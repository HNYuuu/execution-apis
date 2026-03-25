# Cancun Static Evidence Table

## Purpose

This document is a review-oriented evidence table for the current `Cancun`
static findings. It is intentionally limited to `markdown <-> OpenRPC YAML`
semantic inconsistencies across these repository artifacts:

- markdown spec under `src/engine/cancun.md`
- OpenRPC method YAML under `src/engine/openrpc/methods/`
- OpenRPC schema YAML under `src/engine/openrpc/schemas/`

It does not make any claim about:

- generated docs under `docs-api/api/`
- runtime execution behavior
- stateful protocol semantics
- client implementation correctness

## Review Notes

- `cancun.md` is treated as the primary normative source for the `Cancun`
  fork surface.
- Later fork documents are also considered when they explicitly update
  `Cancun` methods. A later update to a `Cancun` method is not counted as a
  `Cancun` bug.
- `methods/*.yaml` and `schemas/*.yaml` are treated as machine-readable
  projections of that source.
- A row is included only when the inconsistency can be observed from files in
  this repository without running any client.
- This first `Cancun` pass focuses on method-level updates that `cancun.md`
  applies to pre-existing `Shanghai` API methods.

## Table

| Group | Static Claim | Source Artifact | Conflicting Artifact | Exact Static Evidence | Checker Rules |
| --- | --- | --- | --- | --- | --- |
| `CANCUN-SHANGHAI-V2-UNSUPPORTED-FORK-ERRORS` | `Cancun` explicitly updates `engine_newPayloadV2`, `engine_forkchoiceUpdatedV2`, and `engine_getPayloadV2` to return `-38005 Unsupported fork`, but the method YAML for all three still omits that error code. | [cancun.md#L226-L238](/Users/ningyuhe/Documents/execution-apis/src/engine/cancun.md#L226) says the `Shanghai API` `V2` methods must add a validation and return `-38005: Unsupported fork` when the payload or payloadAttributes timestamp is at or after Cancun activation. | [payload.yaml#L80-L82](/Users/ningyuhe/Documents/execution-apis/src/engine/openrpc/methods/payload.yaml#L80), [forkchoice.yaml#L63-L67](/Users/ningyuhe/Documents/execution-apis/src/engine/openrpc/methods/forkchoice.yaml#L63), and [payload.yaml#L342-L344](/Users/ningyuhe/Documents/execution-apis/src/engine/openrpc/methods/payload.yaml#L342) omit `-38005` from `engine_newPayloadV2`, `engine_forkchoiceUpdatedV2`, and `engine_getPayloadV2`. | The markdown amendment applies to three concrete methods, but none of the corresponding OpenRPC method definitions declare the required `Unsupported fork` error. | `CANCUN-METHOD-NP2-01`, `CANCUN-METHOD-FCU2-01`, `CANCUN-METHOD-GP2-01` |

## Current Result

Current command:

```bash
npm run engine:static-check -- --fork cancun
```

Current result:

- `3` findings
- `1` failing issue group

## Deferred Notes

- The fixed-size `131072`-byte blob encoding in [cancun.md#L69](/Users/ningyuhe/Documents/execution-apis/src/engine/cancun.md#L69) and [cancun.md#L77](/Users/ningyuhe/Documents/execution-apis/src/engine/cancun.md#L77), currently projected as generic `bytes` in [blob.yaml#L10](/Users/ningyuhe/Documents/execution-apis/src/engine/openrpc/schemas/blob.yaml#L10) and [payload.yaml#L362](/Users/ningyuhe/Documents/execution-apis/src/engine/openrpc/schemas/payload.yaml#L362), is intentionally not counted as a current static bug. It is being retained as a future mutation strategy for dynamic testing.
- `engine_getBlobsV1` carrying `-38005` in [blob.yaml#L20](/Users/ningyuhe/Documents/execution-apis/src/engine/openrpc/methods/blob.yaml#L20) is intentionally not counted as a `Cancun` bug, because [osaka.md#L150-L162](/Users/ningyuhe/Documents/execution-apis/src/engine/osaka.md#L150) later updates the `Cancun API` method to add exactly that validation.
- `engine_newPayloadV3` strict field-count validation in [cancun.md#L108-L110](/Users/ningyuhe/Documents/execution-apis/src/engine/cancun.md#L108) is intentionally not counted as a current static bug. It is retained as a dynamic-test candidate for mutation-based input generation.

## Scope Boundary

Rows intentionally excluded from this evidence table:

- any `docs-api/api/*.mdx` manifestation, because it is downstream of YAML
- markdown-only timeout metadata that is not intended to be projected into YAML
- markdown-only routine obligations that have no direct OpenRPC projection
- any claim requiring a live client to confirm behavior
- any claim that depends on state transitions across multiple calls
- array-item `null` permissiveness when the current review convention treats
  object-schema references as null-equivalent
