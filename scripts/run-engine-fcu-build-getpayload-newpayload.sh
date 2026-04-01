#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_FILE="$ROOT_DIR/context/plans/t12-fcu-build-getpayload-newpayload/paris-fcu-build-getpayload-newpayload.config.json"
TEST_CASE_FILE="$ROOT_DIR/context/plans/t12-fcu-build-getpayload-newpayload/paris-fcu-build-getpayload-newpayload.test-case.json"
OUTPUT_FILE="$ROOT_DIR/context/plans/t12-fcu-build-getpayload-newpayload/paris-fcu-build-getpayload-newpayload.log.json"

node "$ROOT_DIR/scripts/engine-fcu-build-getpayload-newpayload.js" \
  --config "$CONFIG_FILE" \
  --test-case "$TEST_CASE_FILE" \
  --output "$OUTPUT_FILE"
