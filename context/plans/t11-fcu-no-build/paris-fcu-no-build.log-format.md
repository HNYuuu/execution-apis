# T11 FCU No-Build Log Format

## File

- `paris-fcu-no-build.log.json`

## Top-Level Fields

- `taskId`: fixed to `T11`
- `generatedAt`: ISO-8601 timestamp
- `status`: `pass` or `fail`
- `executionMode`: expected `real-runtime`
- `inputs`: config path, test-case path, scenario path, and normalization
  profile path
- `summary`: scenario id, method, client list, and hard invariant ids
- `validations`: artifact checks, branch checks, invariant checks, and
  comparison-key discipline checks
- `clientRuns`: per-client scenario records

## Per-Client Record

- `client`
- `docker_image`
- `container_name`
- `raw_log_file`
- `bootstrap_fcu`: bootstrap replay response used only to establish `B2`
- `scenario`: request, raw response, and normalized response for
  `engine_forkchoiceUpdatedV1`
- `latest_header`
- `invariant_evaluations`

## Invariant Evaluation Record

- `rule_id`
- `passed`
- `details`
