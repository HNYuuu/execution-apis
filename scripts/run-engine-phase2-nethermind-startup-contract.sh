#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

node scripts/engine-phase2-nethermind-startup-contract.js \
  --config context/plans/phases/phase-2-paris-third-client/p2-t02-nethermind-startup-contract/paris-nethermind-startup-contract.config.json \
  --test-case context/plans/phases/phase-2-paris-third-client/p2-t02-nethermind-startup-contract/paris-nethermind-startup-contract.test-case.json \
  --output context/plans/phases/phase-2-paris-third-client/p2-t02-nethermind-startup-contract/paris-nethermind-startup-contract.log.json
