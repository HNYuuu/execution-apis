#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

node scripts/engine-mvp-oracle-gate.js \
  --config context/plans/t01-mvp-oracle-gate/paris-mvp-oracle-gate.config.json \
  --test-case context/plans/t01-mvp-oracle-gate/paris-mvp-oracle-gate.test-case.json \
  --output context/plans/t01-mvp-oracle-gate/paris-mvp-oracle-gate.log.json
