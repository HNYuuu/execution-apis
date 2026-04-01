#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_FILE="$ROOT_DIR/context/plans/t07-runtime-driver/paris-runtime-driver.config.json"
TEST_CASE_FILE="$ROOT_DIR/context/plans/t07-runtime-driver/paris-runtime-driver.test-case.json"
OUTPUT_FILE="$ROOT_DIR/context/plans/t07-runtime-driver/paris-runtime-driver.log.json"

node "$ROOT_DIR/scripts/engine-runtime-scenario-driver.js" \
  --config "$CONFIG_FILE" \
  --test-case "$TEST_CASE_FILE" \
  --output "$OUTPUT_FILE"
