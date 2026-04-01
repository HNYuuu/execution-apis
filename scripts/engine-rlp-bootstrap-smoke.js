#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

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

function readFixtureResponse(filePath) {
  const lines = fs
    .readFileSync(filePath, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const responseLine = lines.find((line) => line.startsWith("<< "));
  if (!responseLine) {
    throw new Error(`missing fixture response line in ${filePath}`);
  }
  return JSON.parse(responseLine.slice(3));
}

function ensureFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`required file is missing: ${filePath}`);
  }
}

function ensureEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label} mismatch: expected ${expected}, got ${actual}`);
  }
}

function ensureArray(value, label) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${label} must be a non-empty array`);
  }
}

function ensureObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be a non-empty object`);
  }
  if (Object.keys(value).length === 0) {
    throw new Error(`${label} must not be empty`);
  }
}

function fileDigest(filePath) {
  const stat = fs.statSync(filePath);
  return {
    path: filePath,
    bytes: stat.size,
  };
}

function main() {
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
  const bootstrapDefinitions = readJson(
    path.join(
      rootDir,
      "context/plans/t02-bootstrap-contract/paris-mvp-bootstrap-definitions.json",
    ),
  );

  if (config.task_id !== "T03") {
    throw new Error("config.task_id must be T03");
  }
  if (testCase.task_id !== "T03") {
    throw new Error("test_case.task_id must be T03");
  }

  const rlpBootstrap = bootstrapDefinitions.bootstrap_definitions.find(
    (definition) => definition.bootstrap_mode === "rlp_import",
  );
  if (!rlpBootstrap) {
    throw new Error("T02 bootstrap definitions do not contain rlp_import");
  }

  ensureArray(config.required_artifacts, "config.required_artifacts");
  ensureObject(config.reference_fixtures, "config.reference_fixtures");
  ensureArray(config.request_sequence, "config.request_sequence");
  ensureArray(config.clients, "config.clients");
  ensureArray(testCase.expected_clients, "testCase.expected_clients");
  ensureArray(testCase.expected_request_methods, "testCase.expected_request_methods");
  ensureEqual(
    JSON.stringify(config.clients),
    JSON.stringify(testCase.expected_clients),
    "planned clients",
  );

  const artifactRecords = [];
  for (const relativePath of config.required_artifacts) {
    const absolutePath = path.join(rootDir, relativePath);
    ensureFile(absolutePath);
    artifactRecords.push(fileDigest(relativePath));
  }

  const blockNumberFixture = readFixtureResponse(
    path.join(rootDir, config.reference_fixtures.eth_blockNumber),
  );
  const latestBlockFixture = readFixtureResponse(
    path.join(rootDir, config.reference_fixtures.eth_getBlockByNumber_latest),
  );
  const headfcu = readJson(path.join(rootDir, config.reference_fixtures.headfcu));

  const observedBlockNumber = blockNumberFixture.result;
  const latestBlock = latestBlockFixture.result;
  const observedHeadHash = latestBlock.hash;
  const observedLatestBlockNumber = latestBlock.number;
  const observedRequestMethods = config.request_sequence.map((request) => request.method);

  ensureEqual(config.bootstrap_mode, "rlp_import", "bootstrap mode");
  ensureEqual(
    rlpBootstrap.state_families.join(","),
    "B1",
    "rlp_import state family mapping",
  );
  ensureEqual(
    observedBlockNumber,
    testCase.expected_observation.head_number,
    "eth_blockNumber result",
  );
  ensureEqual(
    observedLatestBlockNumber,
    testCase.expected_observation.head_number,
    "eth_getBlockByNumber(latest) result.number",
  );
  ensureEqual(
    observedHeadHash,
    testCase.expected_observation.head_hash,
    "eth_getBlockByNumber(latest) result.hash",
  );
  ensureEqual(
    headfcu.params[0].headBlockHash,
    testCase.expected_observation.head_hash,
    "headfcu headBlockHash",
  );
  ensureEqual(
    headfcu.params[0].safeBlockHash,
    testCase.expected_observation.head_hash,
    "headfcu safeBlockHash",
  );
  ensureEqual(
    headfcu.params[0].finalizedBlockHash,
    testCase.expected_observation.head_hash,
    "headfcu finalizedBlockHash",
  );
  ensureEqual(
    JSON.stringify(observedRequestMethods),
    JSON.stringify(testCase.expected_request_methods),
    "request sequence methods",
  );

  const log = {
    taskId: "T03",
    generatedAt: new Date().toISOString(),
    status: "pass",
    executionMode: "offline-baseline",
    inputs: {
      configFile: configPath,
      testCaseFile: testCasePath,
      bootstrapDefinitionFile:
        "context/plans/t02-bootstrap-contract/paris-mvp-bootstrap-definitions.json",
    },
    summary: {
      scenario_id: config.scenario_id,
      fork: config.fork,
      bootstrap_mode: config.bootstrap_mode,
      expected_head_number: testCase.expected_observation.head_number,
      expected_head_hash: testCase.expected_observation.head_hash,
      planned_client_count: config.clients.length,
    },
    validations: [
      {
        check: "required artifacts exist",
        status: "pass",
        details: artifactRecords,
      },
      {
        check: "reference fixtures agree on the latest imported head",
        status: "pass",
        details: {
          eth_blockNumber: observedBlockNumber,
          latest_block_number: observedLatestBlockNumber,
          latest_block_hash: observedHeadHash,
        },
      },
      {
        check: "headfcu head hashes are aligned with the imported latest head",
        status: "pass",
        details: headfcu.params[0],
      },
      {
        check: "request sequence matches the smoke scenario contract",
        status: "pass",
        details: observedRequestMethods,
      },
    ],
    referenceObservation: {
      head_number: observedLatestBlockNumber,
      head_hash: observedHeadHash,
    },
    clientPlans: config.clients.map((client) => ({
      client,
      status: "planned",
      bootstrap_mode: config.bootstrap_mode,
      request_sequence: config.request_sequence,
      execution_blocker: "Awaiting Hive/client runtime wiring from T05 and T07.",
    })),
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(log, null, 2) + "\n");
  console.log(
    `RLP bootstrap smoke baseline prepared for ${config.clients.length} clients. Expected head ${testCase.expected_observation.head_number} / ${testCase.expected_observation.head_hash}.`,
  );
}

try {
  main();
} catch (error) {
  console.error(`RLP bootstrap smoke baseline failed: ${error.message}`);
  process.exit(1);
}
