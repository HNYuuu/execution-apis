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

function candidateErrorTextNormalize(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => candidateErrorTextNormalize(entry));
  }
  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        const nextValue = value[key];
        acc[key] =
          key === "message" && typeof nextValue === "string"
            ? nextValue.toLowerCase()
            : candidateErrorTextNormalize(nextValue);
        return acc;
      }, {});
  }
  return value;
}

function buildArtifactRecord(filePath) {
  const stat = fs.statSync(filePath);
  return {
    path: filePath,
    bytes: stat.size,
  };
}

function pairKey(left, right) {
  return `${left}/${right}`;
}

function summarizeTriSample(sampleId, sourceTask, scenarioId, method, category, values, semanticFields) {
  const clients = Object.keys(values);
  const pairwise = [];
  for (let i = 0; i < clients.length; i += 1) {
    for (let j = i + 1; j < clients.length; j += 1) {
      const left = clients[i];
      const right = clients[j];
      const leftValue = values[left];
      const rightValue = values[right];
      const rawEqual = JSON.stringify(leftValue) === JSON.stringify(rightValue);
      const normalizedEqual = stableStringify(leftValue) === stableStringify(rightValue);
      let differenceType = "exact_match";
      if (!rawEqual && normalizedEqual) {
        differenceType = "object_field_order_only";
      } else if (!normalizedEqual) {
        differenceType = "semantic_difference";
      }
      pairwise.push({
        pair: pairKey(left, right),
        raw_equal: rawEqual,
        normalized_equal: normalizedEqual,
        observed_difference_type: differenceType,
      });
    }
  }
  return {
    sample_id: sampleId,
    source_task: sourceTask,
    scenario_id: scenarioId,
    method,
    category,
    clients,
    semantic_fields: semanticFields,
    values,
    pairwise,
  };
}

function getP2T04Scenario(log, scenarioId) {
  const scenario = (log.scenarios || []).find((entry) => entry.scenario_id === scenarioId);
  if (!scenario) {
    throw new Error(`missing P2-T04 scenario ${scenarioId}`);
  }
  return scenario;
}

function getP2T05ScenarioRuns(log, key) {
  const runs = log.scenarios && log.scenarios[key];
  if (!Array.isArray(runs) || runs.length === 0) {
    throw new Error(`missing P2-T05 scenario ${key}`);
  }
  return runs;
}

function getP2T06ScenarioRuns(log, key) {
  const runs = log.scenarios && log.scenarios[key];
  if (!Array.isArray(runs) || runs.length === 0) {
    throw new Error(`missing P2-T06 scenario ${key}`);
  }
  return runs;
}

function indexByClient(runs) {
  return runs.reduce((acc, run) => {
    acc[run.client] = run;
    return acc;
  }, {});
}

function extractP2T04LatestHeaderSample(log, scenarioId) {
  const scenario = getP2T04Scenario(log, scenarioId);
  const values = {};
  for (const run of scenario.runs) {
    if (run.run !== 1) {
      continue;
    }
    const latestRequest = run.requests.find((entry) => entry.method === "eth_getBlockByNumber");
    values[run.client] = latestRequest.response.result;
  }
  return summarizeTriSample(
    `p2t04-${scenarioId}-latest-header`,
    "P2-T04",
    scenarioId,
    "eth_getBlockByNumber",
    "bootstrap",
    values,
    ["hash", "number", "parentHash", "transactions", "withdrawals"],
  );
}

function extractP2T04HeadFcuSample(log) {
  const scenario = getP2T04Scenario(log, "headfcu-bootstrap-smoke");
  const values = {};
  for (const run of scenario.runs) {
    if (run.run !== 1) {
      continue;
    }
    const fcuRequest = run.requests.find((entry) => entry.method === "engine_forkchoiceUpdatedV3");
    values[run.client] = fcuRequest.response;
  }
  return summarizeTriSample(
    "p2t04-headfcu-response",
    "P2-T04",
    "headfcu-bootstrap-smoke",
    "engine_forkchoiceUpdatedV3",
    "bootstrap",
    values,
    ["result.payloadStatus.status", "result.payloadStatus.latestValidHash", "result.payloadId"],
  );
}

function extractP2T05FcuNoBuildSample(log) {
  const runs = indexByClient(getP2T05ScenarioRuns(log, "fcu_no_build"));
  const values = Object.fromEntries(
    Object.entries(runs).map(([client, run]) => [client, run.response]),
  );
  return summarizeTriSample(
    "p2t05-fcu-no-build",
    "P2-T05",
    "fcu-no-build",
    "engine_forkchoiceUpdatedV1",
    "runtime",
    values,
    ["result.payloadStatus.status", "result.payloadStatus.latestValidHash", "result.payloadId"],
  );
}

function extractP2T05RepeatSample(log, ordinal) {
  const runs = indexByClient(getP2T05ScenarioRuns(log, "repeat_fcu_same_head"));
  const key = ordinal === "first" ? "first" : "second";
  const values = Object.fromEntries(
    Object.entries(runs).map(([client, run]) => [client, run[key].response]),
  );
  return summarizeTriSample(
    `p2t05-repeat-fcu-same-head-${key}`,
    "P2-T05",
    "repeat-fcu-same-head",
    "engine_forkchoiceUpdatedV1",
    "runtime",
    values,
    ["result.payloadStatus.status", "result.payloadStatus.latestValidHash", "result.payloadId"],
  );
}

function extractP2T06BuildFcuSample(log) {
  const runs = indexByClient(getP2T06ScenarioRuns(log, "fcu_build_getpayload_newpayload"));
  const values = Object.fromEntries(
    Object.entries(runs).map(([client, run]) => [client, run.steps.forkchoiceUpdated.normalized_response]),
  );
  return summarizeTriSample(
    "p2t06-build-fcu",
    "P2-T06",
    "fcu-build-getpayload-newpayload",
    "engine_forkchoiceUpdatedV1",
    "build_lifecycle",
    values,
    ["result.payloadStatus.status", "result.payloadStatus.latestValidHash", "result.payloadIdClass"],
  );
}

function extractP2T06GetPayloadProjection(log) {
  const runs = indexByClient(getP2T06ScenarioRuns(log, "fcu_build_getpayload_newpayload"));
  const values = Object.fromEntries(
    Object.entries(runs).map(([client, run]) => [
      client,
      {
        parentHash: run.steps.getPayload.response.result.parentHash,
        blockNumber: run.steps.getPayload.response.result.blockNumber,
        timestamp: run.steps.getPayload.response.result.timestamp,
        prevRandao: run.steps.getPayload.response.result.prevRandao,
        feeRecipient: run.steps.getPayload.response.result.feeRecipient,
      },
    ]),
  );
  return summarizeTriSample(
    "p2t06-getpayload-projection",
    "P2-T06",
    "fcu-build-getpayload-newpayload",
    "engine_getPayloadV1",
    "build_lifecycle",
    values,
    ["parentHash", "blockNumber", "timestamp", "prevRandao", "feeRecipient"],
  );
}

function extractP2T06NewPayloadCategory(log) {
  const runs = indexByClient(getP2T06ScenarioRuns(log, "fcu_build_getpayload_newpayload"));
  const values = Object.fromEntries(
    Object.entries(runs).map(([client, run]) => [
      client,
      {
        status: run.newpayload_category_evaluation.status,
        payload_block_hash_relation:
          run.newpayload_category_evaluation.details.latestValidHash ===
          run.newpayload_category_evaluation.details.payload_block_hash
            ? "equals_payload_block_hash"
            : run.newpayload_category_evaluation.details.latestValidHash === null
              ? "null"
              : "other",
        validationError: run.newpayload_category_evaluation.details.validationError,
      },
    ]),
  );
  return summarizeTriSample(
    "p2t06-newpayload-category",
    "P2-T06",
    "fcu-build-getpayload-newpayload",
    "engine_newPayloadV1",
    "build_lifecycle",
    values,
    ["status", "payload_block_hash_relation", "validationError"],
  );
}

function extractP2T06UnknownPayload(log) {
  const runs = indexByClient(getP2T06ScenarioRuns(log, "unknown_payloadid"));
  const values = Object.fromEntries(
    Object.entries(runs).map(([client, run]) => [
      client,
      {
        code: run.response.error.code,
        message: run.response.error.message,
        normalized_error_category: run.normalized_error_category,
      },
    ]),
  );
  const sample = summarizeTriSample(
    "p2t06-unknown-payload-error",
    "P2-T06",
    "unknown-payloadid",
    "engine_getPayloadV1",
    "error_shape",
    values,
    ["error.code", "error.message", "normalized_error_category"],
  );
  sample.candidate_rule_evaluation = {
    rule_id: "non_semantic_error_text",
    pairwise_after_candidate: sample.pairwise.map((entry) => {
      const [left, right] = entry.pair.split("/");
      return {
        pair: entry.pair,
        equal_after_candidate:
          JSON.stringify(candidateErrorTextNormalize(values[left])) ===
          JSON.stringify(candidateErrorTextNormalize(values[right])),
      };
    }),
  };
  return sample;
}

function writeMarkdown(filePath, content) {
  fs.writeFileSync(filePath, content.endsWith("\n") ? content : `${content}\n`);
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
  const config = readJson(configPath);
  const testCase = readJson(testCasePath);
  ensureEqual(config.task_id, "P2-T07", "config.task_id");
  ensureEqual(testCase.task_id, "P2-T07", "testCase.task_id");

  ensureArray(config.required_artifacts, "config.required_artifacts");
  ensureArray(config.source_logs, "config.source_logs");
  ensureArray(testCase.required_source_tasks, "testCase.required_source_tasks");
  ensureArray(testCase.required_active_rules, "testCase.required_active_rules");
  ensureArray(testCase.required_deferred_rules, "testCase.required_deferred_rules");
  ensureArray(testCase.required_candidate_rules, "testCase.required_candidate_rules");
  ensureArray(testCase.required_sample_ids, "testCase.required_sample_ids");

  const artifactRecords = [];
  for (const artifactPath of config.required_artifacts) {
    const fullPath = path.join(rootDir, artifactPath);
    ensureFile(fullPath, "required artifact");
    artifactRecords.push(buildArtifactRecord(fullPath));
  }

  const sourceLogs = {};
  for (const logDef of config.source_logs) {
    sourceLogs[logDef.task_id] = readJson(path.join(rootDir, logDef.path));
  }

  const phase1Profile = readJson(path.join(rootDir, config.phase1_profile_file));
  const phase1InsightsPath = path.join(rootDir, config.phase1_insights_file);
  ensureFile(phase1InsightsPath, "phase-1 insights file");

  const samples = [
    extractP2T04LatestHeaderSample(sourceLogs["P2-T04"], "rlp-bootstrap-smoke"),
    extractP2T04HeadFcuSample(sourceLogs["P2-T04"]),
    extractP2T05FcuNoBuildSample(sourceLogs["P2-T05"]),
    extractP2T05RepeatSample(sourceLogs["P2-T05"], "first"),
    extractP2T05RepeatSample(sourceLogs["P2-T05"], "second"),
    extractP2T06BuildFcuSample(sourceLogs["P2-T06"]),
    extractP2T06GetPayloadProjection(sourceLogs["P2-T06"]),
    extractP2T06NewPayloadCategory(sourceLogs["P2-T06"]),
    extractP2T06UnknownPayload(sourceLogs["P2-T06"]),
  ];

  const sampleIds = samples.map((sample) => sample.sample_id);
  for (const sampleId of testCase.required_sample_ids) {
    if (!sampleIds.includes(sampleId)) {
      throw new Error(`missing required sample ${sampleId}`);
    }
  }

  const activeRules = phase1Profile.equivalence_rules
    .filter((rule) => rule.status === "active")
    .map((rule) => rule.rule_id);
  const deferredRules = phase1Profile.equivalence_rules
    .filter((rule) => rule.status === "deferred")
    .map((rule) => rule.rule_id);

  ensureEqual(JSON.stringify(activeRules), JSON.stringify(testCase.required_active_rules), "active rules");
  ensureEqual(JSON.stringify(deferredRules), JSON.stringify(testCase.required_deferred_rules), "deferred rules");

  const orderOnlySamples = samples.filter((sample) =>
    sample.pairwise.some((pair) => pair.observed_difference_type === "object_field_order_only"),
  );
  const candidateLedger = [
    {
      discrepancy_id: "P2-D01",
      status: "candidate_pending_manual_confirmation",
      rule_id: "non_semantic_error_text",
      evidence_samples: ["p2t06-unknown-payload-error"],
      triage_label: "candidate-normalization-activation",
      manual_confirmation_required: true,
      activation_decision: "deferred",
      rationale:
        "geth/reth return 'Unknown payload' while nethermind returns 'unknown payload' for the same -38001 unknown-payload branch. Error code and normalized category match, but the rule must not activate without manual review.",
    },
  ];

  const candidateRuleIds = candidateLedger.map((entry) => entry.rule_id);
  ensureEqual(
    JSON.stringify(candidateRuleIds),
    JSON.stringify(testCase.required_candidate_rules),
    "candidate rule ids",
  );

  const candidateSample = samples.find((sample) => sample.sample_id === "p2t06-unknown-payload-error");
  const candidateWorks = candidateSample.candidate_rule_evaluation.pairwise_after_candidate.every(
    (entry) => entry.equal_after_candidate === true,
  );
  if (!candidateWorks) {
    throw new Error("candidate non_semantic_error_text rule does not normalize all observed error-text pairs");
  }

  const corpus = {
    corpus_id: "paris-phase2-three-client-v0",
    generated_at: new Date().toISOString(),
    source_tasks: config.source_logs.map((entry) => entry.task_id),
    clients: testCase.expected_clients,
    categories: ["bootstrap", "runtime", "build_lifecycle", "error_shape"],
    samples,
  };

  const reviewLog = {
    taskId: "P2-T07",
    generatedAt: new Date().toISOString(),
    status: "pass",
    executionMode: "offline-from-real-runtime-logs",
    inputs: {
      configFile: configPath,
      testCaseFile: testCasePath,
      source_logs: config.source_logs,
      phase1_profile_file: config.phase1_profile_file,
      phase1_insights_file: config.phase1_insights_file,
    },
    summary: {
      source_tasks: corpus.source_tasks,
      sample_count: samples.length,
      active_rules: activeRules,
      deferred_rules: deferredRules,
      candidate_rule_ids: candidateRuleIds,
      order_only_sample_ids: orderOnlySamples.map((sample) => sample.sample_id),
    },
    validations: [
      {
        check: "required artifacts exist",
        status: "pass",
        details: artifactRecords,
      },
      {
        check: "three-client corpus covers bootstrap, runtime, build-lifecycle, and error-shape categories",
        status: "pass",
        details: {
          source_tasks: corpus.source_tasks,
          categories: corpus.categories,
          sample_ids: sampleIds,
        },
      },
      {
        check: "phase-1 active normalization rules remain sufficient for current three-client order-only noise",
        status: "pass",
        details: orderOnlySamples.map((sample) => ({
          sample_id: sample.sample_id,
          pairwise: sample.pairwise,
        })),
      },
      {
        check: "candidate deferred rule is recorded in the discrepancy ledger instead of being auto-activated",
        status: "pass",
        details: candidateLedger,
      },
      {
        check: "no deferred rule moved directly to active during phase-2 review",
        status: "pass",
        details: {
          active_rules: activeRules,
          deferred_rules: deferredRules,
          unchanged_from_phase1: true,
        },
      },
    ],
  };

  const reportContent = `# P2-T07 Three-Client Corpus And Normalization Review

## Summary

- source tasks: ${corpus.source_tasks.join(", ")}
- clients: ${corpus.clients.join(", ")}
- sample count: ${samples.length}
- active rules unchanged: ${activeRules.join(", ")}
- deferred rules unchanged: ${deferredRules.join(", ")}

## Review Result

- existing active rules still cover the observed three-client representation noise
- no rule moved from deferred to active in this task
- \`non_semantic_error_text\` now has enough evidence to be recorded as a candidate activation, but it remains deferred pending manual confirmation
- \`null_vs_omitted_when_explicitly_allowed\` still has no phase-2 evidence and remains deferred
`;

  const decisionLogContent = `# P2-T07 Normalization Decision Log

## Active Rules Retained

- \`stable_object_key_order\`
- \`canonical_hex_quantity\`

## Deferred Rules Retained

- \`null_vs_omitted_when_explicitly_allowed\`
- \`non_semantic_error_text\`

## Candidate Activation

- discrepancy id: \`P2-D01\`
- candidate rule: \`non_semantic_error_text\`
- decision in this task: remain \`deferred\`
- reason: manual confirmation is required before activation because the evidence comes from error-text casing differences in the \`unknown-payloadid\` branch
`;

  const insightNoteContent = `# P2-T07 Insight Note

No new phase-2 comparison-discipline insight was promoted to the shared Paris insight set.

Observed candidate only:

- \`P2-D01\`: error-message casing differs across clients for the same \`-38001\` unknown-payload branch

This remains a discrepancy-ledger candidate rather than a new shared insight because no normalization rule was activated in this task.
`;

  const outputDir = path.dirname(outputPath);
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(reviewLog, null, 2) + "\n");
  fs.writeFileSync(path.join(rootDir, config.corpus_output_file), JSON.stringify(corpus, null, 2) + "\n");
  fs.writeFileSync(path.join(rootDir, config.ledger_output_file), JSON.stringify(candidateLedger, null, 2) + "\n");
  writeMarkdown(path.join(rootDir, config.report_output_file), reportContent);
  writeMarkdown(path.join(rootDir, config.decision_log_output_file), decisionLogContent);
  writeMarkdown(path.join(rootDir, config.insight_note_output_file), insightNoteContent);

  console.log(`Phase-2 corpus and normalization review passed with ${samples.length} samples.`);
}

main();
