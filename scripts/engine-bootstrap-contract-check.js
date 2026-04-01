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

function fail(message) {
  throw new Error(message);
}

function ensureArray(value, label) {
  if (!Array.isArray(value) || value.length === 0) {
    fail(`${label} must be a non-empty array`);
  }
}

function ensureFile(filePath, label) {
  if (!fs.existsSync(filePath)) {
    fail(`${label} does not exist: ${filePath}`);
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const configPath = args.config;
  const testCasePath = args["test-case"];
  const outputPath = args.output;

  if (!configPath || !testCasePath || !outputPath) {
    fail("usage: --config <file> --test-case <file> --output <file>");
  }

  const config = readJson(configPath);
  const testCase = readJson(testCasePath);
  const rootDir = process.cwd();
  const definitions = config.bootstrap_definitions || [];
  const definitionMap = new Map(
    definitions.map((definition) => [definition.bootstrap_mode, definition]),
  );
  const validations = [];

  if (config.task_id !== "T02") {
    fail("config.task_id must be T02");
  }
  if (testCase.task_id !== "T02") {
    fail("test-case.task_id must be T02");
  }

  ensureArray(definitions, "bootstrap_definitions");
  ensureArray(testCase.expected_bootstrap_modes, "expected_bootstrap_modes");
  ensureArray(testCase.expected_clients, "expected_clients");
  ensureArray(
    testCase.expected_state_family_bootstrap_modes,
    "expected_state_family_bootstrap_modes",
  );
  ensureArray(
    testCase.expected_runtime_request_replay_only_families,
    "expected_runtime_request_replay_only_families",
  );

  for (const bootstrapMode of testCase.expected_bootstrap_modes) {
    if (!definitionMap.has(bootstrapMode)) {
      fail(`missing bootstrap mode definition: ${bootstrapMode}`);
    }
  }
  validations.push({
    check: "expected bootstrap modes exist",
    status: "pass",
    details: testCase.expected_bootstrap_modes,
  });

  for (const definition of definitions) {
    ensureArray(
      definition.required_artifacts,
      `${definition.bootstrap_mode}.required_artifacts`,
    );
    ensureArray(
      definition.startup_steps,
      `${definition.bootstrap_mode}.startup_steps`,
    );
    ensureArray(
      definition.observable_confirmation,
      `${definition.bootstrap_mode}.observable_confirmation`,
    );
    ensureArray(definition.state_families, `${definition.bootstrap_mode}.state_families`);

    for (const artifactPath of definition.required_artifacts) {
      ensureFile(path.join(rootDir, artifactPath), `${definition.bootstrap_mode} artifact`);
    }

    for (const clientName of testCase.expected_clients) {
      const clientNotes =
        definition.client_bootstrap_notes &&
        definition.client_bootstrap_notes[clientName];
      if (!clientNotes) {
        fail(`${definition.bootstrap_mode} is missing client notes for ${clientName}`);
      }
      if (!Array.isArray(clientNotes.startup_flags)) {
        fail(`${definition.bootstrap_mode}.${clientName}.startup_flags must be an array`);
      }
      if (typeof clientNotes.auth_rpc !== "string" || clientNotes.auth_rpc.length === 0) {
        fail(`${definition.bootstrap_mode}.${clientName}.auth_rpc must be a non-empty string`);
      }
    }
  }
  validations.push({
    check: "artifacts and per-client notes exist",
    status: "pass",
    details: testCase.expected_clients,
  });

  for (const stateFamilyExpectation of testCase.expected_state_family_bootstrap_modes) {
    const definition = definitionMap.get(stateFamilyExpectation.bootstrap_mode);
    if (!definition) {
      fail(
        `definition missing for expected state family mapping: ${stateFamilyExpectation.bootstrap_mode}`,
      );
    }
    if (!definition.state_families.includes(stateFamilyExpectation.state_family)) {
      fail(
        `${stateFamilyExpectation.state_family} is not mapped to ${stateFamilyExpectation.bootstrap_mode}`,
      );
    }
  }
  validations.push({
    check: "state family mapping matches the contract",
    status: "pass",
    details: testCase.expected_state_family_bootstrap_modes,
  });

  const runtimeDefinition = definitionMap.get("runtime_request_replay");
  if (!runtimeDefinition) {
    fail("runtime_request_replay definition is required");
  }
  for (const stateFamily of testCase.expected_runtime_request_replay_only_families) {
    if (!runtimeDefinition.state_families.includes(stateFamily)) {
      fail(`${stateFamily} must remain runtime_request_replay-only`);
    }
    for (const definition of definitions) {
      if (
        definition.bootstrap_mode !== "runtime_request_replay" &&
        definition.state_families.includes(stateFamily)
      ) {
        fail(`${stateFamily} must not appear in ${definition.bootstrap_mode}`);
      }
    }
  }
  validations.push({
    check: "B3/B4 remain runtime_request_replay-only",
    status: "pass",
    details: testCase.expected_runtime_request_replay_only_families,
  });

  const output = {
    taskId: "T02",
    generatedAt: new Date().toISOString(),
    status: "pass",
    inputs: {
      configFile: configPath,
      testCaseFile: testCasePath,
    },
    summary: {
      fork: config.fork,
      bootstrapModeCount: definitions.length,
      clientCount: testCase.expected_clients.length,
      validatedStateFamilyCount:
        testCase.expected_state_family_bootstrap_modes.length,
    },
    validations,
    bootstrapDefinitions: definitions.map((definition) => ({
      bootstrap_mode: definition.bootstrap_mode,
      state_families: definition.state_families,
      required_artifact_count: definition.required_artifacts.length,
      observable_confirmation: definition.observable_confirmation,
    })),
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2) + "\n");
  console.log(
    `Bootstrap contract check passed for ${definitions.length} bootstrap modes and ${testCase.expected_state_family_bootstrap_modes.length} state-family mappings.`,
  );
}

try {
  main();
} catch (error) {
  console.error(`Bootstrap contract check failed: ${error.message}`);
  process.exit(1);
}
