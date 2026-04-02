#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CONFIG_FILE="$ROOT_DIR/context/plans/phases/phase-2-paris-third-client/p2-t06-build-and-unknown-scenarios/paris-phase2-build-and-unknown-scenarios.config.json"
TEST_CASE_FILE="$ROOT_DIR/context/plans/phases/phase-2-paris-third-client/p2-t06-build-and-unknown-scenarios/paris-phase2-build-and-unknown-scenarios.test-case.json"
OUTPUT_FILE="$ROOT_DIR/context/plans/phases/phase-2-paris-third-client/p2-t06-build-and-unknown-scenarios/paris-phase2-build-and-unknown-scenarios.log.json"

node "$ROOT_DIR/scripts/engine-phase2-build-and-unknown-scenarios.js" \
  --config "$CONFIG_FILE" \
  --test-case "$TEST_CASE_FILE" \
  --output "$OUTPUT_FILE"
