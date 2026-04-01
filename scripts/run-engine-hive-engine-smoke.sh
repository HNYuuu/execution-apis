#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CONFIG_FILE="$ROOT_DIR/context/plans/t05-hive-reality-check/paris-hive-engine-smoke.config.json"
TEST_CASE_FILE="$ROOT_DIR/context/plans/t05-hive-reality-check/paris-hive-engine-smoke.test-case.json"
OUTPUT_FILE="$ROOT_DIR/context/plans/t05-hive-reality-check/paris-hive-engine-smoke.log.json"

node "$ROOT_DIR/scripts/engine-hive-engine-smoke.js" \
  --config "$CONFIG_FILE" \
  --test-case "$TEST_CASE_FILE" \
  --output "$OUTPUT_FILE"
