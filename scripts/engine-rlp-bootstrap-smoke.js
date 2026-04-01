#!/usr/bin/env node

const fs = require("fs");
const http = require("http");
const path = require("path");
const { spawnSync } = require("child_process");

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

function runDocker(config, args, label) {
  const result = spawnSync("docker", args, {
    encoding: "utf8",
    env: dockerEnv(config),
    maxBuffer: 1024 * 1024 * 16,
  });
  if (result.status !== 0) {
    throw new Error(
      `${label} failed: ${(result.stderr || result.stdout || "").trim() || "unknown docker error"}`,
    );
  }
  return {
    stdout: (result.stdout || "").trim(),
    stderr: (result.stderr || "").trim(),
  };
}

function requestJsonRpc(host, port, method, params, timeoutMs) {
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
            resolve(JSON.parse(body));
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

async function waitForRpcReady(clientSpec, config) {
  const deadline = Date.now() + config.startup_timeout_ms;
  let lastError = "RPC did not become ready";
  while (Date.now() < deadline) {
    try {
      const response = await requestJsonRpc(
        clientSpec.rpc_host,
        clientSpec.rpc_port,
        "eth_blockNumber",
        [],
        config.request_timeout_ms,
      );
      if (response && typeof response.result === "string") {
        return response;
      }
      lastError = `unexpected readiness response: ${JSON.stringify(response)}`;
    } catch (error) {
      lastError = error.message;
    }
    await sleep(config.rpc_poll_interval_ms);
  }
  throw new Error(`RPC readiness timeout for ${clientSpec.client}: ${lastError}`);
}

function buildContainerName(client, runIndex) {
  return `t03-rlp-${client}-run${runIndex + 1}-${Date.now()}`;
}

function buildRawLogPath(outputDir, outputBaseName, client, runIndex) {
  return path.join(outputDir, `${outputBaseName}.${client}.run${runIndex + 1}.raw.log`);
}

async function runClientObservation(config, clientSpec, runIndex) {
  const containerName = buildContainerName(clientSpec.client, runIndex);
  const rawLogPath = buildRawLogPath(
    path.dirname(config.output_file),
    path.basename(config.output_file, ".json"),
    clientSpec.client,
    runIndex,
  );

  let created = false;
  try {
    const createArgs = ["create", "--name", containerName, "-p", `${clientSpec.rpc_port}:8545`];
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

    await waitForRpcReady(clientSpec, config);

    const blockNumberResponse = await requestJsonRpc(
      clientSpec.rpc_host,
      clientSpec.rpc_port,
      "eth_blockNumber",
      [],
      config.request_timeout_ms,
    );
    const latestBlockResponse = await requestJsonRpc(
      clientSpec.rpc_host,
      clientSpec.rpc_port,
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
      rpc_host: clientSpec.rpc_host,
      rpc_port: clientSpec.rpc_port,
      raw_log_file: rawLogPath,
      requests: [
        {
          method: "eth_blockNumber",
          response: blockNumberResponse,
        },
        {
          method: "eth_getBlockByNumber",
          params: ["latest", false],
          response: latestBlockResponse,
        },
      ],
      observation: {
        head_number: blockNumberResponse.result,
        latest_block_number: latestBlockResponse.result.number,
        head_hash: latestBlockResponse.result.hash,
      },
    };
  } finally {
    if (created) {
      spawnSync("docker", ["rm", "-f", containerName], {
        encoding: "utf8",
        env: dockerEnv(config),
        maxBuffer: 1024 * 1024 * 4,
      });
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

  if (config.task_id !== "T03") {
    throw new Error("config.task_id must be T03");
  }
  if (testCase.task_id !== "T03") {
    throw new Error("testCase.task_id must be T03");
  }

  ensureArray(config.required_artifacts, "config.required_artifacts");
  ensureArray(config.clients, "config.clients");
  ensureArray(testCase.expected_clients, "testCase.expected_clients");
  ensureArray(testCase.expected_request_methods, "testCase.expected_request_methods");

  const absoluteArtifacts = config.required_artifacts.map((relativePath) => {
    const absolutePath = path.join(rootDir, relativePath);
    ensureFile(absolutePath, "required artifact");
    return absolutePath;
  });

  config.output_file = outputPath;
  config.genesis_file = path.join(rootDir, config.genesis_file);
  config.chain_file = path.join(rootDir, config.chain_file);
  config.fork_env = readJson(path.join(rootDir, config.fork_env_file));
  ensureFile(config.genesis_file, "genesis file");
  ensureFile(config.chain_file, "chain file");

  for (const clientSpec of config.clients) {
    runDocker(config, ["image", "inspect", clientSpec.image], `docker image inspect ${clientSpec.image}`);
  }

  ensureEqual(
    JSON.stringify(config.clients.map((client) => client.client)),
    JSON.stringify(testCase.expected_clients),
    "planned clients",
  );
  ensureEqual(config.runs_per_client, testCase.repeated_runs_per_client, "runs_per_client");

  const allRuns = [];
  for (const clientSpec of config.clients) {
    for (let runIndex = 0; runIndex < config.runs_per_client; runIndex += 1) {
      const result = await runClientObservation(config, clientSpec, runIndex);
      allRuns.push(result);
    }
  }

  for (const run of allRuns) {
    ensureEqual(run.observation.head_number, testCase.expected_observation.head_number, `${run.client} run ${run.run} eth_blockNumber`);
    ensureEqual(
      run.observation.latest_block_number,
      testCase.expected_observation.head_number,
      `${run.client} run ${run.run} latest block number`,
    );
    ensureEqual(run.observation.head_hash, testCase.expected_observation.head_hash, `${run.client} run ${run.run} latest block hash`);
    ensureEqual(
      JSON.stringify(run.requests.map((request) => request.method)),
      JSON.stringify(testCase.expected_request_methods),
      `${run.client} run ${run.run} request methods`,
    );
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
    const uniqueObservations = [...new Set(observations)];
    ensureEqual(uniqueObservations.length, 1, `${client} repeated-run consistency`);
  }

  const crossClientObservations = Object.values(perClientRuns).map((runs) => JSON.stringify(runs[0].observation));
  ensureEqual([...new Set(crossClientObservations)].length, 1, "cross-client head consistency");

  const log = {
    taskId: "T03",
    generatedAt: new Date().toISOString(),
    status: "pass",
    executionMode: "real-runtime",
    inputs: {
      configFile: configPath,
      testCaseFile: testCasePath,
      docker_endpoint: config.docker_endpoint,
      runtime_source: config.runtime_source,
    },
    summary: {
      scenario_id: config.scenario_id,
      fork: config.fork,
      bootstrap_mode: config.bootstrap_mode,
      clients: config.clients.map((client) => client.client),
      runs_per_client: config.runs_per_client,
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
        check: "all runtime runs observed the expected imported head",
        status: "pass",
        details: allRuns.map((run) => ({
          client: run.client,
          run: run.run,
          observation: run.observation,
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
        check: "cross-client observations agree after rlp import",
        status: "pass",
        details: Object.keys(perClientRuns).map((client) => ({
          client,
          observation: perClientRuns[client][0].observation,
        })),
      },
    ],
    referenceObservation: {
      head_number: testCase.expected_observation.head_number,
      head_hash: testCase.expected_observation.head_hash,
    },
    clientRuns: allRuns,
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(log, null, 2) + "\n");
  console.log(
    `RLP bootstrap smoke passed for ${config.clients.length} clients across ${config.runs_per_client} runs each.`,
  );
}

main().catch((error) => {
  console.error(`RLP bootstrap smoke failed: ${error.message}`);
  process.exit(1);
});
