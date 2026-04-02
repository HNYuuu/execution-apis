#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CONFIG_FILE="$ROOT_DIR/context/plans/phases/phase-2-paris-third-client/p2-t08-determinism-probe/paris-phase2-determinism-probe.config.json"
TEST_CASE_FILE="$ROOT_DIR/context/plans/phases/phase-2-paris-third-client/p2-t08-determinism-probe/paris-phase2-determinism-probe.test-case.json"
OUTPUT_FILE="$ROOT_DIR/context/plans/phases/phase-2-paris-third-client/p2-t08-determinism-probe/paris-phase2-determinism-probe.log.json"
REPORT_FILE="$ROOT_DIR/context/plans/phases/phase-2-paris-third-client/p2-t08-determinism-probe/paris-phase2-determinism-probe.report.json"

node "$ROOT_DIR/scripts/engine-phase2-determinism-probe.js" \
  --config "$CONFIG_FILE" \
  --test-case "$TEST_CASE_FILE" \
  --output "$OUTPUT_FILE" \
  --report "$REPORT_FILE"
