# P2-T10 Log Format

Primary files:

- [paris-phase2-acceptance.log.json](/Users/ningyuhe/Documents/execution-apis/context/plans/phases/phase-2-paris-third-client/p2-t10-acceptance-review/paris-phase2-acceptance.log.json)
- [paris-phase2-acceptance.report.md](/Users/ningyuhe/Documents/execution-apis/context/plans/phases/phase-2-paris-third-client/p2-t10-acceptance-review/paris-phase2-acceptance.report.md)
- [paris-phase2-acceptance.decision.json](/Users/ningyuhe/Documents/execution-apis/context/plans/phases/phase-2-paris-third-client/p2-t10-acceptance-review/paris-phase2-acceptance.decision.json)

`log.json` top-level fields:

- `taskId`
- `generatedAt`
- `status`
- `executionMode`
- `inputs`
- `summary`
- `validations`

Per-criterion fields:

- `id`
- `label`
- `status`
- `evidence`
- `details`

`decision.json` fields:

- `decision`
- `pass_count`
- `fail_count`
- `blocked_count`
- `failed_criteria`
- `blocked_criteria`
- `rationale`
- `next_steps`
