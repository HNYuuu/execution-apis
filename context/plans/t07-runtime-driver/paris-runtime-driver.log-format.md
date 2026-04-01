# T07 Runtime Driver Log Format

## File

- `paris-runtime-driver.log.json`

## Top-Level Fields

- `taskId`: fixed to `T07`
- `generatedAt`: ISO-8601 timestamp
- `status`: `pass` or `fail`
- `executionMode`: expected `real-runtime`
- `inputs`: config path, test-case path, Docker endpoint, and loaded scenario files
- `summary`: clients, scenarios, scope classes, bootstrap mode, and expected head hash
- `validations`: ordered validation records for artifact presence, scope discipline,
  `fcu-no-build`, `repeat-fcu-same-head`, and stock-only exclusions
- `clientRuns`: per-client execution records

## Per-Client Record

- `client`: short client id
- `container_name`: Docker container used for the run
- `docker_image`: runtime image
- `raw_log_file`: path to captured container logs
- `bootstrap_fcu`: authenticated replay result used to establish `B2`
- `latest_header`: final `eth_getBlockByNumber(latest, false)` observation
- `scenarios`: ordered scenario results

## Per-Scenario Record

- `scenario_id`: scenario name
- `requests`: ordered request/response trace
- `normalized_observation`: compact comparison-ready view for the scenario

## Raw Logs

- one raw container log file per client:
  - `paris-runtime-driver.log.geth.raw.log`
  - `paris-runtime-driver.log.reth.raw.log`
