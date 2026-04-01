# Execution Phases

This directory is the phase-oriented execution layer for the EL differential
testing project.

Use it for forward planning. Historical phase-1 implementation artifacts remain
in `context/plans/t01-*` through `context/plans/t15-*`.

## Phase Order

1. [phase-1-paris-mvp/README.md](./phase-1-paris-mvp/README.md)
   Accepted baseline. Paris `geth/reth` Hive-first MVP.
2. [phase-2-paris-third-client/README.md](./phase-2-paris-third-client/README.md)
   Add the third EL client on the existing Paris pipeline.
   Tracker:
   [phase-2-paris-third-client/task-tracker.md](./phase-2-paris-third-client/task-tracker.md)
3. [phase-3-paris-full-client-matrix/README.md](./phase-3-paris-full-client-matrix/README.md)
   Complete the Paris primary-client matrix and fold stock-owned paths into the
   local envelope workflow.
4. [phase-4-multi-fork-core/README.md](./phase-4-multi-fork-core/README.md)
   Expand the core Engine API differential surface beyond Paris.
5. [phase-5-extended-engine-surface/README.md](./phase-5-extended-engine-surface/README.md)
   Extend to broader API families and harder comparison classes.

## File-Architecture Rule

- phase-level goal and acceptance live under `plans/phases/`
- phase-owned source-of-truth plan documents should live under the owning phase
  directory rather than under `plans/`
- phase-local future task trackers should live under the corresponding phase
  directory
- implementation artifacts remain under task-specific directories unless a
  later migration is explicitly justified

## Execution Rule

- after a task is completed, create the dedicated git commit by default
- stop for user confirmation only when the task outcome leaves a real decision
  that should not be auto-resolved by the agent
