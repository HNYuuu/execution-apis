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

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
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

function buildArtifactRecord(filePath) {
  const stat = fs.statSync(filePath);
  return {
    path: filePath,
    bytes: stat.size,
  };
}

function passCriterion(id, criterion, evidence, details) {
  return {
    id,
    label: criterion.label,
    status: "pass",
    evidence,
    details,
  };
}

function failCriterion(id, criterion, evidence, details) {
  return {
    id,
    label: criterion.label,
    status: "fail",
    evidence,
    details,
  };
}

function findValidation(validations, check) {
  return (validations || []).find((entry) => entry.check === check) || null;
}

function evaluateCriteria(rootDir, config, testCase) {
  const phaseReadme = readText(path.join(rootDir, config.inputs.phase_readme_file));
  const phase3Readme = readText(path.join(rootDir, config.inputs.phase3_readme_file));
  const t03 = readJson(path.join(rootDir, config.inputs.t03_log_file));
  const t04 = readJson(path.join(rootDir, config.inputs.t04_log_file));
  const t05 = readJson(path.join(rootDir, config.inputs.t05_log_file));
  const t06 = readJson(path.join(rootDir, config.inputs.t06_log_file));
  const t07Ledger = readJson(path.join(rootDir, config.inputs.t07_discrepancy_ledger_file));
  const t07DecisionLog = readText(path.join(rootDir, config.inputs.t07_decision_log_file));
  const t08 = readJson(path.join(rootDir, config.inputs.t08_log_file));
  const t09 = readJson(path.join(rootDir, config.inputs.t09_log_file));
  const t09Ledger = readJson(path.join(rootDir, config.inputs.t09_discrepancy_ledger_file));

  const criteriaMap = Object.fromEntries(testCase.criteria.map((entry) => [entry.id, entry]));
  const results = [];

  {
    const criterion = criteriaMap.third_client_executes_phase1_surface;
    const ok =
      t03.status === "pass" &&
      t04.status === "pass" &&
      t05.status === "pass" &&
      t06.status === "pass" &&
      (t03.summary.client === "nethermind") &&
      (t04.summary.clients || []).includes("nethermind") &&
      (t05.summary.clients || []).includes("nethermind") &&
      (t06.summary.clients || []).includes("nethermind");
    results.push(
      ok
        ? passCriterion(
            "third_client_executes_phase1_surface",
            criterion,
            [
              config.inputs.t03_log_file,
              config.inputs.t04_log_file,
              config.inputs.t05_log_file,
              config.inputs.t06_log_file,
            ],
            {
              third_client: "nethermind",
              accepted_scenarios: [
                "rlp-bootstrap-smoke",
                "headfcu-bootstrap-smoke",
                "fcu-no-build",
                "fcu-build-getpayload-newpayload",
                "repeat-fcu-same-head",
                "unknown-payloadid",
              ],
            },
          )
        : failCriterion(
            "third_client_executes_phase1_surface",
            criterion,
            [
              config.inputs.t03_log_file,
              config.inputs.t04_log_file,
              config.inputs.t05_log_file,
              config.inputs.t06_log_file,
            ],
            {
              t03_status: t03.status,
              t04_status: t04.status,
              t05_status: t05.status,
              t06_status: t06.status,
            },
          ),
    );
  }

  {
    const criterion = criteriaMap.complete_result_envelopes_exist;
    const envelopeValidation = findValidation(
      t09.validations,
      "complete envelopes exist for the three-client scenario matrix",
    );
    const ok =
      t09.status === "pass" &&
      envelopeValidation &&
      envelopeValidation.status === "pass" &&
      t09.summary.envelope_count === 18;
    results.push(
      ok
        ? passCriterion(
            "complete_result_envelopes_exist",
            criterion,
            [config.inputs.t09_log_file],
            {
              scenario_count: t09.summary.scenario_count,
              envelope_count: t09.summary.envelope_count,
              pairwise_comparison_count: t09.summary.pairwise_comparison_count,
            },
          )
        : failCriterion(
            "complete_result_envelopes_exist",
            criterion,
            [config.inputs.t09_log_file],
            {
              summary: t09.summary,
              validation: envelopeValidation,
            },
          ),
    );
  }

  {
    const criterion = criteriaMap.bootstrap_digest_consistency;
    const t04Validation = findValidation(
      t04.validations,
      "B1 and B2 bootstrap observations agree across all three clients",
    );
    const t09Validation = findValidation(
      t09.validations,
      "all compared envelopes sharing a scenario also share bootstrap_digest",
    );
    const ok =
      t04Validation &&
      t04Validation.status === "pass" &&
      t09Validation &&
      t09Validation.status === "pass";
    results.push(
      ok
        ? passCriterion(
            "bootstrap_digest_consistency",
            criterion,
            [config.inputs.t04_log_file, config.inputs.t09_log_file],
            {
              t04_check: t04Validation.check,
              t09_check: t09Validation.check,
            },
          )
        : failCriterion(
            "bootstrap_digest_consistency",
            criterion,
            [config.inputs.t04_log_file, config.inputs.t09_log_file],
            {
              t04_validation: t04Validation,
              t09_validation: t09Validation,
            },
          ),
    );
  }

  {
    const criterion = criteriaMap.determinism_is_acceptable;
    const ok =
      t08.status === "pass" &&
      t08.summary.unstable_record_count === 0 &&
      Array.isArray(t08.summary.blocked_ids) &&
      t08.summary.blocked_ids.length === 0;
    results.push(
      ok
        ? passCriterion(
            "determinism_is_acceptable",
            criterion,
            [config.inputs.t08_log_file],
            {
              runtime_reruns: t08.summary.runtime_reruns,
              stable_record_count: t08.summary.stable_record_count,
              blocked_ids: t08.summary.blocked_ids,
            },
          )
        : failCriterion(
            "determinism_is_acceptable",
            criterion,
            [config.inputs.t08_log_file],
            {
              summary: t08.summary,
            },
          ),
    );
  }

  {
    const criterion = criteriaMap.no_unknown_provenance_or_undocumented_normalization;
    const provenanceValidation = findValidation(
      t06.validations,
      "unknown-payloadid keeps the mutated-real-payload provenance discipline",
    );
    const noPendingManual = t07Ledger.every((entry) => entry.manual_confirmation_required === false);
    const documentedNormalization =
      t07DecisionLog.includes("compare `error.code` and normalized error category") &&
      t07DecisionLog.includes("case-only error-message differences are not diff targets");
    const ok =
      provenanceValidation &&
      provenanceValidation.status === "pass" &&
      noPendingManual &&
      documentedNormalization;
    results.push(
      ok
        ? passCriterion(
            "no_unknown_provenance_or_undocumented_normalization",
            criterion,
            [
              config.inputs.t06_log_file,
              config.inputs.t07_discrepancy_ledger_file,
              config.inputs.t07_decision_log_file,
            ],
            {
              provenance_check: provenanceValidation.check,
              resolved_manual_items: t07Ledger.map((entry) => entry.discrepancy_id),
            },
          )
        : failCriterion(
            "no_unknown_provenance_or_undocumented_normalization",
            criterion,
            [
              config.inputs.t06_log_file,
              config.inputs.t07_discrepancy_ledger_file,
              config.inputs.t07_decision_log_file,
            ],
            {
              provenance_validation: provenanceValidation,
              discrepancy_ledger: t07Ledger,
            },
          ),
    );
  }

  {
    const criterion = criteriaMap.deferred_rule_activation_guard_holds;
    const ok =
      t07Ledger.some(
        (entry) =>
          entry.discrepancy_id === "P2-D01" &&
          entry.status === "resolved_by_manual_confirmation" &&
          entry.activation_decision === "phase2_case_only_ignored",
      ) &&
      t07DecisionLog.includes("## Deferred Rules Retained") &&
      t07DecisionLog.includes("null_vs_omitted_when_explicitly_allowed");
    results.push(
      ok
        ? passCriterion(
            "deferred_rule_activation_guard_holds",
            criterion,
            [config.inputs.t07_discrepancy_ledger_file, config.inputs.t07_decision_log_file],
            {
              resolved_discrepancy: "P2-D01",
              deferred_rule_still_retained: "null_vs_omitted_when_explicitly_allowed",
            },
          )
        : failCriterion(
            "deferred_rule_activation_guard_holds",
            criterion,
            [config.inputs.t07_discrepancy_ledger_file, config.inputs.t07_decision_log_file],
            {
              discrepancy_ledger: t07Ledger,
            },
          ),
    );
  }

  {
    const criterion = criteriaMap.inherited_baseline_is_preserved;
    const inheritedValidation = findValidation(
      t09.validations,
      "phase-1 accepted geth/reth differences are labeled inherited baseline when they recur",
    );
    const ok = inheritedValidation && inheritedValidation.status === "pass";
    results.push(
      ok
        ? passCriterion(
            "inherited_baseline_is_preserved",
            criterion,
            [config.inputs.t09_log_file],
            {
              inherited_pairs: (inheritedValidation.details || []).map((entry) => ({
                scenario_id: entry.scenario_id,
                pair: entry.pair,
                baseline_label: entry.baseline_label,
              })),
            },
          )
        : failCriterion(
            "inherited_baseline_is_preserved",
            criterion,
            [config.inputs.t09_log_file],
            {
              validation: inheritedValidation,
            },
          ),
    );
  }

  {
    const criterion = criteriaMap.new_discrepancies_are_reproducible_and_triaged;
    const allowedTriages = new Set([
      "implementation bug",
      "spec ambiguity",
      "normalization issue",
      "implementation-behavior observation",
    ]);
    const ok =
      (t08.summary.blocked_ids || []).length === 0 &&
      t09Ledger.every((entry) => allowedTriages.has(entry.triage)) &&
      t09Ledger.filter((entry) => entry.baseline_label === "new-in-phase-2").every((entry) => entry.pair.includes("nethermind"));
    results.push(
      ok
        ? passCriterion(
            "new_discrepancies_are_reproducible_and_triaged",
            criterion,
            [config.inputs.t08_log_file, config.inputs.t09_discrepancy_ledger_file],
            {
              discrepancy_count: t09Ledger.length,
              new_in_phase_2_count: t09Ledger.filter((entry) => entry.baseline_label === "new-in-phase-2").length,
              triage_set: [...new Set(t09Ledger.map((entry) => entry.triage))],
            },
          )
        : failCriterion(
            "new_discrepancies_are_reproducible_and_triaged",
            criterion,
            [config.inputs.t08_log_file, config.inputs.t09_discrepancy_ledger_file],
            {
              blocked_ids: t08.summary.blocked_ids,
              discrepancy_ledger: t09Ledger,
            },
          ),
    );
  }

  {
    const criterion = criteriaMap.phase2_go_no_go_is_explicit;
    const ok =
      phaseReadme.includes("Phase 2 is accepted only if:") &&
      phase3Readme.includes("Phase 3: Paris Full Client Matrix");
    results.push(
      ok
        ? passCriterion(
            "phase2_go_no_go_is_explicit",
            criterion,
            [config.inputs.phase_readme_file, config.inputs.phase3_readme_file],
            {
              next_phase: "Phase 3: Paris Full Client Matrix",
            },
          )
        : failCriterion(
            "phase2_go_no_go_is_explicit",
            criterion,
            [config.inputs.phase_readme_file, config.inputs.phase3_readme_file],
            {
              phase2_readme_present: phaseReadme.length > 0,
              phase3_readme_present: phase3Readme.length > 0,
            },
          ),
    );
  }

  return results;
}

function buildReport(decision, criteria) {
  const lines = [];
  lines.push("# P2-T10 Phase-2 Acceptance Review");
  lines.push("");
  lines.push("## Decision");
  lines.push("");
  lines.push(`- verdict: \`${decision.decision}\``);
  lines.push(`- pass: \`${decision.pass_count}\``);
  lines.push(`- fail: \`${decision.fail_count}\``);
  lines.push(`- blocked: \`${decision.blocked_count}\``);
  lines.push("");
  lines.push("## Criteria");
  lines.push("");
  for (const criterion of criteria) {
    lines.push(`- \`${criterion.id}\`: \`${criterion.status}\``);
  }
  lines.push("");
  lines.push("## Next Steps");
  lines.push("");
  for (const nextStep of decision.next_steps) {
    lines.push(`- ${nextStep}`);
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const configPath = args.config;
  const testCasePath = args["test-case"];
  const outputPath = args.output;
  const reportPath = args.report;
  const decisionPath = args.decision;

  if (!configPath || !testCasePath || !outputPath || !reportPath || !decisionPath) {
    throw new Error("usage: --config <file> --test-case <file> --output <file> --report <file> --decision <file>");
  }

  const rootDir = process.cwd();
  const config = readJson(configPath);
  const testCase = readJson(testCasePath);
  ensureEqual(config.task_id, "P2-T10", "config.task_id");
  ensureEqual(testCase.task_id, "P2-T10", "testCase.task_id");
  ensureArray(config.required_artifacts, "config.required_artifacts");
  ensureArray(testCase.criteria, "testCase.criteria");

  const artifactRecords = [];
  for (const artifactPath of config.required_artifacts) {
    const absolutePath = path.join(rootDir, artifactPath);
    ensureFile(absolutePath, "required artifact");
    artifactRecords.push(buildArtifactRecord(absolutePath));
  }

  const criteria = evaluateCriteria(rootDir, config, testCase);
  const passCount = criteria.filter((entry) => entry.status === "pass").length;
  const failCount = criteria.filter((entry) => entry.status === "fail").length;
  const blockedCount = criteria.filter((entry) => entry.status === "blocked").length;
  const decision = {
    decision: failCount === 0 && blockedCount === 0 ? "go" : "no-go",
    pass_count: passCount,
    fail_count: failCount,
    blocked_count: blockedCount,
    failed_criteria: criteria.filter((entry) => entry.status === "fail").map((entry) => entry.id),
    blocked_criteria: criteria.filter((entry) => entry.status === "blocked").map((entry) => entry.id),
    rationale:
      failCount === 0 && blockedCount === 0
        ? "Phase 2 acceptance criteria all passed on the current Paris geth/reth/nethermind evidence."
        : "Phase 2 acceptance criteria did not fully pass on the current Paris geth/reth/nethermind evidence.",
    next_steps:
      failCount === 0 && blockedCount === 0
        ? [
            "Start phase-3 by adding besu to the accepted Paris three-client pipeline.",
            "Carry forward phase-2 normalization observations for response-object key-order noise in fcu-no-build and repeat-fcu-same-head.",
            "Fold stock-owned valid-newPayload and invalid-newPayload paths into the local ResultEnvelope workflow during phase-3.",
            "Keep null-vs-omitted equivalence deferred until the corpus contains explicit evidence and a new manual confirmation.",
          ]
        : [
            "Resolve the failed acceptance criteria before widening the Paris matrix.",
            "Do not start phase-3 until the blocked or failed criteria have concrete remediation artifacts.",
          ],
  };

  const log = {
    taskId: "P2-T10",
    generatedAt: new Date().toISOString(),
    status: decision.decision === "go" ? "pass" : "fail",
    executionMode: "offline-acceptance-review",
    inputs: {
      config_file: path.relative(rootDir, configPath),
      test_case_file: path.relative(rootDir, testCasePath),
    },
    summary: {
      pass_count: passCount,
      fail_count: failCount,
      blocked_count: blockedCount,
      decision: decision.decision,
    },
    validations: [
      {
        check: "required artifacts exist",
        status: "pass",
        details: artifactRecords,
      },
      ...criteria,
    ],
  };

  writeJson(outputPath, log);
  writeJson(decisionPath, decision);
  writeText(reportPath, buildReport(decision, criteria));

  if (log.status !== "pass") {
    throw new Error("P2-T10 acceptance review failed");
  }

  console.log(`P2-T10 phase-2 acceptance review passed with decision ${decision.decision}.`);
}

main();
