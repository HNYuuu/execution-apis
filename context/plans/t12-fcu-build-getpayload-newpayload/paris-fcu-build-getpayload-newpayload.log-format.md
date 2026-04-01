# T12 FCU Build/GetPayload/NewPayload Log Format

## File

- `paris-fcu-build-getpayload-newpayload.log.json`

## Top-Level Fields

- `taskId`: fixed to `T12`
- `generatedAt`: ISO-8601 timestamp
- `status`: `pass` or `fail`
- `executionMode`: expected `real-runtime`
- `inputs`: config path, test-case path, scenario path, and normalization
  profile path
- `summary`: scenario id, client list, hard invariant ids, and allowed
  `newPayload` statuses
- `validations`: artifact checks, payloadId-discipline checks, hard invariant
  checks, and per-step response-category checks
- `clientRuns`: per-client execution records

## Per-Client Record

- `client`
- `docker_image`
- `container_name`
- `raw_log_file`
- `bootstrap_fcu`
- `client_runtime_state`: includes the client-local `payloadId`
- `steps.forkchoiceUpdated`
- `steps.getPayload`
- `steps.newPayload`
- `latest_header`
- `invariant_evaluations`
- `newpayload_category_evaluation`

## Comparison Discipline

- `payloadId` remains in `client_runtime_state`
- `forkchoiceUpdated.normalized_response` replaces raw `payloadId` with
  `payloadIdClass`
