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

function fail(message) {
  throw new Error(message);
}

function ensureArray(value, label) {
  if (!Array.isArray(value) || value.length === 0) {
    fail(`${label} must be a non-empty array`);
  }
}

function sameMembers(actual, expected) {
  const actualSorted = [...actual].sort();
  const expectedSorted = [...expected].sort();
  return JSON.stringify(actualSorted) === JSON.stringify(expectedSorted);
}

function parseInsightIds(markdown) {
  const ids = [];
  const lines = markdown.split("\n");
  for (const line of lines) {
    const match = line.match(/^##\s+(I\d+)\s+/);
    if (match) {
      ids.push(match[1]);
    }
  }
  return ids;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const configPath = args.config;
  const testCasePath = args["test-case"];
  const outputPath = args.output;

  if (!configPath || !testCasePath || !outputPath) {
    fail("usage: --config <file> --test-case <file> --output <file>");
  }

  const rootDir = process.cwd();
  const config = readJson(path.join(rootDir, configPath));
  const testCase = readJson(path.join(rootDir, testCasePath));
  const acceptanceDecision = readJson(path.join(rootDir, config.phase1_acceptance_decision_file));
  const phase1Readme = readUtf8(path.join(rootDir, config.phase1_readme_file));
  const phase1Tracker = readUtf8(path.join(rootDir, config.phase1_tracker_file));
  const phase1Insights = readUtf8(path.join(rootDir, config.phase1_insights_file));

  const validations = [];

  if (config.task_id !== "P2-T01") {
    fail("config.task_id must be P2-T01");
  }
  if (testCase.task_id !== "P2-T01") {
    fail("test-case.task_id must be P2-T01");
  }

  ensureArray(config.accepted_phase1_scenarios, "accepted_phase1_scenarios");
  ensureArray(config.required_insight_ids, "required_insight_ids");
  ensureArray(config.comparison_discipline_rules, "comparison_discipline_rules");
  ensureArray(config.phase2_open_questions, "phase2_open_questions");
  ensureArray(testCase.expected_scenarios, "expected_scenarios");
  ensureArray(testCase.expected_constraint_ids, "expected_constraint_ids");

  if (testCase.expected_phase !== config.phase) {
    fail("test-case expected_phase must match config.phase");
  }
  if (testCase.expected_fork !== config.fork) {
    fail("test-case expected_fork must match config.fork");
  }
  if (testCase.expected_target_new_client !== config.target_new_client) {
    fail("test-case expected_target_new_client must match config.target_new_client");
  }
  if (testCase.expected_phase1_acceptance_decision !== acceptanceDecision.decision) {
    fail("test-case expected_phase1_acceptance_decision must match the phase-1 acceptance decision");
  }

  if (config.phase !== "phase-2") {
    fail("phase must remain phase-2");
  }
  if (config.fork !== "Paris") {
    fail("phase-2 fork must remain Paris");
  }
  if (config.target_new_client !== "nethermind") {
    fail("phase-2 target_new_client must be nethermind");
  }
  validations.push({
    check: "phase-2 scope remains Paris plus nethermind",
    status: "pass",
    details: {
      phase: config.phase,
      fork: config.fork,
      target_new_client: config.target_new_client,
    },
  });

  if (!sameMembers(config.accepted_phase1_scenarios, testCase.expected_scenarios)) {
    fail("phase-2 scenario surface must exactly match the accepted phase-1 scenarios");
  }
  validations.push({
    check: "scenario surface is frozen to the accepted phase-1 set",
    status: "pass",
    details: config.accepted_phase1_scenarios,
  });

  if (!phase1Readme.includes("## Status") || !phase1Readme.includes("`done`")) {
    fail("phase-1 README must still mark phase-1 as done");
  }
  if (!phase1Tracker.includes("| `T15` | MVP acceptance review and go/no-go checkpoint | `done` |")) {
    fail("phase-1 tracker must still mark T15 as done");
  }
  if (acceptanceDecision.decision !== "go") {
    fail("phase-1 acceptance decision must remain go");
  }
  validations.push({
    check: "phase-1 acceptance remains intact",
    status: "pass",
    details: {
      phase1_status: "done",
      t15_status: "done",
      acceptance_decision: acceptanceDecision.decision,
    },
  });

  const observedInsightIds = parseInsightIds(phase1Insights);
  for (const insightId of config.required_insight_ids) {
    if (!observedInsightIds.includes(insightId)) {
      fail(`required insight id missing from phase-1 insights: ${insightId}`);
    }
  }
  validations.push({
    check: "phase-1 comparison-discipline insights are explicitly carried into phase-2",
    status: "pass",
    details: config.required_insight_ids,
  });

  const ruleIds = config.comparison_discipline_rules.map((rule) => rule.id);
  if (!sameMembers(ruleIds, testCase.expected_constraint_ids)) {
    fail("comparison discipline rule ids do not match the expected phase-2 gate set");
  }
  if (config.comparison_discipline_rules.some((rule) => !rule.hard_constraint)) {
    fail("all comparison_discipline_rules must be marked as hard_constraint");
  }
  validations.push({
    check: "comparison discipline is carried as hard constraints rather than notes",
    status: "pass",
    details: config.comparison_discipline_rules.map((rule) => ({
      id: rule.id,
      insight_id: rule.insight_id,
      title: rule.title,
    })),
  });

  if (testCase.forbid_new_scenarios_before_full_surface !== true) {
    fail("test case must forbid new scenarios before the third client reaches the full phase-1 surface");
  }
  validations.push({
    check: "phase-2 still forbids scope widening before nethermind covers the full accepted surface",
    status: "pass",
    details: {
      forbid_new_scenarios_before_full_surface:
        testCase.forbid_new_scenarios_before_full_surface,
    },
  });

  const output = {
    task_id: "P2-T01",
    generated_at: new Date().toISOString(),
    status: "pass",
    inputs: {
      config_file: configPath,
      test_case_file: testCasePath,
      phase1_readme_file: config.phase1_readme_file,
      phase1_tracker_file: config.phase1_tracker_file,
      phase1_insights_file: config.phase1_insights_file,
      phase1_acceptance_decision_file: config.phase1_acceptance_decision_file,
    },
    summary: {
      fork: config.fork,
      target_new_client: config.target_new_client,
      frozen_scenario_count: config.accepted_phase1_scenarios.length,
      hard_constraint_count: config.comparison_discipline_rules.length,
      open_question_count: config.phase2_open_questions.length,
    },
    validations,
    phase2_scope: {
      accepted_phase1_scenarios: config.accepted_phase1_scenarios,
      comparison_discipline_rules: config.comparison_discipline_rules,
      phase2_open_questions: config.phase2_open_questions,
    },
  };

  fs.mkdirSync(path.dirname(path.join(rootDir, outputPath)), { recursive: true });
  fs.writeFileSync(path.join(rootDir, outputPath), JSON.stringify(output, null, 2) + "\n");
  console.log(
    `Phase-2 scope gate passed for ${config.accepted_phase1_scenarios.length} Paris scenarios and ${config.comparison_discipline_rules.length} hard constraints.`,
  );
}

try {
  main();
} catch (error) {
  console.error(`Phase-2 scope gate failed: ${error.message}`);
  process.exit(1);
}
