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

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function buildArtifactRecord(filePath) {
  const stat = fs.statSync(filePath);
  return {
    path: filePath,
    bytes: stat.size,
  };
}

function findClientRunByClient(log, client) {
  const run = (log.clientRuns || []).find((entry) => entry.client === client);
  if (!run) {
    throw new Error(`missing client run for ${client}`);
  }
  return run;
}

function findClientRunByClientAndRun(log, client, runNumber) {
  const run = (log.clientRuns || []).find(
    (entry) => entry.client === client && entry.run === runNumber,
  );
  if (!run) {
    throw new Error(`missing client run for ${client} run ${runNumber}`);
  }
  return run;
}

function findRequestByMethod(requests, method) {
  const request = (requests || []).find((entry) => entry.method === method);
  if (!request) {
    throw new Error(`missing request for method ${method}`);
  }
  return request;
}

function findScenario(run, scenarioId) {
  const scenario = (run.scenarios || []).find((entry) => entry.scenario_id === scenarioId);
  if (!scenario) {
    throw new Error(`missing scenario ${scenarioId}`);
  }
  return scenario;
}

function summarizePair(sampleId, sourceTask, scenarioId, method, category, gethValue, rethValue, semanticFields) {
  const rawEqual = JSON.stringify(gethValue) === JSON.stringify(rethValue);
  const normalizedEqual = stableStringify(gethValue) === stableStringify(rethValue);
  let differenceType = "exact_match";
  if (!rawEqual && normalizedEqual) {
    differenceType = "object_field_order_only";
  } else if (!normalizedEqual) {
    differenceType = "semantic_difference";
  }
  return {
    sample_id: sampleId,
    source_task: sourceTask,
    scenario_id: scenarioId,
    method,
    category,
    clients: ["geth", "reth"],
    raw_equal: rawEqual,
    normalized_equal: normalizedEqual,
    observed_difference_type: differenceType,
    semantic_fields: semanticFields,
    geth: gethValue,
    reth: rethValue,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const configPath = args.config;
  const testCasePath = args["test-case"];
  const outputPath = args.output;
  const corpusPath = args.corpus;

  if (!configPath || !testCasePath || !outputPath || !corpusPath) {
    throw new Error(
      "usage: --config <file> --test-case <file> --output <file> --corpus <file>",
    );
  }

  const rootDir = process.cwd();
  const config = readJson(configPath);
  const testCase = readJson(testCasePath);
  ensureEqual(config.task_id, "T08", "config.task_id");
  ensureEqual(testCase.task_id, "T08", "testCase.task_id");

  ensureArray(config.required_artifacts, "config.required_artifacts");
  ensureArray(config.source_logs, "config.source_logs");
  ensureArray(testCase.required_source_tasks, "testCase.required_source_tasks");
  ensureArray(testCase.required_categories, "testCase.required_categories");
  ensureArray(testCase.required_deferred_inputs, "testCase.required_deferred_inputs");

  const artifactRecords = [];
  for (const artifactPath of config.required_artifacts) {
    ensureFile(path.join(rootDir, artifactPath), "required artifact");
    artifactRecords.push(buildArtifactRecord(artifactPath));
  }

  const sourceLogs = {};
  for (const logDef of config.source_logs) {
    sourceLogs[logDef.task_id] = readJson(path.join(rootDir, logDef.path));
  }

  const t03 = sourceLogs.T03;
  const t04 = sourceLogs.T04;
  const t07 = sourceLogs.T07;

  const corpusSamples = [];

  const t03Geth = findClientRunByClientAndRun(t03, "geth", 1);
  const t03Reth = findClientRunByClientAndRun(t03, "reth", 1);
  corpusSamples.push(
    summarizePair(
      "t03-block-number",
      "T03",
      "rlp-bootstrap-smoke",
      "eth_blockNumber",
      "bootstrap",
      findRequestByMethod(t03Geth.requests, "eth_blockNumber").response,
      findRequestByMethod(t03Reth.requests, "eth_blockNumber").response,
      ["result"],
    ),
  );
  corpusSamples.push(
    summarizePair(
      "t03-latest-header",
      "T03",
      "rlp-bootstrap-smoke",
      "eth_getBlockByNumber",
      "bootstrap",
      findRequestByMethod(t03Geth.requests, "eth_getBlockByNumber").response.result,
      findRequestByMethod(t03Reth.requests, "eth_getBlockByNumber").response.result,
      ["hash", "number", "parentHash", "transactions", "withdrawals"],
    ),
  );

  const t04Geth = findClientRunByClientAndRun(t04, "geth", 1);
  const t04Reth = findClientRunByClientAndRun(t04, "reth", 1);
  corpusSamples.push(
    summarizePair(
      "t04-headfcu-response",
      "T04",
      "headfcu-bootstrap-smoke",
      "engine_forkchoiceUpdatedV3",
      "bootstrap",
      findRequestByMethod(t04Geth.requests, "engine_forkchoiceUpdatedV3").response,
      findRequestByMethod(t04Reth.requests, "engine_forkchoiceUpdatedV3").response,
      ["result.payloadStatus.status", "result.payloadStatus.latestValidHash", "result.payloadId"],
    ),
  );
  corpusSamples.push(
    summarizePair(
      "t04-latest-header",
      "T04",
      "headfcu-bootstrap-smoke",
      "eth_getBlockByNumber",
      "bootstrap",
      findRequestByMethod(t04Geth.requests, "eth_getBlockByNumber").response.result,
      findRequestByMethod(t04Reth.requests, "eth_getBlockByNumber").response.result,
      ["hash", "number", "parentHash", "transactions", "withdrawals"],
    ),
  );

  const t07Geth = findClientRunByClient(t07, "geth");
  const t07Reth = findClientRunByClient(t07, "reth");
  corpusSamples.push(
    summarizePair(
      "t07-fcu-no-build",
      "T07",
      "fcu-no-build",
      "engine_forkchoiceUpdatedV3",
      "runtime",
      findScenario(t07Geth, "fcu-no-build").requests[0].response,
      findScenario(t07Reth, "fcu-no-build").requests[0].response,
      ["result.payloadStatus.status", "result.payloadStatus.latestValidHash", "result.payloadId"],
    ),
  );
  corpusSamples.push(
    summarizePair(
      "t07-repeat-fcu-same-head-first",
      "T07",
      "repeat-fcu-same-head",
      "engine_forkchoiceUpdatedV3",
      "runtime",
      findScenario(t07Geth, "repeat-fcu-same-head").requests[0].response,
      findScenario(t07Reth, "repeat-fcu-same-head").requests[0].response,
      ["result.payloadStatus.status", "result.payloadStatus.latestValidHash", "result.payloadId"],
    ),
  );
  corpusSamples.push(
    summarizePair(
      "t07-repeat-fcu-same-head-second",
      "T07",
      "repeat-fcu-same-head",
      "engine_forkchoiceUpdatedV3",
      "runtime",
      findScenario(t07Geth, "repeat-fcu-same-head").requests[1].response,
      findScenario(t07Reth, "repeat-fcu-same-head").requests[1].response,
      ["result.payloadStatus.status", "result.payloadStatus.latestValidHash", "result.payloadId"],
    ),
  );

  const legalRepresentationDifferences = [
    {
      difference_id: "object-field-order",
      status: "observed",
      evidence_samples: ["t03-latest-header", "t04-latest-header"],
      description:
        "The latest-header objects are semantically equal across clients after stable-key normalization, but raw JSON field order differs.",
    },
    {
      difference_id: "wrapper-metadata-variance",
      status: "observed",
      evidence_samples: ["t03-block-number", "t04-headfcu-response", "t07-fcu-no-build"],
      description:
        "Container names, raw log file paths, and other execution metadata differ per run and are not comparison targets for response normalization.",
    },
  ];

  const semanticFieldInventory = [
    {
      family: "forkchoice_response",
      fields: ["result.payloadStatus.status", "result.payloadStatus.latestValidHash", "result.payloadId"],
    },
    {
      family: "head_observation",
      fields: ["number", "hash", "parentHash", "transactions", "withdrawals"],
    },
    {
      family: "block_number_response",
      fields: ["result"],
    },
  ];

  const deferredInputs = [
    {
      input_id: "fcu-build-getpayload-newpayload",
      owner_task: "T12",
      reason: "payloadId-dependent build lifecycle responses are not collected before the dedicated runtime scenario task",
    },
    {
      input_id: "unknown-payloadid",
      owner_task: "T13",
      reason: "error-shape corpus is deferred until the dedicated unknown payloadId scenario exists",
    },
  ];

  const sourceTaskSet = [...new Set(corpusSamples.map((sample) => sample.source_task))];
  const categorySet = [...new Set(corpusSamples.map((sample) => sample.category))];
  const orderOnlySamples = corpusSamples
    .filter((sample) => sample.observed_difference_type === "object_field_order_only")
    .map((sample) => sample.sample_id);

  for (const taskId of testCase.required_source_tasks) {
    if (!sourceTaskSet.includes(taskId)) {
      throw new Error(`missing required source task ${taskId}`);
    }
  }
  for (const category of testCase.required_categories) {
    if (!categorySet.includes(category)) {
      throw new Error(`missing required category ${category}`);
    }
  }
  for (const inputId of testCase.required_deferred_inputs) {
    if (!deferredInputs.find((item) => item.input_id === inputId)) {
      throw new Error(`missing required deferred input ${inputId}`);
    }
  }
  if (corpusSamples.length < testCase.minimum_sample_count) {
    throw new Error(
      `sample count too small: expected at least ${testCase.minimum_sample_count}, got ${corpusSamples.length}`,
    );
  }
  if (orderOnlySamples.length < testCase.minimum_order_only_examples) {
    throw new Error(
      `insufficient order-only examples: expected at least ${testCase.minimum_order_only_examples}, got ${orderOnlySamples.length}`,
    );
  }

  const corpus = {
    taskId: "T08",
    generatedAt: new Date().toISOString(),
    corpusVersion: "v0",
    summary: {
      source_tasks: sourceTaskSet,
      categories: categorySet,
      sample_count: corpusSamples.length,
      order_only_samples: orderOnlySamples,
    },
    samples: corpusSamples,
    legal_representation_differences: legalRepresentationDifferences,
    semantic_field_inventory: semanticFieldInventory,
    deferred_inputs: deferredInputs,
  };

  const log = {
    taskId: "T08",
    generatedAt: corpus.generatedAt,
    status: "pass",
    executionMode: "offline-from-real-runtime-logs",
    inputs: {
      configFile: configPath,
      testCaseFile: testCasePath,
      source_logs: config.source_logs,
    },
    summary: corpus.summary,
    validations: [
      {
        check: "required artifacts exist",
        status: "pass",
        details: artifactRecords,
      },
      {
        check: "corpus contains bootstrap and runtime samples from T03, T04, and T07",
        status: "pass",
        details: {
          source_tasks: sourceTaskSet,
          categories: categorySet,
          sample_ids: corpusSamples.map((sample) => sample.sample_id),
        },
      },
      {
        check: "corpus includes legal representation-difference examples suitable for normalization",
        status: "pass",
        details: {
          order_only_samples: orderOnlySamples,
          legal_representation_differences: legalRepresentationDifferences,
        },
      },
      {
        check: "payloadId-dependent and error-shape gaps are explicitly deferred instead of being silently omitted",
        status: "pass",
        details: deferredInputs,
      },
    ],
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(corpusPath, JSON.stringify(corpus, null, 2) + "\n");
  fs.writeFileSync(outputPath, JSON.stringify(log, null, 2) + "\n");
  console.log(`Response corpus built with ${corpusSamples.length} samples from ${sourceTaskSet.length} tasks.`);
}

main();
