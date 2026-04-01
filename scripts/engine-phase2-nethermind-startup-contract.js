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

function readUtf8(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function ensureArray(value, label) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${label} must be a non-empty array`);
  }
}

function ensureFile(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${label} does not exist: ${filePath}`);
  }
}

function assertIncludes(content, substring, label) {
  if (!content.includes(substring)) {
    throw new Error(`${label} missing required substring: ${substring}`);
  }
}

function summarizeClientParity(config) {
  return config.parity_notes.map((entry) => ({
    client: entry.client,
    jwt_secret_file: entry.jwt_secret_file,
    chain_import_mode: entry.chain_import_mode,
    authrpc_mode: entry.authrpc_mode,
    runtime_readiness_port: entry.runtime_readiness_port,
  }));
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
  const config = readJson(path.join(rootDir, configPath));
  const testCase = readJson(path.join(rootDir, testCasePath));

  if (config.task_id !== "P2-T02") {
    throw new Error("config.task_id must be P2-T02");
  }
  if (testCase.task_id !== "P2-T02") {
    throw new Error("test-case.task_id must be P2-T02");
  }

  ensureArray(config.required_source_files, "required_source_files");
  ensureArray(config.nethermind_required_substrings, "nethermind_required_substrings");
  ensureArray(config.geth_required_substrings, "geth_required_substrings");
  ensureArray(config.reth_required_substrings, "reth_required_substrings");
  ensureArray(config.parity_notes, "parity_notes");
  ensureArray(config.explicit_blockers, "explicit_blockers");
  ensureArray(testCase.expected_blocker_ids, "expected_blocker_ids");
  ensureArray(testCase.expected_clients, "expected_clients");

  for (const sourceFile of config.required_source_files) {
    ensureFile(sourceFile.path, sourceFile.label);
  }

  const nethermindDockerfile = readUtf8(config.nethermind_sources.dockerfile);
  const nethermindStartup = readUtf8(config.nethermind_sources.startup_script);
  const nethermindMkconfig = readUtf8(config.nethermind_sources.generated_config_script);
  const gethStartup = readUtf8(config.phase1_parity_sources.geth_startup_script);
  const rethStartup = readUtf8(config.phase1_parity_sources.reth_startup_script);

  for (const substring of config.nethermind_required_substrings) {
    const haystack =
      substring.source === "dockerfile"
        ? nethermindDockerfile
        : substring.source === "startup"
          ? nethermindStartup
          : nethermindMkconfig;
    assertIncludes(haystack, substring.value, `nethermind ${substring.source}`);
  }

  for (const substring of config.geth_required_substrings) {
    assertIncludes(gethStartup, substring, "geth startup");
  }

  for (const substring of config.reth_required_substrings) {
    assertIncludes(rethStartup, substring, "reth startup");
  }

  const blockerIds = config.explicit_blockers.map((blocker) => blocker.id);
  const expectedBlockerIds = [...testCase.expected_blocker_ids].sort();
  if (JSON.stringify([...blockerIds].sort()) !== JSON.stringify(expectedBlockerIds)) {
    throw new Error("explicit blockers do not match test-case expectations");
  }

  if (config.acquisition_contract.mode !== testCase.expected_acquisition_mode) {
    throw new Error("acquisition mode does not match test-case expectation");
  }
  if (config.acquisition_contract.target_wrapper_image !== testCase.expected_target_wrapper_image) {
    throw new Error("target wrapper image does not match test-case expectation");
  }
  if (config.acquisition_contract.build_args.baseimage !== testCase.expected_baseimage) {
    throw new Error("baseimage does not match test-case expectation");
  }
  if (config.acquisition_contract.build_args.tag !== testCase.expected_tag) {
    throw new Error("image tag does not match test-case expectation");
  }
  if (config.nethermind_runtime_contract.http_port !== testCase.expected_http_port) {
    throw new Error("http_port does not match test-case expectation");
  }
  if (config.nethermind_runtime_contract.authrpc_port !== testCase.expected_authrpc_port) {
    throw new Error("authrpc_port does not match test-case expectation");
  }
  if (config.nethermind_runtime_contract.jwt_secret_file !== testCase.expected_jwt_secret_file) {
    throw new Error("jwt_secret_file does not match test-case expectation");
  }

  const clientSet = new Set(config.parity_notes.map((entry) => entry.client));
  for (const client of testCase.expected_clients) {
    if (!clientSet.has(client)) {
      throw new Error(`missing parity note for client: ${client}`);
    }
  }

  const validations = [
    {
      check: "nethermind Hive wrapper source files exist locally",
      status: "pass",
      details: config.required_source_files.map((entry) => ({
        label: entry.label,
        path: entry.path,
      })),
    },
    {
      check: "nethermind startup contract is concrete about acquisition path, JWT, ports, and config generation",
      status: "pass",
      details: {
        acquisition_contract: config.acquisition_contract,
        nethermind_runtime_contract: config.nethermind_runtime_contract,
      },
    },
    {
      check: "geth/reth parity notes are explicit enough to prevent startup differences from being misclassified as Engine-API discrepancies",
      status: "pass",
      details: summarizeClientParity(config),
    },
    {
      check: "phase-2 blocker list is explicit rather than implicit",
      status: "pass",
      details: config.explicit_blockers,
    },
  ];

  const output = {
    task_id: "P2-T02",
    generated_at: new Date().toISOString(),
    status: "pass",
    inputs: {
      config_file: configPath,
      test_case_file: testCasePath,
      nethermind_sources: config.nethermind_sources,
      phase1_parity_sources: config.phase1_parity_sources,
    },
    summary: {
      target_client: "nethermind",
      acquisition_mode: config.acquisition_contract.mode,
      target_wrapper_image: config.acquisition_contract.target_wrapper_image,
      blocker_count: config.explicit_blockers.length,
      parity_client_count: config.parity_notes.length,
    },
    validations,
    startup_contract: {
      acquisition_contract: config.acquisition_contract,
      nethermind_runtime_contract: config.nethermind_runtime_contract,
      parity_notes: config.parity_notes,
      explicit_blockers: config.explicit_blockers,
    },
  };

  fs.mkdirSync(path.dirname(path.join(rootDir, outputPath)), { recursive: true });
  fs.writeFileSync(path.join(rootDir, outputPath), JSON.stringify(output, null, 2) + "\n");
  console.log(
    `Phase-2 Nethermind startup contract passed with ${config.explicit_blockers.length} explicit blocker(s).`,
  );
}

try {
  main();
} catch (error) {
  console.error(`Phase-2 Nethermind startup contract failed: ${error.message}`);
  process.exit(1);
}
