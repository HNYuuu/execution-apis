# Context Index

This directory holds the durable working context for the `Engine API`
spec-review and test-planning work.

## Shared Documents

- `test-plan.md`
  High-level roadmap from `Paris` through `Amsterdam`.
- `markdown-openrpc-static-check-method.md`
  Reusable method document for `markdown <-> OpenRPC YAML` static review.
- `null-seed-inventory-paris-osaka.md`
  Consolidated `null`-semantics seed list collected from `Paris` through
  `Osaka`, including both confirmed static issues and deferred dynamic-test
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

## Rule Inventory

- `paris-atomic-rules.md`
  Detailed atomic rule decomposition for `Paris`. This remains the template for
  later fork-specific rule inventories.

## Session Snapshots

- `2026-03-24-session-context.md`
  Historical snapshot from the early `Paris`-only phase. Kept for audit
  history, but superseded as a working snapshot.
- `2026-03-25-pre-amsterdam-context.md`
  Current restart point before beginning the `Amsterdam` review.

## Suggested Reading Order

1. `2026-03-25-pre-amsterdam-context.md`
2. `test-plan.md`
3. `markdown-openrpc-static-check-method.md`
4. Fork evidence table for the fork you want to inspect
5. `null-seed-inventory-paris-osaka.md` when preparing dynamic/null mutations
