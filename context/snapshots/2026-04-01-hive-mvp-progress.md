# 2026-04-01 Hive MVP Progress Snapshot

## Purpose

This snapshot records the first implementation day of the Hive-first Engine
API MVP. It is the current restart point for review, rollback planning, and
next-step execution.

Use this file to recover:

- what changed in the test plan
- which MVP tasks are actually complete
- which runtime paths were proved with real clients
- which artifacts and commits anchor the current state

## Current Phase

The work has moved from plan-only refinement into early executable MVP
implementation.

Current state:

- planning is now explicitly `Hive-first`
- `T01`, `T02`, `T03`, and `T05` are complete
- the first real client-runtime bootstrap path has been proved
- the next active task is `T04`:
  `headfcu-bootstrap-smoke`

## Main Decisions From Today

### 1. Real runtime checks must happen early

The earlier offline `T03` baseline was not treated as sufficient completion
evidence.

Decision:

- keep offline artifacts only as preparation
- require real runtime execution before treating bootstrap scenarios as done

This is now reflected in:

- `context/plans/test-plan.md`
- `context/plans/el-differential-testing-plan.md`
- `context/plans/hive-first-mvp-task-tracker.md`

### 2. Hive is the environment anchor, but thin direct client execution is acceptable

`T05` proved that the local environment can run Hive-backed client images for:

- `go-ethereum`
- `reth`

For `T03`, the thinnest working path was:

1. `docker create`
2. `docker cp genesis.json`
3. `docker cp chain.rlp`
4. `docker start`
5. JSON-RPC queries
6. `docker rm -f`

This path was chosen because the client startup scripts move `/genesis.json`,
so direct bind-mounting to `/genesis.json` is not viable.

### 3. `chain.rlp` bootstrap is now runtime-proved for `geth` and `reth`

`T03` no longer depends on fixture-only expectations.

It now proves with real runtime execution that:

- both clients import `genesis + chain.rlp`
- both expose RPC after startup
- both report:
  - head number `0x2d`
  - head hash `0xe27a3e81bd7cfe2aec2cc9e832c73a17c93e7efcf659cf4b39883b96c48708c2`
- repeated runs are stable within each client

## Tasks Completed Today

### `T01` MVP oracle gate

Status:

- complete

Commit:

- `07ddaf1` `Implement T01 MVP oracle gate artifacts`

Key output:

- froze the allowed `Paris` MVP hard-invariant subset

### `T02` bootstrap contract

Status:

- complete

Commit:

- `5ce313c` `Implement T02 bootstrap contract artifacts`

Key output:

- fixed `StateBootstrap` definitions and state-family boundaries

### `T03` rlp bootstrap smoke

Status:

- complete

Commits:

- `c738763` `Add T03 rlp bootstrap smoke baseline artifacts`
- `ba15ce4` `Complete T03 real runtime rlp bootstrap smoke`

Key output:

- upgraded from offline baseline to real-runtime execution
- generated JSON log plus four raw boot logs

Primary artifacts:

- `context/plans/t03-rlp-bootstrap-smoke/paris-rlp-bootstrap-smoke.log.json`
- `context/plans/t03-rlp-bootstrap-smoke/paris-rlp-bootstrap-smoke.log.geth.run1.raw.log`
- `context/plans/t03-rlp-bootstrap-smoke/paris-rlp-bootstrap-smoke.log.geth.run2.raw.log`
- `context/plans/t03-rlp-bootstrap-smoke/paris-rlp-bootstrap-smoke.log.reth.run1.raw.log`
- `context/plans/t03-rlp-bootstrap-smoke/paris-rlp-bootstrap-smoke.log.reth.run2.raw.log`

### `T05` runtime reality check plus Hive integration spike

Status:

- complete

Commit:

- `4879f9c` `Implement T05 Hive runtime reality check artifacts`

Key output:

- proved Docker + local Hive execution path
- proved minimal authenticated Engine API path through Hive engine smoke
- captured the local Docker Desktop compatibility patch as an artifact

Primary artifacts:

- `context/plans/t05-hive-reality-check/paris-hive-reality-check.log.json`
- `context/plans/t05-hive-reality-check/paris-hive-engine-smoke.log.json`
- `context/plans/t05-hive-reality-check/paris-hive-integration-memo.md`
- `context/plans/t05-hive-reality-check/hive-docker-desktop-compat.patch`

## Important Runtime Findings

### 1. Docker Desktop compatibility issue in local Hive clone

The upstream Hive clone in `/tmp/hive` needed a local compatibility patch in:

- `internal/libdocker/container.go`

Reason:

- Docker Desktop populated container IPs under
  `NetworkSettings.Networks.<name>.IPAddress`
- the older top-level `NetworkSettings.IPAddress` field was empty

Without the patch, simulator containers received an empty `HIVE_SIMULATOR`
host.

The patch has been recorded in-repo at:

- `context/plans/t05-hive-reality-check/hive-docker-desktop-compat.patch`

### 2. Sandbox and Docker socket access are different concerns

Real Docker-backed runs succeeded outside the restricted sandbox but may report
permission-denied results if re-run without Docker socket access.

Interpretation:

- repository logs should be treated as the source of record for the successful
  real-runtime runs
- future re-runs need Docker socket access

### 3. Client startup scripts are not bind-mount friendly for `/genesis.json`

Both client startup flows assume they can move or rewrite `/genesis.json`.

Practical implication:

- future bootstrap tasks should prefer container file copy over direct bind
  mounts to the destination filename used by the startup scripts

## Current Working State

Branch:

- `work/engine-api-testing`

Workspace state at snapshot time:

- clean working tree

Task tracker status:

- done: `T01`, `T02`, `T03`, `T05`
- todo: `T04`, `T06`, `T07`, `T08`, `T09`, `T10`, `T11`, `T12`, `T13`, `T14`,
  `T15`

## Immediate Next Step

Start `T04`:

- bootstrap from `genesis + chain.rlp`
- replay `tests/headfcu.json` over authenticated Engine API
- confirm whether `geth` and `reth` accept the replay
- capture comparable `B2` state evidence

Recommended reading order before `T04` work:

1. `context/snapshots/2026-04-01-hive-mvp-progress.md`
2. `context/plans/hive-first-mvp-task-tracker.md`
3. `context/plans/t05-hive-reality-check/paris-hive-integration-memo.md`
4. `context/plans/t03-rlp-bootstrap-smoke/paris-rlp-bootstrap-smoke.log.json`
5. `context/plans/el-differential-testing-plan.md`
