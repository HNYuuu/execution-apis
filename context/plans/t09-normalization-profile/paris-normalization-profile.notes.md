# T09 Normalization Profile Notes

## Scope

- `NormalizationProfile v0` is intentionally conservative.
- It activates only rules that are either directly observed in the corpus or
  required to keep comparison targets stable.
- It does not claim support for error-text or null-vs-omitted equivalence until
  those branches exist in the real corpus.

## Active Rules

- `stable_object_key_order`
- `canonical_hex_quantity`

## Deferred Rules

- `null_vs_omitted_when_explicitly_allowed`
- `non_semantic_error_text`

## Why Deferred Rules Stay Deferred

- `fcu-build-getpayload-newpayload` has not yet produced payloadId-dependent
  corpus samples.
- `unknown-payloadid` has not yet produced error-shape corpus samples.
- Activating those rules early would make the normalization layer claim more
  evidence than it actually has.
