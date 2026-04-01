# 2026-04-01 Hive MVP And Phase-2 Snapshot

## Purpose

This snapshot is the current end-of-day restart point after:

- the accepted `Paris geth/reth` MVP was fully closed
- phase planning was reorganized under `plans/phases/`
- phase-2 was started and its first two tasks were completed

Use this file to recover:

- what phase-1 actually achieved
- what changed in the plan and file architecture
- which phase-2 tasks are already complete
- what concrete blocker now gates the next runtime step

## Current Project State

The work is no longer in MVP implementation. Phase-1 is complete and accepted.
The active line is now `phase-2-paris-third-client`.

Current state:

- phase-1 status: `done`
- phase-2 status: started
- complete phase-2 tasks: `P2-T01`, `P2-T02`
- next active task: `P2-T03`

## Main Decisions Captured Today

### 1. Phase-1 is now treated as a closed baseline

The accepted `Paris geth/reth` MVP remains the baseline for all later work.

That baseline now includes:

- real runtime bootstrap validation
- real runtime custom scenarios
- conservative normalization
- determinism probing
- offline `ResultEnvelope` diff
- explicit MVP acceptance review returning `go`

Primary acceptance anchor:

- `context/plans/t15-mvp-acceptance/paris-mvp-acceptance.decision.json`

### 2. Phase-owned planning documents now live under the owning phase

The active phase-1 source-of-truth planning files were moved under:

- `context/plans/phases/phase-1-paris-mvp/`

This applies to:

- `el-differential-testing-plan.md`
- `hive-first-mvp-task-tracker.md`
- `paris-differential-insights.md`

Implementation artifact directories `t01-*` through `t15-*` were deliberately
left in place as historical execution records.

### 3. Phase-2 stays narrow: Paris only, one new client, no scenario expansion

`P2-T01` froze phase-2 to the accepted phase-1 Paris scenario surface.

Frozen scope:

- fork: `Paris`
- new client target: `nethermind`
- reused scenarios:
  - `rlp-bootstrap-smoke`
  - `headfcu-bootstrap-smoke`
  - `fcu-no-build`
  - `fcu-build-getpayload-newpayload`
  - `repeat-fcu-same-head`
  - `unknown-payloadid`

Comparison-discipline constraints carried into phase-2:

- object key order remains normalization-only noise
- `null` vs omitted stays deferred without new evidence
- Paris scenarios must keep Paris-era fixture alignment
- client-local runtime identifiers stay out of cross-client equality
- `engine_newPayloadV1` success remains a structured category
- `feeRecipient` is not hard-tied to `suggestedFeeRecipient`
- `unknown-payloadid` keeps the mutated-real-Paris-`payloadId` input class

### 4. `nethermind` acquisition is now concrete enough for runtime work

`P2-T02` fixed the startup contract for the third client.

Acquisition decision:

- use Hive client wrapper source at `/tmp/hive/clients/nethermind`
- target image name: `hive/clients/nethermind:latest`
- wrapper base image: `nethermindeth/nethermind:master`

Runtime contract:

- entrypoint: `/nethermind.sh`
- HTTP RPC: `8545`
- authenticated Engine/API: `8551`
- JWT file: `/jwt.secret`
- generated config: `/configs/test.json`
- generated chainspec: `/chainspec/test.json`

Important parity note:

- unlike `geth` and `reth`, `nethermind` exposes authrpc and chain import
  through generated config rather than only through command-line flags

## Tasks Completed Today

### Phase-1 closure status

Phase-1 completion and acceptance are now fully in place:

- `T01` through `T15`: complete
- phase-1 acceptance decision: `go`

Relevant commits already in history before today’s phase-2 work include:

- `09192ad` `Complete T15 MVP acceptance review`
- `11f5821` `Backfill T15 git record in task tracker`
- `06158d9` `Update plans after Paris MVP acceptance`
- `11213e0` `Add phase-oriented roadmap after Paris MVP`
- `9224614` `Add phase-2 task tracker and auto-commit rule`

### Phase-2 task progress

#### `P2-T01` Third-client scope freeze and comparison gate

Status:

- complete

Commits:

- `a3dab7f` `Complete P2-T01 scope freeze and comparison gate`
- `b7f731c` `Backfill P2-T01 git record in task tracker`

Primary artifacts:

- `context/plans/phases/phase-2-paris-third-client/p2-t01-scope-gate/paris-phase2-scope-gate.log.json`
- `context/plans/phases/phase-2-paris-third-client/p2-t01-scope-gate/paris-phase2-scope-gate.report.md`

#### `P2-T02` Nethermind startup contract

Status:

- complete

Commits:

- `b08100c` `Complete P2-T02 nethermind startup contract`
- `30579db` `Backfill P2-T02 git record in task tracker`

Primary artifacts:

- `context/plans/phases/phase-2-paris-third-client/p2-t02-nethermind-startup-contract/paris-nethermind-startup-contract.log.json`
- `context/plans/phases/phase-2-paris-third-client/p2-t02-nethermind-startup-contract/paris-nethermind-startup-contract.report.md`

## Important Current Blocker

The next task is not blocked by ambiguity anymore. It is blocked by a concrete
runtime precondition:

- local image `hive/clients/nethermind:latest` is not built yet

Observed command result:

- `docker image inspect hive/clients/nethermind:latest`
- daemon response: `No such image`

Interpretation:

- `P2-T02` is complete because the startup contract is concrete
- `P2-T03` must now either build the Hive wrapper image or let Hive build it
  during the first real runtime run

## Current Working State

Branch:

- `work/engine-api-testing`

Workspace state at snapshot time:

- clean working tree

Phase status:

- phase-1: `done`
- phase-2: `P2-T01`, `P2-T02` done; `P2-T03` through `P2-T10` todo

## Immediate Next Step

Start `P2-T03`:

- build or trigger build of `hive/clients/nethermind:latest`
- prove `nethermind` starts in the controlled Docker/Hive environment
- prove authenticated Engine RPC is reachable
- run a minimal Hive or equivalent engine smoke path
- fail fast if the wrapper image or auth wiring is still not runnable

Recommended reading order before `P2-T03` work:

1. `context/snapshots/2026-04-01-hive-mvp-progress.md`
2. `context/plans/phases/phase-2-paris-third-client/task-tracker.md`
3. `context/plans/phases/phase-2-paris-third-client/p2-t02-nethermind-startup-contract/paris-nethermind-startup-contract.report.md`
4. `context/plans/t05-hive-reality-check/paris-hive-integration-memo.md`
5. `context/plans/phases/phase-1-paris-mvp/paris-differential-insights.md`
