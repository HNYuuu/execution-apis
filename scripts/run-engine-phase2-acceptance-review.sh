#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CONFIG_FILE="$ROOT_DIR/context/plans/phases/phase-2-paris-third-client/p2-t10-acceptance-review/paris-phase2-acceptance.config.json"
TEST_CASE_FILE="$ROOT_DIR/context/plans/phases/phase-2-paris-third-client/p2-t10-acceptance-review/paris-phase2-acceptance.test-case.json"
OUTPUT_FILE="$ROOT_DIR/context/plans/phases/phase-2-paris-third-client/p2-t10-acceptance-review/paris-phase2-acceptance.log.json"
REPORT_FILE="$ROOT_DIR/context/plans/phases/phase-2-paris-third-client/p2-t10-acceptance-review/paris-phase2-acceptance.report.md"
DECISION_FILE="$ROOT_DIR/context/plans/phases/phase-2-paris-third-client/p2-t10-acceptance-review/paris-phase2-acceptance.decision.json"

node "$ROOT_DIR/scripts/engine-phase2-acceptance-review.js" \
  --config "$CONFIG_FILE" \
  --test-case "$TEST_CASE_FILE" \
  --output "$OUTPUT_FILE" \
  --report "$REPORT_FILE" \
  --decision "$DECISION_FILE"
