# T14 ResultEnvelope Diff Log Format

Primary output files:

- `paris-result-envelope-diff.log.json`
- `paris-result-envelopes.json`
- `paris-result-envelope-diff.json`
- `paris-result-envelope-diff.report.md`

## `paris-result-envelope-diff.log.json`

- `taskId`: fixed value `T14`
- `generatedAt`: ISO-8601 timestamp
- `status`: `pass | fail`
- `executionMode`: expected to be `offline-artifact-diff`
- `inputs`: config, test-case, normalization-profile, and insights paths
- `summary`: scenario count, envelope count, bucket counts, discrepancy count
- `validations`: task-level validation records

## `paris-result-envelopes.json`

- `taskId`: fixed value `T14`
- `generatedAt`: ISO-8601 timestamp
- `envelopes`: array of `ResultEnvelope` objects

Each envelope contains:

- `scenario_id`
- `client`
- `fork`
- `bootstrap_digest`
- `bootstrap_definition`
- `raw_responses`
- `normalized_responses`
- `client_runtime_state`
- `outcome_bucket`

## `paris-result-envelope-diff.json`

- `taskId`: fixed value `T14`
- `generatedAt`: ISO-8601 timestamp
- `scenarioComparisons`: one entry per scenario id
- `discrepancies`: flattened discrepancy list for any final
  `diverge across clients` scenario

Each comparison entry contains:

- `scenario_id`
- `clients`
- `bootstrap_digests`
- `raw_equal`
- `normalized_equal`
- `final_bucket`
- `notes`
- `discrepancies`
