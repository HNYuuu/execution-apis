# Context Index

This directory holds durable working context for the `Engine API` spec-review
and EL differential-testing work.

Top level is now intentionally small. Detailed material is grouped by purpose.

## Layout

- `plans/`
  Active planning documents.
- `evidence/`
  Fork-by-fork static-review results.
- `methods/`
  Reusable review methodology documents.
- `seeds/`
  Dynamic-test seed inventories.
- `rules/`
  Detailed rule inventories and decompositions.
- `snapshots/`
  Historical restart points and session summaries.

## Start Here

Read in this order:

1. `snapshots/2026-03-26-differential-testing-context.md`
2. `plans/el-differential-testing-plan.md`
3. `plans/test-plan.md`
4. `plans/hive-first-mvp-task-tracker.md`

Then pick one branch:

- Static review method:
  `methods/markdown-openrpc-static-check-method.md`
- Dynamic null and edge seeds:
  `seeds/null-seed-inventory-paris-amsterdam.md`
- Fork-specific static evidence:
  any file under `evidence/`

## Key Files

- `plans/test-plan.md`
  Cross-fork roadmap from `Paris` through `Amsterdam`.
- `plans/el-differential-testing-plan.md`
  Current execution-facing plan for the EL differential-testing phase.
- `plans/hive-first-mvp-task-tracker.md`
  Executable task tracker for the current Hive-first MVP.
- `methods/markdown-openrpc-static-check-method.md`
  Reusable method for markdown vs OpenRPC static review.
- `seeds/null-seed-inventory-paris-amsterdam.md`
  Consolidated null-semantics and dynamic-mutation seed list.
- `rules/paris-atomic-rules.md`
  Most detailed current rule inventory template.

## Evidence Status

- `evidence/paris-static-evidence-table.md`
  `Paris`: `0` confirmed findings.
- `evidence/shanghai-static-evidence-table.md`
  `Shanghai`: `2` confirmed findings.
- `evidence/cancun-static-evidence-table.md`
  `Cancun`: `1` issue group / `3` findings.
- `evidence/prague-static-evidence-table.md`
  `Prague`: `0` confirmed findings in `fork-local` mode.
- `evidence/osaka-static-evidence-table.md`
  `Osaka`: `1` confirmed finding.
- `evidence/amsterdam-static-evidence-table.md`
  `Amsterdam`: `1` confirmed finding in `fork-local` mode.

## Historical Notes

Older snapshots are kept under `snapshots/` for auditability, but new work
should normally start from:

- `snapshots/2026-03-26-differential-testing-context.md`
