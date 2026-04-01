# T03 RLP Bootstrap Smoke Log Format

The `T03` MVP writes a single JSON log file at:

- [paris-rlp-bootstrap-smoke.log.json](/Users/ningyuhe/Documents/execution-apis/context/plans/t03-rlp-bootstrap-smoke/paris-rlp-bootstrap-smoke.log.json)

Required top-level fields:

- `taskId`
- `generatedAt`
- `status`
- `executionMode`
- `inputs`
- `summary`
- `validations`
- `referenceObservation`
- `clientPlans`

Validation record fields:

- `check`
- `status`
- `details`

Client plan fields:

- `client`
- `status`
- `bootstrap_mode`
- `request_sequence`
- `execution_blocker`

This log format is intentionally split in two layers:

- `referenceObservation` captures the imported-head baseline derived from local
  chain fixtures
- `clientPlans` records the exact per-client requests that later runtime
  wiring must execute against `geth` and `reth`
