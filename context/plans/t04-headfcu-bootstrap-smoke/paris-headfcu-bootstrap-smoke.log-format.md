# T04 Headfcu Bootstrap Smoke Log Format

The `T04` runtime writes:

- [paris-headfcu-bootstrap-smoke.log.json](/Users/ningyuhe/Documents/execution-apis/context/plans/t04-headfcu-bootstrap-smoke/paris-headfcu-bootstrap-smoke.log.json)

Expected companion raw boot logs:

- `paris-headfcu-bootstrap-smoke.log.geth.run1.raw.log`
- `paris-headfcu-bootstrap-smoke.log.geth.run2.raw.log`
- `paris-headfcu-bootstrap-smoke.log.reth.run1.raw.log`
- `paris-headfcu-bootstrap-smoke.log.reth.run2.raw.log`

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
- `http_host`
- `http_port`
- `auth_host`
- `auth_port`
- `raw_log_file`
- `requests`
- `observation`

The JSON log preserves:

- the authenticated `engine_forkchoiceUpdatedV3` request and response
- the post-replay `eth_blockNumber` result
- the post-replay `eth_getBlockByNumber(latest, false)` result

The `.raw.log` files preserve client startup and import output for debugging.
