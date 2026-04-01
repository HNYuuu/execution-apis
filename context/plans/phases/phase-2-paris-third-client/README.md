# Phase 2: Paris Third-Client Expansion

## Status

`todo`

## Goal

Add the first post-MVP EL client to the accepted Paris pipeline without
changing fork scope or relaxing the comparison discipline established in
phase-1.

Recommended first client:

- `nethermind`

## Scope

- keep fork scope fixed at `Paris`
- reuse the accepted phase-1 bootstrap, normalization, determinism, and
  `ResultEnvelope` workflow
- extend the matrix from `geth/reth` to `geth/reth/nethermind`

## Acceptance Target

Phase 2 is accepted only if:

- all phase-1 Paris scenarios run successfully on the third client
- complete `ResultEnvelope` artifacts exist for the three-client matrix
- determinism remains acceptable for the added client and updated matrix
- no comparison bucket depends on `unknown` provenance or undocumented
  normalization
- any newly exposed discrepancy is reproducible and triaged as one of:
  implementation bug, spec ambiguity, normalization issue, or explicit
  implementation-behavior observation
- an explicit phase-2 go/no-go review decides whether the project can expand to
  the broader Paris client matrix

## Execution Tracker

- [task-tracker.md](/Users/ningyuhe/Documents/execution-apis/context/plans/phases/phase-2-paris-third-client/task-tracker.md)
  Executable phase-2 task list.
