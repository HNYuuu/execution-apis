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

function sha256File(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
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

async function replayHeadFcu(clientSpec, config, headFcuRequest) {
  const token = buildJwtToken(ENGINE_JWT_SECRET_HEX);
  const deadline = Date.now() + config.auth_timeout_ms;
  let lastError = "authenticated Engine API did not become ready";
  while (Date.now() < deadline) {
    try {
      const response = await requestJsonRpc(
        clientSpec.auth_host,
        clientSpec.auth_port,
        headFcuRequest.method,
        headFcuRequest.params,
        config.request_timeout_ms,
        {
          Authorization: `Bearer ${token}`,
        },
      );
      if (response.body && !response.body.error && response.body.result) {
        return response.body;
      }
      lastError = JSON.stringify(response.body);
    } catch (error) {
      lastError = error.message;
    }
    await sleep(config.rpc_poll_interval_ms);
  }
  throw new Error(`authrpc FCU timeout for ${clientSpec.client}: ${lastError}`);
}

function buildContainerName(taskId, scenarioId, client, runIndex) {
  return `${taskId}-${scenarioId}-${client}-run${runIndex + 1}-${Date.now()}`;
}

function buildRawLogPath(outputDir, scenarioId, client, runIndex) {
  return path.join(outputDir, `${scenarioId}.${client}.run${runIndex + 1}.raw.log`);
}

function buildBootstrapDigest(scenarioConfig) {
  const parts = [
    `bootstrap_mode=${scenarioConfig.bootstrap_mode}`,
    `genesis_sha256=${sha256File(scenarioConfig.genesis_file)}`,
    `chain_sha256=${sha256File(scenarioConfig.chain_file)}`,
  ];
  if (scenarioConfig.headfcu_file) {
    parts.push(`headfcu_sha256=${sha256File(scenarioConfig.headfcu_file)}`);
  }
  return crypto.createHash("sha256").update(parts.join("\n")).digest("hex");
}

async function runScenarioClient(config, scenarioConfig, clientSpec, runIndex, outputDir) {
  const containerName = buildContainerName(
    config.task_id.toLowerCase(),
    scenarioConfig.scenario_id,
    clientSpec.client,
    runIndex,
  );
  const rawLogPath = buildRawLogPath(outputDir, scenarioConfig.scenario_id, clientSpec.client, runIndex);
  let created = false;
  try {
    const createArgs = [
      "create",
      "--name",
      containerName,
      "-p",
      `${clientSpec.http_port}:8545`,
    ];
    if (scenarioConfig.requires_authrpc) {
      createArgs.push("-p", `${clientSpec.auth_port}:8551`);
    }
    const runtimeEnv = { ...config.fork_env, ...clientSpec.extra_env };
    for (const [key, value] of Object.entries(runtimeEnv)) {
      createArgs.push("-e", `${key}=${value}`);
    }
    createArgs.push(clientSpec.image);
    runDocker(config, createArgs, `${scenarioConfig.scenario_id} docker create ${clientSpec.client}`);
    created = true;

    runDocker(
      config,
      ["cp", scenarioConfig.genesis_file, `${containerName}:/genesis.json`],
      `${scenarioConfig.scenario_id} docker cp genesis`,
    );
    runDocker(
      config,
      ["cp", scenarioConfig.chain_file, `${containerName}:/chain.rlp`],
      `${scenarioConfig.scenario_id} docker cp chain`,
    );
    runDocker(config, ["start", containerName], `${scenarioConfig.scenario_id} docker start ${clientSpec.client}`);

    await waitForHttpReady(clientSpec, config);

    const requests = [];
    if (scenarioConfig.requires_authrpc) {
      const forkchoiceResponse = await replayHeadFcu(clientSpec, config, scenarioConfig.headfcu_request);
      requests.push({
        method: scenarioConfig.headfcu_request.method,
        params: scenarioConfig.headfcu_request.params,
        response: forkchoiceResponse,
      });
    }
    const blockNumberResponse = await requestJsonRpc(
      clientSpec.http_host,
      clientSpec.http_port,
      "eth_blockNumber",
      [],
      config.request_timeout_ms,
    );
    const latestBlockResponse = await requestJsonRpc(
      clientSpec.http_host,
      clientSpec.http_port,
      "eth_getBlockByNumber",
      ["latest", false],
      config.request_timeout_ms,
    );
    requests.push({
      method: "eth_blockNumber",
      response: blockNumberResponse.body,
    });
    requests.push({
      method: "eth_getBlockByNumber",
      params: ["latest", false],
      response: latestBlockResponse.body,
    });

    const rawLogs = runDocker(
      config,
      ["logs", containerName],
      `${scenarioConfig.scenario_id} docker logs ${clientSpec.client}`,
    ).stdout;
    fs.writeFileSync(rawLogPath, `${rawLogs}\n`);

    return {
      scenario_id: scenarioConfig.scenario_id,
      bootstrap_mode: scenarioConfig.bootstrap_mode,
      bootstrap_digest: scenarioConfig.bootstrap_digest,
      client: clientSpec.client,
      run: runIndex + 1,
      container_name: containerName,
      docker_image: clientSpec.image,
      raw_log_file: rawLogPath,
      requests,
      observation: {
        payload_status: requests[0]?.response?.result?.payloadStatus?.status ?? null,
        latest_valid_hash: requests[0]?.response?.result?.payloadStatus?.latestValidHash ?? null,
        payload_id: requests[0]?.response?.result?.payloadId ?? null,
        head_number: blockNumberResponse.body.result,
        latest_block_number: latestBlockResponse.body.result.number,
        head_hash: latestBlockResponse.body.result.hash,
      },
    };
  } finally {
    if (created) {
      runDocker(config, ["rm", "-f", containerName], `docker rm ${containerName}`, true);
    }
  }
}

function buildArtifactRecord(filePath) {
  const stat = fs.statSync(filePath);
  return {
    path: filePath,
    bytes: stat.size,
  };
}

function groupRunsByClient(runs) {
  const grouped = {};
  for (const run of runs) {
    if (!grouped[run.client]) {
      grouped[run.client] = [];
    }
    grouped[run.client].push(run);
  }
  return grouped;
}

function sameJsonObservations(runs) {
  return [...new Set(runs.map((run) => JSON.stringify(run.observation)))];
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

  if (config.task_id !== "P2-T04") {
    throw new Error("config.task_id must be P2-T04");
  }
  if (testCase.task_id !== "P2-T04") {
    throw new Error("testCase.task_id must be P2-T04");
  }

  ensureArray(config.required_artifacts, "config.required_artifacts");
  ensureArray(config.clients, "config.clients");
  ensureArray(config.scenarios, "config.scenarios");
  ensureArray(testCase.expected_clients, "testCase.expected_clients");
  ensureArray(testCase.scenarios, "testCase.scenarios");

  const absoluteArtifacts = config.required_artifacts.map((relativePath) => {
    const absolutePath = path.join(rootDir, relativePath);
    ensureFile(absolutePath, "required artifact");
    return absolutePath;
  });

  config.fork_env = readJson(path.join(rootDir, config.fork_env_file));
  const outputDir = path.dirname(outputPath);
  fs.mkdirSync(outputDir, { recursive: true });

  for (const clientSpec of config.clients) {
    runDocker(config, ["image", "inspect", clientSpec.image], `docker image inspect ${clientSpec.image}`);
  }

  ensureEqual(
    JSON.stringify(config.clients.map((client) => client.client)),
    JSON.stringify(testCase.expected_clients),
    "planned clients",
  );
  ensureEqual(config.runs_per_client, testCase.repeated_runs_per_client, "runs_per_client");

  const scenarioOutputs = [];
  for (const scenarioConfig of config.scenarios) {
    const scenarioExpectation = testCase.scenarios.find(
      (candidate) => candidate.scenario_id === scenarioConfig.scenario_id,
    );
    if (!scenarioExpectation) {
      throw new Error(`missing test-case expectation for scenario ${scenarioConfig.scenario_id}`);
    }

    scenarioConfig.genesis_file = path.join(rootDir, scenarioConfig.genesis_file);
    scenarioConfig.chain_file = path.join(rootDir, scenarioConfig.chain_file);
    ensureFile(scenarioConfig.genesis_file, `${scenarioConfig.scenario_id} genesis file`);
    ensureFile(scenarioConfig.chain_file, `${scenarioConfig.scenario_id} chain file`);
    if (scenarioConfig.headfcu_file) {
      scenarioConfig.headfcu_file = path.join(rootDir, scenarioConfig.headfcu_file);
      ensureFile(scenarioConfig.headfcu_file, `${scenarioConfig.scenario_id} headfcu file`);
      scenarioConfig.headfcu_request = readJson(scenarioConfig.headfcu_file);
      ensureEqual(
        scenarioConfig.headfcu_request.method,
        scenarioExpectation.expected_fcu_method,
        `${scenarioConfig.scenario_id} headfcu method`,
      );
    }
    scenarioConfig.bootstrap_digest = buildBootstrapDigest(scenarioConfig);

    const allRuns = [];
    for (const clientSpec of config.clients) {
      for (let runIndex = 0; runIndex < config.runs_per_client; runIndex += 1) {
        const result = await runScenarioClient(config, scenarioConfig, clientSpec, runIndex, outputDir);
        allRuns.push(result);
      }
    }

    for (const run of allRuns) {
      ensureEqual(run.observation.head_number, scenarioExpectation.expected_observation.head_number, `${scenarioConfig.scenario_id} ${run.client} run ${run.run} eth_blockNumber`);
      ensureEqual(run.observation.latest_block_number, scenarioExpectation.expected_observation.head_number, `${scenarioConfig.scenario_id} ${run.client} run ${run.run} latest block number`);
      ensureEqual(run.observation.head_hash, scenarioExpectation.expected_observation.head_hash, `${scenarioConfig.scenario_id} ${run.client} run ${run.run} latest block hash`);
      ensureEqual(
        JSON.stringify(run.requests.map((request) => request.method)),
        JSON.stringify(scenarioExpectation.expected_request_methods),
        `${scenarioConfig.scenario_id} ${run.client} run ${run.run} request methods`,
      );
      if (scenarioExpectation.expected_payload_status !== undefined) {
        ensureEqual(run.observation.payload_status, scenarioExpectation.expected_payload_status, `${scenarioConfig.scenario_id} ${run.client} run ${run.run} payload status`);
        ensureEqual(run.observation.latest_valid_hash, scenarioExpectation.expected_observation.head_hash, `${scenarioConfig.scenario_id} ${run.client} run ${run.run} latestValidHash`);
        ensureEqual(run.observation.payload_id, null, `${scenarioConfig.scenario_id} ${run.client} run ${run.run} payloadId`);
      }
      ensureEqual(run.bootstrap_digest, scenarioConfig.bootstrap_digest, `${scenarioConfig.scenario_id} ${run.client} bootstrap_digest`);
    }

    const perClientRuns = groupRunsByClient(allRuns);
    for (const client of Object.keys(perClientRuns)) {
      ensureEqual(sameJsonObservations(perClientRuns[client]).length, 1, `${scenarioConfig.scenario_id} ${client} repeated-run consistency`);
    }
    ensureEqual(
      [...new Set(Object.values(perClientRuns).map((runs) => JSON.stringify(runs[0].observation)))].length,
      1,
      `${scenarioConfig.scenario_id} cross-client consistency`,
    );
    ensureEqual(
      [...new Set(allRuns.map((run) => run.bootstrap_digest))].length,
      1,
      `${scenarioConfig.scenario_id} bootstrap_digest consistency`,
    );

    scenarioOutputs.push({
      scenario_id: scenarioConfig.scenario_id,
      bootstrap_mode: scenarioConfig.bootstrap_mode,
      bootstrap_digest: scenarioConfig.bootstrap_digest,
      expected_observation: scenarioExpectation.expected_observation,
      expected_payload_status: scenarioExpectation.expected_payload_status ?? null,
      runs: allRuns,
      per_client: Object.keys(perClientRuns).map((client) => ({
        client,
        observation: perClientRuns[client][0].observation,
        bootstrap_digest: perClientRuns[client][0].bootstrap_digest,
      })),
    });
  }

  const log = {
    taskId: "P2-T04",
    generatedAt: new Date().toISOString(),
    status: "pass",
    executionMode: "real-runtime",
    inputs: {
      configFile: configPath,
      testCaseFile: testCasePath,
      docker_endpoint: config.docker_endpoint,
      runtime_source: config.runtime_source,
      prerequisite_runtime_proof: config.prerequisite_runtime_proof,
    },
    summary: {
      fork: config.fork,
      clients: config.clients.map((client) => client.client),
      runs_per_client: config.runs_per_client,
      scenario_ids: config.scenarios.map((scenario) => scenario.scenario_id),
      bootstrap_modes: config.scenarios.map((scenario) => scenario.bootstrap_mode),
    },
    validations: [
      {
        check: "required artifacts exist",
        status: "pass",
        details: absoluteArtifacts.map((filePath) => buildArtifactRecord(filePath)),
      },
      {
        check: "required Hive client images exist locally",
        status: "pass",
        details: config.clients.map((client) => ({
          client: client.client,
          image: client.image,
        })),
      },
      {
        check: "B1 and B2 bootstrap observations are stable within each client",
        status: "pass",
        details: scenarioOutputs.map((scenario) => ({
          scenario_id: scenario.scenario_id,
          per_client: scenario.per_client,
        })),
      },
      {
        check: "B1 and B2 bootstrap observations agree across all three clients",
        status: "pass",
        details: scenarioOutputs.map((scenario) => ({
          scenario_id: scenario.scenario_id,
          bootstrap_digest: scenario.bootstrap_digest,
          per_client: scenario.per_client,
        })),
      },
    ],
    scenarios: scenarioOutputs,
  };

  fs.writeFileSync(outputPath, JSON.stringify(log, null, 2) + "\n");
  console.log(
    `Phase-2 bootstrap validation passed for ${config.scenarios.length} scenarios across ${config.clients.length} clients.`,
  );
}

main().catch((error) => {
  console.error(`Phase-2 bootstrap validation failed: ${error.message}`);
  process.exit(1);
});
