# T02 Bootstrap Contract Log Format

The `T02` bootstrap-contract checker writes a single JSON log file at:

- [paris-mvp-bootstrap-contract.log.json](/Users/ningyuhe/Documents/execution-apis/context/plans/t02-bootstrap-contract/paris-mvp-bootstrap-contract.log.json)

Required top-level fields:

- `taskId`
- `generatedAt`
- `status`
- `inputs`
- `summary`
- `validations`
- `bootstrapDefinitions`

Validation record format:

- `check`
- `status`
- `details`

Bootstrap definition summary format:

- `bootstrap_mode`
- `state_families`
- `required_artifact_count`
- `observable_confirmation`

Failure rule:

- If any required artifact is missing, any expected bootstrap mode is absent, or
  `B3` or `B4` appear outside `runtime_request_replay`, the checker must exit
  non-zero and no passing log should be trusted.
