#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CONFIG_FILE="$ROOT_DIR/context/plans/phases/phase-2-paris-third-client/p2-t03-nethermind-runtime-reality-check/paris-nethermind-runtime-reality-check.config.json"
TEST_CASE_FILE="$ROOT_DIR/context/plans/phases/phase-2-paris-third-client/p2-t03-nethermind-runtime-reality-check/paris-nethermind-runtime-reality-check.test-case.json"
OUTPUT_FILE="$ROOT_DIR/context/plans/phases/phase-2-paris-third-client/p2-t03-nethermind-runtime-reality-check/paris-nethermind-runtime-reality-check.log.json"

node "$ROOT_DIR/scripts/engine-phase2-nethermind-runtime-reality-check.js" \
  --config "$CONFIG_FILE" \
  --test-case "$TEST_CASE_FILE" \
  --output "$OUTPUT_FILE"
