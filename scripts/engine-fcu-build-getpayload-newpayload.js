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
  return `t12-build-getpayload-${client}-${Date.now()}`;
}

function buildArtifactRecord(filePath) {
  const stat = fs.statSync(filePath);
  return {
    path: filePath,
    bytes: stat.size,
  };
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

function normalizeFcuBuildResponse(responseBody) {
  return {
    jsonrpc: responseBody.jsonrpc,
    id: responseBody.id,
    result: {
      payloadStatus: stableNormalize(responseBody.result.payloadStatus),
      payloadIdClass: responseBody.result.payloadId ? "present" : "null",
    },
  };
}

function evaluateHardInvariants(clientRun, scenarioDef, testCase) {
  const fcuResult = clientRun.steps.forkchoiceUpdated.response.result;
  const getPayloadResult = clientRun.steps.getPayload.response.result;
  const buildAttrs = scenarioDef.request_sequence[0].params[1];
  const payload = getPayloadResult;
  const evaluations = [
    {
      rule_id: "PARIS-METHOD-FCU-18",
      passed:
        fcuResult &&
        fcuResult.payloadStatus &&
        fcuResult.payloadStatus.status === "VALID" &&
        fcuResult.payloadStatus.latestValidHash === testCase.expected_head_hash &&
        fcuResult.payloadStatus.validationError === null &&
        typeof fcuResult.payloadId === "string" &&
        /^0x[0-9a-fA-F]{16}$/.test(fcuResult.payloadId),
      details: {
        payloadStatus: fcuResult ? fcuResult.payloadStatus : undefined,
        payloadId: fcuResult ? fcuResult.payloadId : undefined,
      },
    },
    {
      rule_id: "PARIS-METHOD-GP-01",
      passed:
        !clientRun.steps.getPayload.response.error &&
        payload &&
        payload.parentHash === testCase.expected_head_hash &&
        payload.blockNumber === testCase.expected_child_block_number &&
        payload.timestamp === buildAttrs.timestamp &&
        payload.prevRandao === buildAttrs.prevRandao,
      details: {
        parentHash: payload ? payload.parentHash : undefined,
        blockNumber: payload ? payload.blockNumber : undefined,
        timestamp: payload ? payload.timestamp : undefined,
        prevRandao: payload ? payload.prevRandao : undefined,
        expected_head_hash: testCase.expected_head_hash,
        expected_child_block_number: testCase.expected_child_block_number,
        requested_payload_attributes: buildAttrs,
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

function evaluateNewPayloadStatus(clientRun, testCase) {
  const payload = clientRun.steps.getPayload.response.result;
  const result = clientRun.steps.newPayload.response.result;
  const status = result.status;
  const accepted = testCase.allowed_newpayload_statuses.includes(status);
  let semanticsOkay = false;
  if (status === "VALID") {
    semanticsOkay =
      result.latestValidHash === payload.blockHash &&
      result.validationError === null;
  } else if (status === "ACCEPTED") {
    semanticsOkay =
      result.latestValidHash === null &&
      result.validationError === null;
  }
  return {
    status,
    passed: accepted && semanticsOkay,
    details: {
      payload_block_hash: payload.blockHash,
      latestValidHash: result.latestValidHash,
      validationError: result.validationError,
    },
  };
}

async function runClient(config, clientSpec, bootstrapRequest, scenarioDef, testCase, outputPath) {
  const bootstrap = await bootstrapClient(config, clientSpec, bootstrapRequest);
  const rawLogPath = path.join(
    path.dirname(outputPath),
    `${path.basename(outputPath, ".json")}.${clientSpec.client}.raw.log`,
  );
  try {
    const fcuStep = scenarioDef.request_sequence[0];
    const fcuResponse = await requestEngine(
      clientSpec,
      config,
      fcuStep.method,
      fcuStep.params,
    );

    const payloadId = fcuResponse.body.result && fcuResponse.body.result.payloadId;
    if (!payloadId) {
      throw new Error(
        `${clientSpec.client} did not return a payloadId: ${JSON.stringify(fcuResponse.body)}`,
      );
    }

    const getPayloadResponse = await requestEngine(
      clientSpec,
      config,
      scenarioDef.request_sequence[1].method,
      [payloadId],
    );

    const payload = getPayloadResponse.body.result;
    const newPayloadResponse = await requestEngine(
      clientSpec,
      config,
      scenarioDef.request_sequence[2].method,
      [payload],
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

    const clientRun = {
      client: clientSpec.client,
      docker_image: clientSpec.image,
      container_name: bootstrap.container_name,
      raw_log_file: rawLogPath,
      bootstrap_fcu: bootstrap.bootstrap_fcu,
      client_runtime_state: {
        payloadId,
      },
      steps: {
        forkchoiceUpdated: {
          method: fcuStep.method,
          params: fcuStep.params,
          response: fcuResponse.body,
          normalized_response: normalizeFcuBuildResponse(fcuResponse.body),
        },
        getPayload: {
          method: scenarioDef.request_sequence[1].method,
          params: [payloadId],
          response: getPayloadResponse.body,
          normalized_response: stableNormalize(getPayloadResponse.body),
        },
        newPayload: {
          method: scenarioDef.request_sequence[2].method,
          params: [payload],
          response: newPayloadResponse.body,
          normalized_response: stableNormalize(newPayloadResponse.body),
        },
      },
      latest_header: latestHeader.body.result,
    };

    clientRun.invariant_evaluations = evaluateHardInvariants(clientRun, scenarioDef, testCase);
    clientRun.newpayload_category_evaluation = evaluateNewPayloadStatus(clientRun, testCase);
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

  ensureEqual(config.task_id, "T12", "config.task_id");
  ensureEqual(testCase.task_id, "T12", "testCase.task_id");
  ensureArray(config.required_artifacts, "config.required_artifacts");
  ensureArray(config.clients, "config.clients");
  ensureArray(testCase.required_hard_invariants, "testCase.required_hard_invariants");
  ensureArray(testCase.allowed_newpayload_statuses, "testCase.allowed_newpayload_statuses");

  const artifactRecords = [];
  for (const artifactPath of config.required_artifacts) {
    ensureFile(path.join(rootDir, artifactPath), "required artifact");
    artifactRecords.push(buildArtifactRecord(artifactPath));
  }

  config.genesis_file = path.join(rootDir, config.genesis_file);
  config.chain_file = path.join(rootDir, config.chain_file);
  config.bootstrap_headfcu_file = path.join(rootDir, config.bootstrap_headfcu_file);
  config.fork_env = readJson(path.join(rootDir, config.fork_env_file));

  const bootstrapRequest = readJson(config.bootstrap_headfcu_file);
  const scenarioDef = readJson(path.join(rootDir, config.scenario_file));

  ensureEqual(scenarioDef.task_id, "T12", "scenarioDef.task_id");
  ensureEqual(scenarioDef.scenario_id, "fcu-build-getpayload-newpayload", "scenarioDef.scenario_id");
  ensureArray(scenarioDef.hard_invariants, "scenarioDef.hard_invariants");
  ensureArray(scenarioDef.request_sequence, "scenarioDef.request_sequence");
  ensureEqual(scenarioDef.request_sequence.length, 3, "T12 request sequence length");

  for (const clientSpec of config.clients) {
    runDocker(config, ["image", "inspect", clientSpec.image], `docker image inspect ${clientSpec.image}`);
  }

  const clientRuns = [];
  for (const clientSpec of config.clients) {
    clientRuns.push(await runClient(config, clientSpec, bootstrapRequest, scenarioDef, testCase, outputPath));
  }

  for (const clientRun of clientRuns) {
    for (const requiredRule of testCase.required_hard_invariants) {
      const evaluation = clientRun.invariant_evaluations.find((entry) => entry.rule_id === requiredRule);
      if (!evaluation || !evaluation.passed) {
        throw new Error(`${clientRun.client} failed hard invariant ${requiredRule}`);
      }
    }
    if (!clientRun.newpayload_category_evaluation.passed) {
      throw new Error(
        `${clientRun.client} returned unexpected newPayload category ${clientRun.newpayload_category_evaluation.status}`,
      );
    }
    ensureEqual(
      clientRun.steps.getPayload.response.result.blockNumber,
      testCase.expected_child_block_number,
      `${clientRun.client} getPayload block number`,
    );
  }

  const log = {
    taskId: "T12",
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
      clients: config.clients.map((client) => client.client),
      hard_invariants: scenarioDef.hard_invariants,
      newpayload_allowed_statuses: testCase.allowed_newpayload_statuses,
    },
    validations: [
      {
        check: "required artifacts exist",
        status: "pass",
        details: artifactRecords,
      },
      {
        check: "payloadId is tracked per client and not used as a cross-client comparison key",
        status: "pass",
        details: clientRuns.map((clientRun) => ({
          client: clientRun.client,
          client_runtime_state: clientRun.client_runtime_state,
          forkchoice_projection: clientRun.steps.forkchoiceUpdated.normalized_response.result.payloadIdClass,
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
        check: "all three calls reach expected response categories",
        status: "pass",
        details: clientRuns.map((clientRun) => ({
          client: clientRun.client,
          forkchoice_status: clientRun.steps.forkchoiceUpdated.response.result.payloadStatus.status,
          getPayload_blockHash: clientRun.steps.getPayload.response.result.blockHash,
          newPayload: clientRun.newpayload_category_evaluation,
        })),
      },
    ],
    clientRuns,
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(log, null, 2) + "\n");
  console.log(`FCU build/getPayload/newPayload scenario passed for ${clientRuns.length} clients.`);
}

main().catch((error) => {
  console.error(`FCU build/getPayload/newPayload scenario failed: ${error.message}`);
  process.exit(1);
});
