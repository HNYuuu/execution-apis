#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_FILE="$ROOT_DIR/context/plans/t13-repeat-fcu-and-unknown-payloadid/paris-t13-scenarios.config.json"
TEST_CASE_FILE="$ROOT_DIR/context/plans/t13-repeat-fcu-and-unknown-payloadid/paris-t13-scenarios.test-case.json"
OUTPUT_FILE="$ROOT_DIR/context/plans/t13-repeat-fcu-and-unknown-payloadid/paris-t13-scenarios.log.json"

node "$ROOT_DIR/scripts/engine-t13-scenarios.js" \
  --config "$CONFIG_FILE" \
  --test-case "$TEST_CASE_FILE" \
  --output "$OUTPUT_FILE"
