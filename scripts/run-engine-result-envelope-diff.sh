#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_FILE="$ROOT_DIR/context/plans/t14-result-envelope-diff/paris-result-envelope-diff.config.json"
TEST_CASE_FILE="$ROOT_DIR/context/plans/t14-result-envelope-diff/paris-result-envelope-diff.test-case.json"
OUTPUT_FILE="$ROOT_DIR/context/plans/t14-result-envelope-diff/paris-result-envelope-diff.log.json"
ENVELOPES_FILE="$ROOT_DIR/context/plans/t14-result-envelope-diff/paris-result-envelopes.json"
DIFF_FILE="$ROOT_DIR/context/plans/t14-result-envelope-diff/paris-result-envelope-diff.json"
REPORT_FILE="$ROOT_DIR/context/plans/t14-result-envelope-diff/paris-result-envelope-diff.report.md"

node "$ROOT_DIR/scripts/engine-result-envelope-diff.js" \
  --config "$CONFIG_FILE" \
  --test-case "$TEST_CASE_FILE" \
  --output "$OUTPUT_FILE" \
  --envelopes "$ENVELOPES_FILE" \
  --diff "$DIFF_FILE" \
  --report "$REPORT_FILE"
