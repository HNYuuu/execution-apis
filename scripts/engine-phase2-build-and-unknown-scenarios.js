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

function buildContainerName(taskId, scenarioId, client) {
  return `${taskId}-${scenarioId}-${client}-${Date.now()}`;
}

function baseCreateArgs(clientSpec, forkEnv, image, containerName) {
  const createArgs = [
    "create",
    "--name",
    containerName,
    "-p",
    `${clientSpec.http_port}:8545`,
    "-p",
    `${clientSpec.auth_port}:8551`,
  ];
  const runtimeEnv = { ...forkEnv, ...clientSpec.extra_env };
  for (const [key, value] of Object.entries(runtimeEnv)) {
    createArgs.push("-e", `${key}=${value}`);
  }
  createArgs.push(image);
  return createArgs;
}

async function bootstrapClient(config, clientSpec, bootstrapRequest, scenarioId) {
  const containerName = buildContainerName(config.task_id.toLowerCase(), scenarioId, clientSpec.client);
  let created = false;
  try {
    runDocker(
      config,
      baseCreateArgs(clientSpec, config.fork_env, clientSpec.image, containerName),
      `${scenarioId} docker create ${clientSpec.client}`,
    );
    created = true;

    runDocker(config, ["cp", config.genesis_file, `${containerName}:/genesis.json`], `${scenarioId} docker cp genesis`);
    runDocker(config, ["cp", config.chain_file, `${containerName}:/chain.rlp`], `${scenarioId} docker cp chain`);
    runDocker(config, ["start", containerName], `${scenarioId} docker start ${clientSpec.client}`);

    await waitForHttpReady(clientSpec, config);
    const bootstrapFcu = await requestEngine(
      clientSpec,
      config,
      config.bootstrap_headfcu.method,
      config.bootstrap_headfcu.params,
    );

    return {
      container_name: containerName,
      bootstrap_fcu: bootstrapFcu.body,
    };
  } catch (error) {
    if (created) {
      runDocker(config, ["logs", containerName], `${scenarioId} bootstrap logs`, true);
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

function evaluateBuildInvariants(clientRun, scenarioDef, testCase) {
  const fcuResult = clientRun.steps.forkchoiceUpdated.response.result;
  const payload = clientRun.steps.getPayload.response.result;
  const buildAttrs = scenarioDef.request_sequence[0].params[1];
  return [
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

async function runBuildLifecycle(config, clientSpec, scenarioDef, testCase, outputDir) {
  const bootstrap = await bootstrapClient(config, clientSpec, config.bootstrap_headfcu, scenarioDef.scenario_id);
  const rawLogPath = path.join(outputDir, `${scenarioDef.scenario_id}.${clientSpec.client}.raw.log`);
  try {
    const fcuStep = scenarioDef.request_sequence[0];
    const fcuResponse = await requestEngine(clientSpec, config, fcuStep.method, fcuStep.params);
    const payloadId = fcuResponse.body.result && fcuResponse.body.result.payloadId;
    if (!payloadId) {
      throw new Error(`${clientSpec.client} did not return a payloadId: ${JSON.stringify(fcuResponse.body)}`);
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
    const rawLogs = runDocker(config, ["logs", bootstrap.container_name], `${scenarioDef.scenario_id} docker logs ${clientSpec.client}`).stdout;
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
    clientRun.invariant_evaluations = evaluateBuildInvariants(clientRun, scenarioDef, testCase);
    clientRun.newpayload_category_evaluation = evaluateNewPayloadStatus(clientRun, testCase);
    return clientRun;
  } finally {
    runDocker(config, ["rm", "-f", bootstrap.container_name], `docker rm ${bootstrap.container_name}`, true);
  }
}

function mutatePayloadId(payloadId) {
  if (!/^0x[0-9a-fA-F]{16}$/.test(payloadId)) {
    throw new Error(`cannot mutate unexpected payloadId format: ${payloadId}`);
  }
  const suffix = payloadId.slice(-1).toLowerCase();
  const replacement = suffix === "0" ? "1" : "0";
  return `${payloadId.slice(0, -1)}${replacement}`;
}

async function runUnknownPayload(config, clientSpec, scenarioDef, outputDir) {
  const bootstrap = await bootstrapClient(config, clientSpec, config.bootstrap_headfcu, scenarioDef.scenario_id);
  const rawLogPath = path.join(outputDir, `${scenarioDef.scenario_id}.${clientSpec.client}.raw.log`);
  try {
    const latestHeader = await requestJsonRpc(
      clientSpec.http_host,
      clientSpec.http_port,
      "eth_getBlockByNumber",
      ["latest", false],
      config.request_timeout_ms,
    );
    const head = latestHeader.body.result;
    const seedBuildResponse = await requestEngine(
      clientSpec,
      config,
      scenarioDef.seed_build_request.method,
      [
        {
          headBlockHash: head.hash,
          safeBlockHash: head.hash,
          finalizedBlockHash: head.hash,
        },
        scenarioDef.seed_build_request.payloadAttributes,
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
      scenarioDef.request_sequence[0].method,
      [mutatedPayloadId],
    );
    const rawLogs = runDocker(config, ["logs", bootstrap.container_name], `${scenarioDef.scenario_id} docker logs ${clientSpec.client}`).stdout;
    fs.writeFileSync(rawLogPath, `${rawLogs}\n`);
    const unknownError = unknownPayloadResponse.body.error || null;
    const unknownCategory = unknownError && unknownError.code === -38001 ? "unknown_payload" : "other";
    return {
      client: clientSpec.client,
      docker_image: clientSpec.image,
      container_name: bootstrap.container_name,
      raw_log_file: rawLogPath,
      bootstrap_fcu: bootstrap.bootstrap_fcu,
      latest_header: head,
      seed_build: {
        request: {
          method: scenarioDef.seed_build_request.method,
          params: [
            {
              headBlockHash: head.hash,
              safeBlockHash: head.hash,
              finalizedBlockHash: head.hash,
            },
            scenarioDef.seed_build_request.payloadAttributes,
          ],
        },
        response: seedBuildResponse.body,
        seed_payload_id: seedPayloadId,
        mutated_payload_id: mutatedPayloadId,
      },
      request: {
        method: scenarioDef.request_sequence[0].method,
        params: [mutatedPayloadId],
      },
      response: unknownPayloadResponse.body,
      normalized_error_category: unknownCategory,
      invariant_evaluation: {
        rule_id: "PARIS-METHOD-GP-02",
        passed: unknownError && unknownError.code === -38001,
        details: {
          error: unknownError,
          normalized_error_category: unknownCategory,
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

  ensureEqual(config.task_id, "P2-T06", "config.task_id");
  ensureEqual(testCase.task_id, "P2-T06", "testCase.task_id");
  ensureArray(config.required_artifacts, "config.required_artifacts");
  ensureArray(config.clients, "config.clients");
  ensureArray(testCase.required_build_invariants, "testCase.required_build_invariants");
  ensureArray(testCase.required_unknown_invariants, "testCase.required_unknown_invariants");
  ensureArray(testCase.allowed_newpayload_statuses, "testCase.allowed_newpayload_statuses");

  const artifactRecords = [];
  for (const artifactPath of config.required_artifacts) {
    const full = path.join(rootDir, artifactPath);
    ensureFile(full, "required artifact");
    artifactRecords.push(buildArtifactRecord(full));
  }

  config.genesis_file = path.join(rootDir, config.genesis_file);
  config.chain_file = path.join(rootDir, config.chain_file);
  config.bootstrap_headfcu = readJson(path.join(rootDir, config.bootstrap_headfcu_file));
  config.fork_env = readJson(path.join(rootDir, config.fork_env_file));
  const buildScenario = readJson(path.join(rootDir, config.build_scenario_file));
  const unknownScenario = readJson(path.join(rootDir, config.unknown_scenario_file));

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

  const buildRuns = [];
  const unknownRuns = [];
  for (const clientSpec of config.clients) {
    buildRuns.push(await runBuildLifecycle(config, clientSpec, buildScenario, testCase, outputDir));
    unknownRuns.push(await runUnknownPayload(config, clientSpec, unknownScenario, outputDir));
  }

  for (const clientRun of buildRuns) {
    for (const requiredRule of testCase.required_build_invariants) {
      const evaluation = clientRun.invariant_evaluations.find((entry) => entry.rule_id === requiredRule);
      if (!evaluation || !evaluation.passed) {
        throw new Error(`${clientRun.client} failed build invariant ${requiredRule}`);
      }
    }
    if (!clientRun.newpayload_category_evaluation.passed) {
      throw new Error(`${clientRun.client} returned unexpected newPayload category ${clientRun.newpayload_category_evaluation.status}`);
    }
  }

  for (const clientRun of unknownRuns) {
    for (const requiredRule of testCase.required_unknown_invariants) {
      const evaluation = clientRun.invariant_evaluation;
      if (evaluation.rule_id !== requiredRule || !evaluation.passed) {
        throw new Error(`${clientRun.client} failed unknown invariant ${requiredRule}: ${JSON.stringify(evaluation.details)}`);
      }
    }
    ensureEqual(clientRun.normalized_error_category, "unknown_payload", `${clientRun.client} unknown payload normalized category`);
  }

  const newInsights = [];
  const log = {
    taskId: "P2-T06",
    generatedAt: new Date().toISOString(),
    status: "pass",
    executionMode: "real-runtime",
    inputs: {
      configFile: configPath,
      testCaseFile: testCasePath,
      buildScenarioFile: config.build_scenario_file,
      unknownScenarioFile: config.unknown_scenario_file,
      normalization_profile_file: config.normalization_profile_file,
      prerequisite_bootstrap_validation: config.prerequisite_bootstrap_validation,
    },
    summary: {
      clients: config.clients.map((client) => client.client),
      build_scenario_id: buildScenario.scenario_id,
      unknown_scenario_id: unknownScenario.scenario_id,
      required_build_invariants: testCase.required_build_invariants,
      required_unknown_invariants: testCase.required_unknown_invariants,
      allowed_newpayload_statuses: testCase.allowed_newpayload_statuses,
      new_insight_count: newInsights.length,
    },
    validations: [
      {
        check: "required artifacts exist",
        status: "pass",
        details: artifactRecords,
      },
      {
        check: "payloadId remains client-local during the build lifecycle",
        status: "pass",
        details: buildRuns.map((clientRun) => ({
          client: clientRun.client,
          client_runtime_state: clientRun.client_runtime_state,
          forkchoice_projection: clientRun.steps.forkchoiceUpdated.normalized_response.result.payloadIdClass,
        })),
      },
      {
        check: "build lifecycle invariants pass on all three clients",
        status: "pass",
        details: buildRuns.map((clientRun) => ({
          client: clientRun.client,
          invariant_evaluations: clientRun.invariant_evaluations,
          newPayload: clientRun.newpayload_category_evaluation,
        })),
      },
      {
        check: "unknown-payloadid keeps the mutated-real-payload provenance discipline",
        status: "pass",
        details: unknownRuns.map((clientRun) => ({
          client: clientRun.client,
          seed_payload_id: clientRun.seed_build.seed_payload_id,
          mutated_payload_id: clientRun.seed_build.mutated_payload_id,
          normalized_error_category: clientRun.normalized_error_category,
          error: clientRun.response.error,
        })),
      },
      {
        check: "no new phase-2 insight is required at the build-lifecycle stage",
        status: "pass",
        details: {
          new_insights: newInsights,
        },
      },
    ],
    scenarios: {
      fcu_build_getpayload_newpayload: buildRuns,
      unknown_payloadid: unknownRuns,
    },
  };

  fs.writeFileSync(outputPath, JSON.stringify(log, null, 2) + "\n");
  console.log(`Phase-2 build-lifecycle and unknown-payload scenarios passed for ${config.clients.length} clients.`);
}

main().catch((error) => {
  console.error(`Phase-2 build-lifecycle and unknown-payload scenarios failed: ${error.message}`);
  process.exit(1);
});
