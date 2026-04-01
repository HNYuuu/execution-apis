# T13 Scenario Log Format

## File

- `paris-t13-scenarios.log.json`

## Top-Level Fields

- `taskId`: fixed to `T13`
- `generatedAt`: ISO-8601 timestamp
- `status`: `pass` or `fail`
- `executionMode`: expected `real-runtime`
- `inputs`: config path, test-case path, scenario paths, and normalization
  profile path
- `summary`: client list, scenario ids, and repeat-scenario semantic mode
- `validations`: artifact checks, repeat-FCU stability checks, and unknown
  payloadId normalized-category checks
- `clientRuns`: per-client execution records

## Per-Client Record

- `client`
- `docker_image`
- `container_name`
- `raw_log_file`
- `bootstrap_fcu`
- `latest_header`
- `scenarios.repeat_fcu_same_head`
- `scenarios.unknown_payloadid`

## Comparison Discipline

- `repeat_fcu_same_head` is implemented as a repeated valid-ancestor shortcut
  request to match `PARIS-METHOD-FCU-03`
- `unknown_payloadid` compares normalized error category, not raw message text
