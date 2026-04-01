#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

node scripts/engine-phase2-scope-gate.js \
  --config context/plans/phases/phase-2-paris-third-client/p2-t01-scope-gate/paris-phase2-scope-gate.config.json \
  --test-case context/plans/phases/phase-2-paris-third-client/p2-t01-scope-gate/paris-phase2-scope-gate.test-case.json \
  --output context/plans/phases/phase-2-paris-third-client/p2-t01-scope-gate/paris-phase2-scope-gate.log.json
