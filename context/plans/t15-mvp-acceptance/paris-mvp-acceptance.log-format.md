# T15 MVP Acceptance Log Format

Primary output files:

- `paris-mvp-acceptance.log.json`
- `paris-mvp-acceptance.report.md`
- `paris-mvp-acceptance.decision.json`

## `paris-mvp-acceptance.log.json`

- `taskId`: fixed value `T15`
- `generatedAt`: ISO-8601 timestamp
- `status`: `pass | fail`
- `executionMode`: expected to be `offline-acceptance-review`
- `inputs`: config path, test-case path, and criterion count
- `summary`: final decision and criterion counts
- `criteria`: criterion-level status records with evidence paths and details
- `validations`: task-level validation records

Criterion statuses must be one of:

- `pass`
- `fail`
- `blocked`

## `paris-mvp-acceptance.decision.json`

- `decision`: `go | no-go`
- `pass_count`
- `fail_count`
- `blocked_count`
- `failed_criteria`
- `blocked_criteria`
- `rationale`
- `next_steps`
