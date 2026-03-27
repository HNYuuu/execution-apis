# Markdown/OpenRPC Static Inconsistency Method

## Purpose

This document explains the method currently used in this repository to find
`static inconsistencies` between:

- markdown Engine API specs
- OpenRPC method YAML
- OpenRPC schema YAML

It is not a dynamic testing method. It does not execute clients or attempt to
prove runtime behavior.

## Source-Of-Truth Model

For the current fork-scoped Engine API work, the working hierarchy is:

1. `src/engine/<fork>.md`
2. `src/engine/openrpc/methods/*.yaml` and `src/engine/openrpc/schemas/*.yaml`

This hierarchy is justified by the repository structure and by the Engine API
README, which treats the fork-scoped markdown docs as the primary spec surface.

The method therefore asks two questions:

1. Did markdown semantics survive projection into OpenRPC?
2. Is the OpenRPC projection precise enough to preserve the intended markdown
   semantics?

## What Counts As A Static Inconsistency

A finding is classified as a static inconsistency only if it can be observed by
reading repository artifacts, without any client execution.

Examples that qualify:

- markdown says `DATA|null`, but schema encodes the field as both non-null and
  required
- markdown says a positional argument accepts versions `A | B`, but method YAML
  only references `B`
- markdown says a field must be present, schema only makes it optional
- markdown says a result array may contain `null` entries, but method YAML only
  allows non-null items
- markdown declares a concrete method error code, but method YAML omits it

Current interpretation for nullable object fields and nullable positional
parameters:

- if a markdown field allows `null`, the YAML projection is accepted when
  either:
  - the field explicitly supports `null`, or
  - the field is not listed in `required`, meaning field absence is treated as
    equivalent to `null`
- the same `optional-as-null` convention may be applied to positional
  parameters when the review rule explicitly allows it
- for result arrays, an `items` block that is a `$ref` to an object schema may
  also be treated as null-equivalent when the review rule explicitly allows it

Examples that do not qualify:

- whether an EL client really returns a given response at runtime
- whether payload validation order is implemented correctly
- whether state transitions across multiple Engine API calls are correct
- whether generated docs under `docs-api/api/` drift from YAML
- whether YAML examples are internally contradictory without a markdown
  contradiction

## Detection Workflow

### Step 1: Choose The Review Slice

Work one fork at a time. For the current slice:

- markdown: `src/engine/<fork>.md`
- methods: `src/engine/openrpc/methods/*.yaml`
- schemas: `src/engine/openrpc/schemas/*.yaml`

### Step 2: Identify The Projection Targets

For each markdown artifact, identify its corresponding OpenRPC projection.

Examples:

- `PayloadStatusV1` in markdown projects into
  `src/engine/openrpc/schemas/payload.yaml`
- `engine_forkchoiceUpdatedV1` request semantics project into
  `src/engine/openrpc/methods/forkchoice.yaml`

### Step 3: Decompose Markdown Rules Into Static Rule Shapes

Only rules that can be expressed statically should enter this checker.

The current method uses these shapes:

- `field nullability`
- `field requiredness / presence`
- `positional parameter nullability`
- `positional parameter presence`
- `parameter version-union projection`
- `result array item nullability`
- `declared error-code presence`
- `enum/value-set projection`

### Step 4: Map Each Rule Shape To Concrete Artifact Locations

The mapping is:

- markdown structure fields -> schema blocks
- markdown positional method params -> method blocks
- markdown method result arrays -> method result schema blocks
- markdown method error declarations -> method error blocks

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

The current implementation has already been exercised on:

- `Paris`
- `Shanghai`
- `Cancun`
- `Prague`
- `Osaka`

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
4. If none are present, check whether the field is omitted from `required` and
   the rule allows `optional-as-null`.
5. If neither condition holds, flag drift.

Important:

- This is about `explicit null` unless the review rule explicitly allows
  `optional-as-null`.

### `schema-field-required`

Goal:

- detect when markdown semantics require the field to be present, but schema
  only makes it optional

Method:

1. Extract the schema block.
2. Read the `required:` list.
3. Check whether the field is named there.
4. If not, but the rule allows `optional-as-null`, accept the projection.
5. Otherwise, flag drift.

This means a nullable markdown field may be projected as either:

- `required and nullable`, or
- `optional and non-null`

depending on the agreed projection convention for the review slice.

### `schema-field-disallow-ref`

Goal:

- detect when markdown requires a more precise schema projection, but the YAML
  field falls back to an overly broad `$ref`

Method:

1. Extract the named top-level schema block from the YAML text.
2. Extract the named property block from `properties:`.
3. Check whether that property block contains the disallowed `$ref`.
4. If it does, flag drift.

Current use:

- this is used for fixed-size byte encodings, where markdown specifies an exact
  width but the schema projects the field as unconstrained `bytes`

### `method-param-nullable`

Goal:

- detect when markdown says a positional parameter accepts `null`, but OpenRPC
  encodes only a non-null object schema

Method:

1. Extract the method block by method name.
2. Extract the parameter block by parameter name.
3. Look for explicit null support using the same nullability scan as above.
4. If none is present, but the rule allows `optional-as-null` and the parameter
   is not required, accept the projection.
5. Otherwise, flag drift.

### `method-param-required`

Goal:

- detect when markdown says a positional slot exists, but OpenRPC makes the
  parameter optional

Method:

1. Extract the parameter block.
2. Read `required: true/false`.
3. If the parameter is not marked required, but the rule allows
   `optional-as-null`, accept the projection.
4. Otherwise, flag drift.

Interpretation:

- In positional JSON-RPC, “slot may contain `null`” and “slot may be omitted”
  are treated as distinct by default, but the checker can relax this when the
  review convention explicitly treats omission as null-equivalent.

### `method-param-schema-refs`

Goal:

- detect when markdown allows multiple schema versions for one positional
  parameter, but method YAML projects only a subset

Method:

1. Extract the method block by method name.
2. Extract the parameter block by parameter name.
3. Check whether the block references every expected schema ref.
4. If any expected ref is missing, flag drift.

### `method-result-array-items-nullable`

Goal:

- detect when markdown allows `null` entries inside a result array, but method
  YAML only allows non-null items

Method:

1. Extract the method block by method name.
2. Extract the `result` block and its nested `items:` block.
3. Check whether the `items:` block explicitly allows `null`.
4. If not, but the review rule allows `object-ref-as-null` and `items:` is a
   schema `$ref`, accept the projection.
5. Otherwise, flag drift.

### `method-result-property-required`

Goal:

- detect when markdown requires a field to exist in the result object, but the
  OpenRPC method projection does not list that field as required

Method:

1. Extract the method block by method name.
2. Extract the nested `result -> schema` block.
3. Parse the `required:` list on that result schema.
4. Check whether the expected property is listed there.
5. If not, flag drift.

### `method-result-nullable`

Goal:

- detect when markdown allows the entire result value to be `null`, but the
  OpenRPC method projection only allows a non-null result schema

Method:

1. Extract the method block by method name.
2. Extract the nested `result -> schema` block.
3. Check whether that schema block explicitly allows `null`.
4. If not, flag drift.

### `method-error-code-present`

Goal:

- detect when markdown declares a concrete method error code, but method YAML
  omits it from the `errors:` block

Method:

1. Extract the method block by method name.
2. Extract the `errors:` block.
3. Check whether the expected `- code:` entry is present.
4. If not, flag drift.

### `method-error-code-absent`

Goal:

- detect when method YAML declares a concrete error code that the markdown
  method section does not project

Method:

1. Extract the method block by method name.
2. Extract the `errors:` block.
3. Check whether the disallowed `- code:` entry is present.
4. If it is present, flag drift.

## Review Modes

There are two valid review modes:

- `fork-local`: compare one fork document against the current YAML projection
  using only that fork text
- `cumulative`: compare one fork document plus any later explicit updates to
  the same older methods against the current YAML projection

The reviewer should choose the mode before interpreting a finding. A result
that is a drift in `fork-local` mode may be acceptable in `cumulative` mode if
later forks explicitly update the older method.

## Scope Boundary

This method intentionally excludes:

- generated docs drift under `docs-api/api/`
- internal YAML example-quality issues that do not contradict markdown
- markdown method metadata such as timeout values that are not intended to be
  represented in OpenRPC YAML
- markdown-only routine rules with no direct YAML representation
- any claim requiring client execution or multi-call state observation
