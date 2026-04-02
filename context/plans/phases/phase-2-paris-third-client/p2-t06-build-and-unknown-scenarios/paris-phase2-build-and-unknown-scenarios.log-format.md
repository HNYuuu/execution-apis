# P2-T06 Build And Unknown Scenarios Log Format

The phase-2 build-lifecycle run writes a single JSON log at:

- [paris-phase2-build-and-unknown-scenarios.log.json](/Users/ningyuhe/Documents/execution-apis/context/plans/phases/phase-2-paris-third-client/p2-t06-build-and-unknown-scenarios/paris-phase2-build-and-unknown-scenarios.log.json)

Required top-level fields:

- `taskId`
- `generatedAt`
- `status`
- `executionMode`
- `inputs`
- `summary`
- `validations`
- `scenarios`

`scenarios.fcu_build_getpayload_newpayload[]` must retain:

- `client`
- `client_runtime_state`
- `steps`
- `invariant_evaluations`
- `newpayload_category_evaluation`

`scenarios.unknown_payloadid[]` must retain:

- `client`
- `seed_build`
- `request`
- `response`
- `normalized_error_category`
- `invariant_evaluation`

Raw runtime evidence is stored as per-scenario per-client Docker logs in the
same directory.
