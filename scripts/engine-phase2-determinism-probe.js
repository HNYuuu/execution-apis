#!/usr/bin/env node

const fs = require("fs");
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

function stableStringify(value) {
  return JSON.stringify(stableNormalize(value));
}

function buildArtifactRecord(filePath) {
  const stat = fs.statSync(filePath);
  return {
    path: filePath,
    bytes: stat.size,
  };
}

function runNodeScript(args, label, rootDir) {
  const result = spawnSync("node", args, {
    cwd: rootDir,
    encoding: "utf8",
    env: process.env,
    maxBuffer: 1024 * 1024 * 64,
  });
  if (result.status !== 0) {
    throw new Error(
      `${label} failed: ${(result.stderr || result.stdout || "").trim() || "unknown error"}`,
    );
  }
  return {
    stdout: (result.stdout || "").trim(),
    stderr: (result.stderr || "").trim(),
  };
}

function fieldShape(objectValue, key) {
  if (!Object.prototype.hasOwnProperty.call(objectValue, key)) {
    return "omitted";
  }
  const value = objectValue[key];
  if (value === null) {
    return "null";
  }
  if (Array.isArray(value)) {
    return `array:${value.length}`;
  }
  return typeof value;
}

function buildStabilityRecord(id, client, snapshots) {
  const normalized = snapshots.map((snapshot) => stableStringify(snapshot));
  const first = normalized[0];
  const allEqual = normalized.every((entry) => entry === first);
  return {
    id,
    client,
    run_count: snapshots.length,
    stable: allEqual,
    normalized_digest: first,
    snapshots,
  };
}

function getBootstrapRuns(log, scenarioId, client) {
  const scenario = (log.scenarios || []).find((entry) => entry.scenario_id === scenarioId);
  if (!scenario) {
    throw new Error(`missing bootstrap scenario ${scenarioId}`);
  }
  const runs = (scenario.runs || []).filter((entry) => entry.client === client);
  if (runs.length === 0) {
    throw new Error(`missing bootstrap runs for ${scenarioId}/${client}`);
  }
  return runs;
}

function getScenarioRun(log, scenarioKey, client) {
  const runs = log.scenarios && log.scenarios[scenarioKey];
  if (!Array.isArray(runs)) {
    throw new Error(`missing scenario key ${scenarioKey}`);
  }
  const run = runs.find((entry) => entry.client === client);
  if (!run) {
    throw new Error(`missing scenario run for ${scenarioKey}/${client}`);
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

function buildBootstrapSnapshot(run) {
  return {
    bootstrap_digest: run.bootstrap_digest,
    observation: run.observation,
    latest_header: findRequestByMethod(run.requests, "eth_getBlockByNumber").response.result,
  };
}

function buildFcuNoBuildSnapshot(run) {
  return {
    normalized_response: run.normalized_response,
    latest_header: run.latest_header,
  };
}

function buildRepeatSnapshot(run) {
  return {
    semantic_mode: run.semantic_mode,
    ancestor_hash: run.ancestor_hash,
    first: run.first.normalized_response,
    second: run.second.normalized_response,
    latest_header: run.latest_header,
  };
}

function buildBuildSnapshot(run) {
  const payload = run.steps.getPayload.response.result;
  const newPayload = run.steps.newPayload.response.result;
  return {
    forkchoice: run.steps.forkchoiceUpdated.normalized_response,
    getpayload_projection: {
      parentHash: payload.parentHash,
      blockNumber: payload.blockNumber,
      timestamp: payload.timestamp,
      prevRandao: payload.prevRandao,
      transaction_count: Array.isArray(payload.transactions) ? payload.transactions.length : null,
      withdrawals_shape: fieldShape(payload, "withdrawals"),
      blobGasUsed_shape: fieldShape(payload, "blobGasUsed"),
      excessBlobGas_shape: fieldShape(payload, "excessBlobGas"),
      feeRecipient_shape: fieldShape(payload, "feeRecipient"),
    },
    newpayload_projection: {
      status: newPayload.status,
      success_category: ["VALID", "ACCEPTED"].includes(newPayload.status) ? "success" : "other",
      latestValidHash_shape: fieldShape(newPayload, "latestValidHash"),
      validationError_shape: fieldShape(newPayload, "validationError"),
    },
  };
}

function buildUnknownPayloadSnapshot(run) {
  const error = run.response.error || null;
  return {
    error_code: error ? error.code : null,
    normalized_error_category: run.normalized_error_category,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const configPath = args.config;
  const testCasePath = args["test-case"];
  const outputPath = args.output;
  const reportPath = args.report;

  if (!configPath || !testCasePath || !outputPath || !reportPath) {
    throw new Error("usage: --config <file> --test-case <file> --output <file> --report <file>");
  }

  const rootDir = process.cwd();
  const config = readJson(configPath);
  const testCase = readJson(testCasePath);

  ensureEqual(config.task_id, "P2-T08", "config.task_id");
  ensureEqual(testCase.task_id, "P2-T08", "testCase.task_id");
  ensureArray(config.required_artifacts, "config.required_artifacts");
  ensureArray(testCase.required_clients, "testCase.required_clients");
  ensureArray(testCase.expected_repeatable_ids, "testCase.expected_repeatable_ids");

  const artifactRecords = [];
  for (const artifactPath of config.required_artifacts) {
    ensureFile(path.join(rootDir, artifactPath), "required artifact");
    artifactRecords.push(buildArtifactRecord(artifactPath));
  }

  const baselineT04 = readJson(path.join(rootDir, config.t04_log_file));
  const baselineT05 = readJson(path.join(rootDir, config.t05_baseline_log_file));
  const baselineT06 = readJson(path.join(rootDir, config.t06_baseline_log_file));

  const rerunRoot = path.join(rootDir, config.runtime_rerun_dir);
  fs.mkdirSync(rerunRoot, { recursive: true });

  const t05RerunLogs = [];
  const t06RerunLogs = [];
  for (let runIndex = 1; runIndex <= config.runtime_reruns; runIndex += 1) {
    const t05RunDir = path.join(rerunRoot, `p2-t05-rerun${runIndex}`);
    const t06RunDir = path.join(rerunRoot, `p2-t06-rerun${runIndex}`);
    fs.mkdirSync(t05RunDir, { recursive: true });
    fs.mkdirSync(t06RunDir, { recursive: true });

    const t05OutputPath = path.join(t05RunDir, "paris-phase2-early-runtime-scenarios.log.json");
    const t06OutputPath = path.join(t06RunDir, "paris-phase2-build-and-unknown-scenarios.log.json");

    runNodeScript(
      [
        path.join(rootDir, "scripts/engine-phase2-early-runtime-scenarios.js"),
        "--config",
        path.join(rootDir, config.t05_config_file),
        "--test-case",
        path.join(rootDir, config.t05_test_case_file),
        "--output",
        t05OutputPath,
      ],
      `P2-T05 rerun ${runIndex}`,
      rootDir,
    );
    runNodeScript(
      [
        path.join(rootDir, "scripts/engine-phase2-build-and-unknown-scenarios.js"),
        "--config",
        path.join(rootDir, config.t06_config_file),
        "--test-case",
        path.join(rootDir, config.t06_test_case_file),
        "--output",
        t06OutputPath,
      ],
      `P2-T06 rerun ${runIndex}`,
      rootDir,
    );

    t05RerunLogs.push(readJson(t05OutputPath));
    t06RerunLogs.push(readJson(t06OutputPath));
  }

  const records = [];

  for (const client of testCase.required_clients) {
    records.push(
      buildStabilityRecord(
        "rlp-bootstrap-smoke",
        client,
        getBootstrapRuns(baselineT04, "rlp-bootstrap-smoke", client).map(buildBootstrapSnapshot),
      ),
    );
    records.push(
      buildStabilityRecord(
        "headfcu-bootstrap-smoke",
        client,
        getBootstrapRuns(baselineT04, "headfcu-bootstrap-smoke", client).map(buildBootstrapSnapshot),
      ),
    );

    const fcuNoBuildRuns = [
      getScenarioRun(baselineT05, "fcu_no_build", client),
      ...t05RerunLogs.map((log) => getScenarioRun(log, "fcu_no_build", client)),
    ];
    const repeatRuns = [
      getScenarioRun(baselineT05, "repeat_fcu_same_head", client),
      ...t05RerunLogs.map((log) => getScenarioRun(log, "repeat_fcu_same_head", client)),
    ];
    records.push(buildStabilityRecord("fcu-no-build", client, fcuNoBuildRuns.map(buildFcuNoBuildSnapshot)));
    records.push(
      buildStabilityRecord("repeat-fcu-same-head", client, repeatRuns.map(buildRepeatSnapshot)),
    );
    records.push(
      buildStabilityRecord("phase2-early-runtime-scenarios", client, fcuNoBuildRuns.map((_, index) => ({
        fcu_no_build: buildFcuNoBuildSnapshot(fcuNoBuildRuns[index]),
        repeat_fcu_same_head: buildRepeatSnapshot(repeatRuns[index]),
      }))),
    );

    const buildRuns = [
      getScenarioRun(baselineT06, "fcu_build_getpayload_newpayload", client),
      ...t06RerunLogs.map((log) => getScenarioRun(log, "fcu_build_getpayload_newpayload", client)),
    ];
    const unknownRuns = [
      getScenarioRun(baselineT06, "unknown_payloadid", client),
      ...t06RerunLogs.map((log) => getScenarioRun(log, "unknown_payloadid", client)),
    ];
    records.push(
      buildStabilityRecord(
        "fcu-build-getpayload-newpayload",
        client,
        buildRuns.map(buildBuildSnapshot),
      ),
    );
    records.push(
      buildStabilityRecord(
        "unknown-payloadid",
        client,
        unknownRuns.map(buildUnknownPayloadSnapshot),
      ),
    );
    records.push(
      buildStabilityRecord("phase2-build-and-unknown-scenarios", client, buildRuns.map((_, index) => ({
        fcu_build_getpayload_newpayload: buildBuildSnapshot(buildRuns[index]),
        unknown_payloadid: buildUnknownPayloadSnapshot(unknownRuns[index]),
      }))),
    );
  }

  const unstableRecords = records.filter((record) => !record.stable);
  const repeatableIds = [...new Set(records.filter((record) => record.stable).map((record) => record.id))];
  const blockedIds = [...new Set(unstableRecords.map((record) => record.id))];

  for (const expectedId of testCase.expected_repeatable_ids) {
    if (!repeatableIds.includes(expectedId)) {
      throw new Error(`expected repeatable id ${expectedId} was not stable`);
    }
  }

  const summary = {
    taskId: "P2-T08",
    generatedAt: new Date().toISOString(),
    manual_decision_applied: "case-only error-text differences are not diff targets unless semantics differ",
    runtime_reruns: config.runtime_reruns,
    stable_record_count: records.filter((record) => record.stable).length,
    unstable_record_count: unstableRecords.length,
    repeatable_ids: repeatableIds,
    blocked_ids: blockedIds,
    records,
  };

  const log = {
    taskId: "P2-T08",
    generatedAt: summary.generatedAt,
    status: unstableRecords.length === 0 ? "pass" : "fail",
    executionMode: "real-runtime-rerun",
    inputs: {
      configFile: configPath,
      testCaseFile: testCasePath,
      t04_log_file: config.t04_log_file,
      t05_baseline_log_file: config.t05_baseline_log_file,
      t06_baseline_log_file: config.t06_baseline_log_file,
      runtime_rerun_dir: config.runtime_rerun_dir,
      phase2_normalization_decision_log: config.phase2_normalization_decision_log,
    },
    validations: [
      {
        check: "required artifacts exist",
        status: "pass",
        details: artifactRecords,
      },
      {
        check: "phase-2 manual decision excludes case-only error-text differences from diff targets",
        status: "pass",
        details: {
          discrepancy_id: "P2-D01",
          comparison_key: ["error.code", "normalized_error_category"],
          excluded_key: ["error.message casing"],
        },
      },
      {
        check: "every expected repeatable scenario remained stable for every client",
        status: unstableRecords.length === 0 ? "pass" : "fail",
        details: {
          repeatable_ids: repeatableIds,
          blocked_ids: blockedIds,
        },
      },
    ],
    summary,
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(log, null, 2) + "\n");
  fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2) + "\n");

  if (unstableRecords.length > 0) {
    throw new Error(
      `phase-2 determinism probe found unstable records: ${unstableRecords
        .map((record) => `${record.id}:${record.client}`)
        .join(", ")}`,
    );
  }

  console.log(`Phase-2 determinism probe passed for ${testCase.required_clients.length} clients.`);
}

try {
  main();
} catch (error) {
  console.error(`Phase-2 determinism probe failed: ${error.message}`);
  process.exit(1);
}
