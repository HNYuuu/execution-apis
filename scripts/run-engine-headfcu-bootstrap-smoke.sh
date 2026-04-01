#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CONFIG_FILE="$ROOT_DIR/context/plans/t04-headfcu-bootstrap-smoke/paris-headfcu-bootstrap-smoke.config.json"
TEST_CASE_FILE="$ROOT_DIR/context/plans/t04-headfcu-bootstrap-smoke/paris-headfcu-bootstrap-smoke.test-case.json"
OUTPUT_FILE="$ROOT_DIR/context/plans/t04-headfcu-bootstrap-smoke/paris-headfcu-bootstrap-smoke.log.json"

node "$ROOT_DIR/scripts/engine-headfcu-bootstrap-smoke.js" \
  --config "$CONFIG_FILE" \
  --test-case "$TEST_CASE_FILE" \
  --output "$OUTPUT_FILE"
