#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CONFIG_FILE="$ROOT_DIR/context/plans/t03-rlp-bootstrap-smoke/paris-rlp-bootstrap-smoke.config.json"
TEST_CASE_FILE="$ROOT_DIR/context/plans/t03-rlp-bootstrap-smoke/paris-rlp-bootstrap-smoke.test-case.json"
OUTPUT_FILE="$ROOT_DIR/context/plans/t03-rlp-bootstrap-smoke/paris-rlp-bootstrap-smoke.log.json"

node "$ROOT_DIR/scripts/engine-rlp-bootstrap-smoke.js" \
  --config "$CONFIG_FILE" \
  --test-case "$TEST_CASE_FILE" \
  --output "$OUTPUT_FILE"
