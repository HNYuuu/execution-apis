# Amsterdam Static Evidence Table

## Purpose

This document is a review-oriented evidence table for the current `Amsterdam`
static findings. It is intentionally limited to `markdown <-> OpenRPC YAML`
semantic consistency across these repository artifacts:

- markdown spec under `src/engine/amsterdam.md`
- OpenRPC method YAML under `src/engine/openrpc/methods/`
- OpenRPC schema YAML under `src/engine/openrpc/schemas/`

It does not make any claim about:

- generated docs under `docs-api/api/`
- runtime execution behavior
- stateful protocol semantics
- client implementation correctness

## Review Notes

- This `Amsterdam` pass uses `fork-local` review mode.
- `amsterdam.md` is treated as the primary normative source for this pass.
- A row is included only when the inconsistency can be observed from
  repository files alone.
- Array-item `null` projections that resolve through object-schema `$ref`s are
  not counted as current static bugs under the active review convention.
- Nullable object fields may be projected either explicitly or by omission from
  `required`.

## Table

| Group | Static Claim | Source Artifact | Conflicting Artifact | Exact Static Evidence | Checker Rules |
| --- | --- | --- | --- | --- | --- |
| `AMSTERDAM-PAYLOAD-BODIES-RANGE-V2-ERRORS` | `engine_getPayloadBodiesByRangeV2` inherits `-32602: Invalid params` from `engine_getPayloadBodiesByRangeV1`, but the method YAML omits it. | [amsterdam.md#L178-L182](/Users/ningyuhe/Documents/execution-apis/src/engine/amsterdam.md#L178) says the method follows [`engine_getPayloadBodiesByRangeV1`](./shanghai.md#engine_getpayloadbodiesbyrangev1) with additions only. [shanghai.md#L217-L219](/Users/ningyuhe/Documents/execution-apis/src/engine/shanghai.md#L217) explicitly requires `-32602: Invalid params` for invalid `start` or `count`. | [payload.yaml#L956-L958](/Users/ningyuhe/Documents/execution-apis/src/engine/openrpc/methods/payload.yaml#L956) lists only `-38004` for `engine_getPayloadBodiesByRangeV2`. | The Amsterdam method inherits the Shanghai error surface plus Amsterdam-specific additions, but the inherited `-32602` branch is absent from the OpenRPC method projection. | `AMSTERDAM-METHOD-BODIES-RANGEV2-03` |

## Current Result

Current command:

```bash
npm run engine:static-check -- --fork amsterdam
```

Current result:

- `1` finding
- `1` failing issue group

## Checked Surface

The current `Amsterdam` pass explicitly covered:

- `ExecutionPayloadV4` required `blockAccessList` and `slotNumber`
- `engine_newPayloadV5` request/error surface
- `engine_getPayloadV6` response/error surface
- `ExecutionPayloadBodyV2.blockAccessList` nullability
- `engine_getPayloadBodiesByHashV2` response/error surface
- `engine_getPayloadBodiesByRangeV2` response/error surface
- `PayloadAttributesV4.slotNumber`
- `engine_forkchoiceUpdatedV4` parameter/error surface
- `Amsterdam` update sections for `engine_newPayloadV4`, `engine_getPayloadV5`,
  and `engine_forkchoiceUpdatedV3`

## Deferred Notes

- The `blockAccessList: null` semantics for pre-Amsterdam or pruned blocks in
  `ExecutionPayloadBodyV2` are not currently counted as a static bug because
  the schema already models `blockAccessList` as `bytes | null`, and omission
  of nullable object fields is treated as null-equivalent under the active
  review convention.
- The method-level wording issue where `PayloadAttributesV4` is placed in the
  `Methods` section of `amsterdam.md` is a markdown organization issue, not a
  `markdown <-> OpenRPC YAML` semantic inconsistency.
