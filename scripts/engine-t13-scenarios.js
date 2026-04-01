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

function buildArtifactRecord(filePath) {
  const stat = fs.statSync(filePath);
  return {
    path: filePath,
    bytes: stat.size,
  };
}

function mutatePayloadId(payloadId) {
  if (!/^0x[0-9a-fA-F]{16}$/.test(payloadId)) {
    throw new Error(`cannot mutate unexpected payloadId format: ${payloadId}`);
  }
  const suffix = payloadId.slice(-1).toLowerCase();
  const replacement = suffix === "0" ? "1" : "0";
  return `${payloadId.slice(0, -1)}${replacement}`;
}

function buildContainerName(client) {
  return `t13-scenarios-${client}-${Date.now()}`;
}

async function bootstrapClient(config, clientSpec, bootstrapRequest) {
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
      bootstrapRequest.method,
      bootstrapRequest.params,
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

async function runClient(config, clientSpec, bootstrapRequest, repeatScenario, unknownScenario, testCase, outputPath) {
  const bootstrap = await bootstrapClient(config, clientSpec, bootstrapRequest);
  const rawLogPath = path.join(
    path.dirname(outputPath),
    `${path.basename(outputPath, ".json")}.${clientSpec.client}.raw.log`,
  );
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

    const repeatFirst = await requestEngine(
      clientSpec,
      config,
      repeatScenario.request_sequence[0].method,
      repeatParams,
    );
    const repeatSecond = await requestEngine(
      clientSpec,
      config,
      repeatScenario.request_sequence[1].method,
      repeatParams,
    );

    const repeatNormalizedFirst = stableNormalize(repeatFirst.body);
    const repeatNormalizedSecond = stableNormalize(repeatSecond.body);
    const seedBuildAttrs = unknownScenario.seed_build_request.payloadAttributes;
    const seedBuildResponse = await requestEngine(
      clientSpec,
      config,
      unknownScenario.seed_build_request.method,
      [
        {
          headBlockHash: head.hash,
          safeBlockHash: head.hash,
          finalizedBlockHash: head.hash,
        },
        seedBuildAttrs,
      ],
    );
    const seedPayloadId = seedBuildResponse.body.result && seedBuildResponse.body.result.payloadId;
    if (!seedPayloadId) {
      throw new Error(`${clientSpec.client} failed to obtain seed payloadId for unknown-payload scenario`);
    }
    const mutatedPayloadId = mutatePayloadId(seedPayloadId);
    const unknownPayloadResponse = await requestEngine(
      clientSpec,
      config,
      unknownScenario.request_sequence[0].method,
      [mutatedPayloadId],
    );
    const rawLogs = runDocker(config, ["logs", bootstrap.container_name], `${clientSpec.client} docker logs`).stdout;
    fs.writeFileSync(rawLogPath, `${rawLogs}\n`);
    const unknownError = unknownPayloadResponse.body.error || null;
    const unknownCategory = unknownError && unknownError.code === -38001 ? "unknown_payload" : "other";

    const repeatInvariant = {
      rule_id: "PARIS-METHOD-FCU-03",
      passed:
        repeatFirst.body.result &&
        repeatFirst.body.result.payloadStatus &&
        repeatFirst.body.result.payloadStatus.status === "VALID" &&
        repeatFirst.body.result.payloadStatus.latestValidHash === ancestorHash &&
        repeatFirst.body.result.payloadStatus.validationError === null &&
        repeatFirst.body.result.payloadId === null &&
        JSON.stringify(repeatNormalizedFirst) === JSON.stringify(repeatNormalizedSecond),
      details: {
        ancestorHash,
        first: repeatFirst.body.result,
        second: repeatSecond.body.result,
      },
    };

    const unknownInvariant = {
      rule_id: "PARIS-METHOD-GP-02",
      passed: unknownError && unknownError.code === -38001,
      details: {
        error: unknownError,
        normalized_error_category: unknownCategory,
      },
    };

    return {
      client: clientSpec.client,
      docker_image: clientSpec.image,
      container_name: bootstrap.container_name,
      raw_log_file: rawLogPath,
      bootstrap_fcu: bootstrap.bootstrap_fcu,
      latest_header: head,
      scenarios: {
        repeat_fcu_same_head: {
          semantic_mode: "valid_ancestor_shortcut_repeated",
          ancestor_hash: ancestorHash,
          first: {
            request: {
              method: repeatScenario.request_sequence[0].method,
              params: repeatParams,
            },
            response: repeatFirst.body,
            normalized_response: repeatNormalizedFirst,
          },
          second: {
            request: {
              method: repeatScenario.request_sequence[1].method,
              params: repeatParams,
            },
            response: repeatSecond.body,
            normalized_response: repeatNormalizedSecond,
          },
          invariant_evaluation: repeatInvariant,
        },
        unknown_payloadid: {
          seed_build: {
            request: {
              method: unknownScenario.seed_build_request.method,
              params: [
                {
                  headBlockHash: head.hash,
                  safeBlockHash: head.hash,
                  finalizedBlockHash: head.hash,
                },
                seedBuildAttrs,
              ],
            },
            response: seedBuildResponse.body,
            seed_payload_id: seedPayloadId,
            mutated_payload_id: mutatedPayloadId,
          },
          request: {
            method: unknownScenario.request_sequence[0].method,
            params: [mutatedPayloadId],
          },
          response: unknownPayloadResponse.body,
          normalized_error_category: unknownCategory,
          invariant_evaluation: unknownInvariant,
        },
      },
    };
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
  ensureEqual(config.task_id, "T13", "config.task_id");
  ensureEqual(testCase.task_id, "T13", "testCase.task_id");
  ensureArray(config.required_artifacts, "config.required_artifacts");
  ensureArray(config.clients, "config.clients");
  ensureArray(testCase.required_repeat_invariants, "testCase.required_repeat_invariants");
  ensureArray(testCase.required_unknown_invariants, "testCase.required_unknown_invariants");

  const artifactRecords = [];
  for (const artifactPath of config.required_artifacts) {
    ensureFile(path.join(rootDir, artifactPath), "required artifact");
    artifactRecords.push(buildArtifactRecord(path.join(rootDir, artifactPath)));
  }

  config.genesis_file = path.join(rootDir, config.genesis_file);
  config.chain_file = path.join(rootDir, config.chain_file);
  config.bootstrap_headfcu_file = path.join(rootDir, config.bootstrap_headfcu_file);
  config.fork_env = readJson(path.join(rootDir, config.fork_env_file));

  const bootstrapRequest = readJson(config.bootstrap_headfcu_file);
  const repeatScenario = readJson(path.join(rootDir, config.repeat_scenario_file));
  const unknownScenario = readJson(path.join(rootDir, config.unknown_scenario_file));

  for (const clientSpec of config.clients) {
    runDocker(config, ["image", "inspect", clientSpec.image], `docker image inspect ${clientSpec.image}`);
  }

  const clientRuns = [];
  for (const clientSpec of config.clients) {
    clientRuns.push(
      await runClient(config, clientSpec, bootstrapRequest, repeatScenario, unknownScenario, testCase, outputPath),
    );
  }

  for (const clientRun of clientRuns) {
    const repeatEval = clientRun.scenarios.repeat_fcu_same_head.invariant_evaluation;
    const unknownEval = clientRun.scenarios.unknown_payloadid.invariant_evaluation;
    if (!repeatEval.passed) {
      throw new Error(`${clientRun.client} failed repeat-fcu invariant`);
    }
    if (!unknownEval.passed) {
      throw new Error(
        `${clientRun.client} failed unknown-payloadid invariant: ${JSON.stringify(unknownEval.details)}`,
      );
    }
    ensureEqual(
      clientRun.scenarios.unknown_payloadid.normalized_error_category,
      "unknown_payload",
      `${clientRun.client} unknown payload normalized category`,
    );
  }

  const log = {
    taskId: "T13",
    generatedAt: new Date().toISOString(),
    status: "pass",
    executionMode: "real-runtime",
    inputs: {
      configFile: configPath,
      testCaseFile: testCasePath,
      repeatScenarioFile: config.repeat_scenario_file,
      unknownScenarioFile: config.unknown_scenario_file,
      normalization_profile_file: config.normalization_profile_file,
    },
    summary: {
      clients: config.clients.map((client) => client.client),
      repeat_scenario_id: repeatScenario.scenario_id,
      unknown_scenario_id: unknownScenario.scenario_id,
      repeat_semantic_mode: "valid_ancestor_shortcut_repeated",
    },
    validations: [
      {
        check: "required artifacts exist",
        status: "pass",
        details: artifactRecords,
      },
      {
        check: "repeated FCU remains stable within one client on a valid ancestor shortcut request",
        status: "pass",
        details: clientRuns.map((clientRun) => ({
          client: clientRun.client,
          scenario: clientRun.scenarios.repeat_fcu_same_head,
        })),
      },
      {
        check: "unknown payloadId handling is classified by normalized error category",
        status: "pass",
        details: clientRuns.map((clientRun) => ({
          client: clientRun.client,
          normalized_error_category: clientRun.scenarios.unknown_payloadid.normalized_error_category,
          error: clientRun.scenarios.unknown_payloadid.response.error,
        })),
      },
    ],
    clientRuns,
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(log, null, 2) + "\n");
  console.log(`T13 scenarios passed for ${clientRuns.length} clients.`);
}

main().catch((error) => {
  console.error(`T13 scenarios failed: ${error.message}`);
  process.exit(1);
});
