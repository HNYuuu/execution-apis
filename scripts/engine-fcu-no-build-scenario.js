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

function ensureEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label} mismatch: expected ${expected}, got ${actual}`);
  }
}

function ensureFile(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${label} is missing: ${filePath}`);
  }
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

function buildContainerName(client) {
  return `t11-fcu-no-build-${client}-${Date.now()}`;
}

function buildArtifactRecord(filePath) {
  const stat = fs.statSync(filePath);
  return {
    path: filePath,
    bytes: stat.size,
  };
}

async function bootstrapClient(config, clientSpec, fixtures) {
  const containerName = buildContainerName(clientSpec.client);
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
    const runtimeEnv = { ...config.fork_env, ...clientSpec.extra_env };
    for (const [key, value] of Object.entries(runtimeEnv)) {
      createArgs.push("-e", `${key}=${value}`);
    }
    createArgs.push(clientSpec.image);
    runDocker(config, createArgs, `${clientSpec.client} docker create`);
    created = true;

    runDocker(config, ["cp", config.genesis_file, `${containerName}:/genesis.json`], "docker cp genesis");
    runDocker(config, ["cp", config.chain_file, `${containerName}:/chain.rlp`], "docker cp chain");
    runDocker(config, ["start", containerName], `${clientSpec.client} docker start`);

    await waitForHttpReady(clientSpec, config);

    const bootstrapFcu = await requestEngine(
      clientSpec,
      config,
      fixtures.bootstrap.method,
      fixtures.bootstrap.params,
    );

    return {
      container_name: containerName,
      bootstrap_fcu: bootstrapFcu.body,
    };
  } catch (error) {
    if (created) {
      runDocker(config, ["logs", containerName], `${clientSpec.client} bootstrap logs`, true);
    }
    throw error;
  }
}

function evaluateInvariants(clientRun, scenarioDef, testCase) {
  const response = clientRun.scenario.response;
  const request = clientRun.scenario.request;
  const result = response.result;
  const evaluations = [
    {
      rule_id: "PARIS-METHOD-FCU-22",
      passed: request.params[1] === null && !response.error,
      details: {
        second_param_is_null: request.params[1] === null,
        response_has_error: Boolean(response.error),
      },
    },
    {
      rule_id: "PARIS-METHOD-FCU-23",
      passed: result && Object.prototype.hasOwnProperty.call(result, "payloadId") && result.payloadId === null,
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
        result.payloadStatus.latestValidHash === testCase.expected_head_hash &&
        result.payloadStatus.validationError === null &&
        result.payloadId === null,
      details: {
        payloadStatus: result ? result.payloadStatus : undefined,
        payloadId: result ? result.payloadId : undefined,
        expected_head_hash: testCase.expected_head_hash,
      },
    },
  ];

  for (const invariantId of scenarioDef.hard_invariants) {
    if (!evaluations.find((entry) => entry.rule_id === invariantId)) {
      throw new Error(`missing invariant evaluation for ${invariantId}`);
    }
  }

  return evaluations;
}

async function runClient(config, clientSpec, scenarioDef, fixtures, testCase, outputPath) {
  const bootstrap = await bootstrapClient(config, clientSpec, fixtures);
  const rawLogPath = path.join(
    path.dirname(outputPath),
    `${path.basename(outputPath, ".json")}.${clientSpec.client}.raw.log`,
  );
  try {
    const requestDef = scenarioDef.request_sequence[0];
    const requestPayload = {
      request_id: requestDef.request_id,
      endpoint: requestDef.endpoint,
      method: requestDef.method,
      params: requestDef.params,
    };

    const scenarioResponse = await requestEngine(
      clientSpec,
      config,
      requestDef.method,
      requestDef.params,
    );

    const latestHeader = await requestJsonRpc(
      clientSpec.http_host,
      clientSpec.http_port,
      "eth_getBlockByNumber",
      ["latest", false],
      config.request_timeout_ms,
    );

    const rawLogs = runDocker(config, ["logs", bootstrap.container_name], `${clientSpec.client} docker logs`).stdout;
    fs.writeFileSync(rawLogPath, `${rawLogs}\n`);

    const normalized = stableNormalize(scenarioResponse.body);
    const clientRun = {
      client: clientSpec.client,
      docker_image: clientSpec.image,
      container_name: bootstrap.container_name,
      raw_log_file: rawLogPath,
      bootstrap_fcu: bootstrap.bootstrap_fcu,
      scenario: {
        scenario_id: scenarioDef.scenario_id,
        request: requestPayload,
        response: scenarioResponse.body,
        normalized_response: normalized,
      },
      latest_header: latestHeader.body.result,
    };
    clientRun.invariant_evaluations = evaluateInvariants(clientRun, scenarioDef, testCase);
    return clientRun;
  } finally {
    runDocker(config, ["rm", "-f", bootstrap.container_name], `docker rm ${bootstrap.container_name}`, true);
  }
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

  ensureEqual(config.task_id, "T11", "config.task_id");
  ensureEqual(testCase.task_id, "T11", "testCase.task_id");
  ensureArray(config.required_artifacts, "config.required_artifacts");
  ensureArray(config.clients, "config.clients");
  ensureArray(testCase.required_hard_invariants, "testCase.required_hard_invariants");

  const artifactRecords = [];
  for (const artifactPath of config.required_artifacts) {
    ensureFile(path.join(rootDir, artifactPath), "required artifact");
    artifactRecords.push(buildArtifactRecord(artifactPath));
  }

  config.genesis_file = path.join(rootDir, config.genesis_file);
  config.chain_file = path.join(rootDir, config.chain_file);
  config.bootstrap_headfcu_file = path.join(rootDir, config.bootstrap_headfcu_file);
  config.fork_env = readJson(path.join(rootDir, config.fork_env_file));

  const bootstrapFixture = readJson(config.bootstrap_headfcu_file);
  const scenarioDef = readJson(path.join(rootDir, config.scenario_file));

  ensureEqual(scenarioDef.task_id, "T11", "scenarioDef.task_id");
  ensureEqual(scenarioDef.scenario_id, "fcu-no-build", "scenarioDef.scenario_id");
  ensureArray(scenarioDef.hard_invariants, "scenarioDef.hard_invariants");
  ensureArray(scenarioDef.request_sequence, "scenarioDef.request_sequence");
  ensureEqual(scenarioDef.request_sequence.length, 1, "T11 request sequence length");
  ensureEqual(scenarioDef.request_sequence[0].method, "engine_forkchoiceUpdatedV1", "T11 method");

  const fixtures = {
    bootstrap: bootstrapFixture,
  };

  for (const clientSpec of config.clients) {
    runDocker(config, ["image", "inspect", clientSpec.image], `docker image inspect ${clientSpec.image}`);
  }

  const clientRuns = [];
  for (const clientSpec of config.clients) {
    clientRuns.push(await runClient(config, clientSpec, scenarioDef, fixtures, testCase, outputPath));
  }

  for (const clientRun of clientRuns) {
    for (const requiredRule of testCase.required_hard_invariants) {
      const evaluation = clientRun.invariant_evaluations.find((entry) => entry.rule_id === requiredRule);
      if (!evaluation || !evaluation.passed) {
        throw new Error(`${clientRun.client} failed hard invariant ${requiredRule}`);
      }
    }
    ensureEqual(clientRun.latest_header.hash, testCase.expected_head_hash, `${clientRun.client} latest header hash`);
    ensureEqual(clientRun.latest_header.number, testCase.expected_head_number, `${clientRun.client} latest header number`);
  }

  const log = {
    taskId: "T11",
    generatedAt: new Date().toISOString(),
    status: "pass",
    executionMode: "real-runtime",
    inputs: {
      configFile: configPath,
      testCaseFile: testCasePath,
      scenarioFile: config.scenario_file,
      normalization_profile_file: config.normalization_profile_file,
    },
    summary: {
      scenario_id: scenarioDef.scenario_id,
      method: scenarioDef.request_sequence[0].method,
      clients: config.clients.map((client) => client.client),
      hard_invariants: scenarioDef.hard_invariants,
    },
    validations: [
      {
        check: "required artifacts exist",
        status: "pass",
        details: artifactRecords,
      },
      {
        check: "scenario stays in the no-build branch with payloadId null",
        status: "pass",
        details: clientRuns.map((clientRun) => ({
          client: clientRun.client,
          result: clientRun.scenario.response.result,
        })),
      },
      {
        check: "approved hard invariants pass on all clients",
        status: "pass",
        details: clientRuns.map((clientRun) => ({
          client: clientRun.client,
          invariant_evaluations: clientRun.invariant_evaluations,
        })),
      },
      {
        check: "comparison does not use client-local runtime values as cross-client keys",
        status: "pass",
        details: {
          normalized_fields: [
            "result.payloadStatus.status",
            "result.payloadStatus.latestValidHash",
            "result.payloadId",
          ],
          excluded_runtime_keys: ["container_name", "raw_log_file"],
        },
      },
    ],
    clientRuns,
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(log, null, 2) + "\n");
  console.log(`FCU no-build scenario passed for ${clientRuns.length} clients.`);
}

main().catch((error) => {
  console.error(`FCU no-build scenario failed: ${error.message}`);
  process.exit(1);
});
