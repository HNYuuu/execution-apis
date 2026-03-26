# Context Index

This directory holds the durable working context for the `Engine API`
spec-review and test-planning work.

## Shared Documents

- `test-plan.md`
  High-level roadmap from `Paris` through `Amsterdam`.
- `el-differential-testing-plan.md`
  Concrete plan for the next phase: lightweight CL-driven differential testing
  across major EL clients.
- `markdown-openrpc-static-check-method.md`
  Reusable method document for `markdown <-> OpenRPC YAML` static review.
- `null-seed-inventory-paris-osaka.md`
  Consolidated `null`-semantics seed list collected from `Paris` through
  `Amsterdam`, including both confirmed static issues and deferred dynamic-test
  mutations.

## Fork Evidence Tables

- `paris-static-evidence-table.md`
  `Paris` static review result. Current status: `0` confirmed findings.
- `shanghai-static-evidence-table.md`
  `Shanghai` static review result. Current status: `2` confirmed findings.
- `cancun-static-evidence-table.md`
  `Cancun` static review result. Current status: `1` issue group / `3`
  findings.
- `prague-static-evidence-table.md`
  `Prague` static review result. Current status: `0` confirmed findings in
  `fork-local` mode.
- `osaka-static-evidence-table.md`
  `Osaka` static review result. Current status: `1` confirmed finding.
- `amsterdam-static-evidence-table.md`
  `Amsterdam` static review result. Current status: `1` confirmed finding in
  `fork-local` mode.

## Rule Inventory

- `paris-atomic-rules.md`
  Detailed atomic rule decomposition for `Paris`. This remains the template for
  later fork-specific rule inventories.

## Session Snapshots

- `2026-03-24-session-context.md`
  Historical snapshot from the early `Paris`-only phase. Kept for audit
  history, but superseded as a working snapshot.
- `2026-03-25-pre-amsterdam-context.md`
  Historical restart point from immediately before the `Amsterdam` review.
- `2026-03-26-differential-testing-context.md`
  Current restart point after the static-review phase and at the beginning of
  EL differential-testing planning.

## Suggested Reading Order

1. `2026-03-26-differential-testing-context.md`
2. `el-differential-testing-plan.md`
3. `test-plan.md`
4. `2026-03-25-pre-amsterdam-context.md`
5. `markdown-openrpc-static-check-method.md`
6. Fork evidence table for the fork you want to inspect
7. `null-seed-inventory-paris-osaka.md` when preparing dynamic/null mutations
