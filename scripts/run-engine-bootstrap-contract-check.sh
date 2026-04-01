#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CONFIG_FILE="$ROOT_DIR/context/plans/t02-bootstrap-contract/paris-mvp-bootstrap-definitions.json"
TEST_CASE_FILE="$ROOT_DIR/context/plans/t02-bootstrap-contract/paris-mvp-bootstrap-contract.test-case.json"
OUTPUT_FILE="$ROOT_DIR/context/plans/t02-bootstrap-contract/paris-mvp-bootstrap-contract.log.json"

node "$ROOT_DIR/scripts/engine-bootstrap-contract-check.js" \
  --config "$CONFIG_FILE" \
  --test-case "$TEST_CASE_FILE" \
  --output "$OUTPUT_FILE"
