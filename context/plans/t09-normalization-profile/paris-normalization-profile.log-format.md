# T09 Normalization Profile Log Format

## Files

- `paris-normalization-profile.log.json`
- `paris-normalization-profile.json`
- `paris-normalization-profile.examples.json`

## Log File

- `taskId`: fixed to `T09`
- `generatedAt`: ISO-8601 timestamp
- `status`: `pass` or `fail`
- `executionMode`: expected `offline-from-real-runtime-corpus`
- `inputs`: config path, test-case path, and corpus path
- `summary`: profile id, active rules, deferred rules, ignored fields, example
  count, and accepted order-only example ids
- `validations`: artifact checks, noise-suppression checks, semantic-field
  preservation checks, and deferred-rule disclosure

## Profile File

- `profile_id`
- `comparison_fields`
- `equivalence_rules`
- `ignored_fields`
- `client_notes`
- `non_normalizable_fields`

## Examples File

- `example_id`
- `source_task`
- `scenario_id`
- `rule_decision`
- `raw_equal`
- `normalized_equal`
- `observed_difference_type`
- `semantic_fields`
- `geth`
- `reth`
