# Osaka Static Evidence Table

## Purpose

This document is a review-oriented evidence table for the current `Osaka`
static findings. It is intentionally limited to `markdown <-> OpenRPC YAML`
semantic consistency across these repository artifacts:

- markdown spec under `src/engine/osaka.md`
- OpenRPC method YAML under `src/engine/openrpc/methods/`
- OpenRPC schema YAML under `src/engine/openrpc/schemas/`

It does not make any claim about:

- generated docs under `docs-api/api/`
- runtime execution behavior
- stateful protocol semantics
- client implementation correctness

## Review Notes

- This `Osaka` pass uses `fork-local` review mode by request.
- `osaka.md` is treated as the primary normative source for this pass.
- A row is included only when the inconsistency can be observed from
  repository files alone.

## Table

| Group | Static Claim | Source Artifact | Conflicting Artifact | Exact Static Evidence | Checker Rules |
| --- | --- | --- | --- | --- | --- |
| `OSAKA-GETBLOBS-V2-RESULT-NULLABILITY` | `engine_getBlobsV2` allows a top-level `null` result in case of missing, older, or temporarily unavailable blob data, but methods YAML only allows arrays. | [osaka.md#L105-L119](/Users/ningyuhe/Documents/execution-apis/src/engine/osaka.md#L105) defines the result as `Array of BlobAndProofV2 ... or null in case of any missing blobs` and the specification repeats that the client **MUST** return `null` in several cases. | [blob.yaml#L48-L53](/Users/ningyuhe/Documents/execution-apis/src/engine/openrpc/methods/blob.yaml#L48) projects the result as `type: array` with non-null `BlobAndProofV2` items only. | The OpenRPC method projection drops the top-level `null` branch that the Osaka method section explicitly requires. | `OSAKA-METHOD-GB2-01` |

## Current Result

Current command:

```bash
npm run engine:static-check -- --fork osaka
```

Current result:

- `1` finding
- `1` failing issue group

## Checked Surface

The current `Osaka` pass explicitly covered:

- `engine_getPayloadV5` response surface and concrete error codes
- `engine_getBlobsV2` nullability and error surface
- `engine_getBlobsV3` nullability and error surface
- `Osaka` update sections for `engine_getBlobsV1` and `engine_getPayloadV4`

## Deferred Notes

- Fixed-size blob bytes and proof-count cardinality constraints are being
  retained as dynamic-test candidates rather than current static bugs.
