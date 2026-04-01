#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_FILE="$ROOT_DIR/context/plans/t11-fcu-no-build/paris-fcu-no-build.config.json"
TEST_CASE_FILE="$ROOT_DIR/context/plans/t11-fcu-no-build/paris-fcu-no-build.test-case.json"
OUTPUT_FILE="$ROOT_DIR/context/plans/t11-fcu-no-build/paris-fcu-no-build.log.json"

node "$ROOT_DIR/scripts/engine-fcu-no-build-scenario.js" \
  --config "$CONFIG_FILE" \
  --test-case "$TEST_CASE_FILE" \
  --output "$OUTPUT_FILE"
