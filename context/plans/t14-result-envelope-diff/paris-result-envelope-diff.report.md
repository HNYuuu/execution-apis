# T14 ResultEnvelope Diff Report

## Summary

- scenarios compared: `6`
- envelopes generated: `12`
- discrepancy count: `0`
- bucket counts: `{"all agree":2,"agree after normalization":4,"diverge across clients":0,"violates hard invariant":0}`

## Scenario Buckets

- `rlp-bootstrap-smoke`: `agree after normalization`
- `headfcu-bootstrap-smoke`: `agree after normalization`
- `fcu-no-build`: `all agree`
- `fcu-build-getpayload-newpayload`: `agree after normalization`
- `repeat-fcu-same-head`: `all agree`
- `unknown-payloadid`: `agree after normalization`

## Notes

- `T07` prototype output is intentionally not serialized into final ResultEnvelope artifacts because `T11` and `T13` provide the formal Paris runtime scenarios.
- `unknown-payloadid` uses mutated real Paris V1 `payloadId` inputs only.
- `fcu-build-getpayload-newpayload` excludes client-local runtime identifiers from cross-client equality keys.

