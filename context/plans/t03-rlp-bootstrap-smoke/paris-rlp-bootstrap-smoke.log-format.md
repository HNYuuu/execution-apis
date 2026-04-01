# T03 RLP Bootstrap Smoke Log Format

The `T03` runtime writes:

- [paris-rlp-bootstrap-smoke.log.json](/Users/ningyuhe/Documents/execution-apis/context/plans/t03-rlp-bootstrap-smoke/paris-rlp-bootstrap-smoke.log.json)
- [paris-rlp-bootstrap-smoke.log.geth.run1.raw.log](/Users/ningyuhe/Documents/execution-apis/context/plans/t03-rlp-bootstrap-smoke/paris-rlp-bootstrap-smoke.log.geth.run1.raw.log)
- [paris-rlp-bootstrap-smoke.log.geth.run2.raw.log](/Users/ningyuhe/Documents/execution-apis/context/plans/t03-rlp-bootstrap-smoke/paris-rlp-bootstrap-smoke.log.geth.run2.raw.log)
- [paris-rlp-bootstrap-smoke.log.reth.run1.raw.log](/Users/ningyuhe/Documents/execution-apis/context/plans/t03-rlp-bootstrap-smoke/paris-rlp-bootstrap-smoke.log.reth.run1.raw.log)
- [paris-rlp-bootstrap-smoke.log.reth.run2.raw.log](/Users/ningyuhe/Documents/execution-apis/context/plans/t03-rlp-bootstrap-smoke/paris-rlp-bootstrap-smoke.log.reth.run2.raw.log)

Required JSON top-level fields:

- `taskId`
- `generatedAt`
- `status`
- `executionMode`
- `inputs`
- `summary`
- `validations`
- `referenceObservation`
- `clientRuns`

Validation record fields:

- `check`
- `status`
- `details`

Client run fields:

- `client`
- `run`
- `container_name`
- `docker_image`
- `rpc_host`
- `rpc_port`
- `raw_log_file`
- `requests`
- `observation`

The JSON log carries normalized per-run observations. The `.raw.log` files
preserve the original client boot output for later debugging.
