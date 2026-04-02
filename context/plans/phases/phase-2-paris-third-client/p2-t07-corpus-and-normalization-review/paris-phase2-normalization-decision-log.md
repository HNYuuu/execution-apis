# P2-T07 Normalization Decision Log

## Active Rules Retained

- `stable_object_key_order`
- `canonical_hex_quantity`
- `non_semantic_error_text`
  Scope: phase-2 comparison only for case-only message variation that does not
  change semantic error classification.

## Deferred Rules Retained

- `null_vs_omitted_when_explicitly_allowed`

## Manual Confirmation Applied

- discrepancy id: `P2-D01`
- rule: `non_semantic_error_text`
- decision: case-only error-message differences are not diff targets unless
  they encode semantic divergence
- effect on phase-2 diff: compare `error.code` and normalized error category;
  ignore raw message casing for the current `unknown-payloadid` branch
