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

function runNodeScript(args, label) {
  const result = spawnSync("node", args, {
    encoding: "utf8",
    env: process.env,
    maxBuffer: 1024 * 1024 * 32,
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

function buildT03Snapshot(run) {
  return {
    block_number: findRequestByMethod(run.requests, "eth_blockNumber").response.result,
    latest_header: findRequestByMethod(run.requests, "eth_getBlockByNumber").response.result,
    observation: run.observation,
  };
}

function buildT04Snapshot(run) {
  return {
    forkchoice_response: findRequestByMethod(run.requests, "engine_forkchoiceUpdatedV3").response.result,
    block_number: findRequestByMethod(run.requests, "eth_blockNumber").response.result,
    latest_header: findRequestByMethod(run.requests, "eth_getBlockByNumber").response.result,
    observation: run.observation,
  };
}

function buildT07Snapshot(run) {
  return {
    bootstrap_fcu: run.bootstrap_fcu.result,
    latest_header: run.latest_header,
    scenarios: (run.scenarios || []).map((scenario) => ({
      scenario_id: scenario.scenario_id,
      normalized_observation: scenario.normalized_observation,
    })),
  };
}

function buildStabilityRecord(taskOrScenarioId, client, snapshots) {
  const normalized = snapshots.map((snapshot) => stableStringify(snapshot));
  const first = normalized[0];
  const allEqual = normalized.every((entry) => entry === first);
  return {
    id: taskOrScenarioId,
    client,
    run_count: snapshots.length,
    stable: allEqual,
    normalized_digest: first,
    snapshots,
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
  ensureEqual(config.task_id, "T10", "config.task_id");
  ensureEqual(testCase.task_id, "T10", "testCase.task_id");
  ensureArray(config.required_artifacts, "config.required_artifacts");
  ensureArray(testCase.expected_repeatable_ids, "testCase.expected_repeatable_ids");
  ensureArray(testCase.required_clients, "testCase.required_clients");

  const artifactRecords = [];
  for (const artifactPath of config.required_artifacts) {
    ensureFile(path.join(rootDir, artifactPath), "required artifact");
    artifactRecords.push(buildArtifactRecord(artifactPath));
  }

  const normalizationProfile = readJson(path.join(rootDir, config.normalization_profile_file));
  const t03Log = readJson(path.join(rootDir, config.t03_log_file));
  const t04Log = readJson(path.join(rootDir, config.t04_log_file));
  const t07ConfigPath = path.join(rootDir, config.t07_config_file);
  const t07TestCasePath = path.join(rootDir, config.t07_test_case_file);
  const t07BaselineLog = readJson(path.join(rootDir, config.t07_baseline_log_file));

  const runtimeRerunDir = path.join(rootDir, config.runtime_rerun_dir);
  fs.mkdirSync(runtimeRerunDir, { recursive: true });

  const runtimeLogs = [];
  for (let runIndex = 1; runIndex <= config.runtime_reruns; runIndex += 1) {
    const runtimeOutputPath = path.join(runtimeRerunDir, `paris-runtime-driver.rerun${runIndex}.log.json`);
    runNodeScript(
      [
        path.join(rootDir, "scripts/engine-runtime-scenario-driver.js"),
        "--config",
        t07ConfigPath,
        "--test-case",
        t07TestCasePath,
        "--output",
        runtimeOutputPath,
      ],
      `T07 runtime rerun ${runIndex}`,
    );
    runtimeLogs.push(readJson(runtimeOutputPath));
  }

  const t03Records = [];
  for (const client of testCase.required_clients) {
    const runs = (t03Log.clientRuns || []).filter((entry) => entry.client === client);
    if (runs.length < 2) {
      throw new Error(`T03 has insufficient runs for ${client}`);
    }
    t03Records.push(buildStabilityRecord("rlp-bootstrap-smoke", client, runs.map(buildT03Snapshot)));
  }

  const t04Records = [];
  for (const client of testCase.required_clients) {
    const runs = (t04Log.clientRuns || []).filter((entry) => entry.client === client);
    if (runs.length < 2) {
      throw new Error(`T04 has insufficient runs for ${client}`);
    }
    t04Records.push(buildStabilityRecord("headfcu-bootstrap-smoke", client, runs.map(buildT04Snapshot)));
  }

  const t07Records = [];
  const t07ScenarioRecords = [];
  for (const client of testCase.required_clients) {
    const baselineRun = (t07BaselineLog.clientRuns || []).find((entry) => entry.client === client);
    if (!baselineRun) {
      throw new Error(`missing T07 baseline run for ${client}`);
    }
    const rerunClientRuns = runtimeLogs.map((log) => {
      const run = (log.clientRuns || []).find((entry) => entry.client === client);
      if (!run) {
        throw new Error(`missing T07 rerun for ${client}`);
      }
      return run;
    });
    const allRuns = [baselineRun, ...rerunClientRuns];
    t07Records.push(buildStabilityRecord("runtime-driver-early-scenarios", client, allRuns.map(buildT07Snapshot)));

    for (const scenarioId of testCase.runtime_scenarios) {
      t07ScenarioRecords.push(
        buildStabilityRecord(
          scenarioId,
          client,
          allRuns.map((run) => findScenario(run, scenarioId).normalized_observation),
        ),
      );
    }
  }

  const allRecords = [...t03Records, ...t04Records, ...t07Records, ...t07ScenarioRecords];
  const unstable = allRecords.filter((record) => !record.stable);
  const repeatableIds = [...new Set(allRecords.filter((record) => record.stable).map((record) => record.id))];

  for (const expectedId of testCase.expected_repeatable_ids) {
    if (!repeatableIds.includes(expectedId)) {
      throw new Error(`expected repeatable id ${expectedId} was not stable`);
    }
  }
  if (unstable.length > 0) {
    throw new Error(`determinism probe found unstable records: ${unstable.map((item) => `${item.id}:${item.client}`).join(", ")}`);
  }

  const report = {
    taskId: "T10",
    generatedAt: new Date().toISOString(),
    profile_id: normalizationProfile.profile_id,
    repeatable_ids: repeatableIds,
    blocked_ids: [],
    rerun_count: config.runtime_reruns + 1,
    records: allRecords.map((record) => ({
      id: record.id,
      client: record.client,
      run_count: record.run_count,
      stable: record.stable,
    })),
  };

  const log = {
    taskId: "T10",
    generatedAt: report.generatedAt,
    status: "pass",
    executionMode: "mixed-existing-and-real-rerun",
    inputs: {
      configFile: configPath,
      testCaseFile: testCasePath,
      normalization_profile_file: config.normalization_profile_file,
      runtime_reruns: config.runtime_reruns,
    },
    summary: {
      profile_id: normalizationProfile.profile_id,
      required_clients: testCase.required_clients,
      repeatable_ids: repeatableIds,
      blocked_ids: [],
      runtime_rerun_dir: config.runtime_rerun_dir,
    },
    validations: [
      {
        check: "required artifacts exist",
        status: "pass",
        details: artifactRecords,
      },
      {
        check: "bootstrap scenarios are stable within each client",
        status: "pass",
        details: [...t03Records, ...t04Records].map((record) => ({
          id: record.id,
          client: record.client,
          run_count: record.run_count,
          stable: record.stable,
        })),
      },
      {
        check: "early runtime scenario set is stable within each client across reruns",
        status: "pass",
        details: [...t07Records, ...t07ScenarioRecords].map((record) => ({
          id: record.id,
          client: record.client,
          run_count: record.run_count,
          stable: record.stable,
        })),
      },
      {
        check: "no scenario is blocked for MVP diffing at the current early-scenario surface",
        status: "pass",
        details: {
          repeatable_ids: repeatableIds,
          blocked_ids: [],
        },
      },
    ],
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");
  fs.writeFileSync(outputPath, JSON.stringify(log, null, 2) + "\n");
  console.log(`Determinism probe passed for ${testCase.required_clients.length} clients across ${repeatableIds.length} repeatable ids.`);
}

main();
