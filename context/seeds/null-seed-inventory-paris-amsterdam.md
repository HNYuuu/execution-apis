# Null Seed Inventory: Paris to Amsterdam

## Purpose

This document collects all `null`-related semantics that surfaced during the
`Paris -> Shanghai -> Cancun -> Prague -> Osaka -> Amsterdam` review passes.

It is intentionally broader than the static evidence tables:

- some rows are confirmed `markdown <-> OpenRPC YAML` issues
- some rows are accepted under the current projection conventions
- some rows are not static bugs, but are still valuable dynamic-test seeds

## Review Conventions

- Nullable object fields may be projected either as explicit `null` support or
  as non-required fields, if the review slice accepts omission as
  null-equivalent.
- Nullable positional parameters may also be treated as optional when the
  maintainers explicitly accept omission as null-equivalent.
- Top-level method `result: null` is not the same as “missing result field”.
- Array-item `null` and top-level `null` are distinct semantics and should be
  tested separately.

## Paris

- `PayloadStatusV1.latestValidHash` is `DATA|null` in [paris.md#L82](/Users/ningyuhe/Documents/execution-apis/src/engine/paris.md#L82), and `PayloadStatusV1.validationError` is `String|null` in [paris.md#L84](/Users/ningyuhe/Documents/execution-apis/src/engine/paris.md#L84).
  Current YAML in [payload.yaml#L16](/Users/ningyuhe/Documents/execution-apis/src/engine/openrpc/schemas/payload.yaml#L16) and [payload.yaml#L19](/Users/ningyuhe/Documents/execution-apis/src/engine/openrpc/schemas/payload.yaml#L19) models these fields as optional non-null properties.
  Classification: accepted projection under current convention.
  Dynamic seeds: compare explicit `null` vs omitted field in `INVALID`, `SYNCING`, and `ACCEPTED` responses, especially the response shapes listed in [paris.md#L175](/Users/ningyuhe/Documents/execution-apis/src/engine/paris.md#L175).

- `engine_forkchoiceUpdatedV1.payloadAttributes` is `Object|null` in [paris.md#L196](/Users/ningyuhe/Documents/execution-apis/src/engine/paris.md#L196).
  Current YAML in [forkchoice.yaml#L11](/Users/ningyuhe/Documents/execution-apis/src/engine/openrpc/methods/forkchoice.yaml#L11) models it as `required: false`.
  Classification: accepted projection under current convention.
  Dynamic seeds: send the second positional param as explicit `null`, omit it entirely, send `{}`, and send a structurally valid object to see whether implementations distinguish these cases.

- `ForkchoiceUpdatedResponseV1.payloadId` is `DATA|null` in [paris.md#L206](/Users/ningyuhe/Documents/execution-apis/src/engine/paris.md#L206), and many response branches explicitly return `payloadId: null` in [paris.md#L234](/Users/ningyuhe/Documents/execution-apis/src/engine/paris.md#L234).
  Current YAML in [forkchoice.yaml#L27](/Users/ningyuhe/Documents/execution-apis/src/engine/openrpc/schemas/forkchoice.yaml#L27) models `payloadId` as an optional non-null `bytes8`.
  Classification: accepted projection under current convention.
  Dynamic seeds: compare explicit `payloadId: null` vs omitted `payloadId` when no build has started.

## Shanghai

- `engine_forkchoiceUpdatedV2.payloadAttributes` is `PayloadAttributesV1 | PayloadAttributesV2 | null` in [shanghai.md#L123](/Users/ningyuhe/Documents/execution-apis/src/engine/shanghai.md#L123).
  Current YAML in [forkchoice.yaml#L55](/Users/ningyuhe/Documents/execution-apis/src/engine/openrpc/methods/forkchoice.yaml#L55) projects only `PayloadAttributesV2`.
  Classification: confirmed static issue, with a null-bearing parameter surface.
  Dynamic seeds: explicit `null`, omitted param, `V1` object below Shanghai timestamp, and `V2` object at-or-above Shanghai timestamp.

- `engine_getPayloadBodiesByHashV1` must use `null` array entries for missing blocks in [shanghai.md#L186](/Users/ningyuhe/Documents/execution-apis/src/engine/shanghai.md#L186).
  Current YAML in [payload.yaml#L789](/Users/ningyuhe/Documents/execution-apis/src/engine/openrpc/methods/payload.yaml#L789) projects items as `ExecutionPayloadBodyV1`.
  Classification: not counted as a current static bug under the current object-ref convention.
  Dynamic seeds: request one known block and one missing block, and verify `[body, null]` shape.

- `engine_getPayloadBodiesByRangeV1` must place `null` inside the response array for unavailable blocks and must trim trailing `null` past the latest known block in [shanghai.md#L221](/Users/ningyuhe/Documents/execution-apis/src/engine/shanghai.md#L221).
  Current YAML in [payload.yaml#L846](/Users/ningyuhe/Documents/execution-apis/src/engine/openrpc/methods/payload.yaml#L846) projects items as `ExecutionPayloadBodyV1`.
  Classification: not counted as a current static bug under the current object-ref convention.
  Dynamic seeds: sparse leading `null`s, all-`null` arrays behind the tip, and truncated arrays with no trailing `null`.

- Bodies of pre-Shanghai blocks must set `withdrawals` to `null` in [shanghai.md#L192](/Users/ningyuhe/Documents/execution-apis/src/engine/shanghai.md#L192) and [shanghai.md#L229](/Users/ningyuhe/Documents/execution-apis/src/engine/shanghai.md#L229).
  Current YAML explicitly models `withdrawals` as `array | null` in [payload.yaml#L318](/Users/ningyuhe/Documents/execution-apis/src/engine/openrpc/schemas/payload.yaml#L318).
  Classification: correctly projected, but still a dynamic-test seed.
  Dynamic seeds: fetch pre-Shanghai bodies and assert `withdrawals: null` rather than `[]`.

## Cancun

- `engine_newPayloadV3` says any field having `null` value must be considered as not provided in [cancun.md#L110](/Users/ningyuhe/Documents/execution-apis/src/engine/cancun.md#L110).
  Classification: not treated as a current static bug.
  Dynamic seeds: inject explicit `null` into required payload fields, optional-looking fields, and the extra Cancun parameters to verify rejection behavior and normalization.

- `engine_forkchoiceUpdatedV3.payloadAttributes` is `Object|null` in [cancun.md#L127](/Users/ningyuhe/Documents/execution-apis/src/engine/cancun.md#L127).
  Current YAML in [forkchoice.yaml#L108](/Users/ningyuhe/Documents/execution-apis/src/engine/openrpc/methods/forkchoice.yaml#L108) models it as `required: false`.
  Classification: accepted projection under the current convention.
  Dynamic seeds: explicit `null`, omitted param, and structurally valid-but-boundary payload attributes.

- `engine_getBlobsV1` returns an array whose items may be `null` in [cancun.md#L201](/Users/ningyuhe/Documents/execution-apis/src/engine/cancun.md#L201), must use positional `null` for missing blobs in [cancun.md#L208](/Users/ningyuhe/Documents/execution-apis/src/engine/cancun.md#L208), and may return an all-`null` array while syncing in [cancun.md#L212](/Users/ningyuhe/Documents/execution-apis/src/engine/cancun.md#L212).
  Current YAML in [blob.yaml#L13](/Users/ningyuhe/Documents/execution-apis/src/engine/openrpc/methods/blob.yaml#L13) projects only an array of `BlobAndProofV1`.
  Classification: not currently raised as a static issue under the current object-ref convention, but highly relevant for dynamic testing.
  Dynamic seeds: `[A, null, C]`, all-`null` arrays during sync, and arrays with pruned entries nullified.

## Prague

- `engine_newPayloadV4.executionRequests` must trigger `-32602` if the param itself is `null` in [prague.md#L38](/Users/ningyuhe/Documents/execution-apis/src/engine/prague.md#L38).
  Current YAML in [payload.yaml#L213](/Users/ningyuhe/Documents/execution-apis/src/engine/openrpc/methods/payload.yaml#L213) models the param as a required array.
  Classification: no current static issue, but a strong dynamic-test seed.
  Dynamic seeds: explicit `null`, empty array `[]`, duplicate request types, out-of-order types, and one-byte entries.

- Prague continues to use `{ latestValidHash: null, validationError: errorMessage | null }` in the `INVALID` branch in [prague.md#L53](/Users/ningyuhe/Documents/execution-apis/src/engine/prague.md#L53).
  Classification: inherited null behavior, not a new static issue.
  Dynamic seeds: invalid request-commitment cases that should land on the exact null-bearing status shape.

## Osaka

- `engine_getBlobsV2` allows the entire top-level `result` to be `null` in [osaka.md#L107](/Users/ningyuhe/Documents/execution-apis/src/engine/osaka.md#L107), and the specification repeats that `null` must be returned for missing, older, syncing, and pruned cases in [osaka.md#L115](/Users/ningyuhe/Documents/execution-apis/src/engine/osaka.md#L115).
  Current YAML in [blob.yaml#L48](/Users/ningyuhe/Documents/execution-apis/src/engine/openrpc/methods/blob.yaml#L48) only allows arrays.
  Classification: confirmed static issue.
  Dynamic seeds: request sets with one missing blob, one older-version blob, and syncing mode, all of which should produce top-level `result: null`.

- `engine_getBlobsV3` allows both top-level `null` and positional `null` array entries in [osaka.md#L135](/Users/ningyuhe/Documents/execution-apis/src/engine/osaka.md#L135).
  Current YAML in [blob.yaml#L208](/Users/ningyuhe/Documents/execution-apis/src/engine/openrpc/methods/blob.yaml#L208) correctly models:
  `array<BlobAndProofV2 | null> | null`.
  Classification: correctly projected, but an important dynamic seed family.
  Dynamic seeds: `[A, null, C]`, all-`null` arrays of matching length, and top-level `null` while generally unable to serve blob data.

## Amsterdam

- `ExecutionPayloadBodyV2.blockAccessList` is `DATA|null` in [amsterdam.md#L74](/Users/ningyuhe/Documents/execution-apis/src/engine/amsterdam.md#L74), with explicit rules that it **MUST** be `null` for pre-Amsterdam blocks and for pruned access lists in [amsterdam.md#L155](/Users/ningyuhe/Documents/execution-apis/src/engine/amsterdam.md#L155) and [amsterdam.md#L180](/Users/ningyuhe/Documents/execution-apis/src/engine/amsterdam.md#L180).
  Current YAML in [payload.yaml#L340](/Users/ningyuhe/Documents/execution-apis/src/engine/openrpc/schemas/payload.yaml#L340) correctly models `blockAccessList` as `bytes | null`.
  Classification: correctly projected, but a high-value dynamic-test seed.
  Dynamic seeds: pre-Amsterdam body with `blockAccessList: null`, post-Amsterdam body with non-null access list, and pruned body with `blockAccessList: null`.

- `engine_getPayloadBodiesByHashV2` says the result is an array of `ExecutionPayloadBodyV2` objects or `null` for unavailable blocks in [amsterdam.md#L148](/Users/ningyuhe/Documents/execution-apis/src/engine/amsterdam.md#L148).
  Current YAML in [payload.yaml#L903](/Users/ningyuhe/Documents/execution-apis/src/engine/openrpc/methods/payload.yaml#L903) projects the result as an array of `ExecutionPayloadBodyV2` items.
  Classification: not currently counted as a static bug under the active object-ref convention.
  Dynamic seeds: request one known block and one unavailable block, verify positional `null`, and distinguish `body.blockAccessList: null` from an entirely `null` array entry.

- `engine_getPayloadBodiesByRangeV2` says the result is an array of `ExecutionPayloadBodyV2` objects or `null` for unavailable blocks in [amsterdam.md#L173](/Users/ningyuhe/Documents/execution-apis/src/engine/amsterdam.md#L173).
  Current YAML in [payload.yaml#L952](/Users/ningyuhe/Documents/execution-apis/src/engine/openrpc/methods/payload.yaml#L952) projects the result as an array of `ExecutionPayloadBodyV2` items.
  Classification: not currently counted as a static bug under the active object-ref convention.
  Dynamic seeds: sparse positional `null`s, truncated arrays with no trailing `null`, and mixtures of available bodies whose internal `blockAccessList` is `null` because of pre-fork or pruning conditions.

- `engine_forkchoiceUpdatedV4.payloadAttributes` is `Object|null` in [amsterdam.md#L191](/Users/ningyuhe/Documents/execution-apis/src/engine/amsterdam.md#L191).
  Current YAML in [forkchoice.yaml#L166](/Users/ningyuhe/Documents/execution-apis/src/engine/openrpc/methods/forkchoice.yaml#L166) models it as `required: false`.
  Classification: accepted projection under the current convention.
  Dynamic seeds: explicit `null`, omitted parameter, structurally valid `PayloadAttributesV4`, and near-boundary timestamps around Amsterdam activation combined with `slotNumber`.

- `engine_newPayloadV5` introduces a new invalid branch tied to `blockAccessList` validation, and on failure **MUST** return `{status: INVALID, latestValidHash: null, validationError: errorMessage | null}` in [amsterdam.md#L103](/Users/ningyuhe/Documents/execution-apis/src/engine/amsterdam.md#L103).
  Classification: inherited null-bearing status behavior with a new Amsterdam-specific trigger.
  Dynamic seeds: valid payload with mismatching `blockAccessList`, missing `blockAccessList`, and malformed RLP-encoded access lists to distinguish `INVALID` status from `-32602`.

## Recommended Mutation Families

- Explicit `null` vs omitted field for nullable response fields.
- Explicit `null` vs omitted positional parameter where the spec allows `Object|null`.
- Top-level `result: null` vs `result: []`.
- Array item `null` vs top-level `null`.
- `null` in fields that the markdown says must be treated as “not provided”.
- Pre-fork object fields that must be `null` rather than empty arrays or absent.
