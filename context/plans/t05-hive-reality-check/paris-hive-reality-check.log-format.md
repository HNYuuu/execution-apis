# T05 Hive Reality Check Log Format

The `T05` runtime probe writes a single JSON log file at:

- [paris-hive-reality-check.log.json](/Users/ningyuhe/Documents/execution-apis/context/plans/t05-hive-reality-check/paris-hive-reality-check.log.json)

Required top-level fields:

- `taskId`
- `generatedAt`
- `status`
- `inputs`
- `summary`
- `validations`
- `environment`
- `nextActions`

Validation records must capture:

- `check`
- `status`
- `details`

This task is allowed to end in `blocked` status. A blocked result is still a
valid artifact if it proves which runtime prerequisite is missing and records
the next concrete action needed to unblock real client experiments.
