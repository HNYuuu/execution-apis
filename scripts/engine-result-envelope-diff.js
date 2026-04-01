#!/usr/bin/env node

const crypto = require("crypto");
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

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(filePath, value) {
  fs.writeFileSync(filePath, value);
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

function sha256String(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function sha256File(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function buildArtifactRecord(filePath) {
  const stat = fs.statSync(filePath);
  return {
    path: filePath,
    bytes: stat.size,
  };
}

function scenarioViolationStatus(checks) {
  if (!Array.isArray(checks) || checks.length === 0) {
    return null;
  }
  const failed = checks.filter((entry) => entry && entry.passed === false);
  if (failed.length === 0) {
    return null;
  }
  return {
    outcome_bucket: "violates hard invariant",
    failed_checks: failed.map((entry) => entry.rule_id || entry.check || "unknown_check"),
  };
}

function validationFailureStatus(validations, requiredCheckLabel) {
  const match = (validations || []).find((entry) => entry.check === requiredCheckLabel);
  if (match && match.status !== "pass") {
    return {
      outcome_bucket: "violates hard invariant",
      failed_checks: [requiredCheckLabel],
    };
  }
  return null;
}

function findRequestByMethod(run, method) {
  const request = (run.requests || []).find((entry) => entry.method === method);
  if (!request) {
    throw new Error(`missing request ${method}`);
  }
  return request;
}

function selectLatestRun(clientRuns, client) {
  const runs = (clientRuns || []).filter((entry) => entry.client === client);
  if (runs.length === 0) {
    throw new Error(`missing client run for ${client}`);
  }
  return runs.slice().sort((a, b) => (a.run || 0) - (b.run || 0))[runs.length - 1];
}

function buildBootstrapDigest(rootDir, sourceConfig, startupSteps) {
  const requiredArtifacts = sourceConfig.required_artifacts || [];
  ensureArray(requiredArtifacts, "sourceConfig.required_artifacts");
  ensureArray(startupSteps, "startupSteps");
  const artifactHashes = requiredArtifacts.map((artifactPath) => {
    const absolutePath = path.join(rootDir, artifactPath);
    ensureFile(absolutePath, "bootstrap artifact");
    return {
      path: artifactPath,
      sha256: sha256File(absolutePath),
    };
  });
  const normalizedBootstrapDefinition = {
    bootstrap_mode: sourceConfig.bootstrap_mode,
    required_artifacts: requiredArtifacts,
    artifact_hashes: artifactHashes,
    startup_steps: startupSteps,
  };
  return {
    digest: sha256String(stableStringify(normalizedBootstrapDefinition)),
    definition: normalizedBootstrapDefinition,
  };
}

function extractT03Envelope(rootDir, scenarioDef, log, sourceConfig, client) {
  const run = selectLatestRun(log.clientRuns, client);
  const blockNumber = findRequestByMethod(run, "eth_blockNumber");
  const latestHeader = findRequestByMethod(run, "eth_getBlockByNumber");
  const bootstrapDigest = buildBootstrapDigest(rootDir, sourceConfig, scenarioDef.startup_steps);
  const rawResponses = {
    blockNumber,
    latestHeader,
  };
  const normalizedResponses = stableNormalize(rawResponses);
  return {
    scenario_id: scenarioDef.scenario_id,
    client,
    fork: sourceConfig.fork,
    bootstrap_digest: bootstrapDigest.digest,
    bootstrap_definition: bootstrapDigest.definition,
    raw_responses: rawResponses,
    normalized_responses: normalizedResponses,
    client_runtime_state: {},
    preliminary_outcome: validationFailureStatus(
      log.validations,
      "all client observations match expected head number and head hash",
    ),
    comparison_metadata: {
      raw_projection: rawResponses,
      normalized_projection: normalizedResponses,
    },
  };
}

function extractT04Envelope(rootDir, scenarioDef, log, sourceConfig, client) {
  const run = selectLatestRun(log.clientRuns, client);
  const blockNumber = findRequestByMethod(run, "eth_blockNumber");
  const latestHeader = findRequestByMethod(run, "eth_getBlockByNumber");
  const bootstrapDigest = buildBootstrapDigest(rootDir, sourceConfig, scenarioDef.startup_steps);
  const rawResponses = {
    bootstrap_fcu: run.bootstrap_fcu,
    blockNumber,
    latestHeader,
  };
  const normalizedResponses = stableNormalize(rawResponses);
  return {
    scenario_id: scenarioDef.scenario_id,
    client,
    fork: sourceConfig.fork,
    bootstrap_digest: bootstrapDigest.digest,
    bootstrap_definition: bootstrapDigest.definition,
    raw_responses: rawResponses,
    normalized_responses: normalizedResponses,
    client_runtime_state: {},
    preliminary_outcome: validationFailureStatus(
      log.validations,
      "cross-client forkchoice-known observations agree",
    ),
    comparison_metadata: {
      raw_projection: rawResponses,
      normalized_projection: normalizedResponses,
    },
  };
}

function extractT11Envelope(rootDir, scenarioDef, log, sourceConfig, client) {
  const run = (log.clientRuns || []).find((entry) => entry.client === client);
  if (!run) {
    throw new Error(`missing T11 run for ${client}`);
  }
  const bootstrapDigest = buildBootstrapDigest(rootDir, sourceConfig, scenarioDef.startup_steps);
  const rawResponses = {
    request: run.scenario.request,
    response: run.scenario.response,
  };
  const normalizedResponses = {
    request: stableNormalize(run.scenario.request),
    response: run.scenario.normalized_response,
  };
  return {
    scenario_id: scenarioDef.scenario_id,
    client,
    fork: sourceConfig.fork,
    bootstrap_digest: bootstrapDigest.digest,
    bootstrap_definition: bootstrapDigest.definition,
    raw_responses: rawResponses,
    normalized_responses: normalizedResponses,
    client_runtime_state: {},
    preliminary_outcome: scenarioViolationStatus(run.invariant_evaluations),
    comparison_metadata: {
      raw_projection: rawResponses,
      normalized_projection: normalizedResponses,
    },
  };
}

function classifyNewPayloadSuccess(step, getPayloadStep) {
  const status = step.response.result.status;
  const latestValidHash = step.response.result.latestValidHash;
  const payloadBlockHash = getPayloadStep.response.result.blockHash;
  let relation = "unexpected";
  if (status === "VALID" && latestValidHash === payloadBlockHash) {
    relation = "matches_payload_blockhash";
  } else if (status === "ACCEPTED" && latestValidHash === null) {
    relation = "null";
  }
  return {
    status,
    success_category: status === "VALID" || status === "ACCEPTED" ? "success" : "unexpected",
    latest_valid_hash_relation: relation,
    validation_error_is_null: step.response.result.validationError === null,
  };
}

function extractT12Envelope(rootDir, scenarioDef, log, sourceConfig, client) {
  const run = (log.clientRuns || []).find((entry) => entry.client === client);
  if (!run) {
    throw new Error(`missing T12 run for ${client}`);
  }
  const bootstrapDigest = buildBootstrapDigest(rootDir, sourceConfig, scenarioDef.startup_steps);
  const rawResponses = {
    forkchoiceUpdated: run.steps.forkchoiceUpdated,
    getPayload: run.steps.getPayload,
    newPayload: run.steps.newPayload,
  };
  const normalizedResponses = {
    forkchoiceUpdated: run.steps.forkchoiceUpdated.normalized_response,
    getPayload: {
      result_class: "success",
      parentHash: run.steps.getPayload.response.result.parentHash,
      blockNumber: run.steps.getPayload.response.result.blockNumber,
      timestamp: run.steps.getPayload.response.result.timestamp,
      prevRandao: run.steps.getPayload.response.result.prevRandao,
      transactions_count: (run.steps.getPayload.response.result.transactions || []).length,
    },
    newPayload: classifyNewPayloadSuccess(run.steps.newPayload, run.steps.getPayload),
  };
  const violation =
    scenarioViolationStatus(run.invariant_evaluations) ||
    (run.newpayload_category_evaluation && !run.newpayload_category_evaluation.passed
      ? {
          outcome_bucket: "violates hard invariant",
          failed_checks: [run.newpayload_category_evaluation.check || "newpayload_category"],
        }
      : null);
  return {
    scenario_id: scenarioDef.scenario_id,
    client,
    fork: sourceConfig.fork,
    bootstrap_digest: bootstrapDigest.digest,
    bootstrap_definition: bootstrapDigest.definition,
    raw_responses: rawResponses,
    normalized_responses: normalizedResponses,
    client_runtime_state: stableNormalize(run.client_runtime_state || {}),
    preliminary_outcome: violation,
    comparison_metadata: {
      raw_projection: rawResponses,
      normalized_projection: normalizedResponses,
      excluded_runtime_fields: [
        "forkchoiceUpdated.result.payloadId",
        "getPayload.result.blockHash",
        "getPayload.result.extraData",
        "newPayload.result.latestValidHash",
      ],
    },
  };
}

function extractT13RepeatEnvelope(rootDir, scenarioDef, log, sourceConfig, client) {
  const run = (log.clientRuns || []).find((entry) => entry.client === client);
  if (!run) {
    throw new Error(`missing T13 run for ${client}`);
  }
  const scenario = run.scenarios.repeat_fcu_same_head;
  const bootstrapDigest = buildBootstrapDigest(rootDir, sourceConfig, scenarioDef.startup_steps);
  const rawResponses = {
    first: scenario.first,
    second: scenario.second,
  };
  const normalizedResponses = {
    semantic_mode: scenario.semantic_mode,
    first: scenario.first.normalized_response,
    second: scenario.second.normalized_response,
  };
  return {
    scenario_id: scenarioDef.scenario_id,
    client,
    fork: sourceConfig.fork,
    bootstrap_digest: bootstrapDigest.digest,
    bootstrap_definition: bootstrapDigest.definition,
    raw_responses: rawResponses,
    normalized_responses: normalizedResponses,
    client_runtime_state: {
      ancestor_hash: scenario.ancestor_hash,
    },
    preliminary_outcome: scenario.invariant_evaluation && scenario.invariant_evaluation.passed === false
      ? {
          outcome_bucket: "violates hard invariant",
          failed_checks: [scenario.invariant_evaluation.rule_id],
        }
      : null,
    comparison_metadata: {
      raw_projection: rawResponses,
      normalized_projection: normalizedResponses,
    },
  };
}

function extractT13UnknownEnvelope(rootDir, scenarioDef, log, sourceConfig, client) {
  const run = (log.clientRuns || []).find((entry) => entry.client === client);
  if (!run) {
    throw new Error(`missing T13 run for ${client}`);
  }
  const scenario = run.scenarios.unknown_payloadid;
  const bootstrapDigest = buildBootstrapDigest(rootDir, sourceConfig, scenarioDef.startup_steps);
  const seedPayloadId = scenario.seed_build.response.result.payloadId;
  const mutatedPayloadId = scenario.request.params[0];
  const rawResponses = {
    seed_build: scenario.seed_build,
    request: scenario.request,
    response: scenario.response,
  };
  const normalizedResponses = {
    request_payload_origin: "mutated_real_v1_payload_id",
    seed_payload_id_class: seedPayloadId ? "present" : "missing",
    error: {
      code: scenario.response.error.code,
      category: scenario.normalized_error_category,
    },
  };
  const failedChecks = [];
  if (!scenario.invariant_evaluation.passed) {
    failedChecks.push(scenario.invariant_evaluation.rule_id);
  }
  if (!seedPayloadId || mutatedPayloadId === seedPayloadId) {
    failedChecks.push("mutated_real_v1_payload_id_requirement");
  }
  return {
    scenario_id: scenarioDef.scenario_id,
    client,
    fork: sourceConfig.fork,
    bootstrap_digest: bootstrapDigest.digest,
    bootstrap_definition: bootstrapDigest.definition,
    raw_responses: rawResponses,
    normalized_responses: normalizedResponses,
    client_runtime_state: {
      seed_payload_id: seedPayloadId,
      mutated_payload_id: mutatedPayloadId,
    },
    preliminary_outcome: failedChecks.length > 0
      ? {
          outcome_bucket: "violates hard invariant",
          failed_checks: failedChecks,
        }
      : null,
    comparison_metadata: {
      raw_projection: rawResponses,
      normalized_projection: normalizedResponses,
      input_class: "mutated_real_v1_payload_id",
    },
  };
}

function extractEnvelope(rootDir, scenarioDef, log, sourceConfig, client) {
  switch (scenarioDef.source_kind) {
    case "t03_rlp_bootstrap":
      return extractT03Envelope(rootDir, scenarioDef, log, sourceConfig, client);
    case "t04_headfcu_bootstrap":
      return extractT04Envelope(rootDir, scenarioDef, log, sourceConfig, client);
    case "t11_fcu_no_build":
      return extractT11Envelope(rootDir, scenarioDef, log, sourceConfig, client);
    case "t12_build_getpayload_newpayload":
      return extractT12Envelope(rootDir, scenarioDef, log, sourceConfig, client);
    case "t13_repeat_fcu":
      return extractT13RepeatEnvelope(rootDir, scenarioDef, log, sourceConfig, client);
    case "t13_unknown_payloadid":
      return extractT13UnknownEnvelope(rootDir, scenarioDef, log, sourceConfig, client);
    default:
      throw new Error(`unsupported source_kind ${scenarioDef.source_kind}`);
  }
}

function compareScenarioEnvelopes(scenarioId, scenarioEnvelopes) {
  const clients = scenarioEnvelopes.map((entry) => entry.client).sort();
  const bootstrapDigests = [...new Set(scenarioEnvelopes.map((entry) => entry.bootstrap_digest))];
  const preliminaryViolation = scenarioEnvelopes.find((entry) => entry.preliminary_outcome);
  const rawProjectionDigests = scenarioEnvelopes.map((entry) =>
    JSON.stringify(entry.comparison_metadata.raw_projection),
  );
  const normalizedProjectionDigests = scenarioEnvelopes.map((entry) =>
    stableStringify(entry.comparison_metadata.normalized_projection),
  );
  const rawEqual = rawProjectionDigests.every((entry) => entry === rawProjectionDigests[0]);
  const normalizedEqual = normalizedProjectionDigests.every((entry) => entry === normalizedProjectionDigests[0]);

  let finalBucket = "diverge across clients";
  const notes = [];
  if (preliminaryViolation) {
    finalBucket = "violates hard invariant";
  } else if (rawEqual) {
    finalBucket = "all agree";
  } else if (normalizedEqual) {
    finalBucket = "agree after normalization";
  }

  if (scenarioId === "rlp-bootstrap-smoke" || scenarioId === "headfcu-bootstrap-smoke") {
    notes.push("latest_header_object_field_order_only");
  }
  if (scenarioId === "fcu-build-getpayload-newpayload") {
    notes.push("client_local_payload_runtime_values_excluded_from_cross_client_keys");
    notes.push("newpayload_success_compared_as_structured_success_category");
  }
  if (scenarioId === "unknown-payloadid") {
    notes.push("comparison_uses_mutated_real_v1_payload_id_inputs_only");
  }

  const discrepancies =
    finalBucket === "diverge across clients"
      ? scenarioEnvelopes.map((entry) => ({
          client: entry.client,
          normalized_projection: entry.comparison_metadata.normalized_projection,
        }))
      : [];

  return {
    scenario_id: scenarioId,
    clients,
    bootstrap_digests: bootstrapDigests,
    raw_equal: rawEqual,
    normalized_equal: normalizedEqual,
    final_bucket: finalBucket,
    notes,
    discrepancies,
  };
}

function buildReport(diff, summary) {
  const lines = [];
  lines.push("# T14 ResultEnvelope Diff Report");
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- scenarios compared: \`${summary.scenario_count}\``);
  lines.push(`- envelopes generated: \`${summary.envelope_count}\``);
  lines.push(`- discrepancy count: \`${summary.discrepancy_count}\``);
  lines.push(`- bucket counts: \`${JSON.stringify(summary.bucket_counts)}\``);
  lines.push("");
  lines.push("## Scenario Buckets");
  lines.push("");
  for (const comparison of diff.scenarioComparisons) {
    lines.push(`- \`${comparison.scenario_id}\`: \`${comparison.final_bucket}\``);
  }
  lines.push("");
  lines.push("## Notes");
  lines.push("");
  lines.push("- `T07` prototype output is intentionally not serialized into final ResultEnvelope artifacts because `T11` and `T13` provide the formal Paris runtime scenarios.");
  lines.push("- `unknown-payloadid` uses mutated real Paris V1 `payloadId` inputs only.");
  lines.push("- `fcu-build-getpayload-newpayload` excludes client-local runtime identifiers from cross-client equality keys.");
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const configPath = args.config;
  const testCasePath = args["test-case"];
  const outputPath = args.output;
  const envelopesPath = args.envelopes;
  const diffPath = args.diff;
  const reportPath = args.report;

  if (!configPath || !testCasePath || !outputPath || !envelopesPath || !diffPath || !reportPath) {
    throw new Error(
      "usage: --config <file> --test-case <file> --output <file> --envelopes <file> --diff <file> --report <file>",
    );
  }

  const rootDir = process.cwd();
  const config = readJson(configPath);
  const testCase = readJson(testCasePath);
  ensureEqual(config.task_id, "T14", "config.task_id");
  ensureEqual(testCase.task_id, "T14", "testCase.task_id");
  ensureArray(config.required_artifacts, "config.required_artifacts");
  ensureArray(config.scenarios, "config.scenarios");
  ensureArray(testCase.required_clients, "testCase.required_clients");
  ensureArray(testCase.expected_scenarios, "testCase.expected_scenarios");

  const artifactRecords = [];
  for (const artifactPath of config.required_artifacts) {
    ensureFile(path.join(rootDir, artifactPath), "required artifact");
    artifactRecords.push(buildArtifactRecord(artifactPath));
  }

  const envelopes = [];
  const comparisons = [];
  for (const scenarioDef of config.scenarios) {
    ensureArray(scenarioDef.startup_steps, `${scenarioDef.scenario_id}.startup_steps`);
    const sourceLog = readJson(path.join(rootDir, scenarioDef.source_log_file));
    const sourceConfig = readJson(path.join(rootDir, scenarioDef.source_config_file));
    const scenarioEnvelopes = testCase.required_clients.map((client) =>
      extractEnvelope(rootDir, scenarioDef, sourceLog, sourceConfig, client),
    );
    const comparison = compareScenarioEnvelopes(scenarioDef.scenario_id, scenarioEnvelopes);
    for (const envelope of scenarioEnvelopes) {
      envelope.outcome_bucket = comparison.final_bucket;
      delete envelope.preliminary_outcome;
      delete envelope.comparison_metadata;
      envelopes.push(envelope);
    }
    comparisons.push(comparison);
  }

  const expectedScenarioIds = testCase.expected_scenarios.map((entry) => entry.scenario_id).sort();
  const actualScenarioIds = comparisons.map((entry) => entry.scenario_id).sort();
  ensureEqual(JSON.stringify(actualScenarioIds), JSON.stringify(expectedScenarioIds), "scenario id set");

  const bucketCounts = {
    "all agree": 0,
    "agree after normalization": 0,
    "diverge across clients": 0,
    "violates hard invariant": 0,
  };
  for (const comparison of comparisons) {
    bucketCounts[comparison.final_bucket] += 1;
  }

  const validations = [];
  validations.push({
    check: "every compared scenario produces complete ResultEnvelope records",
    status:
      envelopes.length === testCase.required_clients.length * testCase.expected_scenarios.length ? "pass" : "fail",
    details: {
      envelope_count: envelopes.length,
      expected_count: testCase.required_clients.length * testCase.expected_scenarios.length,
    },
  });
  validations.push({
    check: "unknown-payloadid uses mutated real Paris V1 payloadId inputs",
    status: (() => {
      const unknownEnvelopes = envelopes.filter((entry) => entry.scenario_id === "unknown-payloadid");
      return unknownEnvelopes.every(
        (entry) =>
          entry.client_runtime_state.seed_payload_id &&
          entry.client_runtime_state.mutated_payload_id &&
          entry.client_runtime_state.seed_payload_id !== entry.client_runtime_state.mutated_payload_id,
      )
        ? "pass"
        : "fail";
    })(),
    details: envelopes
      .filter((entry) => entry.scenario_id === "unknown-payloadid")
      .map((entry) => ({
        client: entry.client,
        seed_payload_id: entry.client_runtime_state.seed_payload_id,
        mutated_payload_id: entry.client_runtime_state.mutated_payload_id,
      })),
  });
  validations.push({
    check: "all compared envelopes sharing a scenario also share bootstrap_digest",
    status: comparisons.every((entry) => entry.bootstrap_digests.length === 1) ? "pass" : "fail",
    details: comparisons.map((entry) => ({
      scenario_id: entry.scenario_id,
      bootstrap_digests: entry.bootstrap_digests,
    })),
  });
  validations.push({
    check: "offline comparison assigns final cross-client buckets",
    status: comparisons.every((entry) =>
      ["all agree", "agree after normalization", "diverge across clients", "violates hard invariant"].includes(
        entry.final_bucket,
      ),
    )
      ? "pass"
      : "fail",
    details: comparisons.map((entry) => ({
      scenario_id: entry.scenario_id,
      final_bucket: entry.final_bucket,
    })),
  });
  for (const expected of testCase.expected_scenarios) {
    const actual = comparisons.find((entry) => entry.scenario_id === expected.scenario_id);
    if (!actual) {
      throw new Error(`missing comparison for ${expected.scenario_id}`);
    }
    validations.push({
      check: `expected bucket for ${expected.scenario_id}`,
      status: actual.final_bucket === expected.expected_bucket ? "pass" : "fail",
      details: {
        expected_bucket: expected.expected_bucket,
        actual_bucket: actual.final_bucket,
      },
    });
  }

  const diff = {
    taskId: "T14",
    generatedAt: new Date().toISOString(),
    scenarioComparisons: comparisons,
    discrepancies: comparisons.flatMap((entry) =>
      entry.discrepancies.map((detail) => ({
        scenario_id: entry.scenario_id,
        detail,
      })),
    ),
  };

  const summary = {
    scenario_count: comparisons.length,
    envelope_count: envelopes.length,
    bucket_counts: bucketCounts,
    discrepancy_count: diff.discrepancies.length,
  };

  const log = {
    taskId: "T14",
    generatedAt: new Date().toISOString(),
    status: validations.every((entry) => entry.status === "pass") ? "pass" : "fail",
    executionMode: "offline-artifact-diff",
    inputs: {
      config_file: path.relative(rootDir, configPath),
      test_case_file: path.relative(rootDir, testCasePath),
      normalization_profile_file: config.normalization_profile_file,
      insights_file: config.insights_file,
    },
    summary,
    validations,
  };

  writeJson(envelopesPath, {
    taskId: "T14",
    generatedAt: log.generatedAt,
    envelopes,
  });
  writeJson(diffPath, diff);
  writeJson(outputPath, log);
  writeText(reportPath, buildReport(diff, summary));

  if (log.status !== "pass") {
    throw new Error("T14 result-envelope diff failed validation");
  }

  console.log(
    `T14 result-envelope diff passed for ${summary.scenario_count} scenarios and ${summary.envelope_count} envelopes.`,
  );
}

main();
