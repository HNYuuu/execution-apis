#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_FILE="$ROOT_DIR/context/plans/t08-response-corpus/paris-response-corpus.config.json"
TEST_CASE_FILE="$ROOT_DIR/context/plans/t08-response-corpus/paris-response-corpus.test-case.json"
OUTPUT_FILE="$ROOT_DIR/context/plans/t08-response-corpus/paris-response-corpus.log.json"
CORPUS_FILE="$ROOT_DIR/context/plans/t08-response-corpus/paris-response-corpus.samples.json"

node "$ROOT_DIR/scripts/engine-response-corpus.js" \
  --config "$CONFIG_FILE" \
  --test-case "$TEST_CASE_FILE" \
  --output "$OUTPUT_FILE" \
  --corpus "$CORPUS_FILE"
