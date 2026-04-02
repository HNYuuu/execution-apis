#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CONFIG_FILE="$ROOT_DIR/context/plans/phases/phase-2-paris-third-client/p2-t07-corpus-and-normalization-review/paris-phase2-corpus-and-normalization-review.config.json"
TEST_CASE_FILE="$ROOT_DIR/context/plans/phases/phase-2-paris-third-client/p2-t07-corpus-and-normalization-review/paris-phase2-corpus-and-normalization-review.test-case.json"
OUTPUT_FILE="$ROOT_DIR/context/plans/phases/phase-2-paris-third-client/p2-t07-corpus-and-normalization-review/paris-phase2-corpus-and-normalization-review.log.json"

node "$ROOT_DIR/scripts/engine-phase2-corpus-and-normalization-review.js" \
  --config "$CONFIG_FILE" \
  --test-case "$TEST_CASE_FILE" \
  --output "$OUTPUT_FILE"
