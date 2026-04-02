#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CONFIG_FILE="$ROOT_DIR/context/plans/phases/phase-2-paris-third-client/p2-t04-bootstrap-validation/paris-phase2-bootstrap-validation.config.json"
TEST_CASE_FILE="$ROOT_DIR/context/plans/phases/phase-2-paris-third-client/p2-t04-bootstrap-validation/paris-phase2-bootstrap-validation.test-case.json"
OUTPUT_FILE="$ROOT_DIR/context/plans/phases/phase-2-paris-third-client/p2-t04-bootstrap-validation/paris-phase2-bootstrap-validation.log.json"

node "$ROOT_DIR/scripts/engine-phase2-bootstrap-validation.js" \
  --config "$CONFIG_FILE" \
  --test-case "$TEST_CASE_FILE" \
  --output "$OUTPUT_FILE"
