# T06 Stock Coverage Log Format

The `T06` stock-coverage task writes:

- [paris-stock-coverage.log.json](/Users/ningyuhe/Documents/execution-apis/context/plans/t06-stock-coverage/paris-stock-coverage.log.json)
- [paris-stock-coverage-report.md](/Users/ningyuhe/Documents/execution-apis/context/plans/t06-stock-coverage/paris-stock-coverage-report.md)

Required JSON top-level fields:

- `taskId`
- `generatedAt`
- `status`
- `inputs`
- `summary`
- `validations`
- `behaviorMatrix`
- `removeFromCustomScope`
- `customRuntimeScope`
- `deferredBehaviors`
- `recommendedT07Scope`

Validation record fields:

- `check`
- `status`
- `details`

Behavior-matrix record fields:

- `behavior`
- `stock_coverage_level`
- `recommended_owner`
- `primary_stock_paths`
- `evidence`
- `rationale`
- `reason_remove_from_custom`
- `reason_custom_runtime`

The JSON log is the machine-checkable source of record.

The Markdown report is the reviewer-oriented rendering of the same coverage
classification and recommended `T07` scope.
