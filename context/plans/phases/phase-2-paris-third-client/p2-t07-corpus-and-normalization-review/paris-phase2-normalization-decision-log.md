# P2-T07 Normalization Decision Log

## Active Rules Retained

- `stable_object_key_order`
- `canonical_hex_quantity`

## Deferred Rules Retained

- `null_vs_omitted_when_explicitly_allowed`
- `non_semantic_error_text`

## Candidate Activation

- discrepancy id: `P2-D01`
- candidate rule: `non_semantic_error_text`
- decision in this task: remain `deferred`
- reason: manual confirmation is required before activation because the evidence comes from error-text casing differences in the `unknown-payloadid` branch
