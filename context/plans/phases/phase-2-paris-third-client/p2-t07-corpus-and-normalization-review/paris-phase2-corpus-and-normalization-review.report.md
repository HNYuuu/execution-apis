# P2-T07 Three-Client Corpus And Normalization Review

## Summary

- source tasks: P2-T04, P2-T05, P2-T06
- clients: geth, reth, nethermind
- sample count: 9
- active rules for phase-2 comparison: stable_object_key_order, canonical_hex_quantity, non_semantic_error_text
- deferred rules unchanged: null_vs_omitted_when_explicitly_allowed

## Review Result

- existing active rules still cover the observed three-client representation noise
- manual follow-up confirmed that case-only error-message differences are not a differential target unless semantics differ
- `non_semantic_error_text` is therefore active for the phase-2 `unknown-payloadid` comparison path, but only as a case-insensitive non-semantic guard
- `null_vs_omitted_when_explicitly_allowed` still has no phase-2 evidence and remains deferred
