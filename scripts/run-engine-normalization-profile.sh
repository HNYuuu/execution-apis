#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_FILE="$ROOT_DIR/context/plans/t09-normalization-profile/paris-normalization-profile.config.json"
TEST_CASE_FILE="$ROOT_DIR/context/plans/t09-normalization-profile/paris-normalization-profile.test-case.json"
OUTPUT_FILE="$ROOT_DIR/context/plans/t09-normalization-profile/paris-normalization-profile.log.json"
PROFILE_FILE="$ROOT_DIR/context/plans/t09-normalization-profile/paris-normalization-profile.json"
EXAMPLES_FILE="$ROOT_DIR/context/plans/t09-normalization-profile/paris-normalization-profile.examples.json"

node "$ROOT_DIR/scripts/engine-normalization-profile.js" \
  --config "$CONFIG_FILE" \
  --test-case "$TEST_CASE_FILE" \
  --output "$OUTPUT_FILE" \
  --profile "$PROFILE_FILE" \
  --examples "$EXAMPLES_FILE"
