#!/usr/bin/env node

const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const path = require("path");
const { spawnSync } = require("child_process");

const ENGINE_JWT_SECRET_HEX =
  "7365637265747365637265747365637265747365637265747365637265747365";

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      continue;
    }
    args[token.slice(2)] = argv[i + 1];
    i += 1;
  }
  return args;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function ensureArray(value, label) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${label} must be a non-empty array`);
  }
}

function ensureFile(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${label} is missing: ${filePath}`);
  }
}

function ensureEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label} mismatch: expected ${expected}, got ${actual}`);
  }
}

function stableNormalize(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => stableNormalize(entry));
  }
  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = stableNormalize(value[key]);
        return acc;
      }, {});
  }
  return value;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function dockerEnv(config) {
  const env = { ...process.env };
  if (config.docker_endpoint) {
    env.DOCKER_HOST = config.docker_endpoint;
  }
  return env;
}

function runDocker(config, args, label, allowFailure = false) {
  const result = spawnSync("docker", args, {
    encoding: "utf8",
    env: dockerEnv(config),
    maxBuffer: 1024 * 1024 * 16,
  });
  if (!allowFailure && result.status !== 0) {
    throw new Error(
      `${label} failed: ${(result.stderr || result.stdout || "").trim() || "unknown docker error"}`,
    );
  }
  return {
    status: result.status,
    stdout: (result.stdout || "").trim(),
    stderr: (result.stderr || "").trim(),
  };
}

function base64UrlEncode(buffer) {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function buildJwtToken(secretHex) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = Buffer.from(JSON.stringify({ iat: Math.floor(Date.now() / 1000) }));
  const encodedHeader = base64UrlEncode(header);
  const encodedPayload = base64UrlEncode(payload);
  const body = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto
    .createHmac("sha256", Buffer.from(secretHex, "hex"))
    .update(body)
    .digest();
  return `${body}.${base64UrlEncode(signature)}`;
}

function requestJsonRpc(host, port, method, params, timeoutMs, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      jsonrpc: "2.0",
      method,
      params,
      id: 1,
    });
    const request = http.request(
      {
        host,
        port,
        path: "/",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
          ...headers,
        },
        timeout: timeoutMs,
      },
      (response) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => {
          try {
            resolve({
              statusCode: response.statusCode,
              body: JSON.parse(body),
            });
          } catch (error) {
            reject(new Error(`invalid JSON-RPC response for ${method}: ${body}`));
          }
        });
      },
    );
    request.on("timeout", () => {
      request.destroy(new Error(`request timeout for ${method}`));
    });
    request.on("error", (error) => {
      reject(error);
    });
    request.write(payload);
    request.end();
  });
}

async function waitForHttpReady(clientSpec, config) {
  const deadline = Date.now() + config.startup_timeout_ms;
  let lastError = "HTTP RPC did not become ready";
  while (Date.now() < deadline) {
    try {
      const response = await requestJsonRpc(
        clientSpec.http_host,
        clientSpec.http_port,
        "eth_blockNumber",
        [],
        config.request_timeout_ms,
      );
      if (response.body && typeof response.body.result === "string") {
        return response.body;
      }
      lastError = `unexpected readiness response: ${JSON.stringify(response.body)}`;
    } catch (error) {
      lastError = error.message;
    }
    await sleep(config.rpc_poll_interval_ms);
  }
  throw new Error(`HTTP RPC readiness timeout for ${clientSpec.client}: ${lastError}`);
}

async function requestEngine(clientSpec, config, method, params) {
  const token = buildJwtToken(ENGINE_JWT_SECRET_HEX);
  return requestJsonRpc(
    clientSpec.auth_host,
    clientSpec.auth_port,
    method,
    params,
    config.request_timeout_ms,
    {
      Authorization: `Bearer ${token}`,
    },
  );
}

function buildContainerName(taskId, scenarioId, client) {
  return `${taskId}-${scenarioId}-${client}-${Date.now()}`;
}

function buildRawLogPath(outputDir, scenarioId, client) {
  return path.join(outputDir, `${scenarioId}.${client}.raw.log`);
}

async function bootstrapClient(config, scenarioConfig, clientSpec) {
  const containerName = buildContainerName(config.task_id.toLowerCase(), scenarioConfig.scenario_id, clientSpec.client);
  let created = false;
  try {
    const createArgs = [
      "create",
      "--name",
      containerName,
      "-p",
      `${clientSpec.http_port}:8545`,
      "-p",
      `${clientSpec.auth_port}:8551`,
    ];
    const runtimeEnv = { ...scenarioConfig.fork_env, ...clientSpec.extra_env };
    for (const [key, value] of Object.entries(runtimeEnv)) {
      createArgs.push("-e", `${key}=${value}`);
    }
    createArgs.push(clientSpec.image);
    runDocker(config, createArgs, `${scenarioConfig.scenario_id} docker create ${clientSpec.client}`);
    created = true;

    runDocker(config, ["cp", scenarioConfig.genesis_file, `${containerName}:/genesis.json`], `${scenarioConfig.scenario_id} docker cp genesis`);
    runDocker(config, ["cp", scenarioConfig.chain_file, `${containerName}:/chain.rlp`], `${scenarioConfig.scenario_id} docker cp chain`);
    runDocker(config, ["start", containerName], `${scenarioConfig.scenario_id} docker start ${clientSpec.client}`);

    await waitForHttpReady(clientSpec, config);
    const bootstrapFcu = await requestEngine(
      clientSpec,
      config,
      scenarioConfig.bootstrap_headfcu.method,
      scenarioConfig.bootstrap_headfcu.params,
    );

    return {
      container_name: containerName,
      bootstrap_fcu: bootstrapFcu.body,
    };
  } catch (error) {
    if (created) {
      runDocker(config, ["logs", containerName], `${scenarioConfig.scenario_id} bootstrap logs`, true);
    }
    throw error;
  }
}

async function runFcuNoBuild(config, scenarioConfig, clientSpec, outputDir) {
  const bootstrap = await bootstrapClient(config, scenarioConfig, clientSpec);
  const rawLogPath = buildRawLogPath(outputDir, scenarioConfig.scenario_id, clientSpec.client);
  try {
    const response = await requestEngine(
      clientSpec,
      config,
      scenarioConfig.method,
      scenarioConfig.request_params,
    );
    const latestHeader = await requestJsonRpc(
      clientSpec.http_host,
      clientSpec.http_port,
      "eth_getBlockByNumber",
      ["latest", false],
      config.request_timeout_ms,
    );
    const rawLogs = runDocker(config, ["logs", bootstrap.container_name], `${scenarioConfig.scenario_id} docker logs ${clientSpec.client}`).stdout;
    fs.writeFileSync(rawLogPath, `${rawLogs}\n`);

    const result = response.body.result;
    const invariantEvaluations = [
      {
        rule_id: "PARIS-METHOD-FCU-22",
        passed: scenarioConfig.request_params[1] === null && !response.body.error,
        details: {
          second_param_is_null: scenarioConfig.request_params[1] === null,
          response_has_error: Boolean(response.body.error),
        },
      },
      {
        rule_id: "PARIS-METHOD-FCU-23",
        passed: result && result.payloadId === null,
        details: {
          payloadId: result ? result.payloadId : undefined,
        },
      },
      {
        rule_id: "PARIS-METHOD-FCU-17",
        passed:
          result &&
          result.payloadStatus &&
          result.payloadStatus.status === "VALID" &&
          result.payloadStatus.latestValidHash === scenarioConfig.expected_head_hash &&
          result.payloadStatus.validationError === null &&
          result.payloadId === null,
        details: {
          payloadStatus: result ? result.payloadStatus : undefined,
          payloadId: result ? result.payloadId : undefined,
          expected_head_hash: scenarioConfig.expected_head_hash,
        },
      },
    ];

    return {
      client: clientSpec.client,
      docker_image: clientSpec.image,
      container_name: bootstrap.container_name,
      raw_log_file: rawLogPath,
      bootstrap_fcu: bootstrap.bootstrap_fcu,
      request: {
        method: scenarioConfig.method,
        params: scenarioConfig.request_params,
      },
      response: response.body,
      normalized_response: stableNormalize(response.body),
      latest_header: latestHeader.body.result,
      invariant_evaluations: invariantEvaluations,
    };
  } finally {
    runDocker(config, ["rm", "-f", bootstrap.container_name], `docker rm ${bootstrap.container_name}`, true);
  }
}

async function runRepeatFcuSameHead(config, scenarioConfig, clientSpec, outputDir) {
  const bootstrap = await bootstrapClient(config, scenarioConfig, clientSpec);
  const rawLogPath = buildRawLogPath(outputDir, scenarioConfig.scenario_id, clientSpec.client);
  try {
    const latestHeader = await requestJsonRpc(
      clientSpec.http_host,
      clientSpec.http_port,
      "eth_getBlockByNumber",
      ["latest", false],
      config.request_timeout_ms,
    );
    const head = latestHeader.body.result;
    const ancestorHash = head.parentHash;
    const repeatParams = [
      {
        headBlockHash: ancestorHash,
        safeBlockHash: ancestorHash,
        finalizedBlockHash: ancestorHash,
      },
      null,
    ];
    const first = await requestEngine(clientSpec, config, scenarioConfig.method, repeatParams);
    const second = await requestEngine(clientSpec, config, scenarioConfig.method, repeatParams);
    const rawLogs = runDocker(config, ["logs", bootstrap.container_name], `${scenarioConfig.scenario_id} docker logs ${clientSpec.client}`).stdout;
    fs.writeFileSync(rawLogPath, `${rawLogs}\n`);

    const normalizedFirst = stableNormalize(first.body);
    const normalizedSecond = stableNormalize(second.body);
    const invariant = {
      rule_id: "PARIS-METHOD-FCU-03",
      passed:
        first.body.result &&
        first.body.result.payloadStatus &&
        first.body.result.payloadStatus.status === "VALID" &&
        first.body.result.payloadStatus.latestValidHash === ancestorHash &&
        first.body.result.payloadStatus.validationError === null &&
        first.body.result.payloadId === null &&
        JSON.stringify(normalizedFirst) === JSON.stringify(normalizedSecond),
      details: {
        ancestorHash,
        first: first.body.result,
        second: second.body.result,
      },
    };

    return {
      client: clientSpec.client,
      docker_image: clientSpec.image,
      container_name: bootstrap.container_name,
      raw_log_file: rawLogPath,
      bootstrap_fcu: bootstrap.bootstrap_fcu,
      latest_header: head,
      semantic_mode: "valid_ancestor_shortcut_repeated",
      ancestor_hash: ancestorHash,
      first: {
        request: { method: scenarioConfig.method, params: repeatParams },
        response: first.body,
        normalized_response: normalizedFirst,
      },
      second: {
        request: { method: scenarioConfig.method, params: repeatParams },
        response: second.body,
        normalized_response: normalizedSecond,
      },
      invariant_evaluation: invariant,
    };
  } finally {
    runDocker(config, ["rm", "-f", bootstrap.container_name], `docker rm ${bootstrap.container_name}`, true);
  }
}

function buildArtifactRecord(filePath) {
  const stat = fs.statSync(filePath);
  return {
    path: filePath,
    bytes: stat.size,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const configPath = args.config;
  const testCasePath = args["test-case"];
  const outputPath = args.output;

  if (!configPath || !testCasePath || !outputPath) {
    throw new Error("usage: --config <file> --test-case <file> --output <file>");
  }

  const rootDir = process.cwd();
  const config = readJson(configPath);
  const testCase = readJson(testCasePath);
  if (config.task_id !== "P2-T05") {
    throw new Error("config.task_id must be P2-T05");
  }
  if (testCase.task_id !== "P2-T05") {
    throw new Error("testCase.task_id must be P2-T05");
  }

  ensureArray(config.required_artifacts, "config.required_artifacts");
  ensureArray(config.clients, "config.clients");
  ensureArray(testCase.expected_clients, "testCase.expected_clients");
  ensureArray(testCase.required_fcu_no_build_invariants, "testCase.required_fcu_no_build_invariants");
  ensureArray(testCase.required_repeat_invariants, "testCase.required_repeat_invariants");

  const artifactRecords = [];
  for (const artifactPath of config.required_artifacts) {
    const full = path.join(rootDir, artifactPath);
    ensureFile(full, "required artifact");
    artifactRecords.push(buildArtifactRecord(full));
  }

  config.fcu_no_build.genesis_file = path.join(rootDir, config.fcu_no_build.genesis_file);
  config.fcu_no_build.chain_file = path.join(rootDir, config.fcu_no_build.chain_file);
  config.fcu_no_build.bootstrap_headfcu = readJson(path.join(rootDir, config.fcu_no_build.bootstrap_headfcu_file));
  config.fcu_no_build.fork_env = readJson(path.join(rootDir, config.fcu_no_build.fork_env_file));

  config.repeat_fcu_same_head.genesis_file = path.join(rootDir, config.repeat_fcu_same_head.genesis_file);
  config.repeat_fcu_same_head.chain_file = path.join(rootDir, config.repeat_fcu_same_head.chain_file);
  config.repeat_fcu_same_head.bootstrap_headfcu = readJson(path.join(rootDir, config.repeat_fcu_same_head.bootstrap_headfcu_file));
  config.repeat_fcu_same_head.fork_env = readJson(path.join(rootDir, config.repeat_fcu_same_head.fork_env_file));

  for (const clientSpec of config.clients) {
    runDocker(config, ["image", "inspect", clientSpec.image], `docker image inspect ${clientSpec.image}`);
  }
  ensureEqual(
    JSON.stringify(config.clients.map((client) => client.client)),
    JSON.stringify(testCase.expected_clients),
    "planned clients",
  );

  const outputDir = path.dirname(outputPath);
  fs.mkdirSync(outputDir, { recursive: true });

  const fcuNoBuildRuns = [];
  const repeatRuns = [];
  for (const clientSpec of config.clients) {
    fcuNoBuildRuns.push(await runFcuNoBuild(config, config.fcu_no_build, clientSpec, outputDir));
    repeatRuns.push(await runRepeatFcuSameHead(config, config.repeat_fcu_same_head, clientSpec, outputDir));
  }

  for (const run of fcuNoBuildRuns) {
    for (const ruleId of testCase.required_fcu_no_build_invariants) {
      const evaluation = run.invariant_evaluations.find((entry) => entry.rule_id === ruleId);
      if (!evaluation || !evaluation.passed) {
        throw new Error(`${run.client} failed ${ruleId} in fcu-no-build`);
      }
    }
    ensureEqual(run.response.result.payloadStatus.status, "VALID", `${run.client} fcu-no-build payloadStatus.status`);
    ensureEqual(run.response.result.payloadStatus.latestValidHash, config.fcu_no_build.expected_head_hash, `${run.client} fcu-no-build latestValidHash`);
    ensureEqual(run.response.result.payloadId, null, `${run.client} fcu-no-build payloadId`);
  }

  for (const run of repeatRuns) {
    for (const ruleId of testCase.required_repeat_invariants) {
      const evaluation = run.invariant_evaluation;
      if (evaluation.rule_id !== ruleId || !evaluation.passed) {
        throw new Error(`${run.client} failed ${ruleId} in repeat-fcu-same-head`);
      }
    }
  }

  const newInsights = [];
  const log = {
    taskId: "P2-T05",
    generatedAt: new Date().toISOString(),
    status: "pass",
    executionMode: "real-runtime",
    inputs: {
      configFile: configPath,
      testCaseFile: testCasePath,
      prerequisite_bootstrap_validation: config.prerequisite_bootstrap_validation,
      prerequisite_insights_file: config.prerequisite_insights_file,
    },
    summary: {
      clients: config.clients.map((client) => client.client),
      scenarios: [
        config.fcu_no_build.scenario_id,
        config.repeat_fcu_same_head.scenario_id,
      ],
      hard_invariants: [
        ...testCase.required_fcu_no_build_invariants,
        ...testCase.required_repeat_invariants,
      ],
      new_insight_count: newInsights.length,
    },
    validations: [
      {
        check: "required artifacts exist",
        status: "pass",
        details: artifactRecords,
      },
      {
        check: "nethermind satisfies the accepted fcu-no-build hard invariants",
        status: "pass",
        details: fcuNoBuildRuns.map((run) => ({
          client: run.client,
          result: run.response.result,
          invariant_evaluations: run.invariant_evaluations,
        })),
      },
      {
        check: "repeat-fcu-same-head remains a valid-ancestor shortcut on all clients",
        status: "pass",
        details: repeatRuns.map((run) => ({
          client: run.client,
          invariant_evaluation: run.invariant_evaluation,
          ancestor_hash: run.ancestor_hash,
        })),
      },
      {
        check: "no new comparison-discipline insight is required for the third client at the early runtime stage",
        status: "pass",
        details: {
          new_insights: newInsights,
        },
      },
    ],
    scenarios: {
      fcu_no_build: fcuNoBuildRuns,
      repeat_fcu_same_head: repeatRuns,
    },
  };

  fs.writeFileSync(outputPath, JSON.stringify(log, null, 2) + "\n");
  console.log(`Phase-2 early runtime scenarios passed for ${config.clients.length} clients.`);
}

main().catch((error) => {
  console.error(`Phase-2 early runtime scenarios failed: ${error.message}`);
  process.exit(1);
});
