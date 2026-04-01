# Phase 5: Extended Engine Surface

## Status

`todo`

## Goal

Extend beyond the core payload-build and forkchoice lifecycle into the broader
Engine API surface and the harder comparison classes that were intentionally
deferred earlier.

## Scope

- `engine_getPayloadBodies*`
- `engine_getBlobs*`
- deferred normalization classes such as:
  `null_vs_omitted_when_explicitly_allowed`
  and `non_semantic_error_text`
- explicit comparison lanes for implementation-behavior observations such as
  arbitrary `DATA(8)` payload-id inputs
- generated state-machine exploration only after the above surfaces are stable

## Acceptance Target

Phase 5 is accepted only if:

- each new API family has an explicit oracle policy, scenario set, and
  normalization contract
- previously deferred normalization rules are activated only with real corpus
  evidence
- implementation-behavior observations are tracked separately from normative
  comparison buckets
- wider-surface discrepancies are reproducible, classified, and reviewable
- an explicit phase-5 review determines whether the project is ready for more
  open-ended exploration such as generated state machines or fuzzing
