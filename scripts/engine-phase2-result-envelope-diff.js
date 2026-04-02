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

function buildArtifactRecord(filePath) {
  const stat = fs.statSync(filePath);
  return {
    path: filePath,
    bytes: stat.size,
  };
}

function findBootstrapScenario(log, scenarioId) {
  const scenario = (log.scenarios || []).find((entry) => entry.scenario_id === scenarioId);
  if (!scenario) {
    throw new Error(`missing bootstrap scenario ${scenarioId}`);
  }
  return scenario;
}

function latestRunForClient(runs, client) {
  const clientRuns = (runs || []).filter((entry) => entry.client === client);
  if (clientRuns.length === 0) {
    throw new Error(`missing run for ${client}`);
  }
  return clientRuns.slice().sort((a, b) => (a.run || 0) - (b.run || 0))[clientRuns.length - 1];
}

function extractBootstrapEnvelope(log, scenarioId, client) {
  const scenario = findBootstrapScenario(log, scenarioId);
  const run = latestRunForClient(scenario.runs, client);
  const ethGetBlock = (run.requests || []).find((entry) => entry.method === "eth_getBlockByNumber");
  if (!ethGetBlock) {
    throw new Error(`missing eth_getBlockByNumber for ${scenarioId}/${client}`);
  }
  const rawResponses = {
    latest_header: ethGetBlock.response.result,
    observation: run.observation,
  };
  const normalizedResponses = stableNormalize(rawResponses);
  return {
    scenario_id: scenarioId,
    client,
    fork: "Paris",
    bootstrap_digest: scenario.bootstrap_digest,
    raw_responses: rawResponses,
    normalized_responses: normalizedResponses,
    client_runtime_state: {},
    preliminary_outcome: null,
    comparison_metadata: {
      raw_projection: rawResponses,
      normalized_projection: normalizedResponses,
    },
  };
}

function extractFcuNoBuildEnvelope(log, client) {
  const run = (log.scenarios.fcu_no_build || []).find((entry) => entry.client === client);
  if (!run) {
    throw new Error(`missing fcu_no_build run for ${client}`);
  }
  const rawResponses = {
    request: run.request,
    response: run.response,
  };
  const normalizedResponses = {
    request: stableNormalize(run.request),
    response: run.normalized_response,
  };
  const failedChecks = (run.invariant_evaluations || [])
    .filter((entry) => entry.passed === false)
    .map((entry) => entry.rule_id);
  return {
    scenario_id: "fcu-no-build",
    client,
    fork: "Paris",
    bootstrap_digest: "ef592ea141df7f49503b1fb1b276e8668df2186d41c364040e500b40e25ca944",
    raw_responses: rawResponses,
    normalized_responses: normalizedResponses,
    client_runtime_state: {},
    preliminary_outcome: failedChecks.length > 0 ? {
      outcome_bucket: "violates hard invariant",
      failed_checks: failedChecks,
    } : null,
    comparison_metadata: {
      raw_projection: rawResponses,
      normalized_projection: normalizedResponses,
    },
  };
}

function extractRepeatEnvelope(log, client) {
  const run = (log.scenarios.repeat_fcu_same_head || []).find((entry) => entry.client === client);
  if (!run) {
    throw new Error(`missing repeat_fcu_same_head run for ${client}`);
  }
  const rawResponses = {
    first: run.first,
    second: run.second,
  };
  const normalizedResponses = {
    semantic_mode: run.semantic_mode,
    first: run.first.normalized_response,
    second: run.second.normalized_response,
  };
  const failed = run.invariant_evaluation && run.invariant_evaluation.passed === false;
  return {
    scenario_id: "repeat-fcu-same-head",
    client,
    fork: "Paris",
    bootstrap_digest: "ef592ea141df7f49503b1fb1b276e8668df2186d41c364040e500b40e25ca944",
    raw_responses: rawResponses,
    normalized_responses: normalizedResponses,
    client_runtime_state: {
      ancestor_hash: run.ancestor_hash,
    },
    preliminary_outcome: failed ? {
      outcome_bucket: "violates hard invariant",
      failed_checks: [run.invariant_evaluation.rule_id],
    } : null,
    comparison_metadata: {
      raw_projection: rawResponses,
      normalized_projection: normalizedResponses,
    },
  };
}

function extractBuildEnvelope(log, client) {
  const run = (log.scenarios.fcu_build_getpayload_newpayload || []).find((entry) => entry.client === client);
  if (!run) {
    throw new Error(`missing build run for ${client}`);
  }
  const payload = run.steps.getPayload.response.result;
  const newPayload = run.steps.newPayload.response.result;
  const failedChecks = [];
  for (const evaluation of run.invariant_evaluations || []) {
    if (evaluation.passed === false) {
      failedChecks.push(evaluation.rule_id);
    }
  }
  if (run.newpayload_category_evaluation && run.newpayload_category_evaluation.passed === false) {
    failedChecks.push("newpayload_success_category");
  }
  const rawResponses = {
    forkchoiceUpdated: run.steps.forkchoiceUpdated,
    getPayload: run.steps.getPayload,
    newPayload: run.steps.newPayload,
  };
  const normalizedResponses = {
    forkchoiceUpdated: run.steps.forkchoiceUpdated.normalized_response,
    getPayload: {
      parentHash: payload.parentHash,
      blockNumber: payload.blockNumber,
      timestamp: payload.timestamp,
      prevRandao: payload.prevRandao,
      transactions_count: (payload.transactions || []).length,
    },
    newPayload: {
      status: newPayload.status,
      success_category: ["VALID", "ACCEPTED"].includes(newPayload.status) ? "success" : "other",
      latestValidHash_relation:
        newPayload.status === "VALID" && newPayload.latestValidHash === payload.blockHash
          ? "matches_payload_blockhash"
          : newPayload.status === "ACCEPTED" && newPayload.latestValidHash === null
            ? "null"
            : "unexpected",
      validationError_is_null: newPayload.validationError === null,
    },
  };
  return {
    scenario_id: "fcu-build-getpayload-newpayload",
    client,
    fork: "Paris",
    bootstrap_digest: "ef592ea141df7f49503b1fb1b276e8668df2186d41c364040e500b40e25ca944",
    raw_responses: rawResponses,
    normalized_responses: normalizedResponses,
    client_runtime_state: stableNormalize(run.client_runtime_state || {}),
    preliminary_outcome: failedChecks.length > 0 ? {
      outcome_bucket: "violates hard invariant",
      failed_checks: failedChecks,
    } : null,
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

function extractUnknownEnvelope(log, client) {
  const run = (log.scenarios.unknown_payloadid || []).find((entry) => entry.client === client);
  if (!run) {
    throw new Error(`missing unknown_payloadid run for ${client}`);
  }
  const failedChecks = [];
  if (!run.invariant_evaluation || run.invariant_evaluation.passed === false) {
    failedChecks.push("PARIS-METHOD-GP-02");
  }
  if (
    !run.seed_build ||
    !run.seed_build.seed_payload_id ||
    !run.seed_build.mutated_payload_id ||
    run.seed_build.seed_payload_id === run.seed_build.mutated_payload_id
  ) {
    failedChecks.push("mutated_real_v1_payload_id_requirement");
  }
  const rawResponses = {
    seed_build: run.seed_build,
    request: run.request,
    response: run.response,
  };
  const normalizedResponses = {
    request_payload_origin: "mutated_real_v1_payload_id",
    error: {
      code: run.response.error.code,
      category: run.normalized_error_category,
    },
  };
  return {
    scenario_id: "unknown-payloadid",
    client,
    fork: "Paris",
    bootstrap_digest: "ef592ea141df7f49503b1fb1b276e8668df2186d41c364040e500b40e25ca944",
    raw_responses: rawResponses,
    normalized_responses: normalizedResponses,
    client_runtime_state: {
      seed_payload_id: run.seed_build.seed_payload_id,
      mutated_payload_id: run.seed_build.mutated_payload_id,
    },
    preliminary_outcome: failedChecks.length > 0 ? {
      outcome_bucket: "violates hard invariant",
      failed_checks: failedChecks,
    } : null,
    comparison_metadata: {
      raw_projection: rawResponses,
      normalized_projection: normalizedResponses,
      input_class: "mutated_real_v1_payload_id",
      excluded_raw_difference: ["error.message casing"],
    },
  };
}

function compareEnvelopes(envelopes) {
  const preliminaryViolation = envelopes.find((entry) => entry.preliminary_outcome);
  const rawProjectionDigests = envelopes.map((entry) => JSON.stringify(entry.comparison_metadata.raw_projection));
  const normalizedProjectionDigests = envelopes.map((entry) =>
    stableStringify(entry.comparison_metadata.normalized_projection),
  );
  const rawEqual = rawProjectionDigests.every((entry) => entry === rawProjectionDigests[0]);
  const normalizedEqual = normalizedProjectionDigests.every((entry) => entry === normalizedProjectionDigests[0]);

  let finalBucket = "diverge across clients";
  if (preliminaryViolation) {
    finalBucket = "violates hard invariant";
  } else if (rawEqual) {
    finalBucket = "all agree";
  } else if (normalizedEqual) {
    finalBucket = "agree after normalization";
  }
  return {
    raw_equal: rawEqual,
    normalized_equal: normalizedEqual,
    final_bucket: finalBucket,
  };
}

function triagePair(scenarioId, pairKey, pairResult, phase1Buckets) {
  if (pairResult.final_bucket === "all agree") {
    return null;
  }
  const inheritedBaseline =
    pairKey === "geth/reth" &&
    phase1Buckets[scenarioId] &&
    phase1Buckets[scenarioId] === pairResult.final_bucket;

  let triage = "implementation bug";
  if (pairResult.final_bucket === "agree after normalization") {
    triage = "normalization issue";
  } else if (scenarioId === "unknown-payloadid") {
    triage = "implementation-behavior observation";
  }

  const notes = [];
  if (scenarioId === "rlp-bootstrap-smoke" || scenarioId === "headfcu-bootstrap-smoke") {
    notes.push("object_key_order_only");
  }
  if (scenarioId === "fcu-no-build" || scenarioId === "repeat-fcu-same-head") {
    notes.push("response_object_key_order_only");
  }
  if (scenarioId === "fcu-build-getpayload-newpayload") {
    notes.push("client_local_runtime_values_excluded");
    notes.push("newpayload_compared_as_success_category");
  }
  if (scenarioId === "unknown-payloadid") {
    notes.push("compare_code_and_category_only");
    notes.push("case_only_error_message_difference_is_not_a_diff_target");
  }

  return {
    scenario_id: scenarioId,
    comparison_scope: "pairwise",
    pair: pairKey,
    bucket: pairResult.final_bucket,
    baseline_label: inheritedBaseline ? "inherited-baseline" : "new-in-phase-2",
    triage,
    notes,
  };
}

function buildReport(summary, matrixComparisons, pairwiseComparisons, discrepancyLedger) {
  const lines = [];
  lines.push("# P2-T09 Three-Client ResultEnvelope Diff Report");
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- scenarios compared: \`${summary.scenario_count}\``);
  lines.push(`- envelopes generated: \`${summary.envelope_count}\``);
  lines.push(`- pairwise comparisons: \`${summary.pairwise_comparison_count}\``);
  lines.push(`- discrepancy ledger entries: \`${summary.discrepancy_count}\``);
  lines.push(`- matrix bucket counts: \`${JSON.stringify(summary.matrix_bucket_counts)}\``);
  lines.push("");
  lines.push("## Matrix Buckets");
  lines.push("");
  for (const comparison of matrixComparisons) {
    lines.push(`- \`${comparison.scenario_id}\`: \`${comparison.final_bucket}\``);
  }
  lines.push("");
  lines.push("## Pairwise Coverage");
  lines.push("");
  for (const comparison of pairwiseComparisons) {
    lines.push(`- \`${comparison.scenario_id}\` / \`${comparison.pair}\`: \`${comparison.final_bucket}\``);
  }
  lines.push("");
  lines.push("## Triage");
  lines.push("");
  if (discrepancyLedger.length === 0) {
    lines.push("- No non-trivial pairwise discrepancy required triage.");
  } else {
    for (const entry of discrepancyLedger) {
      lines.push(
        `- \`${entry.scenario_id}\` / \`${entry.pair}\`: \`${entry.baseline_label}\`, \`${entry.triage}\`, bucket \`${entry.bucket}\``,
      );
    }
  }
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
  const ledgerPath = args.ledger;
  const reportPath = args.report;

  if (!configPath || !testCasePath || !outputPath || !envelopesPath || !diffPath || !ledgerPath || !reportPath) {
    throw new Error(
      "usage: --config <file> --test-case <file> --output <file> --envelopes <file> --diff <file> --ledger <file> --report <file>",
    );
  }

  const rootDir = process.cwd();
  const config = readJson(configPath);
  const testCase = readJson(testCasePath);
  ensureEqual(config.task_id, "P2-T09", "config.task_id");
  ensureEqual(testCase.task_id, "P2-T09", "testCase.task_id");
  ensureArray(config.required_artifacts, "config.required_artifacts");
  ensureArray(testCase.required_clients, "testCase.required_clients");
  ensureArray(testCase.expected_matrix_scenarios, "testCase.expected_matrix_scenarios");
  ensureArray(testCase.expected_pairs, "testCase.expected_pairs");

  const artifactRecords = [];
  for (const artifactPath of config.required_artifacts) {
    ensureFile(path.join(rootDir, artifactPath), "required artifact");
    artifactRecords.push(buildArtifactRecord(artifactPath));
  }

  const t04Log = readJson(path.join(rootDir, config.t04_log_file));
  const t05Log = readJson(path.join(rootDir, config.t05_log_file));
  const t06Log = readJson(path.join(rootDir, config.t06_log_file));
  const t08Log = readJson(path.join(rootDir, config.t08_log_file));
  const phase1Diff = readJson(path.join(rootDir, config.phase1_t14_diff_file));

  const phase1Buckets = {};
  for (const entry of phase1Diff.scenarioComparisons || []) {
    phase1Buckets[entry.scenario_id] = entry.final_bucket;
  }

  const scenarioExtractors = {
    "rlp-bootstrap-smoke": (client) => extractBootstrapEnvelope(t04Log, "rlp-bootstrap-smoke", client),
    "headfcu-bootstrap-smoke": (client) => extractBootstrapEnvelope(t04Log, "headfcu-bootstrap-smoke", client),
    "fcu-no-build": (client) => extractFcuNoBuildEnvelope(t05Log, client),
    "repeat-fcu-same-head": (client) => extractRepeatEnvelope(t05Log, client),
    "fcu-build-getpayload-newpayload": (client) => extractBuildEnvelope(t06Log, client),
    "unknown-payloadid": (client) => extractUnknownEnvelope(t06Log, client),
  };

  const envelopes = [];
  const matrixComparisons = [];
  const pairwiseComparisons = [];
  const discrepancyLedger = [];

  for (const scenarioExpectation of testCase.expected_matrix_scenarios) {
    const scenarioId = scenarioExpectation.scenario_id;
    const scenarioEnvelopes = testCase.required_clients.map((client) => scenarioExtractors[scenarioId](client));
    const matrixResult = compareEnvelopes(scenarioEnvelopes);
    matrixComparisons.push({
      scenario_id: scenarioId,
      clients: testCase.required_clients,
      final_bucket: matrixResult.final_bucket,
      raw_equal: matrixResult.raw_equal,
      normalized_equal: matrixResult.normalized_equal,
      bootstrap_digests: [...new Set(scenarioEnvelopes.map((entry) => entry.bootstrap_digest))],
    });

    for (const pair of testCase.expected_pairs) {
      const pairEnvelopes = scenarioEnvelopes.filter((entry) => pair.includes(entry.client));
      const pairResult = compareEnvelopes(pairEnvelopes);
      const pairKey = pair.join("/");
      pairwiseComparisons.push({
        scenario_id: scenarioId,
        pair: pairKey,
        final_bucket: pairResult.final_bucket,
        raw_equal: pairResult.raw_equal,
        normalized_equal: pairResult.normalized_equal,
      });
      const triage = triagePair(scenarioId, pairKey, pairResult, phase1Buckets);
      if (triage) {
        discrepancyLedger.push(triage);
      }
    }

    for (const envelope of scenarioEnvelopes) {
      envelope.outcome_bucket = matrixResult.final_bucket;
      delete envelope.preliminary_outcome;
      delete envelope.comparison_metadata;
      envelopes.push(envelope);
    }
  }

  const matrixBucketCounts = {
    "all agree": 0,
    "agree after normalization": 0,
    "diverge across clients": 0,
    "violates hard invariant": 0,
  };
  for (const comparison of matrixComparisons) {
    matrixBucketCounts[comparison.final_bucket] += 1;
  }

  const validations = [];
  validations.push({
    check: "complete envelopes exist for the three-client scenario matrix",
    status: envelopes.length === testCase.required_clients.length * testCase.expected_matrix_scenarios.length ? "pass" : "fail",
    details: {
      envelope_count: envelopes.length,
      expected_count: testCase.required_clients.length * testCase.expected_matrix_scenarios.length,
    },
  });
  validations.push({
    check: "pairwise comparison set is explicit and complete",
    status:
      pairwiseComparisons.length === testCase.expected_pairs.length * testCase.expected_matrix_scenarios.length
        ? "pass"
        : "fail",
    details: {
      pairwise_count: pairwiseComparisons.length,
      expected_count: testCase.expected_pairs.length * testCase.expected_matrix_scenarios.length,
      pairs: testCase.expected_pairs.map((entry) => entry.join("/")),
    },
  });
  validations.push({
    check: "phase-1 accepted geth/reth differences are labeled inherited baseline when they recur",
    status: discrepancyLedger
      .filter((entry) => entry.pair === "geth/reth")
      .every((entry) => entry.baseline_label === "inherited-baseline")
      ? "pass"
      : "fail",
    details: discrepancyLedger.filter((entry) => entry.pair === "geth/reth"),
  });
  validations.push({
    check: "every discrepancy ledger entry is triaged",
    status: discrepancyLedger.every((entry) => entry.triage) ? "pass" : "fail",
    details: discrepancyLedger,
  });
  validations.push({
    check: "determinism leaves no blocked scenario ids for offline diff",
    status: (t08Log.summary.blocked_ids || []).length === 0 ? "pass" : "fail",
    details: {
      blocked_ids: t08Log.summary.blocked_ids || [],
    },
  });
  validations.push({
    check: "all compared envelopes sharing a scenario also share bootstrap_digest",
    status: matrixComparisons.every((entry) => entry.bootstrap_digests.length === 1) ? "pass" : "fail",
    details: matrixComparisons.map((entry) => ({
      scenario_id: entry.scenario_id,
      bootstrap_digests: entry.bootstrap_digests,
    })),
  });
  for (const expected of testCase.expected_matrix_scenarios) {
    const actual = matrixComparisons.find((entry) => entry.scenario_id === expected.scenario_id);
    validations.push({
      check: `expected matrix bucket for ${expected.scenario_id}`,
      status: actual && actual.final_bucket === expected.expected_bucket ? "pass" : "fail",
      details: {
        expected_bucket: expected.expected_bucket,
        actual_bucket: actual ? actual.final_bucket : "missing",
      },
    });
  }

  const diff = {
    taskId: "P2-T09",
    generatedAt: new Date().toISOString(),
    matrixComparisons,
    pairwiseComparisons,
  };
  const summary = {
    scenario_count: matrixComparisons.length,
    envelope_count: envelopes.length,
    pairwise_comparison_count: pairwiseComparisons.length,
    matrix_bucket_counts: matrixBucketCounts,
    discrepancy_count: discrepancyLedger.length,
  };
  const log = {
    taskId: "P2-T09",
    generatedAt: new Date().toISOString(),
    status: validations.every((entry) => entry.status === "pass") ? "pass" : "fail",
    executionMode: "offline-artifact-diff",
    inputs: {
      config_file: path.relative(rootDir, configPath),
      test_case_file: path.relative(rootDir, testCasePath),
      t04_log_file: config.t04_log_file,
      t05_log_file: config.t05_log_file,
      t06_log_file: config.t06_log_file,
      t08_log_file: config.t08_log_file,
      phase1_t14_diff_file: config.phase1_t14_diff_file,
      phase2_normalization_decision_log: config.phase2_normalization_decision_log,
    },
    summary,
    validations,
  };

  writeJson(envelopesPath, { taskId: "P2-T09", generatedAt: log.generatedAt, envelopes });
  writeJson(diffPath, diff);
  writeJson(ledgerPath, discrepancyLedger);
  writeJson(outputPath, log);
  writeText(reportPath, buildReport(summary, matrixComparisons, pairwiseComparisons, discrepancyLedger));

  if (log.status !== "pass") {
    throw new Error("P2-T09 result-envelope diff failed validation");
  }

  console.log(
    `P2-T09 result-envelope diff passed for ${summary.scenario_count} scenarios and ${summary.envelope_count} envelopes.`,
  );
}

main();
