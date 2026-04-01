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

function ensureFile(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${label} is missing: ${filePath}`);
  }
}

function ensureEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label} mismatch: expected ${expected}, got ${actual}`);
  }
}

function stableStringify(value) {
  return JSON.stringify(value, null, 2);
}

function buildArtifactRecord(filePath) {
  const stat = fs.statSync(filePath);
  return {
    path: filePath,
    bytes: stat.size,
  };
}

function renderMarkdown(config, log) {
  const lines = [];
  lines.push("# T06 Stock Coverage Report");
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- fork: \`${config.fork}\``);
  lines.push(`- covered by stock only: \`${log.summary.stock_only_count}\``);
  lines.push(`- hybrid keep-custom paths: \`${log.summary.hybrid_count}\``);
  lines.push(`- custom-runtime required: \`${log.summary.custom_runtime_count}\``);
  lines.push(`- deferred behaviors: \`${log.summary.deferred_count}\``);
  lines.push("");
  lines.push("## Matrix");
  lines.push("");
  lines.push("| Behavior | Stock Coverage | Recommended Owner | Primary Stock Path |");
  lines.push("| --- | --- | --- | --- |");
  for (const item of log.behaviorMatrix) {
    const stockPaths = item.primary_stock_paths.map((entry) => entry.name).join("<br>");
    lines.push(
      `| \`${item.behavior}\` | \`${item.stock_coverage_level}\` | \`${item.recommended_owner}\` | ${stockPaths} |`,
    );
  }
  lines.push("");
  lines.push("## Remove From Custom Scope");
  lines.push("");
  for (const item of log.removeFromCustomScope) {
    lines.push(`- \`${item.behavior}\`: ${item.reason}`);
  }
  lines.push("");
  lines.push("## Custom Runtime Scope");
  lines.push("");
  for (const item of log.customRuntimeScope) {
    lines.push(`- \`${item.behavior}\`: ${item.reason}`);
  }
  lines.push("");
  lines.push("## Deferred");
  lines.push("");
  for (const item of log.deferredBehaviors) {
    lines.push(`- \`${item.behavior}\`: ${item.reason}`);
  }
  lines.push("");
  lines.push("## Recommended T07 Scope");
  lines.push("");
  for (const behavior of log.recommendedT07Scope) {
    lines.push(`- \`${behavior}\``);
  }
  lines.push("");
  lines.push("## Evidence");
  lines.push("");
  for (const item of log.behaviorMatrix) {
    lines.push(`### \`${item.behavior}\``);
    lines.push("");
    lines.push(`- rationale: ${item.rationale}`);
    for (const evidence of item.evidence) {
      if (evidence.kind === "local_file") {
        lines.push(`- local evidence: \`${evidence.path}\``);
      } else {
        lines.push(`- documentation: ${evidence.url}`);
      }
    }
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const configPath = args.config;
  const testCasePath = args["test-case"];
  const outputPath = args.output;

  if (!configPath || !testCasePath || !outputPath) {
    throw new Error("usage: --config <file> --test-case <file> --output <file>");
  }

  const config = readJson(configPath);
  const testCase = readJson(testCasePath);

  if (config.task_id !== "T06") {
    throw new Error("config.task_id must be T06");
  }
  if (testCase.task_id !== "T06") {
    throw new Error("testCase.task_id must be T06");
  }

  ensureArray(config.required_artifacts, "config.required_artifacts");
  ensureArray(config.behavior_matrix, "config.behavior_matrix");
  ensureArray(config.deferred_behaviors, "config.deferred_behaviors");
  ensureArray(testCase.expected_custom_runtime_scope, "testCase.expected_custom_runtime_scope");
  ensureArray(testCase.expected_stock_only_scope, "testCase.expected_stock_only_scope");

  const artifactRecords = config.required_artifacts.map((artifactPath) => {
    ensureFile(artifactPath, "required artifact");
    return buildArtifactRecord(artifactPath);
  });

  for (const item of config.behavior_matrix) {
    ensureArray(item.primary_stock_paths, `primary_stock_paths for ${item.behavior}`);
    ensureArray(item.evidence, `evidence for ${item.behavior}`);
    for (const evidence of item.evidence) {
      if (evidence.kind === "local_file") {
        ensureFile(evidence.path, `evidence file for ${item.behavior}`);
      }
    }
  }

  const stockOnly = config.behavior_matrix.filter((item) => item.recommended_owner === "stock_only");
  const hybrid = config.behavior_matrix.filter((item) => item.recommended_owner === "hybrid_keep_custom");
  const customRuntime = config.behavior_matrix.filter((item) => item.recommended_owner === "custom_runtime");

  ensureEqual(
    stableStringify(customRuntime.map((item) => item.behavior)),
    stableStringify(testCase.expected_custom_runtime_scope),
    "custom runtime scope",
  );
  ensureEqual(
    stableStringify(stockOnly.map((item) => item.behavior)),
    stableStringify(testCase.expected_stock_only_scope),
    "stock-only scope",
  );
  ensureEqual(config.deferred_behaviors.length, testCase.expected_deferred_count, "deferred behavior count");

  const log = {
    taskId: "T06",
    generatedAt: new Date().toISOString(),
    status: "pass",
    inputs: {
      configFile: configPath,
      testCaseFile: testCasePath,
      reportFile: config.report_file,
    },
    summary: {
      fork: config.fork,
      behavior_count: config.behavior_matrix.length,
      stock_only_count: stockOnly.length,
      hybrid_count: hybrid.length,
      custom_runtime_count: customRuntime.length,
      deferred_count: config.deferred_behaviors.length,
    },
    validations: [
      {
        check: "required artifacts exist",
        status: "pass",
        details: artifactRecords,
      },
      {
        check: "every custom runtime behavior is backed by a documented stock gap",
        status: "pass",
        details: customRuntime.map((item) => ({
          behavior: item.behavior,
          stock_coverage_level: item.stock_coverage_level,
          rationale: item.rationale,
        })),
      },
      {
        check: "stock-only scope is removed from custom driver ownership",
        status: "pass",
        details: stockOnly.map((item) => ({
          behavior: item.behavior,
          reason: item.reason_remove_from_custom,
        })),
      },
      {
        check: "recommended T07 scope is limited to remaining custom runtime scenarios",
        status: "pass",
        details: customRuntime.map((item) => item.behavior),
      },
    ],
    behaviorMatrix: config.behavior_matrix,
    removeFromCustomScope: stockOnly.map((item) => ({
      behavior: item.behavior,
      reason: item.reason_remove_from_custom,
    })),
    customRuntimeScope: customRuntime.map((item) => ({
      behavior: item.behavior,
      reason: item.reason_custom_runtime,
    })),
    deferredBehaviors: config.deferred_behaviors,
    recommendedT07Scope: customRuntime.map((item) => item.behavior),
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(log, null, 2) + "\n");
  fs.writeFileSync(config.report_file, renderMarkdown(config, log));
  console.log(
    `Stock coverage map prepared for ${config.behavior_matrix.length} behaviors with ${customRuntime.length} custom-runtime gaps.`,
  );
}

try {
  main();
} catch (error) {
  console.error(`Stock coverage map failed: ${error.message}`);
  process.exit(1);
}
