# 2026-03-25 Pre-Amsterdam Context

## Purpose

This is the current restart point before beginning the `Amsterdam` static
review pass.

Use this file first when resuming the work.

## Current Scope

The current phase is limited to `static artifact inconsistencies` between:

- `src/engine/<fork>.md`
- `src/engine/openrpc/methods/*.yaml`
- `src/engine/openrpc/schemas/*.yaml`

Out of scope for the current pass:

- generated docs under `docs-api/api/`
- runtime client behavior
- stateful multi-call semantics
- differential testing across EL clients

## Active Review Conventions

- Fork-scoped markdown is treated as the primary normative source for Engine
  API semantics.
- Nullable object fields may be projected either by explicit `null` support or
  by omission from `required`.
- Nullable positional parameters may also be treated as optional when
  maintainers explicitly accept omission as null-equivalent.
- Top-level method `result: null` is not equivalent to a missing result field
  and should be modeled explicitly.
- Timeout annotations in markdown are not currently treated as YAML projection
  obligations.
- Generated docs are downstream artifacts and are not part of the primary
  finding surface.

## Checker State

Implementation files:

- `scripts/engine-static-check.js`
- `scripts/engine-static-check-data.js`

Entry point:

```bash
npm run engine:static-check -- --fork <fork>
```

Supported review modes:

- `fork-local`
- `cumulative`

## Current Fork Status

- `Paris`
  - status: `0` findings
  - evidence: `context/paris-static-evidence-table.md`
- `Shanghai`
  - status: `2` findings
  - evidence: `context/shanghai-static-evidence-table.md`
  - current findings:
    - `engine_forkchoiceUpdatedV2` missing `PayloadAttributesV1` in the method
      union
    - `engine_getPayloadBodiesByRangeV1` missing `-32602`
- `Cancun`
  - status: `1` issue group / `3` findings
  - evidence: `context/cancun-static-evidence-table.md`
  - current findings:
    - `engine_newPayloadV2`, `engine_forkchoiceUpdatedV2`, and
      `engine_getPayloadV2` omit required `-38005`
- `Prague`
  - status: `0` findings in `fork-local` mode
  - evidence: `context/prague-static-evidence-table.md`
- `Osaka`
  - status: `1` finding
  - evidence: `context/osaka-static-evidence-table.md`
  - current finding:
    - `engine_getBlobsV2` drops the top-level `result: null` branch in methods
      YAML

## Dynamic-Test Seed Inventory

The current `null`-focused seed list is:

- `context/null-seed-inventory-paris-osaka.md`

This document includes:

- confirmed static `null` issues
- accepted projections worth stress-testing dynamically
- deferred mutation ideas that should not be reported as current static bugs

## Suggested Next Step

Run the same static review method on `Amsterdam` in `fork-local` mode first,
then decide whether any `cumulative` checks are still needed.
