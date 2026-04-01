#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_FILE="$ROOT_DIR/context/plans/t10-determinism-probe/paris-determinism-probe.config.json"
TEST_CASE_FILE="$ROOT_DIR/context/plans/t10-determinism-probe/paris-determinism-probe.test-case.json"
OUTPUT_FILE="$ROOT_DIR/context/plans/t10-determinism-probe/paris-determinism-probe.log.json"
REPORT_FILE="$ROOT_DIR/context/plans/t10-determinism-probe/paris-determinism-probe.report.json"

node "$ROOT_DIR/scripts/engine-determinism-probe.js" \
  --config "$CONFIG_FILE" \
  --test-case "$TEST_CASE_FILE" \
  --output "$OUTPUT_FILE" \
  --report "$REPORT_FILE"
