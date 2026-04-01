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

function includesAll(haystack, needles) {
  return needles.every((needle) => haystack.includes(needle));
}

function evaluateCriteria(rootDir, config, testCase) {
  const t01 = readJson(path.join(rootDir, config.inputs.t01_log_file));
  const t02 = readJson(path.join(rootDir, config.inputs.t02_bootstrap_definitions_file));
  const t03 = readJson(path.join(rootDir, config.inputs.t03_log_file));
  const t04 = readJson(path.join(rootDir, config.inputs.t04_log_file));
  const t06Report = readText(path.join(rootDir, config.inputs.t06_report_file));
  const t07 = readJson(path.join(rootDir, config.inputs.t07_log_file));
  const t09 = readJson(path.join(rootDir, config.inputs.t09_log_file));
  const t10 = readJson(path.join(rootDir, config.inputs.t10_report_file));
  const t14 = readJson(path.join(rootDir, config.inputs.t14_log_file));
  const insights = readText(path.join(rootDir, config.inputs.insights_file));

  const criteriaMap = Object.fromEntries(testCase.criteria.map((entry) => [entry.id, entry]));
  const results = [];

  {
    const criterion = criteriaMap.provenance_gate_compliance;
    const ok =
      t01.status === "pass" &&
      t01.validations.allHardInvariantsHaveKnownProvenance === true &&
      Array.isArray(t01.unknownHardInvariants) &&
      t01.unknownHardInvariants.length === 0;
    results.push(
      ok
        ? passCriterion("provenance_gate_compliance", criterion, [config.inputs.t01_log_file], {
            approved_hard_invariants: t01.summary.approvedHardInvariantCount,
            unknown_hard_invariants: t01.unknownHardInvariants.length,
          })
        : failCriterion("provenance_gate_compliance", criterion, [config.inputs.t01_log_file], {
            status: t01.status,
            validations: t01.validations,
            unknown_hard_invariants: t01.unknownHardInvariants,
          }),
    );
  }

  {
    const criterion = criteriaMap.bootstrap_reproducibility;
    const bucketChecks = Object.fromEntries(
      t14.validations
        .filter((entry) => entry.check.startsWith("expected bucket for "))
        .map((entry) => [entry.check.replace("expected bucket for ", ""), entry.status]),
    );
    const ok =
      t03.status === "pass" &&
      t04.status === "pass" &&
      bucketChecks["rlp-bootstrap-smoke"] === "pass" &&
      bucketChecks["headfcu-bootstrap-smoke"] === "pass";
    results.push(
      ok
        ? passCriterion(
            "bootstrap_reproducibility",
            criterion,
            [config.inputs.t03_log_file, config.inputs.t04_log_file, config.inputs.t14_log_file],
            {
              t03_bucket: "agree after normalization",
              t04_bucket: "agree after normalization",
            },
          )
        : failCriterion(
            "bootstrap_reproducibility",
            criterion,
            [config.inputs.t03_log_file, config.inputs.t04_log_file, config.inputs.t14_log_file],
            {
              t03_status: t03.status,
              t04_status: t04.status,
              bucketChecks,
            },
          ),
    );
  }

  {
    const criterion = criteriaMap.chain_rlp_scope_is_limited;
    const definitions = Object.fromEntries(
      (t02.bootstrap_definitions || []).map((entry) => [entry.bootstrap_mode, entry]),
    );
    const ok =
      definitions.rlp_import &&
      definitions.rlp_import_plus_headfcu &&
      definitions.runtime_request_replay &&
      includesAll(definitions.runtime_request_replay.state_families, ["B3", "B4"]) &&
      definitions.runtime_request_replay.client_bootstrap_notes.geth.artifact_injection.includes("Do not inject payloadId-bearing state") &&
      definitions.runtime_request_replay.client_bootstrap_notes.reth.artifact_injection.includes("Do not inject payloadId-bearing state");
    results.push(
      ok
        ? passCriterion("chain_rlp_scope_is_limited", criterion, [config.inputs.t02_bootstrap_definitions_file], {
            persistent_bootstrap_modes: ["rlp_import", "rlp_import_plus_headfcu"],
            runtime_only_state_families: definitions.runtime_request_replay.state_families,
          })
        : failCriterion("chain_rlp_scope_is_limited", criterion, [config.inputs.t02_bootstrap_definitions_file], {
            runtime_request_replay: definitions.runtime_request_replay || null,
          }),
    );
  }

  {
    const criterion = criteriaMap.runtime_only_state_uses_request_replay;
    const ok =
      t14.validations.find((entry) => entry.check === "unknown-payloadid uses mutated real Paris V1 payloadId inputs")?.status === "pass";
    results.push(
      ok
        ? passCriterion(
            "runtime_only_state_uses_request_replay",
            criterion,
            [config.inputs.t02_bootstrap_definitions_file, config.inputs.t14_log_file],
            {
              check: "unknown-payloadid uses mutated real Paris V1 payloadId inputs",
            },
          )
        : failCriterion(
            "runtime_only_state_uses_request_replay",
            criterion,
            [config.inputs.t02_bootstrap_definitions_file, config.inputs.t14_log_file],
            {
              t14_validations: t14.validations,
            },
          ),
    );
  }

  {
    const criterion = criteriaMap.normalization_noise_is_controlled;
    const ok =
      t09.status === "pass" &&
      t09.validations.find(
        (entry) => entry.check === "profile suppresses representation noise in observed order-only samples",
      )?.status === "pass" &&
      t14.summary.bucket_counts["diverge across clients"] === 0;
    results.push(
      ok
        ? passCriterion(
            "normalization_noise_is_controlled",
            criterion,
            [config.inputs.t09_log_file, config.inputs.t14_log_file, config.inputs.insights_file],
            {
              active_rules: t09.summary.active_rules,
              deferred_rules: t09.summary.deferred_rules,
              bucket_counts: t14.summary.bucket_counts,
            },
          )
        : failCriterion(
            "normalization_noise_is_controlled",
            criterion,
            [config.inputs.t09_log_file, config.inputs.t14_log_file, config.inputs.insights_file],
            {
              t09_status: t09.status,
              t14_summary: t14.summary,
            },
          ),
    );
  }

  {
    const criterion = criteriaMap.determinism_is_sufficient;
    const ok =
      Array.isArray(t10.blocked_ids) &&
      t10.blocked_ids.length === 0 &&
      Array.isArray(t10.records) &&
      t10.records.every((entry) => entry.stable === true);
    results.push(
      ok
        ? passCriterion("determinism_is_sufficient", criterion, [config.inputs.t10_report_file], {
            blocked_ids: t10.blocked_ids,
            rerun_count: t10.rerun_count,
            repeatable_ids: t10.repeatable_ids,
          })
        : failCriterion("determinism_is_sufficient", criterion, [config.inputs.t10_report_file], {
            blocked_ids: t10.blocked_ids,
            unstable_records: (t10.records || []).filter((entry) => entry.stable !== true),
          }),
    );
  }

  {
    const criterion = criteriaMap.stock_coverage_is_used_where_available;
    const ok =
      includesAll(t06Report, [
        "| `valid-newpayload` | `full` | `stock_only` |",
        "| `invalid-newpayload` | `full` | `stock_only` |",
        "Do not build a separate MVP custom scenario for baseline valid newPayload acceptance",
        "Do not allocate custom MVP driver scope to baseline invalid newPayload acceptance",
      ]) &&
      t07.validations.find(
        (entry) =>
          entry.check ===
          "driver uses thin Docker-backed bootstrap and does not include stock-only newPayload scenarios",
      )?.status === "pass";
    results.push(
      ok
        ? passCriterion(
            "stock_coverage_is_used_where_available",
            criterion,
            [config.inputs.t06_report_file, config.inputs.t07_log_file],
            {
              stock_only_behaviors: ["valid-newpayload", "invalid-newpayload"],
            },
          )
        : failCriterion(
            "stock_coverage_is_used_where_available",
            criterion,
            [config.inputs.t06_report_file, config.inputs.t07_log_file],
            {
              t07_validations: t07.validations,
            },
          ),
    );
  }

  {
    const criterion = criteriaMap.thin_driver_is_still_justified;
    const ok =
      t07.status === "pass" &&
      t14.status === "pass" &&
      t14.summary.bucket_counts["diverge across clients"] === 0 &&
      includesAll(insights, [
        "Client-Local Runtime Values Must Not Become Cross-Client Keys",
        "Unknown Payload Needs A Provenance-Aware Input Class",
      ]);
    results.push(
      ok
        ? passCriterion(
            "thin_driver_is_still_justified",
            criterion,
            [config.inputs.t07_log_file, config.inputs.t14_log_file, config.inputs.insights_file],
            {
              t07_scope: t07.summary.scope_classification,
              t14_bucket_counts: t14.summary.bucket_counts,
            },
          )
        : failCriterion(
            "thin_driver_is_still_justified",
            criterion,
            [config.inputs.t07_log_file, config.inputs.t14_log_file, config.inputs.insights_file],
            {
              t07_status: t07.status,
              t14_status: t14.status,
            },
          ),
    );
  }

  {
    const criterion = criteriaMap.custom_code_scope_is_limited;
    const ok =
      t09.status === "pass" &&
      t14.status === "pass" &&
      t07.validations.find(
        (entry) =>
          entry.check ===
          "driver uses thin Docker-backed bootstrap and does not include stock-only newPayload scenarios",
      )?.status === "pass";
    results.push(
      ok
        ? passCriterion(
            "custom_code_scope_is_limited",
            criterion,
            [config.inputs.t07_log_file, config.inputs.t09_log_file, config.inputs.t14_log_file],
            {
              custom_workstreams: ["scenario driving", "normalization", "result recording"],
            },
          )
        : failCriterion(
            "custom_code_scope_is_limited",
            criterion,
            [config.inputs.t07_log_file, config.inputs.t09_log_file, config.inputs.t14_log_file],
            {
              t07_status: t07.status,
              t09_status: t09.status,
              t14_status: t14.status,
            },
          ),
    );
  }

  return results;
}

function buildDecision(criteria, testCase) {
  const failed = criteria.filter((entry) => entry.status === "fail");
  const blocked = criteria.filter((entry) => entry.status === "blocked");
  const passCount = criteria.filter((entry) => entry.status === "pass").length;
  const decision = failed.length === 0 && blocked.length === 0 ? testCase.expected_decision : "no-go";
  return {
    decision,
    pass_count: passCount,
    fail_count: failed.length,
    blocked_count: blocked.length,
    failed_criteria: failed.map((entry) => entry.id),
    blocked_criteria: blocked.map((entry) => entry.id),
    rationale:
      decision === "go"
        ? "All MVP acceptance criteria passed on current Paris geth/reth evidence."
        : "At least one MVP acceptance criterion failed or remains blocked.",
    next_steps:
      decision === "go"
        ? testCase.go_next_steps
        : testCase.no_go_next_steps,
  };
}

function buildReport(criteria, decision) {
  const lines = [];
  lines.push("# T15 MVP Acceptance Review");
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
  for (const step of decision.next_steps) {
    lines.push(`- ${step}`);
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
    throw new Error(
      "usage: --config <file> --test-case <file> --output <file> --report <file> --decision <file>",
    );
  }

  const rootDir = process.cwd();
  const config = readJson(configPath);
  const testCase = readJson(testCasePath);
  ensureEqual(config.task_id, "T15", "config.task_id");
  ensureEqual(testCase.task_id, "T15", "testCase.task_id");
  ensureArray(config.required_artifacts, "config.required_artifacts");
  ensureArray(testCase.criteria, "testCase.criteria");
  ensureArray(testCase.go_next_steps, "testCase.go_next_steps");
  ensureArray(testCase.no_go_next_steps, "testCase.no_go_next_steps");

  const artifactRecords = [];
  for (const artifactPath of config.required_artifacts) {
    ensureFile(path.join(rootDir, artifactPath), "required artifact");
    artifactRecords.push(buildArtifactRecord(artifactPath));
  }

  const criteria = evaluateCriteria(rootDir, config, testCase);
  const decision = buildDecision(criteria, testCase);

  const validations = [
    {
      check: "every acceptance criterion is marked pass, fail, or blocked",
      status: criteria.every((entry) => ["pass", "fail", "blocked"].includes(entry.status)) ? "pass" : "fail",
      details: criteria.map((entry) => ({ id: entry.id, status: entry.status })),
    },
    {
      check: "any blocked criterion has concrete remediation",
      status:
        criteria.filter((entry) => entry.status === "blocked").length === 0 || decision.next_steps.length > 0
          ? "pass"
          : "fail",
      details: {
        blocked_criteria: criteria.filter((entry) => entry.status === "blocked").map((entry) => entry.id),
        next_steps: decision.next_steps,
      },
    },
    {
      check: "go decision matches expected decision",
      status: decision.decision === testCase.expected_decision ? "pass" : "fail",
      details: {
        expected_decision: testCase.expected_decision,
        actual_decision: decision.decision,
      },
    },
  ];

  const log = {
    taskId: "T15",
    generatedAt: new Date().toISOString(),
    status: validations.every((entry) => entry.status === "pass") ? "pass" : "fail",
    executionMode: "offline-acceptance-review",
    inputs: {
      config_file: path.relative(rootDir, configPath),
      test_case_file: path.relative(rootDir, testCasePath),
      criteria_count: criteria.length,
    },
    summary: {
      decision: decision.decision,
      pass_count: decision.pass_count,
      fail_count: decision.fail_count,
      blocked_count: decision.blocked_count,
    },
    criteria,
    validations,
  };

  writeJson(outputPath, log);
  writeJson(decisionPath, decision);
  writeText(reportPath, buildReport(criteria, decision));

  if (log.status !== "pass") {
    throw new Error("T15 MVP acceptance review failed validation");
  }

  console.log(`T15 MVP acceptance review passed with decision: ${decision.decision}.`);
}

main();
