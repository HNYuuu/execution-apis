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

function ensureFile(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${label} is missing: ${filePath}`);
  }
}

function runHive(config, clientSpec) {
  const hiveArgs = [
    "-docker.endpoint",
    config.docker_endpoint,
    "--sim",
    config.simulator,
    "--sim.limit",
    config.sim_limit,
    "--client",
    clientSpec.client,
    "--sim.parallelism",
    String(config.sim_parallelism),
    "--client.checktimelimit",
    config.client_check_timeout,
    "--sim.timelimit",
    config.sim_timeout,
    "--results-root",
    clientSpec.results_root,
  ];
  return spawnSync("./hive", hiveArgs, {
    cwd: config.hive_root,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 16,
  });
}

function parseSummary(stdout) {
  const lines = stdout.split("\n").map((line) => line.trim()).filter(Boolean);
  const summaryLine = [...lines]
    .reverse()
    .find((line) => line.includes("simulation ethereum/engine finished"));
  if (!summaryLine) {
    throw new Error("missing Hive summary line");
  }
  const suiteMatch = summaryLine.match(/suites=(\d+)/);
  const testsMatch = summaryLine.match(/tests=(\d+)/);
  const failedMatch = summaryLine.match(/failed=(\d+)/);
  if (!suiteMatch || !testsMatch || !failedMatch) {
    throw new Error(`unable to parse summary line: ${summaryLine}`);
  }
  return {
    suites: Number(suiteMatch[1]),
    tests: Number(testsMatch[1]),
    failed: Number(failedMatch[1]),
    summaryLine,
  };
}

function findResultsLog(resultsRoot) {
  if (!fs.existsSync(resultsRoot)) {
    return [];
  }
  return fs
    .readdirSync(resultsRoot)
    .filter((entry) => entry.endsWith(".log"))
    .map((entry) => path.join(resultsRoot, entry))
    .sort();
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const configPath = args.config;
  const testCasePath = args["test-case"];
  const outputPath = args.output;

  if (!configPath || !testCasePath || !outputPath) {
    throw new Error("usage: --config <file> --test-case <file> --output <file>");
  }

  const config = readJson(configPath);
  const testCase = readJson(testCasePath);
  if (config.task_id !== "T05") {
    throw new Error("config.task_id must be T05");
  }
  if (testCase.task_id !== "T05") {
    throw new Error("testCase.task_id must be T05");
  }

  ensureArray(config.clients, "config.clients");
  ensureArray(testCase.expected_clients, "testCase.expected_clients");
  ensureArray(config.required_artifacts, "config.required_artifacts");

  for (const artifactPath of config.required_artifacts) {
    ensureFile(artifactPath, "required artifact");
  }
  ensureFile(path.join(config.hive_root, "hive"), "Hive binary");

  const results = [];
  for (const clientSpec of config.clients) {
    const run = runHive(config, clientSpec);
    const combinedOutput = `${run.stdout || ""}${run.stderr || ""}`;
    if (run.status !== 0) {
      throw new Error(`Hive run failed for ${clientSpec.client}: ${combinedOutput}`);
    }
    const summary = parseSummary(combinedOutput);
    const expected = testCase.expected_result;
    if (
      summary.suites !== expected.suites ||
      summary.tests !== expected.tests ||
      summary.failed !== expected.failed
    ) {
      throw new Error(
        `unexpected summary for ${clientSpec.client}: got ${summary.suites}/${summary.tests}/${summary.failed}`,
      );
    }
    const perClientLogFiles = findResultsLog(clientSpec.results_root);
    results.push({
      client: clientSpec.client,
      summary,
      results_root: clientSpec.results_root,
      log_files: perClientLogFiles,
    });
  }

  const output = {
    taskId: "T05",
    generatedAt: new Date().toISOString(),
    status: "pass",
    executionMode: "real-runtime",
    inputs: {
      configFile: configPath,
      testCaseFile: testCasePath,
    },
    summary: {
      simulator: config.simulator,
      sim_limit: config.sim_limit,
      clients: results.map((result) => result.client),
      expected_result: testCase.expected_result,
    },
    validations: [
      {
        check: "patched local Hive root is available",
        status: "pass",
        details: {
          hive_root: config.hive_root,
          docker_endpoint: config.docker_endpoint,
        },
      },
      {
        check: "go-ethereum and reth minimal engine smoke runs passed",
        status: "pass",
        details: results,
      },
    ],
    notes: config.notes,
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2) + "\n");
  console.log(
    `Hive engine smoke passed for ${results.length} clients with ${testCase.expected_result.tests} tests each.`,
  );
}

try {
  main();
} catch (error) {
  console.error(`Hive engine smoke failed: ${error.message}`);
  process.exit(1);
}
