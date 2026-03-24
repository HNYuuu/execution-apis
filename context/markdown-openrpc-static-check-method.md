# Markdown/OpenRPC Static Inconsistency Method

## Purpose

This document explains the method currently used in this repository to find
`static inconsistencies` between:

- markdown Engine API specs
- OpenRPC method YAML
- OpenRPC schema YAML
- generated docs

It is not a dynamic testing method. It does not execute clients or attempt to
prove runtime behavior.

## Source-Of-Truth Model

For the current `Paris` work, the working hierarchy is:

1. `src/engine/paris.md`
2. `src/engine/openrpc/methods/*.yaml` and `src/engine/openrpc/schemas/*.yaml`
3. `docs-api/api/methods/*.mdx`

This hierarchy is justified by the repository structure and by the Engine API
README, which treats the fork-scoped markdown docs as the primary spec surface.

The method therefore asks three questions:

1. Did markdown semantics survive projection into OpenRPC?
2. Did OpenRPC semantics survive projection into generated docs?
3. Are there internal contradictions inside OpenRPC examples or docs examples?

## What Counts As A Static Inconsistency

A finding is classified as a static inconsistency only if it can be observed by
reading repository artifacts, without any client execution.

Examples that qualify:

- markdown says `DATA|null`, schema says plain `$ref` and omits `required`
- markdown says a positional argument may be `null`, method YAML marks it
  `required: false` instead
- schema marks fields as required, generated docs omit `*required*`
- OpenRPC example uses `"0x0"`, generated docs example uses numeric `0`
- two examples in the same artifact use the same request but contradictory
  responses

Examples that do not qualify:

- whether an EL client really returns a given response at runtime
- whether payload validation order is implemented correctly
- whether state transitions across multiple Engine API calls are correct

## Detection Workflow

### Step 1: Choose The Review Slice

Work one fork at a time. For the current slice:

- markdown: `src/engine/paris.md`
- methods: `src/engine/openrpc/methods/*.yaml`
- schemas: `src/engine/openrpc/schemas/*.yaml`
- docs: `docs-api/api/methods/engine_*V1.mdx`

### Step 2: Identify The Projection Targets

For each markdown artifact, identify its corresponding OpenRPC and docs
projection.

Examples:

- `PayloadStatusV1` in markdown projects into
  `src/engine/openrpc/schemas/payload.yaml`
- `engine_forkchoiceUpdatedV1` request semantics project into
  `src/engine/openrpc/methods/forkchoice.yaml`
- generated docs project into
  `docs-api/api/methods/engine_forkchoiceUpdatedV1.mdx`

### Step 3: Decompose Markdown Rules Into Static Rule Shapes

Only rules that can be expressed statically should enter this checker.

The current method uses these shapes:

- `field nullability`
- `field requiredness / presence`
- `positional parameter nullability`
- `positional parameter presence`
- `enum/value-set projection`
- `timeout metadata projection`
- `example JSON scalar type projection`
- `source example -> generated example fidelity`
- `duplicate-request / divergent-response contradictions`

### Step 4: Map Each Rule Shape To Concrete Artifact Locations

The mapping is:

- markdown structure fields -> schema blocks
- markdown positional method params -> method blocks
- schema requiredness -> generated-doc field labels
- OpenRPC method examples -> generated-doc examples
- generated docs sidebar `InteractiveRequest` -> docs embedded request payload

This keeps the check static and explicit.

## Current Checker Implementation

Current implementation files:

- `scripts/engine-static-check.js`
- `scripts/engine-static-check-data.js`

The runner is generic; the issue groups are data-driven.

Current fork filter example:

```bash
npm run engine:static-check -- --fork paris
```

## How Each Check Type Works

### `schema-field-nullable`

Goal:

- detect when markdown expects explicit `null`, but schema does not encode it

Method:

1. Extract the named top-level schema block from the YAML text.
2. Extract the named property block from `properties:`.
3. Look for explicit null support:
   - `nullable: true`
   - `type: null`
   - `type: [ ..., null, ... ]`
   - other explicitly null-bearing schema constructs
4. If none are present, flag drift.

Important:

- This is about `explicit null`, not merely `field may be omitted`.

### `schema-field-required`

Goal:

- detect when markdown semantics require the field to be present, but schema
  only makes it optional

Method:

1. Extract the schema block.
2. Read the `required:` list.
3. Check whether the field is named there.
4. If not, flag drift.

This is why `optional but non-null` is treated differently from
`required and nullable`.

### `method-param-nullable`

Goal:

- detect when markdown says a positional parameter accepts `null`, but OpenRPC
  encodes only a non-null object schema

Method:

1. Extract the method block by method name.
2. Extract the parameter block by parameter name.
3. Look for explicit null support using the same nullability scan as above.
4. If none is present, flag drift.

### `method-param-required`

Goal:

- detect when markdown says a positional slot exists, but OpenRPC makes the
  parameter optional

Method:

1. Extract the parameter block.
2. Read `required: true/false`.
3. If the parameter is not marked required, flag drift.

Interpretation:

- In positional JSON-RPC, “slot may contain `null`” is not the same as “slot may
  be omitted”.

### `doc-label-required`

Goal:

- detect when required fields are not shown as required in generated docs

Method:

1. Search the docs file for the field label line.
2. Check whether the line contains `*required*`.
3. If not, flag drift.

This is only used when another artifact already establishes that the field is
required.

### `doc-label-not-plain-type`

Goal:

- detect when generated docs flatten richer semantics into a plain type label

Method:

1. Search for the docs label line.
2. Compare it against a known flattened line such as
   `* **latestValidHash** \`string\``.
3. If the rendered label is exactly the flattened form, flag drift.

This is useful for:

- nullable fields rendered as plain `string`
- nullable/object params rendered as plain `object`

### `doc-json-type`

Goal:

- detect scalar type drift inside fenced JSON examples

Method:

1. Parse every fenced `json` block in the docs file.
2. Find the value at the configured JSON path.
3. Compare its actual JSON type with the expected type.

Example:

- expect `string`
- docs example contains numeric `0`

### `doc-interactive-request-json-type`

Goal:

- detect scalar type drift in the sidebar `InteractiveRequest` payload

Method:

1. Extract the serialized `request={"{...}"}`
   string from the MDX component.
2. Decode the escaped JSON string.
3. Parse it as JSON.
4. Compare the type at the configured path.

This is separate from fenced example parsing because the sidebar request lives
inside an MDX prop, not a fenced code block.

### `method-examples-consistent`

Goal:

- detect contradictions internal to OpenRPC method examples

Method:

1. Extract the `examples:` block from the method YAML.
2. Parse each example’s `params` and `result` into normalized JSON-like
   objects.
3. Group examples by normalized request.
4. If the same normalized request appears more than once with different
   normalized responses, flag drift.

This is a purely static contradiction check. It does not claim which response
is correct.

### `doc-examples-consistent`

Goal:

- detect contradictions internal to generated docs examples

Method:

1. Parse each `#### Request` / `#### Response` pair in the docs examples
   section.
2. Normalize requests and responses as JSON strings.
3. Group by request and detect divergent responses.

### `method-doc-examples-match`

Goal:

- detect projection drift between OpenRPC source examples and generated docs
  examples

Method:

1. Parse the OpenRPC method examples.
2. Parse the generated docs examples.
3. Compare:
   - example count
   - example name
   - normalized request payload
   - normalized response payload
4. If any differ, flag drift.

This is how the checker proves that a docs example differs from its OpenRPC
source, rather than only saying that the docs example looks suspicious by
itself.

## Manual Recheck Procedure

To reduce false positives, recheck every finding manually with this sequence:

1. Verify the compared lines refer to the same semantic object.
   Example: do not compare a request line to a response line.
2. Verify the source-of-truth layer is correct.
   For `Paris`, markdown wins over OpenRPC/docs.
3. Verify the checker did not collapse a real distinction.
   Example: distinguish `optional` from `nullable`.
4. Verify the finding is static.
   If it needs a client run, it belongs to a later phase.
5. Verify the inconsistency is observable in the repository text.
   If it depends on external assumptions, downgrade or drop it.

## Common False-Positive Risks

The main false-positive risks are:

- comparing request and response lines by mistake
- treating `field may be omitted` as equivalent to `field may be null`
- assuming docs are normative when markdown or OpenRPC is the real source
- reading markdown routine semantics into a checker that only compares
  projection artifacts

These are exactly why the current work is scoped to static inconsistency only.

## Current Scope Boundary

The current method intentionally excludes:

- full parsing of markdown routines such as payload validation order
- any claim about whether an EL client follows the spec
- any stateful or multi-call behavior
- any cross-client comparison

Those belong to later fixture, state-machine, and differential-testing phases.

## Practical Review Checklist

When reviewing a candidate Paris finding, ask:

1. Is there a concrete markdown/OpenRPC/docs line reference?
2. Is the mismatch visible without running code?
3. Is the semantic dimension one of:
   - type
   - nullability
   - requiredness
   - presence
   - timeout metadata
   - example fidelity
4. Did we compare the right artifact layers?
5. If docs are involved, can the mismatch be traced back either to:
   - OpenRPC -> docs projection drift
   - docs-only internal contradiction

If all five are satisfied, the finding belongs in the static evidence set.
