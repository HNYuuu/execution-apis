# 2026-03-24 Session Context

## Purpose

This file is the resumable session context for the `Engine API` testing work
done on `2026-03-24`.

It is intended to let future work restart quickly without reconstructing the
full discussion from chat history.

## Repo State

Local repository:

- `/Users/ningyuhe/Documents/execution-apis`

Current remotes:

- `origin`: `https://github.com/HNYuuu/execution-apis.git`
- `upstream`: `https://github.com/ethereum/execution-apis.git`

## High-Level Goal

The long-term goal is to build a complete Engine API test strategy from
`Paris` through `Amsterdam`, with three layers:

1. `static spec consistency`
2. `cross-fork spec evolution consistency`
3. `dynamic / differential client testing`

The current work is still in the first layer, and is deliberately limited to
`static artifact inconsistencies`.

## Critical Scope Decision

Current `Paris` findings must be limited to inconsistencies that are visible
purely from repository artifacts.

Included:

- markdown vs OpenRPC schema drift
- markdown vs OpenRPC method drift
- OpenRPC vs generated-doc drift
- internal contradictions inside OpenRPC examples
- internal contradictions inside generated docs examples

Excluded for now:

- runtime Engine API behavior
- payload-validation semantics that require live execution
- stateful multi-call behavior
- EL client implementation differences

This scope boundary was explicitly reinforced during the session to avoid
mixing static review with later differential testing.

## What Was Decided About Documentation

The `context/` directory was reduced to a minimal durable set.

Kept:

- `context/test-plan.md`
- `context/markdown-openrpc-static-check-method.md`
- `context/paris-atomic-rules.md`
- `context/paris-static-evidence-table.md`

Deleted as redundant intermediate artifacts:

- `context/paris-openrpc-pilot.md`
- `context/paris-specification-surface.md`

Reason:

- those two files were exploratory and had already been subsumed by the rule
  inventory and the evidence table
- they were not judged necessary for future fork-by-fork work

## Durable Context Files And Their Roles

### `context/test-plan.md`

The persistent cross-fork plan.

Use this file for:

- overall roadmap
- phase ordering
- cross-fork work planning

### `context/markdown-openrpc-static-check-method.md`

The reusable method document for finding static inconsistencies.

Use this file for:

- checker design principles
- what counts as a static inconsistency
- manual false-positive review procedure

### `context/paris-atomic-rules.md`

The durable `Paris` rule inventory.

Use this file for:

- rule IDs
- static vs single-call vs stateful tagging
- template for future fork inventories

### `context/paris-static-evidence-table.md`

The detailed evidence table for current `Paris` static findings.

Use this file for:

- manual review
- issue preparation
- proving a finding with exact file/line evidence

## Checker Implementation Status

Current checker files:

- `scripts/engine-static-check.js`
- `scripts/engine-static-check-data.js`

Package entrypoint:

- `npm run engine:static-check -- --fork paris`

Architecture:

- generic runner in `engine-static-check.js`
- fork-specific issue groups in `engine-static-check-data.js`
- current implemented fork coverage is `Paris` only

Current checker capabilities include:

- schema field nullability checks
- schema field requiredness checks
- positional method parameter nullability checks
- positional method parameter presence checks
- generated-doc requiredness checks
- generated-doc plain-type flattening checks
- fenced JSON example type checks
- `InteractiveRequest` JSON type checks
- duplicate-request / divergent-response checks within OpenRPC examples
- duplicate-request / divergent-response checks within generated docs
- OpenRPC example to generated-doc example fidelity checks
- timeout projection checks

## Current Paris Checker Result

Last rechecked command:

```bash
node scripts/engine-static-check.js --fork paris
```

Current result:

- `57` findings
- `9` issue groups

Current issue groups:

- `PARIS-PSTATUS-PROJECTION`
- `PARIS-FCU-PARAM-PROJECTION`
- `PARIS-FCU-PAYLOADID-PROJECTION`
- `PARIS-ETC-DOC-EXAMPLE-TYPES`
- `PARIS-NP-REQUEST-DOC-REQUIREDNESS`
- `PARIS-FCU-REQUEST-DOC-REQUIREDNESS`
- `PARIS-ETC-REQUEST-DOC-REQUIREDNESS`
- `PARIS-NP-EXAMPLE-CONSISTENCY`
- `PARIS-TIMEOUT-PROJECTION`

Interpretation:

- these are not runtime bugs
- these are static inconsistencies between markdown, OpenRPC, and generated docs
- some are internal contradictions inside example sets

## Notable Static Findings Confirmed Today

### 1. `PayloadStatusV1` nullability / presence drift

Markdown says:

- `latestValidHash: DATA|null`
- `validationError: String|null`

But the OpenRPC schema encodes both as optional but non-null fields, and the
generated docs flatten both to plain non-required `string`.

### 2. `engine_forkchoiceUpdatedV1` second parameter drift

Markdown says the second positional parameter is `Object|null`.

OpenRPC method YAML encodes it as `required: false` with a non-null schema,
which changes semantics from:

- `slot exists, may contain null`

to:

- `slot may be omitted; if present it is non-null`

Generated docs also flatten it to a plain optional `object`.

### 3. `ForkchoiceUpdatedResponseV1.payloadId` drift

Markdown says `payloadId: DATA|null`.

OpenRPC schema encodes it as optional but non-null `bytes8`, and generated docs
flatten it to a plain non-required `string`.

### 4. `engine_exchangeTransitionConfigurationV1` docs example type drift

OpenRPC source example uses `"0x0"` for `terminalTotalDifficulty`.

Generated docs convert that to numeric `0` in:

- the sidebar `InteractiveRequest`
- the request example
- the response example

This is now proven both as:

- a docs-only type mismatch
- an OpenRPC-example -> generated-doc-example projection mismatch

### 5. Generated docs drop nested request-field `required` markers

Affected docs:

- `engine_newPayloadV1`
- `engine_forkchoiceUpdatedV1`
- `engine_exchangeTransitionConfigurationV1`

The corresponding schemas clearly list those fields in `required`, but the docs
omit `*required*` on nested request fields.

### 6. `engine_newPayloadV1` example contradiction

Both the OpenRPC method YAML and the generated docs contain two examples whose
requests are identical but whose responses differ:

- one `VALID`
- one `INVALID`

Important note:

- this finding was manually rechecked after a false-positive concern
- the concern came from comparing response lines rather than request lines
- the checker finding was retained after re-verification

### 7. Timeout metadata projection gap

`paris.md` specifies timeout metadata for these methods:

- `engine_newPayloadV1`
- `engine_forkchoiceUpdatedV1`
- `engine_getPayloadV1`
- `engine_exchangeTransitionConfigurationV1`

That timeout metadata is not projected into:

- OpenRPC method YAML
- generated docs

## False-Positive Handling Outcome

A manual recheck step was added to the process after a challenge about
`engine_newPayloadV1` example consistency.

Result:

- no finding was removed during the last recheck
- but the review discipline was improved
- the static method document now explicitly warns against:
  - mixing request and response evidence
  - confusing `optional` with `nullable`
  - treating dynamic claims as static claims

## Current Git-Tree Intent

The following files are intended to remain as the durable working set for this
phase:

- `context/test-plan.md`
- `context/markdown-openrpc-static-check-method.md`
- `context/paris-atomic-rules.md`
- `context/paris-static-evidence-table.md`
- `scripts/engine-static-check.js`
- `scripts/engine-static-check-data.js`

These are the files that should be extended when work continues.

## Recommended Next Steps

If work resumes from this point, the most natural next steps are:

1. keep deepening `Paris` only if a new static inconsistency class is found
2. otherwise start porting the same method to `Shanghai`
3. reuse:
   - `context/markdown-openrpc-static-check-method.md`
   - `scripts/engine-static-check.js`
   - `scripts/engine-static-check-data.js`
4. create the `Shanghai` equivalents of:
   - atomic rules
   - static evidence table
   - issue-group data entries

## Resume Command

To resume from the current static-check state:

```bash
npm run engine:static-check -- --fork paris
```

Then use:

- `context/paris-static-evidence-table.md` for review
- `context/markdown-openrpc-static-check-method.md` for method
- `context/test-plan.md` for cross-fork planning
