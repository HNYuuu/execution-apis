# P2-T02 Log Format

Structured JSON log written by `engine-phase2-nethermind-startup-contract.js`.

Top-level fields:

- `task_id`
- `generated_at`
- `status`
- `inputs`
- `summary`
- `validations`
- `startup_contract`

`startup_contract` contains:

- `acquisition_contract`
- `nethermind_runtime_contract`
- `parity_notes`
- `explicit_blockers`

`explicit_blockers` must stay explicit even when the task passes, because phase-2
task 3 should fail fast on environment readiness instead of rediscovering the
same missing-image condition indirectly.
