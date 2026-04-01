# Phase 1: Paris MVP

## Status

`done`

## Goal

Prove that the Hive-first design can run a real Engine API differential
pipeline for `Paris` on `geth` and `reth`, including:

- real runtime bootstrap validation
- real runtime custom scenarios
- conservative normalization
- determinism probing
- offline `ResultEnvelope` comparison

## Scope

- fork: `Paris`
- clients: `geth`, `reth`
- scenarios:
  `rlp-bootstrap-smoke`,
  `headfcu-bootstrap-smoke`,
  `fcu-no-build`,
  `fcu-build-getpayload-newpayload`,
  `repeat-fcu-same-head`,
  `unknown-payloadid`

## Acceptance Target

Phase 1 is accepted only if:

- no promoted MVP hard invariant depends on `unknown` provenance
- the same bootstrap artifacts reproduce the same observable pre-state across
  `geth` and `reth`
- runtime-only Engine state is created by request replay rather than file
  injection
- normalization suppresses observed representation noise without erasing
  semantic differences
- the early bootstrap and runtime scenario set is deterministic enough for
  offline diff
- an explicit go/no-go review returns `go`

## Canonical Artifacts

- [test-plan.md](/Users/ningyuhe/Documents/execution-apis/context/plans/test-plan.md)
- [el-differential-testing-plan.md](/Users/ningyuhe/Documents/execution-apis/context/plans/phases/phase-1-paris-mvp/el-differential-testing-plan.md)
- [hive-first-mvp-task-tracker.md](/Users/ningyuhe/Documents/execution-apis/context/plans/phases/phase-1-paris-mvp/hive-first-mvp-task-tracker.md)
- [paris-differential-insights.md](/Users/ningyuhe/Documents/execution-apis/context/plans/phases/phase-1-paris-mvp/paris-differential-insights.md)
- [paris-mvp-acceptance.decision.json](/Users/ningyuhe/Documents/execution-apis/context/plans/t15-mvp-acceptance/paris-mvp-acceptance.decision.json)
