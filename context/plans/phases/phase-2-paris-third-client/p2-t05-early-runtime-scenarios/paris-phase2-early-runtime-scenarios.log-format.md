# P2-T05 Early Runtime Scenarios Log Format

The phase-2 early runtime run writes a single JSON log at:

- [paris-phase2-early-runtime-scenarios.log.json](/Users/ningyuhe/Documents/execution-apis/context/plans/phases/phase-2-paris-third-client/p2-t05-early-runtime-scenarios/paris-phase2-early-runtime-scenarios.log.json)

Required top-level fields:

- `taskId`
- `generatedAt`
- `status`
- `executionMode`
- `inputs`
- `summary`
- `validations`
- `scenarios`

`scenarios.fcu_no_build[]` must retain:

- `client`
- `request`
- `response`
- `normalized_response`
- `latest_header`
- `invariant_evaluations`

`scenarios.repeat_fcu_same_head[]` must retain:

- `client`
- `semantic_mode`
- `ancestor_hash`
- `first`
- `second`
- `invariant_evaluation`

Raw runtime evidence is stored as per-scenario per-client Docker logs in the
same directory.
