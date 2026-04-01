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

function findSample(corpus, sampleId) {
  const sample = (corpus.samples || []).find((entry) => entry.sample_id === sampleId);
  if (!sample) {
    throw new Error(`missing corpus sample ${sampleId}`);
  }
  return sample;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const configPath = args.config;
  const testCasePath = args["test-case"];
  const outputPath = args.output;
  const profilePath = args.profile;
  const examplesPath = args.examples;

  if (!configPath || !testCasePath || !outputPath || !profilePath || !examplesPath) {
    throw new Error(
      "usage: --config <file> --test-case <file> --output <file> --profile <file> --examples <file>",
    );
  }

  const rootDir = process.cwd();
  const config = readJson(configPath);
  const testCase = readJson(testCasePath);
  ensureEqual(config.task_id, "T09", "config.task_id");
  ensureEqual(testCase.task_id, "T09", "testCase.task_id");

  ensureArray(config.required_artifacts, "config.required_artifacts");
  ensureArray(testCase.required_active_rules, "testCase.required_active_rules");
  ensureArray(testCase.required_deferred_rules, "testCase.required_deferred_rules");
  ensureArray(testCase.required_semantic_fields, "testCase.required_semantic_fields");
  ensureArray(testCase.required_non_normalizable_fields, "testCase.required_non_normalizable_fields");
  ensureArray(testCase.required_example_ids, "testCase.required_example_ids");

  const artifactRecords = [];
  for (const artifactPath of config.required_artifacts) {
    ensureFile(path.join(rootDir, artifactPath), "required artifact");
    artifactRecords.push(buildArtifactRecord(artifactPath));
  }

  const corpus = readJson(path.join(rootDir, config.corpus_file));
  const profile = {
    profile_id: "paris-v0",
    comparison_fields: [
      "result",
      "result.payloadStatus.status",
      "result.payloadStatus.latestValidHash",
      "result.payloadId",
      "number",
      "hash",
      "parentHash",
      "transactions",
      "withdrawals",
    ],
    equivalence_rules: [
      {
        rule_id: "stable_object_key_order",
        status: "active",
        applies_to: [
          "eth_getBlockByNumber.latest_header",
          "generic_json_objects",
        ],
        rationale:
          "Observed geth/reth latest-header responses differ in raw key order but become equal after stable key sorting.",
      },
      {
        rule_id: "canonical_hex_quantity",
        status: "active",
        applies_to: [
          "eth_blockNumber.result",
          "block_header.number",
          "block_header.gasLimit",
          "block_header.gasUsed",
        ],
        rationale:
          "Hex quantities remain comparison fields and are compared after canonical JSON normalization. No alternate representation has been observed yet, but the rule is active because quantities are first-class comparison targets.",
      },
      {
        rule_id: "null_vs_omitted_when_explicitly_allowed",
        status: "deferred",
        applies_to: [
          "future payload-attribute and payload-body branches"
        ],
        rationale:
          "No sample in corpus v0 demonstrates a scenario-approved null-vs-omitted pair, so the rule is recorded but not active.",
      },
      {
        rule_id: "non_semantic_error_text",
        status: "deferred",
        applies_to: [
          "future unknown-payloadid and error-shape scenarios"
        ],
        rationale:
          "No error-text sample exists in corpus v0. Error code and field presence remain non-normalizable until dedicated evidence is collected.",
      },
    ],
    ignored_fields: [
      "container_name",
      "docker_image",
      "raw_log_file",
      "rpc_host",
      "rpc_port",
      "http_host",
      "http_port",
      "auth_host",
      "auth_port",
      "run",
    ],
    client_notes: [
      {
        client: "geth",
        note:
          "Latest-header field order differs from reth in raw JSON, but semantic fields align after stable-key normalization.",
      },
      {
        client: "reth",
        note:
          "Latest-header field order differs from geth in raw JSON, but semantic fields align after stable-key normalization.",
      },
    ],
    non_normalizable_fields: [
      "result.payloadStatus.status",
      "result.payloadStatus.latestValidHash",
      "result.payloadId",
      "error.code",
      "error.message",
      "number",
      "hash",
      "parentHash",
      "transactions",
      "withdrawals",
    ],
  };

  const examples = testCase.required_example_ids.map((sampleId) => {
    const sample = findSample(corpus, sampleId);
    return {
      example_id: sample.sample_id,
      source_task: sample.source_task,
      scenario_id: sample.scenario_id,
      rule_decision:
        sample.observed_difference_type === "object_field_order_only"
          ? "accepted_by_stable_object_key_order"
          : "no_normalization_needed",
      raw_equal: sample.raw_equal,
      normalized_equal: stableStringify(sample.geth) === stableStringify(sample.reth),
      observed_difference_type: sample.observed_difference_type,
      semantic_fields: sample.semantic_fields,
      geth: sample.geth,
      reth: sample.reth,
    };
  });

  const activeRules = profile.equivalence_rules
    .filter((rule) => rule.status === "active")
    .map((rule) => rule.rule_id);
  const deferredRules = profile.equivalence_rules
    .filter((rule) => rule.status === "deferred")
    .map((rule) => rule.rule_id);

  for (const ruleId of testCase.required_active_rules) {
    if (!activeRules.includes(ruleId)) {
      throw new Error(`missing active rule ${ruleId}`);
    }
  }
  for (const ruleId of testCase.required_deferred_rules) {
    if (!deferredRules.includes(ruleId)) {
      throw new Error(`missing deferred rule ${ruleId}`);
    }
  }
  for (const field of testCase.required_semantic_fields) {
    if (!profile.comparison_fields.includes(field) && !profile.non_normalizable_fields.includes(field)) {
      throw new Error(`missing semantic field ${field}`);
    }
  }
  for (const field of testCase.required_non_normalizable_fields) {
    if (!profile.non_normalizable_fields.includes(field)) {
      throw new Error(`missing non-normalizable field ${field}`);
    }
  }
  if (examples.length < testCase.minimum_example_count) {
    throw new Error(
      `insufficient normalization examples: expected at least ${testCase.minimum_example_count}, got ${examples.length}`,
    );
  }

  const orderExamples = examples.filter(
    (example) => example.rule_decision === "accepted_by_stable_object_key_order",
  );
  if (orderExamples.length < testCase.minimum_order_examples) {
    throw new Error(
      `insufficient stable-order examples: expected at least ${testCase.minimum_order_examples}, got ${orderExamples.length}`,
    );
  }

  const profileSuppressesNoise = orderExamples.every(
    (example) => example.raw_equal === false && example.normalized_equal === true,
  );
  if (!profileSuppressesNoise) {
    throw new Error("stable object-key normalization does not suppress the observed order-only noise");
  }

  const preservedExactMatches = examples
    .filter((example) => example.rule_decision === "no_normalization_needed")
    .every((example) => example.normalized_equal === true);
  if (!preservedExactMatches) {
    throw new Error("exact-match examples were not preserved under normalization");
  }

  const log = {
    taskId: "T09",
    generatedAt: new Date().toISOString(),
    status: "pass",
    executionMode: "offline-from-real-runtime-corpus",
    inputs: {
      configFile: configPath,
      testCaseFile: testCasePath,
      corpusFile: config.corpus_file,
    },
    summary: {
      profile_id: profile.profile_id,
      active_rules: activeRules,
      deferred_rules: deferredRules,
      ignored_fields: profile.ignored_fields,
      example_count: examples.length,
      order_example_ids: orderExamples.map((example) => example.example_id),
    },
    validations: [
      {
        check: "required artifacts exist",
        status: "pass",
        details: artifactRecords,
      },
      {
        check: "profile suppresses representation noise in observed order-only samples",
        status: "pass",
        details: orderExamples.map((example) => ({
          example_id: example.example_id,
          raw_equal: example.raw_equal,
          normalized_equal: example.normalized_equal,
        })),
      },
      {
        check: "profile preserves semantic fields and non-normalizable fields",
        status: "pass",
        details: {
          comparison_fields: profile.comparison_fields,
          non_normalizable_fields: profile.non_normalizable_fields,
        },
      },
      {
        check: "deferred rules are explicit where corpus v0 lacks evidence",
        status: "pass",
        details: profile.equivalence_rules.filter((rule) => rule.status === "deferred"),
      },
    ],
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(profilePath, JSON.stringify(profile, null, 2) + "\n");
  fs.writeFileSync(examplesPath, JSON.stringify({ taskId: "T09", generatedAt: log.generatedAt, examples }, null, 2) + "\n");
  fs.writeFileSync(outputPath, JSON.stringify(log, null, 2) + "\n");
  console.log(`Normalization profile built with ${activeRules.length} active rules and ${examples.length} examples.`);
}

main();
