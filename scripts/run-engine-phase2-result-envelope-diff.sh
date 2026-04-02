#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CONFIG_FILE="$ROOT_DIR/context/plans/phases/phase-2-paris-third-client/p2-t09-result-envelope-diff/paris-phase2-result-envelope-diff.config.json"
TEST_CASE_FILE="$ROOT_DIR/context/plans/phases/phase-2-paris-third-client/p2-t09-result-envelope-diff/paris-phase2-result-envelope-diff.test-case.json"
OUTPUT_FILE="$ROOT_DIR/context/plans/phases/phase-2-paris-third-client/p2-t09-result-envelope-diff/paris-phase2-result-envelope-diff.log.json"
ENVELOPES_FILE="$ROOT_DIR/context/plans/phases/phase-2-paris-third-client/p2-t09-result-envelope-diff/paris-phase2-result-envelopes.json"
DIFF_FILE="$ROOT_DIR/context/plans/phases/phase-2-paris-third-client/p2-t09-result-envelope-diff/paris-phase2-result-envelope-diff.json"
LEDGER_FILE="$ROOT_DIR/context/plans/phases/phase-2-paris-third-client/p2-t09-result-envelope-diff/paris-phase2-discrepancy-ledger.json"
REPORT_FILE="$ROOT_DIR/context/plans/phases/phase-2-paris-third-client/p2-t09-result-envelope-diff/paris-phase2-result-envelope-diff.report.md"

node "$ROOT_DIR/scripts/engine-phase2-result-envelope-diff.js" \
  --config "$CONFIG_FILE" \
  --test-case "$TEST_CASE_FILE" \
  --output "$OUTPUT_FILE" \
  --envelopes "$ENVELOPES_FILE" \
  --diff "$DIFF_FILE" \
  --ledger "$LEDGER_FILE" \
  --report "$REPORT_FILE"
