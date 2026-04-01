# Phase 2 Task Tracker

This document converts phase-2 into an executable task list.

Each task must include:

- `inputs`
- `operation steps`
- `expected outputs`
- `validation method`

Default artifact expectation for every phase-2 task:

- `code`
- `script`
- `config`
- `test case`
- `log format`

If a task intentionally omits one of these artifact types, the omission should
be recorded in that task's notes.

Git requirement for every task:

- each completed task must end with a dedicated git commit
- the task record should include the commit hash and commit message once the
  task is done
- create that task commit by default once the task passes
- ask for user confirmation only when the task leaves a real manual decision
  unresolved
- batching multiple completed tasks into one commit is discouraged because it
  weakens rollback and auditability

Status values:

- `todo`
- `in_progress`
- `blocked`
- `done`

## Summary

| Task ID | Task | Status |
| --- | --- | --- |
| `P2-T01` | Third-client scope freeze and comparison-discipline gate | `done` |
| `P2-T02` | `nethermind` acquisition and startup contract | `todo` |
| `P2-T03` | `nethermind` runtime reality check and Hive wiring proof | `todo` |
| `P2-T04` | `nethermind` bootstrap validation for `B1` and `B2` | `todo` |
| `P2-T05` | `nethermind` early runtime scenarios | `todo` |
| `P2-T06` | `nethermind` build-lifecycle and unknown-payload scenarios | `todo` |
| `P2-T07` | Three-client corpus extension and normalization review | `todo` |
| `P2-T08` | Three-client determinism probe | `todo` |
| `P2-T09` | Three-client `ResultEnvelope` diff and discrepancy triage | `todo` |
| `P2-T10` | Phase-2 acceptance review and go/no-go checkpoint | `todo` |

## `P2-T01` Third-Client Scope Freeze And Comparison-Discipline Gate

**Status**

`done`

**Inputs**

- [phase-2 README.md](/Users/ningyuhe/Documents/execution-apis/context/plans/phases/phase-2-paris-third-client/README.md)
- [phase-1 README.md](/Users/ningyuhe/Documents/execution-apis/context/plans/phases/phase-1-paris-mvp/README.md)
- [paris-differential-insights.md](/Users/ningyuhe/Documents/execution-apis/context/plans/phases/phase-1-paris-mvp/paris-differential-insights.md)
- [hive-first-mvp-task-tracker.md](/Users/ningyuhe/Documents/execution-apis/context/plans/phases/phase-1-paris-mvp/hive-first-mvp-task-tracker.md)

**Operation Steps**

1. Freeze the phase-2 scenario surface to the accepted phase-1 Paris set.
2. Freeze the first new client target as `nethermind`.
3. Re-state the comparison-discipline rules that phase-2 must preserve:
   client-local runtime values, conservative normalization, and the
   provenance-aware `unknown-payloadid` input class.
4. Record any phase-1 insight that becomes a hard planning constraint for the
   three-client matrix.

**Expected Outputs**

- phase-2 scope memo
- explicit list of reused phase-1 comparison-discipline rules
- explicit list of phase-2-only open questions

**Artifacts**

- `code`
  [engine-phase2-scope-gate.js](/Users/ningyuhe/Documents/execution-apis/scripts/engine-phase2-scope-gate.js)
- `script`
  [run-engine-phase2-scope-gate.sh](/Users/ningyuhe/Documents/execution-apis/scripts/run-engine-phase2-scope-gate.sh)
- `config`
  [paris-phase2-scope-gate.config.json](/Users/ningyuhe/Documents/execution-apis/context/plans/phases/phase-2-paris-third-client/p2-t01-scope-gate/paris-phase2-scope-gate.config.json)
- `test case`
  [paris-phase2-scope-gate.test-case.json](/Users/ningyuhe/Documents/execution-apis/context/plans/phases/phase-2-paris-third-client/p2-t01-scope-gate/paris-phase2-scope-gate.test-case.json)
- `log format`
  [paris-phase2-scope-gate.log-format.md](/Users/ningyuhe/Documents/execution-apis/context/plans/phases/phase-2-paris-third-client/p2-t01-scope-gate/paris-phase2-scope-gate.log-format.md)
- `log output`
  [paris-phase2-scope-gate.log.json](/Users/ningyuhe/Documents/execution-apis/context/plans/phases/phase-2-paris-third-client/p2-t01-scope-gate/paris-phase2-scope-gate.log.json)
- `scope memo`
  [paris-phase2-scope-gate.report.md](/Users/ningyuhe/Documents/execution-apis/context/plans/phases/phase-2-paris-third-client/p2-t01-scope-gate/paris-phase2-scope-gate.report.md)

**Git Record**

- `commit`
  `a3dab7f` - `Complete P2-T01 scope freeze and comparison gate`

**Validation Method**

- Confirm phase-2 does not widen fork scope beyond `Paris`.
- Confirm no new scenario is added before `nethermind` is running on the full
  accepted phase-1 scenario surface.

## `P2-T02` `nethermind` Acquisition And Startup Contract

**Status**

`todo`

**Inputs**

- [paris-hive-integration-memo.md](/Users/ningyuhe/Documents/execution-apis/context/plans/t05-hive-reality-check/paris-hive-integration-memo.md)
- phase-1 runtime configs for `geth` and `reth`
- local Hive client-image conventions

**Operation Steps**

1. Identify the concrete `nethermind` image or build path to use under Hive.
2. Record required startup flags, JWT secret path, HTTP/auth RPC ports, and any
   chain-import specifics.
3. Compare the `nethermind` startup path with the accepted `geth/reth` startup
   contracts.
4. Record any expected divergence that should not be misclassified as an
   Engine-API discrepancy.

**Expected Outputs**

- `nethermind` startup contract
- per-client parity notes against `geth` and `reth`
- explicit blocker list if the image or startup path is not ready

**Validation Method**

- Confirm the startup contract is concrete enough to run real bootstrap tasks.
- Confirm JWT/auth RPC expectations are explicit rather than implicit.

## `P2-T03` `nethermind` Runtime Reality Check And Hive Wiring Proof

**Status**

`todo`

**Inputs**

- output of `P2-T02`
- [paris-hive-engine-smoke.log.json](/Users/ningyuhe/Documents/execution-apis/context/plans/t05-hive-reality-check/paris-hive-engine-smoke.log.json)
- accepted phase-1 Docker/Hive wiring assumptions

**Operation Steps**

1. Prove that `nethermind` can be launched in the controlled Docker/Hive
   environment.
2. Prove that authenticated Engine RPC is reachable.
3. Run a minimal stock Hive or equivalent smoke request path.
4. Record any environment-level blockers before phase-2 scenario work starts.

**Expected Outputs**

- real runtime `nethermind` smoke log
- startup memo for `nethermind`
- blocker memo if the environment is not yet phase-2-ready

**Validation Method**

- Confirm the environment can reach both HTTP RPC and authenticated Engine RPC.
- Confirm this task fails fast on environment blockers rather than letting them
  leak into later scenario tasks.

## `P2-T04` `nethermind` Bootstrap Validation For `B1` And `B2`

**Status**

`todo`

**Inputs**

- accepted bootstrap definitions from phase-1
- [paris-rlp-bootstrap-smoke.config.json](/Users/ningyuhe/Documents/execution-apis/context/plans/t03-rlp-bootstrap-smoke/paris-rlp-bootstrap-smoke.config.json)
- [paris-headfcu-bootstrap-smoke.config.json](/Users/ningyuhe/Documents/execution-apis/context/plans/t04-headfcu-bootstrap-smoke/paris-headfcu-bootstrap-smoke.config.json)
- output of `P2-T03`

**Operation Steps**

1. Adapt `rlp-bootstrap-smoke` to add `nethermind`.
2. Adapt `headfcu-bootstrap-smoke` to add `nethermind`.
3. Confirm `nethermind` reaches the same observable pre-state as the accepted
   phase-1 baseline.
4. Record whether any difference is semantic or representation-only.

**Expected Outputs**

- `nethermind` `B1` bootstrap artifacts
- `nethermind` `B2` bootstrap artifacts
- three-client bootstrap comparison notes

**Validation Method**

- Confirm the `B1` and `B2` observable states are comparable across all three
  clients.
- Confirm bootstrap-only differences are not misclassified as runtime
  discrepancies.

## `P2-T05` `nethermind` Early Runtime Scenarios

**Status**

`todo`

**Inputs**

- accepted phase-1 runtime scenarios for:
  `fcu-no-build`,
  `repeat-fcu-same-head`
- [paris-differential-insights.md](/Users/ningyuhe/Documents/execution-apis/context/plans/phases/phase-1-paris-mvp/paris-differential-insights.md)
- outputs of `P2-T04`

**Operation Steps**

1. Run `fcu-no-build` on `nethermind` with the accepted Paris method and
   bootstrap contract.
2. Run `repeat-fcu-same-head` on `nethermind`.
3. Evaluate the same hard invariants used in phase-1.
4. Record any new comparison-discipline insight exposed by the third client.

**Expected Outputs**

- `nethermind` runtime artifacts for the early custom scenarios
- invariant evaluations for `nethermind`
- updated insight notes if new non-semantic differences appear

**Validation Method**

- Confirm `nethermind` satisfies the accepted phase-1 hard invariants for the
  early scenarios.
- Confirm any deviation is classified before phase-2 proceeds.

## `P2-T06` `nethermind` Build-Lifecycle And Unknown-Payload Scenarios

**Status**

`todo`

**Inputs**

- accepted phase-1 scenarios for:
  `fcu-build-getpayload-newpayload`,
  `unknown-payloadid`
- phase-1 Paris fixture strategy
- outputs of `P2-T04`

**Operation Steps**

1. Run the Paris build-lifecycle sequence on `nethermind`.
2. Track client-local runtime values such as `payloadId` without turning them
   into cross-client keys.
3. Run the provenance-aware unknown-payload scenario by mutating a real Paris
   V1 `payloadId`.
4. Record any third-client-specific behavior that needs a new insight note.

**Expected Outputs**

- `nethermind` build-lifecycle artifacts
- `nethermind` unknown-payload artifacts
- explicit notes on any newly exposed implementation-behavior observations

**Validation Method**

- Confirm phase-2 does not regress the accepted `unknown-payloadid` input-class
  discipline.
- Confirm `nethermind` results are ready for corpus and envelope generation.

## `P2-T07` Three-Client Corpus Extension And Normalization Review

**Status**

`todo`

**Inputs**

- outputs of `P2-T04` through `P2-T06`
- [paris-normalization-profile.json](/Users/ningyuhe/Documents/execution-apis/context/plans/t09-normalization-profile/paris-normalization-profile.json)
- [paris-differential-insights.md](/Users/ningyuhe/Documents/execution-apis/context/plans/phases/phase-1-paris-mvp/paris-differential-insights.md)

**Operation Steps**

1. Extend the Paris response corpus to include `nethermind`.
2. Test whether existing normalization rules still hold on the three-client
   matrix.
3. Decide whether any deferred normalization rule now has enough real evidence
   to activate.
4. Record any new insight without normalizing away semantic differences.

**Expected Outputs**

- three-client Paris corpus
- normalization review memo
- updated insight note and normalization decision log

**Validation Method**

- Confirm any normalization change is evidence-driven.
- Confirm no semantic discrepancy is hidden by a newly activated rule.

## `P2-T08` Three-Client Determinism Probe

**Status**

`todo`

**Inputs**

- outputs of `P2-T04` through `P2-T07`
- accepted phase-1 determinism method

**Operation Steps**

1. Re-run the agreed bootstrap and early runtime scenarios for the three-client
   matrix.
2. Check within-client stability for `nethermind`.
3. Re-check matrix-level readiness for offline diff.
4. Record any newly unstable scenario and stop it from contaminating final
   comparison buckets.

**Expected Outputs**

- three-client determinism report
- explicit repeatable vs blocked scenario list

**Validation Method**

- Confirm the expanded matrix is deterministic enough for offline diff.
- Confirm any unstable scenario is marked blocked rather than silently used.

## `P2-T09` Three-Client `ResultEnvelope` Diff And Discrepancy Triage

**Status**

`todo`

**Inputs**

- outputs of `P2-T04` through `P2-T08`
- accepted phase-1 `ResultEnvelope` workflow
- current Paris differential insights

**Operation Steps**

1. Extend `ResultEnvelope` generation from two clients to three.
2. Run offline pairwise and matrix-level comparison for the accepted Paris
   surface.
3. Keep the phase-1 comparison-discipline exclusions intact.
4. Triage every newly exposed discrepancy as:
   implementation bug,
   spec ambiguity,
   normalization issue,
   or implementation-behavior observation.

**Expected Outputs**

- three-client `ResultEnvelope` artifacts
- offline diff report for the three-client matrix
- first discrepancy ledger for phase-2

**Validation Method**

- Confirm complete envelopes exist for the three-client scenario matrix.
- Confirm every discrepancy is triaged rather than left as an unlabeled diff.

## `P2-T10` Phase-2 Acceptance Review And Go/No-Go Checkpoint

**Status**

`todo`

**Inputs**

- outputs of `P2-T01` through `P2-T09`
- [phase-2 README.md](/Users/ningyuhe/Documents/execution-apis/context/plans/phases/phase-2-paris-third-client/README.md)

**Operation Steps**

1. Review each phase-2 acceptance target against observed outputs.
2. Confirm the third-client expansion did not relax the accepted phase-1
   comparison discipline.
3. Confirm determinism and offline diff remain trustworthy on the three-client
   matrix.
4. Make an explicit go/no-go decision for moving to the broader Paris client
   matrix.

**Expected Outputs**

- phase-2 review summary
- explicit go/no-go decision
- next-step task list for phase-3 or remediation

**Validation Method**

- Confirm every phase-2 acceptance criterion is marked pass, fail, or blocked.
- Confirm any blocked criterion has a concrete remediation path.
