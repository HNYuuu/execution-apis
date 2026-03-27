# 2026-03-24 Session Context (Historical Snapshot)

## Supersession Note

Parts of this session snapshot were superseded on `2026-03-25` after
re-reviewing nullable-field projection semantics with maintainers. In
particular, nullable object fields are now treated as correctly projected when
they are omitted from `required`, and generated-doc drift is no longer part of
the primary findings surface. Markdown timeout annotations are also no longer
treated as YAML projection bugs. Use
`context/evidence/paris-static-evidence-table.md`,
`context/methods/markdown-openrpc-static-check-method.md`, and current
`npm run engine:static-check -- --fork paris` output as the authoritative
current state. For the current pre-`Amsterdam` restart point, use
`context/snapshots/2026-03-25-pre-amsterdam-context.md` instead of this file.

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

- `context/plans/test-plan.md`
- `context/methods/markdown-openrpc-static-check-method.md`
- `context/rules/paris-atomic-rules.md`
- `context/evidence/paris-static-evidence-table.md`

Deleted as redundant intermediate artifacts:

- `context/paris-openrpc-pilot.md`
- `context/paris-specification-surface.md`

Reason:

- those two files were exploratory and had already been subsumed by the rule
  inventory and the evidence table
- they were not judged necessary for future fork-by-fork work

## Durable Context Files And Their Roles

### `context/plans/test-plan.md`

The persistent cross-fork plan.

Use this file for:

- overall roadmap
- phase ordering
- cross-fork work planning

### `context/methods/markdown-openrpc-static-check-method.md`

The reusable method document for finding static inconsistencies.

Use this file for:

- checker design principles
- what counts as a static inconsistency
- manual false-positive review procedure

### `context/rules/paris-atomic-rules.md`

The durable `Paris` rule inventory.

Use this file for:

- rule IDs
- static vs single-call vs stateful tagging
- template for future fork inventories

### `context/evidence/paris-static-evidence-table.md`

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
- generic helper logic for additional static checks if later needed

## Current Paris Checker Result

This section is superseded by the `2026-03-25` re-review.

Use the current command:

```bash
npm run engine:static-check -- --fork paris
```

Current authoritative result:

- `2` findings
- `1` issue group

Current issue group:

- `PARIS-FCU-PARAM-PROJECTION`

Interpretation:

- these are not runtime bugs
- these are static inconsistencies between markdown and OpenRPC methods
- generated-doc drift and timeout projection are no longer part of the primary
  findings surface
- nullable object fields projected via `required: false` are treated as
  acceptable

## Notable Static Findings Confirmed Today

### 1. `engine_forkchoiceUpdatedV1` second parameter drift

Markdown says the second positional parameter is `Object|null`.

OpenRPC method YAML encodes it as `required: false` with a non-null schema,
which changes semantics from:

- `slot exists, may contain null`

to:

- `slot may be omitted; if present it is non-null`

## Current Git-Tree Intent

The following files are intended to remain as the durable working set for this
phase:

- `context/plans/test-plan.md`
- `context/methods/markdown-openrpc-static-check-method.md`
- `context/rules/paris-atomic-rules.md`
- `context/evidence/paris-static-evidence-table.md`
- `scripts/engine-static-check.js`
- `scripts/engine-static-check-data.js`

These are the files that should be extended when work continues.

## Recommended Next Steps

If work resumes from this point, the most natural next steps are:

1. keep deepening `Paris` only if a new static inconsistency class is found
2. otherwise start porting the same method to `Shanghai`
3. reuse:
   - `context/methods/markdown-openrpc-static-check-method.md`
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

- `context/evidence/paris-static-evidence-table.md` for review
- `context/methods/markdown-openrpc-static-check-method.md` for method
- `context/plans/test-plan.md` for cross-fork planning
