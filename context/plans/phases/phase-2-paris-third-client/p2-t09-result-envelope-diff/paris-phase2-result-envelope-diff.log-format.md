# P2-T09 Log Format

Primary files:

- [paris-phase2-result-envelope-diff.log.json](/Users/ningyuhe/Documents/execution-apis/context/plans/phases/phase-2-paris-third-client/p2-t09-result-envelope-diff/paris-phase2-result-envelope-diff.log.json)
- [paris-phase2-result-envelopes.json](/Users/ningyuhe/Documents/execution-apis/context/plans/phases/phase-2-paris-third-client/p2-t09-result-envelope-diff/paris-phase2-result-envelopes.json)
- [paris-phase2-result-envelope-diff.json](/Users/ningyuhe/Documents/execution-apis/context/plans/phases/phase-2-paris-third-client/p2-t09-result-envelope-diff/paris-phase2-result-envelope-diff.json)
- [paris-phase2-discrepancy-ledger.json](/Users/ningyuhe/Documents/execution-apis/context/plans/phases/phase-2-paris-third-client/p2-t09-result-envelope-diff/paris-phase2-discrepancy-ledger.json)

`log.json` top-level fields:

- `taskId`
- `generatedAt`
- `status`
- `executionMode`
- `inputs`
- `summary`
- `validations`

`result-envelopes.json` fields:

- `taskId`
- `generatedAt`
- `envelopes`

Per-envelope fields:

- `scenario_id`
- `client`
- `fork`
- `bootstrap_digest`
- `raw_responses`
- `normalized_responses`
- `client_runtime_state`
- `outcome_bucket`

`result-envelope-diff.json` fields:

- `matrixComparisons`
- `pairwiseComparisons`

`discrepancy-ledger.json` fields:

- `scenario_id`
- `comparison_scope`
- `pair`
- `bucket`
- `baseline_label`
- `triage`
- `notes`
