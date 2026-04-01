#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CONFIG_FILE="$ROOT_DIR/context/plans/t06-stock-coverage/paris-stock-coverage.config.json"
TEST_CASE_FILE="$ROOT_DIR/context/plans/t06-stock-coverage/paris-stock-coverage.test-case.json"
OUTPUT_FILE="$ROOT_DIR/context/plans/t06-stock-coverage/paris-stock-coverage.log.json"

node "$ROOT_DIR/scripts/engine-stock-coverage-map.js" \
  --config "$CONFIG_FILE" \
  --test-case "$TEST_CASE_FILE" \
  --output "$OUTPUT_FILE"
