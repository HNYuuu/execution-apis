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

function getByPath(root, dotPath) {
  const segments = dotPath.split(".");
  let current = root;
  for (const segment of segments) {
    if (current === undefined || current === null) {
      return undefined;
    }
    if (/^\d+$/.test(segment)) {
      current = current[Number(segment)];
    } else {
      current = current[segment];
    }
  }
  return current;
}

function resolveValue(value, context) {
  if (Array.isArray(value)) {
    return value.map((entry) => resolveValue(entry, context));
  }
  if (value && typeof value === "object") {
    if (Object.prototype.hasOwnProperty.call(value, "$fixture")) {
      return getByPath(context.fixtures, value.$fixture);
    }
    if (Object.prototype.hasOwnProperty.call(value, "$response")) {
      return getByPath(context.responses, value.$response);
    }
    const resolved = {};
    for (const [key, entry] of Object.entries(value)) {
      resolved[key] = resolveValue(entry, context);
    }
    return resolved;
  }
  return value;
}

function buildContainerName(client, suffix) {
  return `t07-runtime-${client}-${suffix}-${Date.now()}`;
}

async function bootstrapClient(config, clientSpec, fixtures) {
  const containerName = buildContainerName(clientSpec.client, "bootstrap");
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
      fixtures.headfcu.method,
      fixtures.headfcu.params,
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

async function executeScenario(clientSpec, config, scenario, runtimeContext) {
  const requests = [];
  for (const requestDef of scenario.request_sequence) {
    const resolvedParams = resolveValue(requestDef.params, runtimeContext);
    let response;
    if (requestDef.endpoint === "engine") {
      response = await requestEngine(clientSpec, config, requestDef.method, resolvedParams);
      response = response.body;
    } else if (requestDef.endpoint === "eth") {
      response = await requestJsonRpc(
        clientSpec.http_host,
        clientSpec.http_port,
        requestDef.method,
        resolvedParams,
        config.request_timeout_ms,
      );
      response = response.body;
    } else {
      throw new Error(`unsupported endpoint ${requestDef.endpoint}`);
    }

    runtimeContext.responses[requestDef.request_id] = response;
    requests.push({
      request_id: requestDef.request_id,
      endpoint: requestDef.endpoint,
      method: requestDef.method,
      params: resolvedParams,
      response,
    });
  }

  return {
    scenario_id: scenario.scenario_id,
    requests,
  };
}

function normalizeObservation(scenarioId, requests) {
  if (scenarioId === "fcu-no-build") {
    const response = requests[0].response.result;
    return {
      payload_status: response.payloadStatus.status,
      latest_valid_hash: response.payloadStatus.latestValidHash,
      payload_id: response.payloadId ?? null,
    };
  }
  if (scenarioId === "repeat-fcu-same-head") {
    return {
      first: {
        payload_status: requests[0].response.result.payloadStatus.status,
        latest_valid_hash: requests[0].response.result.payloadStatus.latestValidHash,
        payload_id: requests[0].response.result.payloadId ?? null,
      },
      second: {
        payload_status: requests[1].response.result.payloadStatus.status,
        latest_valid_hash: requests[1].response.result.payloadStatus.latestValidHash,
        payload_id: requests[1].response.result.payloadId ?? null,
      },
    };
  }
  return {};
}

async function runClient(config, clientSpec, scenarios, fixtures, rawLogPrefix) {
  const bootstrap = await bootstrapClient(config, clientSpec, fixtures);
  const rawLogPath = `${rawLogPrefix}.${clientSpec.client}.raw.log`;
  try {
    const runtimeContext = {
      fixtures,
      responses: {
        bootstrap_fcu: bootstrap.bootstrap_fcu,
      },
    };

    const scenarioResults = [];
    for (const scenario of scenarios) {
      const result = await executeScenario(clientSpec, config, scenario, runtimeContext);
      scenarioResults.push({
        scenario_id: result.scenario_id,
        requests: result.requests,
        normalized_observation: normalizeObservation(result.scenario_id, result.requests),
      });
    }

    const latestHeader = await requestJsonRpc(
      clientSpec.http_host,
      clientSpec.http_port,
      "eth_getBlockByNumber",
      ["latest", false],
      config.request_timeout_ms,
    );
    const rawLogs = runDocker(config, ["logs", bootstrap.container_name], `${clientSpec.client} docker logs`).stdout;
    fs.writeFileSync(rawLogPath, `${rawLogs}\n`);

    return {
      client: clientSpec.client,
      container_name: bootstrap.container_name,
      docker_image: clientSpec.image,
      raw_log_file: rawLogPath,
      bootstrap_fcu: bootstrap.bootstrap_fcu,
      latest_header: latestHeader.body.result,
      scenarios: scenarioResults,
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
  if (config.task_id !== "T07") {
    throw new Error("config.task_id must be T07");
  }
  if (testCase.task_id !== "T07") {
    throw new Error("testCase.task_id must be T07");
  }

  ensureArray(config.required_artifacts, "config.required_artifacts");
  ensureArray(config.clients, "config.clients");
  ensureArray(config.scenario_files, "config.scenario_files");
  ensureArray(testCase.expected_scenarios, "testCase.expected_scenarios");
  ensureArray(testCase.allowed_scope_ids, "testCase.allowed_scope_ids");

  const artifactRecords = [];
  for (const artifactPath of config.required_artifacts) {
    ensureFile(artifactPath, "required artifact");
    artifactRecords.push(buildArtifactRecord(artifactPath));
  }

  config.genesis_file = path.join(rootDir, config.genesis_file);
  config.chain_file = path.join(rootDir, config.chain_file);
  config.headfcu_file = path.join(rootDir, config.headfcu_file);
  config.fork_env = readJson(path.join(rootDir, config.fork_env_file));

  const fixtures = {
    headfcu: readJson(config.headfcu_file),
  };

  const scenarios = config.scenario_files.map((scenarioFile) =>
    readJson(path.join(rootDir, scenarioFile)),
  );
  ensureEqual(
    JSON.stringify(scenarios.map((scenario) => scenario.scenario_id)),
    JSON.stringify(testCase.expected_scenarios),
    "scenario list",
  );
  for (const scenario of scenarios) {
    ensureEqual(scenario.task_id, "T07", `scenario task id for ${scenario.scenario_id}`);
    if (!testCase.allowed_scope_ids.includes(scenario.scope_classification)) {
      throw new Error(
        `scenario ${scenario.scenario_id} has disallowed scope ${scenario.scope_classification}`,
      );
    }
    ensureArray(scenario.request_sequence, `request sequence for ${scenario.scenario_id}`);
  }

  for (const clientSpec of config.clients) {
    runDocker(config, ["image", "inspect", clientSpec.image], `docker image inspect ${clientSpec.image}`);
  }

  const rawLogPrefix = path.join(
    path.dirname(outputPath),
    path.basename(outputPath, ".json"),
  );
  const clientRuns = [];
  for (const clientSpec of config.clients) {
    clientRuns.push(await runClient(config, clientSpec, scenarios, fixtures, rawLogPrefix));
  }

  const fcuNoBuildByClient = clientRuns.map((clientRun) => ({
    client: clientRun.client,
    observation: clientRun.scenarios.find((scenario) => scenario.scenario_id === "fcu-no-build")
      .normalized_observation,
  }));
  const repeatSameHeadByClient = clientRuns.map((clientRun) => ({
    client: clientRun.client,
    observation: clientRun.scenarios.find((scenario) => scenario.scenario_id === "repeat-fcu-same-head")
      .normalized_observation,
  }));

  for (const item of fcuNoBuildByClient) {
    ensureEqual(item.observation.payload_status, "VALID", `${item.client} fcu-no-build payload status`);
    ensureEqual(item.observation.payload_id, null, `${item.client} fcu-no-build payload id`);
    ensureEqual(
      item.observation.latest_valid_hash,
      testCase.expected_head_hash,
      `${item.client} fcu-no-build latestValidHash`,
    );
  }
  for (const item of repeatSameHeadByClient) {
    ensureEqual(
      JSON.stringify(item.observation.first),
      JSON.stringify(item.observation.second),
      `${item.client} repeat-fcu-same-head equality`,
    );
    ensureEqual(item.observation.first.payload_status, "VALID", `${item.client} repeat-fcu payload status`);
    ensureEqual(item.observation.first.payload_id, null, `${item.client} repeat-fcu payload id`);
  }
  for (const clientRun of clientRuns) {
    ensureEqual(
      clientRun.latest_header.number,
      testCase.expected_head_number,
      `${clientRun.client} latest header number`,
    );
    ensureEqual(
      clientRun.latest_header.hash,
      testCase.expected_head_hash,
      `${clientRun.client} latest header hash`,
    );
  }

  const log = {
    taskId: "T07",
    generatedAt: new Date().toISOString(),
    status: "pass",
    executionMode: "real-runtime",
    inputs: {
      configFile: configPath,
      testCaseFile: testCasePath,
      docker_endpoint: config.docker_endpoint,
      scenario_files: config.scenario_files,
    },
    summary: {
      clients: config.clients.map((client) => client.client),
      scenarios: scenarios.map((scenario) => scenario.scenario_id),
      scope_classification: [...new Set(scenarios.map((scenario) => scenario.scope_classification))],
      bootstrap_mode: "rlp_import_plus_headfcu",
      expected_head_hash: testCase.expected_head_hash,
    },
    validations: [
      {
        check: "required artifacts exist",
        status: "pass",
        details: artifactRecords,
      },
      {
        check: "all loaded scenarios stay within the T06 custom-runtime scope",
        status: "pass",
        details: scenarios.map((scenario) => ({
          scenario_id: scenario.scenario_id,
          scope_classification: scenario.scope_classification,
        })),
      },
      {
        check: "fcu-no-build returns VALID with null payloadId on all clients",
        status: "pass",
        details: fcuNoBuildByClient,
      },
      {
        check: "repeat-fcu-same-head is stable within each client",
        status: "pass",
        details: repeatSameHeadByClient,
      },
      {
        check: "latest header remains anchored to the expected imported head",
        status: "pass",
        details: clientRuns.map((clientRun) => ({
          client: clientRun.client,
          latest_header: {
            number: clientRun.latest_header.number,
            hash: clientRun.latest_header.hash,
          },
        })),
      },
      {
        check: "driver uses thin Docker-backed bootstrap and does not include stock-only newPayload scenarios",
        status: "pass",
        details: {
          excluded_stock_only: testCase.excluded_stock_only,
          included_scenarios: scenarios.map((scenario) => scenario.scenario_id),
        },
      },
    ],
    clientRuns,
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(log, null, 2) + "\n");
  console.log(
    `Runtime scenario driver passed for ${config.clients.length} clients across ${scenarios.length} scenarios.`,
  );
}

main().catch((error) => {
  console.error(`Runtime scenario driver failed: ${error.message}`);
  process.exit(1);
});
