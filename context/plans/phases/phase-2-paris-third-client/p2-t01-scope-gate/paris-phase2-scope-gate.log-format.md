# P2-T01 Log Format

Structured JSON log written by `engine-phase2-scope-gate.js`.

Top-level fields:

- `task_id`
- `generated_at`
- `status`
- `inputs`
- `summary`
- `validations`
- `phase2_scope`

Validation entries:

- `check`
- `status`
- `details`

`phase2_scope` captures:

- frozen phase-1 scenario set reused by phase-2
- hard comparison-discipline constraints carried into the third-client matrix
- phase-2-only open questions that remain unresolved after the scope freeze
