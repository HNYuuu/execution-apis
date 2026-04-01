# T08 Response Corpus Log Format

## Files

- `paris-response-corpus.log.json`
- `paris-response-corpus.samples.json`

## Log File

- `taskId`: fixed to `T08`
- `generatedAt`: ISO-8601 timestamp
- `status`: `pass` or `fail`
- `executionMode`: expected `offline-from-real-runtime-logs`
- `inputs`: config path, test-case path, and source log list
- `summary`: source tasks, categories, sample count, and order-only samples
- `validations`: artifact checks, coverage checks, normalization-seed checks,
  and explicit deferred-input checks

## Sample Corpus File

- `taskId`: fixed to `T08`
- `corpusVersion`: expected `v0`
- `summary`: same corpus-level overview used by the log
- `samples`: sampled request or response pairs across `geth` and `reth`
- `legal_representation_differences`: explicitly observed noise categories that
  normalization may absorb
- `semantic_field_inventory`: fields that must remain comparison targets
- `deferred_inputs`: payloadId-dependent or error-shape branches not yet
  collected in the corpus

## Sample Record

- `sample_id`: stable identifier for a sampled pair
- `source_task`: one of `T03`, `T04`, or `T07`
- `scenario_id`: originating scenario name
- `method`: RPC or Engine API method
- `category`: `bootstrap` or `runtime`
- `raw_equal`: whether the raw JSON encodings are byte-for-byte equal
- `normalized_equal`: whether stable-key normalization removes the difference
- `observed_difference_type`: `exact_match`, `object_field_order_only`, or
  `semantic_difference`
- `semantic_fields`: fields that remain meaningful after normalization
- `geth` and `reth`: the sampled values
