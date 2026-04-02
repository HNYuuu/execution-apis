# P2-T08 Log Format

Primary file:

- [paris-phase2-determinism-probe.log.json](/Users/ningyuhe/Documents/execution-apis/context/plans/phases/phase-2-paris-third-client/p2-t08-determinism-probe/paris-phase2-determinism-probe.log.json)

Top-level fields:

- `taskId`
- `generatedAt`
- `status`
- `executionMode`
- `inputs`
- `validations`
- `summary`

`summary` fields:

- `manual_decision_applied`
- `runtime_reruns`
- `stable_record_count`
- `unstable_record_count`
- `repeatable_ids`
- `blocked_ids`
- `records`

Per-record fields:

- `id`
- `client`
- `run_count`
- `stable`
- `normalized_digest`
- `snapshots`

Rerun artifacts:

- `runtime-reruns/p2-t05-rerun*/paris-phase2-early-runtime-scenarios.log.json`
- `runtime-reruns/p2-t06-rerun*/paris-phase2-build-and-unknown-scenarios.log.json`
