# Shanghai Static Evidence Table

## Purpose

This document is a review-oriented evidence table for the current `Shanghai`
static findings. It is intentionally limited to `markdown <-> OpenRPC YAML`
semantic inconsistencies across these repository artifacts:

- markdown spec under `src/engine/shanghai.md`
- OpenRPC method YAML under `src/engine/openrpc/methods/`
- OpenRPC schema YAML under `src/engine/openrpc/schemas/`

It does not make any claim about:

- generated docs under `docs-api/api/`
- runtime execution behavior
- stateful protocol semantics
- client implementation correctness

## Review Notes

- `shanghai.md` is treated as the primary normative source for the `Shanghai`
  fork surface.
- `methods/*.yaml` and `schemas/*.yaml` are treated as machine-readable
  projections of that source.
- A row is included only when the inconsistency can be observed from files in
  this repository without running any client.

## Table

| Group | Static Claim | Source Artifact | Conflicting Artifact | Exact Static Evidence | Checker Rules |
| --- | --- | --- | --- | --- | --- |
| `SHANGHAI-FCU-PATTR-VERSION-PROJECTION` | `engine_forkchoiceUpdatedV2` must accept `PayloadAttributesV1 | PayloadAttributesV2 | null` by fork/timestamp, but the method YAML only projects `PayloadAttributesV2`. | [shanghai.md#L120-L126](/Users/ningyuhe/Documents/execution-apis/src/engine/shanghai.md#L120) defines parameter 2 as `PayloadAttributesV1 | PayloadAttributesV2 | null`. | [forkchoice.yaml#L55-L58](/Users/ningyuhe/Documents/execution-apis/src/engine/openrpc/methods/forkchoice.yaml#L55) references only `#/components/schemas/PayloadAttributesV2`. | The `V1` branch of the allowed parameter union is missing from the OpenRPC method projection. | `SHANGHAI-METHOD-FCU2-01` |
| `SHANGHAI-PAYLOAD-BODIES-RANGE-ERRORS` | `engine_getPayloadBodiesByRangeV1` must declare `-32602 Invalid params` for `start < 1` or `count < 1`. | [shanghai.md#L217-L219](/Users/ningyuhe/Documents/execution-apis/src/engine/shanghai.md#L217) explicitly requires `-32602: Invalid params`. | [payload.yaml#L852-L854](/Users/ningyuhe/Documents/execution-apis/src/engine/openrpc/methods/payload.yaml#L852) lists only `-38004`. | The method YAML omits a concrete error code required by markdown. | `SHANGHAI-METHOD-BODIES-RANGE-02` |

## Current Result

Current command:

```bash
npm run engine:static-check -- --fork shanghai
```

Current result:

- `2` findings
- `2` failing issue groups

## Scope Boundary

Rows intentionally excluded from this evidence table:

- any `docs-api/api/*.mdx` manifestation, because it is downstream of YAML
- internal YAML example-quality issues that do not contradict markdown
- markdown-only timeout metadata that is not intended to be projected into YAML
- result-array items that are `$ref` projections to object schemas when the
  current review convention treats such refs as null-equivalent
- markdown-only routine obligations that have no direct OpenRPC projection
- any claim requiring a live client to confirm behavior
- any claim that depends on state transitions across multiple calls
