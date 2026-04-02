# P2-T04 Bootstrap Validation Log Format

The phase-2 bootstrap validation writes a single combined JSON log at:

- [paris-phase2-bootstrap-validation.log.json](/Users/ningyuhe/Documents/execution-apis/context/plans/phases/phase-2-paris-third-client/p2-t04-bootstrap-validation/paris-phase2-bootstrap-validation.log.json)

Required top-level fields:

- `taskId`
- `generatedAt`
- `status`
- `executionMode`
- `inputs`
- `summary`
- `validations`
- `scenarios`

Each `scenarios[]` item must include:

- `scenario_id`
- `bootstrap_mode`
- `bootstrap_digest`
- `expected_observation`
- `expected_payload_status`
- `runs`
- `per_client`

Each runtime run must retain:

- `client`
- `run`
- `bootstrap_digest`
- `raw_log_file`
- `requests`
- `observation`

This log proves that the accepted phase-1 `B1` and `B2` bootstrap states are
observable on `geth`, `reth`, and `nethermind`, and that all compared runs for
the same pre-state carry the same `bootstrap_digest`.
