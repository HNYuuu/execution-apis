# 2026-03-26 Differential Testing Context

## Purpose

This file is the current restart point after the markdown/OpenRPC static-review
phase and before implementation of the Engine API EL differential-testing
harness.

Use this file to recover the current testing direction, scope boundaries, and
next-step priorities without replaying the full discussion history.

## Current Phase

The `markdown <-> yaml` static-review phase is considered a stage-complete
supporting step.

Its role is now:

- identify where OpenRPC YAML is incomplete as a semantic oracle
- identify markdown-only rules worth turning into dynamic mutations
- identify null, error-code, and boundary cases worth stress-testing later

The main active direction has shifted to:

- `EL differential testing for Engine API behavior`

## Main Decisions From Today

### 1. Scope of the dynamic phase

The immediate target is:

- `EL client Engine API server-side behavior`

The immediate non-targets are:

- full CL-client correctness
- p2p networking behavior
- naturally evolving multi-node private-network behavior

CL-side logic is treated as a driver, not as the primary system under test.

### 2. Role of YAML and markdown

The current layered interpretation is:

- OpenRPC YAML provides request skeletons, shape constraints, and method/schema
  discovery.
- Fork-scoped markdown provides semantic enrichment, especially for:
  - boundary lengths
  - null semantics
  - mandatory error/status branches
  - fork-specific behavior
  - cross-field and sequence-sensitive constraints

Conclusion:

- YAML should not be treated as a complete semantic oracle for Engine API
  differential testing.
- YAML is still useful as the grammar layer for seed construction.

### 3. Oracle policy

The agreed testing model is not `yaml-only oracle`.

The current plan is:

- use YAML for syntactic plausibility
- use markdown-derived rules as a thin semantic overlay
- treat cross-client divergence as the primary testing signal

The preferred result buckets are:

- `all agree`
- `agree after normalization`
- `diverge across clients`
- `violates hard invariant`

### 4. Environment strategy

The first differential-testing version should not start with a full private
network and a real CL client.

The preferred initial setup is:

- one isolated EL sandbox per client
- one state controller per sandbox
- one lightweight CL-side driver or trace replayer
- one shared scenario runner
- one normalizer plus comparator

The driver only needs to make each EL client believe it is talking to a valid
CL-side peer. It does not need to implement full CL behavior.

### 5. State-control policy

Because Engine API behavior is highly stateful, tests must compare clients only
after driving them into equivalent abstract states.

Initial state families remain:

- `S0 bootstrap`
- `S1 imported-chain`
- `S2 forkchoice-known`
- `S3 build-started`
- `S4 payload-available`
- `S5 payload-imported`
- `S6 degraded-data`
- `S7 fork-boundary`

State control should prefer:

1. common genesis and fork schedule
2. deterministic prebuilt chain or fixtures
3. common Engine API request replay
4. client-specific helpers only if unavoidable

Direct database mutation is discouraged.

### 6. CL-side testing decision

The current answer is:

- do not test CL clients yet

Reason:

- mixing EL-server testing with CL-consumer testing would make first-phase
  differential findings much harder to interpret

Future CL-side testing remains interesting, but it should be a later and
separate line of work.

### 7. Client coverage set

The agreed target EL client set is:

- `geth`
- `nethermind`
- `erigon`
- `besu`
- `reth`

Recommended rollout order:

1. `geth` + `reth`
2. add `nethermind`
3. add `besu`
4. add `erigon`

## Current Supporting Documents

Primary planning documents:

- `context/plans/test-plan.md`
- `context/plans/el-differential-testing-plan.md`

Static-review method and findings:

- `context/methods/markdown-openrpc-static-check-method.md`
- `context/evidence/paris-static-evidence-table.md`
- `context/evidence/shanghai-static-evidence-table.md`
- `context/evidence/cancun-static-evidence-table.md`
- `context/evidence/prague-static-evidence-table.md`
- `context/evidence/osaka-static-evidence-table.md`
- `context/evidence/amsterdam-static-evidence-table.md`

Dynamic seed inventory:

- `context/seeds/null-seed-inventory-paris-amsterdam.md`

## Current Branch And Working State

Current working branch:

- `work/engine-api-testing`

Current local status at the time of writing:

- dynamic differential-testing plan has been drafted
- this context snapshot has been added
- changes are ready to commit and push

## Immediate Next Step

Start the harness MVP design and implementation plan with the following minimum
scope:

- two clients first: `geth` and `reth`
- one fork first: `Paris` or `Shanghai`
- one deterministic sequence first:
  `forkchoiceUpdated -> getPayload -> newPayload`
- one markdown-derived boundary sequence

## Short Reading Order

1. `context/snapshots/2026-03-26-differential-testing-context.md`
2. `context/plans/el-differential-testing-plan.md`
3. `context/plans/test-plan.md`
4. `context/seeds/null-seed-inventory-paris-amsterdam.md`
