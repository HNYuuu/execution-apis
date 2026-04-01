#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_FILE="$ROOT_DIR/context/plans/t15-mvp-acceptance/paris-mvp-acceptance.config.json"
TEST_CASE_FILE="$ROOT_DIR/context/plans/t15-mvp-acceptance/paris-mvp-acceptance.test-case.json"
OUTPUT_FILE="$ROOT_DIR/context/plans/t15-mvp-acceptance/paris-mvp-acceptance.log.json"
REPORT_FILE="$ROOT_DIR/context/plans/t15-mvp-acceptance/paris-mvp-acceptance.report.md"
DECISION_FILE="$ROOT_DIR/context/plans/t15-mvp-acceptance/paris-mvp-acceptance.decision.json"

node "$ROOT_DIR/scripts/engine-mvp-acceptance-review.js" \
  --config "$CONFIG_FILE" \
  --test-case "$TEST_CASE_FILE" \
  --output "$OUTPUT_FILE" \
  --report "$REPORT_FILE" \
  --decision "$DECISION_FILE"
