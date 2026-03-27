# Prague Static Evidence Table

## Purpose

This document is a review-oriented evidence table for the current `Prague`
static findings. It is intentionally limited to `markdown <-> OpenRPC YAML`
semantic consistency across these repository artifacts:

- markdown spec under `src/engine/prague.md`
- OpenRPC method YAML under `src/engine/openrpc/methods/`
- OpenRPC schema YAML under `src/engine/openrpc/schemas/`

It does not make any claim about:

- generated docs under `docs-api/api/`
- runtime execution behavior
- stateful protocol semantics
- client implementation correctness

## Review Notes

- This `Prague` pass uses **fork-local** review mode by request: it compares
  `prague.md` against the current YAML projection without incorporating later
  fork updates.
- `prague.md` is treated as the primary normative source for this pass.
- A row would be included only when the inconsistency can be observed from
  repository files alone.

## Table

No confirmed `Prague` static findings at the current review boundary.

## Current Result

Current command:

```bash
npm run engine:static-check -- --fork prague
```

Current result:

- `0` findings
- `0` failing issue groups

## Checked Surface

The current `Prague` pass explicitly covered:

- `engine_newPayloadV4` request surface and concrete error codes
- `engine_getPayloadV4` response surface and concrete error codes
- `Prague`'s update section for `engine_newPayloadV3`, `engine_getPayloadV3`,
  and `engine_forkchoiceUpdatedV3`

## Deferred Notes

- `executionRequests` ordering, uniqueness, non-empty payload bytes, and
  related content constraints are being treated as dynamic validation behavior
  rather than current static projection bugs.
