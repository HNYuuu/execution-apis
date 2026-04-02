#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CONFIG_FILE="$ROOT_DIR/context/plans/phases/phase-2-paris-third-client/p2-t05-early-runtime-scenarios/paris-phase2-early-runtime-scenarios.config.json"
TEST_CASE_FILE="$ROOT_DIR/context/plans/phases/phase-2-paris-third-client/p2-t05-early-runtime-scenarios/paris-phase2-early-runtime-scenarios.test-case.json"
OUTPUT_FILE="$ROOT_DIR/context/plans/phases/phase-2-paris-third-client/p2-t05-early-runtime-scenarios/paris-phase2-early-runtime-scenarios.log.json"

node "$ROOT_DIR/scripts/engine-phase2-early-runtime-scenarios.js" \
  --config "$CONFIG_FILE" \
  --test-case "$TEST_CASE_FILE" \
  --output "$OUTPUT_FILE"
