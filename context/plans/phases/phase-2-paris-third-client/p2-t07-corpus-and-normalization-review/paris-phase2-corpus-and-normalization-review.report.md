# P2-T07 Three-Client Corpus And Normalization Review

## Summary

- source tasks: P2-T04, P2-T05, P2-T06
- clients: geth, reth, nethermind
- sample count: 9
- active rules unchanged: stable_object_key_order, canonical_hex_quantity
- deferred rules unchanged: null_vs_omitted_when_explicitly_allowed, non_semantic_error_text

## Review Result

- existing active rules still cover the observed three-client representation noise
- no rule moved from deferred to active in this task
- `non_semantic_error_text` now has enough evidence to be recorded as a candidate activation, but it remains deferred pending manual confirmation
- `null_vs_omitted_when_explicitly_allowed` still has no phase-2 evidence and remains deferred
