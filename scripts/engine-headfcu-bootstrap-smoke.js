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

function buildContainerName(client, runIndex) {
  return `t04-headfcu-${client}-run${runIndex + 1}-${Date.now()}`;
}

function buildRawLogPath(outputDir, outputBaseName, client, runIndex) {
  return path.join(outputDir, `${outputBaseName}.${client}.run${runIndex + 1}.raw.log`);
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

async function runClientObservation(config, clientSpec, runIndex, headFcuRequest) {
  const containerName = buildContainerName(clientSpec.client, runIndex);
  const rawLogPath = buildRawLogPath(
    path.dirname(config.output_file),
    path.basename(config.output_file, ".json"),
    clientSpec.client,
    runIndex,
  );

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

    const forkchoiceResponse = await replayHeadFcu(clientSpec, config, headFcuRequest);
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

    const rawLogs = runDocker(config, ["logs", containerName], `${clientSpec.client} docker logs`).stdout;
    fs.writeFileSync(rawLogPath, `${rawLogs}\n`);

    return {
      client: clientSpec.client,
      run: runIndex + 1,
      container_name: containerName,
      docker_image: clientSpec.image,
      http_host: clientSpec.http_host,
      http_port: clientSpec.http_port,
      auth_host: clientSpec.auth_host,
      auth_port: clientSpec.auth_port,
      raw_log_file: rawLogPath,
      requests: [
        {
          method: headFcuRequest.method,
          params: headFcuRequest.params,
          response: forkchoiceResponse,
        },
        {
          method: "eth_blockNumber",
          response: blockNumberResponse.body,
        },
        {
          method: "eth_getBlockByNumber",
          params: ["latest", false],
          response: latestBlockResponse.body,
        },
      ],
      observation: {
        payload_status: forkchoiceResponse.result.payloadStatus.status,
        latest_valid_hash: forkchoiceResponse.result.payloadStatus.latestValidHash,
        payload_id: forkchoiceResponse.result.payloadId ?? null,
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

  if (config.task_id !== "T04") {
    throw new Error("config.task_id must be T04");
  }
  if (testCase.task_id !== "T04") {
    throw new Error("testCase.task_id must be T04");
  }

  ensureArray(config.required_artifacts, "config.required_artifacts");
  ensureArray(config.clients, "config.clients");
  ensureArray(testCase.expected_clients, "testCase.expected_clients");

  const absoluteArtifacts = config.required_artifacts.map((relativePath) => {
    const absolutePath = path.join(rootDir, relativePath);
    ensureFile(absolutePath, "required artifact");
    return absolutePath;
  });

  config.output_file = outputPath;
  config.genesis_file = path.join(rootDir, config.genesis_file);
  config.chain_file = path.join(rootDir, config.chain_file);
  config.fork_env = readJson(path.join(rootDir, config.fork_env_file));
  const headFcuRequest = readJson(path.join(rootDir, config.headfcu_file));

  ensureFile(config.genesis_file, "genesis file");
  ensureFile(config.chain_file, "chain file");
  ensureFile(path.join(rootDir, config.headfcu_file), "headfcu file");

  ensureEqual(
    JSON.stringify(config.clients.map((client) => client.client)),
    JSON.stringify(testCase.expected_clients),
    "planned clients",
  );
  ensureEqual(config.runs_per_client, testCase.repeated_runs_per_client, "runs_per_client");
  ensureEqual(headFcuRequest.method, testCase.expected_fcu_method, "headfcu method");

  for (const clientSpec of config.clients) {
    runDocker(config, ["image", "inspect", clientSpec.image], `docker image inspect ${clientSpec.image}`);
  }

  const allRuns = [];
  for (const clientSpec of config.clients) {
    for (let runIndex = 0; runIndex < config.runs_per_client; runIndex += 1) {
      const result = await runClientObservation(config, clientSpec, runIndex, headFcuRequest);
      allRuns.push(result);
    }
  }

  for (const run of allRuns) {
    ensureEqual(run.observation.payload_status, testCase.expected_payload_status, `${run.client} run ${run.run} payload status`);
    ensureEqual(run.observation.latest_valid_hash, testCase.expected_observation.head_hash, `${run.client} run ${run.run} latestValidHash`);
    ensureEqual(run.observation.payload_id, null, `${run.client} run ${run.run} payloadId`);
    ensureEqual(run.observation.head_number, testCase.expected_observation.head_number, `${run.client} run ${run.run} eth_blockNumber`);
    ensureEqual(
      run.observation.latest_block_number,
      testCase.expected_observation.head_number,
      `${run.client} run ${run.run} latest block number`,
    );
    ensureEqual(run.observation.head_hash, testCase.expected_observation.head_hash, `${run.client} run ${run.run} latest block hash`);
  }

  const perClientRuns = {};
  for (const run of allRuns) {
    if (!perClientRuns[run.client]) {
      perClientRuns[run.client] = [];
    }
    perClientRuns[run.client].push(run);
  }

  for (const client of Object.keys(perClientRuns)) {
    const observations = perClientRuns[client].map((run) => JSON.stringify(run.observation));
    ensureEqual([...new Set(observations)].length, 1, `${client} repeated-run consistency`);
  }
  const crossClientObservations = Object.values(perClientRuns).map((runs) => JSON.stringify(runs[0].observation));
  ensureEqual([...new Set(crossClientObservations)].length, 1, "cross-client B2 consistency");

  const log = {
    taskId: "T04",
    generatedAt: new Date().toISOString(),
    status: "pass",
    executionMode: "real-runtime",
    inputs: {
      configFile: configPath,
      testCaseFile: testCasePath,
      docker_endpoint: config.docker_endpoint,
      runtime_source: config.runtime_source,
      headfcu_file: path.join(rootDir, config.headfcu_file),
    },
    summary: {
      scenario_id: config.scenario_id,
      fork: config.fork,
      bootstrap_mode: config.bootstrap_mode,
      clients: config.clients.map((client) => client.client),
      runs_per_client: config.runs_per_client,
      expected_payload_status: testCase.expected_payload_status,
      expected_head_number: testCase.expected_observation.head_number,
      expected_head_hash: testCase.expected_observation.head_hash,
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
        check: "headfcu replay returned a successful payloadStatus branch",
        status: "pass",
        details: allRuns.map((run) => ({
          client: run.client,
          run: run.run,
          payload_status: run.observation.payload_status,
          latest_valid_hash: run.observation.latest_valid_hash,
          payload_id: run.observation.payload_id,
        })),
      },
      {
        check: "latest block remained aligned with headfcu head hash",
        status: "pass",
        details: allRuns.map((run) => ({
          client: run.client,
          run: run.run,
          head_number: run.observation.head_number,
          head_hash: run.observation.head_hash,
        })),
      },
      {
        check: "repeated runs are stable within each client",
        status: "pass",
        details: Object.keys(perClientRuns).map((client) => ({
          client,
          runs: perClientRuns[client].map((run) => run.observation),
        })),
      },
      {
        check: "cross-client forkchoice-known observations agree",
        status: "pass",
        details: Object.keys(perClientRuns).map((client) => ({
          client,
          observation: perClientRuns[client][0].observation,
        })),
      },
    ],
    referenceObservation: {
      payload_status: testCase.expected_payload_status,
      head_number: testCase.expected_observation.head_number,
      head_hash: testCase.expected_observation.head_hash,
    },
    clientRuns: allRuns,
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(log, null, 2) + "\n");
  console.log(
    `headfcu bootstrap smoke passed for ${config.clients.length} clients across ${config.runs_per_client} runs each.`,
  );
}

main().catch((error) => {
  console.error(`headfcu bootstrap smoke failed: ${error.message}`);
  process.exit(1);
});
