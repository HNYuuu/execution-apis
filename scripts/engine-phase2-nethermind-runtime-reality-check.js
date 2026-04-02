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

function readUtf8(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function ensureArray(value, label) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${label} must be a non-empty array`);
  }
}

function resolveFromRoot(rootDir, maybeRelativePath) {
  return path.isAbsolute(maybeRelativePath)
    ? maybeRelativePath
    : path.join(rootDir, maybeRelativePath);
}

function ensureFile(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${label} is missing: ${filePath}`);
  }
}

function runCommand(command, args, options) {
  return spawnSync(command, args, {
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 32,
    ...options,
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
  const suites = summaryLine.match(/suites=(\d+)/);
  const tests = summaryLine.match(/tests=(\d+)/);
  const failed = summaryLine.match(/failed=(\d+)/);
  if (!suites || !tests || !failed) {
    throw new Error(`unable to parse Hive summary line: ${summaryLine}`);
  }
  return {
    summary_line: summaryLine,
    suites: Number(suites[1]),
    tests: Number(tests[1]),
    failed: Number(failed[1]),
  };
}

function inspectDockerImage(image) {
  const result = runCommand("docker", ["image", "inspect", image], {});
  return {
    present: result.status === 0,
    status: result.status,
    stdout: (result.stdout || "").trim(),
    stderr: (result.stderr || "").trim(),
  };
}

function collectMethods(logContent) {
  const seen = new Set();
  const regex = /"method":"([^"]+)"/g;
  let match = regex.exec(logContent);
  while (match) {
    seen.add(match[1]);
    match = regex.exec(logContent);
  }
  return [...seen].sort();
}

function collectMethodGroup(methods, prefix) {
  return methods.filter((method) => method.startsWith(prefix));
}

function ensureMembers(actual, expected, label) {
  for (const member of expected) {
    if (!actual.includes(member)) {
      throw new Error(`${label} missing required member: ${member}`);
    }
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const configPathArg = args.config;
  const testCasePathArg = args["test-case"];
  const outputPathArg = args.output;

  if (!configPathArg || !testCasePathArg || !outputPathArg) {
    throw new Error("usage: --config <file> --test-case <file> --output <file>");
  }

  const rootDir = process.cwd();
  const configPath = resolveFromRoot(rootDir, configPathArg);
  const testCasePath = resolveFromRoot(rootDir, testCasePathArg);
  const outputPath = resolveFromRoot(rootDir, outputPathArg);
  const artifactDir = path.dirname(outputPath);

  const config = readJson(configPath);
  const testCase = readJson(testCasePath);

  if (config.task_id !== "P2-T03") {
    throw new Error("config.task_id must be P2-T03");
  }
  if (testCase.task_id !== "P2-T03") {
    throw new Error("test-case.task_id must be P2-T03");
  }

  ensureArray(config.required_artifacts, "config.required_artifacts");
  ensureArray(config.required_hive_patch_markers, "config.required_hive_patch_markers");
  ensureArray(testCase.required_http_methods, "testCase.required_http_methods");
  ensureArray(testCase.required_engine_methods, "testCase.required_engine_methods");
  ensureArray(testCase.expected_cleared_blocker_ids, "testCase.expected_cleared_blocker_ids");

  for (const artifactPath of config.required_artifacts) {
    ensureFile(resolveFromRoot(rootDir, artifactPath), "required artifact");
  }

  const hiveBinary = path.join(config.hive_root, "hive");
  const patchedContainerGo = path.join(config.hive_root, "internal/libdocker/container.go");
  ensureFile(hiveBinary, "Hive binary");
  ensureFile(patchedContainerGo, "patched Hive container.go");

  const patchedContent = readUtf8(patchedContainerGo);
  for (const marker of config.required_hive_patch_markers) {
    if (!patchedContent.includes(marker)) {
      throw new Error(`local Hive patch marker missing: ${marker}`);
    }
  }

  fs.rmSync(config.results_root, { recursive: true, force: true });
  fs.mkdirSync(config.results_root, { recursive: true });
  fs.mkdirSync(artifactDir, { recursive: true });

  const imageBefore = inspectDockerImage(config.target_wrapper_image);
  const hiveArgs = [
    "-docker.endpoint",
    config.docker_endpoint,
    "--sim",
    config.simulator,
    "--sim.limit",
    config.sim_limit,
    "--client",
    config.client,
    "--sim.parallelism",
    String(config.sim_parallelism),
    "--client.checktimelimit",
    config.client_check_timeout,
    "--sim.timelimit",
    config.sim_timeout,
    "--results-root",
    config.results_root,
  ];
  const run = runCommand("./hive", hiveArgs, { cwd: config.hive_root });
  const combinedOutput = `${run.stdout || ""}${run.stderr || ""}`;

  const runLogPath = path.join(artifactDir, config.copied_artifacts.hive_run_log);
  fs.writeFileSync(runLogPath, combinedOutput);

  if (run.status !== 0) {
    throw new Error(`Hive run failed for ${config.client}: ${combinedOutput}`);
  }

  const imageAfter = inspectDockerImage(config.target_wrapper_image);
  if (!imageAfter.present) {
    throw new Error(`wrapper image still missing after runtime smoke: ${config.target_wrapper_image}`);
  }

  const summary = parseSummary(combinedOutput);
  if (
    summary.suites !== testCase.expected_result.suites ||
    summary.tests !== testCase.expected_result.tests ||
    summary.failed !== testCase.expected_result.failed
  ) {
    throw new Error(
      `unexpected Hive summary ${summary.suites}/${summary.tests}/${summary.failed} for ${config.client}`,
    );
  }

  const resultFiles = fs.readdirSync(config.results_root).sort();
  const simulatorLogName = resultFiles.find((entry) => entry.endsWith(".log"));
  const runJsonName = resultFiles.find((entry) => entry.endsWith(".json") && entry !== "hive.json");
  if (!simulatorLogName || !runJsonName || !resultFiles.includes("hive.json")) {
    throw new Error("results_root is missing required Hive artifacts");
  }

  const simulatorLogPath = path.join(config.results_root, simulatorLogName);
  const runJsonPath = path.join(config.results_root, runJsonName);
  const hiveJsonPath = path.join(config.results_root, "hive.json");

  const simulatorLogContent = readUtf8(simulatorLogPath);
  const runJson = readJson(runJsonPath);
  const hiveJson = readJson(hiveJsonPath);
  const allMethods = collectMethods(simulatorLogContent);
  const httpMethods = collectMethodGroup(allMethods, "eth_");
  const engineMethods = collectMethodGroup(allMethods, "engine_");

  ensureMembers(httpMethods, testCase.required_http_methods, "HTTP method evidence");
  ensureMembers(engineMethods, testCase.required_engine_methods, "Engine method evidence");

  const copiedSimulatorLogPath = path.join(artifactDir, config.copied_artifacts.simulator_log);
  const copiedRunJsonPath = path.join(artifactDir, config.copied_artifacts.run_json);
  const copiedHiveJsonPath = path.join(artifactDir, config.copied_artifacts.hive_json);
  fs.copyFileSync(simulatorLogPath, copiedSimulatorLogPath);
  fs.copyFileSync(runJsonPath, copiedRunJsonPath);
  fs.copyFileSync(hiveJsonPath, copiedHiveJsonPath);

  const output = {
    task_id: "P2-T03",
    generated_at: new Date().toISOString(),
    status: "pass",
    execution_mode: "real-runtime",
    inputs: {
      config_file: configPathArg,
      test_case_file: testCasePathArg,
      hive_root: config.hive_root,
      docker_endpoint: config.docker_endpoint,
      simulator: config.simulator,
      sim_limit: config.sim_limit,
      client: config.client,
      results_root: config.results_root,
    },
    summary: {
      client: config.client,
      expected_result: testCase.expected_result,
      observed_result: summary,
      target_wrapper_image: config.target_wrapper_image,
      image_present_before_run: imageBefore.present,
      image_present_after_run: imageAfter.present,
      client_version: runJson.clientVersions?.[config.client] || null,
      hive_version: hiveJson.hiveVersion || runJson.runMetadata?.hiveVersion || null,
    },
    validations: [
      {
        check: "phase-1 Hive Docker Desktop compatibility patch is still present in the local Hive clone",
        status: "pass",
        details: {
          hive_root: config.hive_root,
          verified_markers: config.required_hive_patch_markers,
        },
      },
      {
        check: "nethermind wrapper image is available for phase-2 runtime work",
        status: "pass",
        details: {
          target_wrapper_image: config.target_wrapper_image,
          image_present_before_run: imageBefore.present,
          image_present_after_run: imageAfter.present,
          cleared_blocker_ids: testCase.expected_cleared_blocker_ids,
        },
      },
      {
        check: "stock Hive engine smoke passes for nethermind in the controlled Docker environment",
        status: "pass",
        details: {
          summary,
          simulator_log: config.copied_artifacts.simulator_log,
          run_json: config.copied_artifacts.run_json,
          hive_json: config.copied_artifacts.hive_json,
        },
      },
      {
        check: "the same real runtime run exercises both HTTP RPC and authenticated Engine RPC",
        status: "pass",
        details: {
          http_methods: httpMethods,
          engine_methods: engineMethods,
        },
      },
    ],
    runtime_contract_update: {
      target_client: config.client,
      startup_contract_source:
        config.startup_contract_source,
      blocker_clearance: testCase.expected_cleared_blocker_ids.map((id) => ({
        id,
        resolution: "cleared by successful stock Hive engine smoke",
      })),
    },
    copied_artifacts: {
      hive_run_log: config.copied_artifacts.hive_run_log,
      simulator_log: config.copied_artifacts.simulator_log,
      run_json: config.copied_artifacts.run_json,
      hive_json: config.copied_artifacts.hive_json,
      original_results_root: config.results_root,
      original_files: resultFiles,
    },
    notes: config.notes,
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2) + "\n");
  console.log(
    `Phase-2 Nethermind runtime reality check passed with ${summary.tests} tests and ${engineMethods.length} Engine methods observed.`,
  );
}

try {
  main();
} catch (error) {
  console.error(`Phase-2 Nethermind runtime reality check failed: ${error.message}`);
  process.exit(1);
}
