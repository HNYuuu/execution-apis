# Engine API Test Plan

## Goal

Build a complete test strategy for the Engine API across all fork-scoped specs
in this repository, from `Paris` through `Amsterdam`, with three complementary
objectives:

1. Verify consistency between Engine API rules and their higher-level sources.
2. Detect inconsistencies introduced by the "new spec modifies old spec"
   evolution model.
3. Verify that different execution clients implement the Engine API
   consistently.

This document is the durable high-level roadmap. Historical session context
remains under `context/snapshots/`, but the current source of truth is the
`context/plans/` directory.

## Scope

Covered fork-scoped Engine API specifications:

- `Paris`
- `Shanghai`
- `Cancun`
- `Prague`
- `Osaka`
- `Amsterdam`

Covered artifact types:

- Markdown specifications under `src/engine/`
- OpenRPC method definitions under `src/engine/openrpc/methods/`
- OpenRPC schema definitions under `src/engine/openrpc/schemas/`
- Repository test fixtures under `tests/`
- Dynamic differential harness inputs derived from repository fixtures and
  fork-scoped specs
- Downstream conformance execution in Hive `rpc-compat`

Out of scope for the initial execution phases:

- Full fuzzing infrastructure
- Full stateful differential execution against all five clients at once
- Performance benchmarking

## Guiding Model

Treat the Engine API as a layered specification surface:

1. `High-level provenance layer`
   Map each Engine API rule to a source such as prior Engine API specs,
   consensus-layer specs, EIPs, or explicit repository design decisions.
2. `Spec evolution layer`
   Check whether fork-to-fork modifications preserve consistency when a newer
   document extends, overrides, or deprecates earlier rules.
3. `Implementation layer`
   Check whether execution clients expose equivalent observable behavior for the
   same Engine API inputs and protocol sequences.

The execution path for those layers is intentionally linear:

`Static review -> Fixture-level single-call checks -> Hive-first EL differential MVP -> Client expansion`

The repository's existing `tests/*.io` format only covers the second step. It
does not replace the Hive-based stateful differential stack required for the
third step.

Forward execution after the accepted Paris MVP is now organized under
[plans/phases/README.md](./phases/README.md). The current accepted MVP is
treated as `phase-1`.

## Artifact Discipline

Every implementation step in this testing program must produce durable
artifacts. Work is not considered complete if it exists only as an interactive
experiment or undocumented local state.

Minimum artifact set for each executable step:

- `code`
  implementation code or helper library code
- `script`
  runnable entrypoint or automation wrapper
- `config`
  configuration or bootstrap definition used by the step
- `test case`
  concrete scenario, fixture, or comparison input for the step
- `log format`
  documented output schema or log record format so results can be inspected and
  diffed later

If a step does not naturally require one of these artifact types, the plan for
that step must explicitly say why it is omitted. The default expectation is to
produce all five.

Every completed step must also end with a dedicated git commit so the work can
be reviewed and rolled back independently later. The commit is part of the step
record, not an optional cleanup action at the end of a larger batch.

## Test Axes

Every rule or test case should be tagged against one or more of the following
axes:

- `Structure`
  Fields, types, optionality, nullability, presence semantics, versioned
  schemas, enum values, and object composition.
- `Routine`
  Validation steps, required ordering of checks, derived values, and
  preconditions.
- `Error behavior`
  Error codes, error grouping, rejection conditions, and deprecation behavior.
- `State behavior`
  Protocol state transitions such as payload building lifecycle, forkchoice
  progression, and blob retrieval behavior.
- `Cross-fork delta`
  What changed, what was inherited, and what was overridden from one fork spec
  to the next.

## Phase 0: Specification Surface Inventory

### Purpose

Define the full Engine API testing surface precisely before writing automated
checks. The inventory must cover not only callable methods, but also the data
structures they consume and produce, and the routines that define their
validation and stateful behavior.

### Tasks

1. Build a `method/version matrix` covering all Engine API methods from
   `Paris` through `Amsterdam`.
2. Build a `data structure inventory` for payload, forkchoice, blob,
   transition, and capability-related structures.
3. Build a `routine inventory` for validation and behavioral procedures
   described in the markdown specs.
4. For each method, structure, or routine, mark where it is introduced,
   extended, overridden, or deprecated.
5. Record where each artifact lives across markdown, OpenRPC YAML, and
   generated docs.
6. Record cross-links between methods, structures, and routines.

### Deliverables

- `Engine API method/version matrix`
- `Engine API data structure inventory`
- `Engine API routine inventory`
- `Method-structure-routine linkage map`
- `Rule source index`

## Phase 1: Provenance And High-Level Consistency

### Purpose

Verify that Engine API requirements are justified by higher-level sources and
that no rule exists without traceable provenance.

### Working assumption

There is not necessarily one single top-level EIP covering the entire Engine
API. Provenance may be distributed across consensus specs, fork-specific
protocol changes, EIPs, and prior Engine API versions.

### Tasks

1. Create a traceability matrix for atomic rules.
2. Decompose each spec section into atomic rules such as required field
   constraints, validation predicates, check ordering requirements, response
   obligations, error obligations, and capability negotiation requirements.
3. Assign each rule a provenance category:
   `inherited`, `consensus-derived`, `EIP-derived`, `repository-local`, or
   `unknown`.
4. Identify `Missing provenance`, `Stale projection`, and
   `Over-specification`.

### Deliverables

- `Traceability matrix`
- `Provenance gap report`

### Phase 1 exit rule

Phase 5 may not promote an atomic rule into a `hard invariant` if that rule is
still classified as `unknown`.

Allowed temporary state:

- `unknown` provenance may still exist outside the MVP target surface
- `unknown` provenance may not remain in the `Paris + geth/reth` MVP scenario
  set

## Phase 2: Cross-Fork Spec Evolution Consistency

### Purpose

Check whether the incremental spec-writing style introduces contradictions or
hidden drift from `Paris` to `Amsterdam`.

### Tasks

1. For every method and type, classify each fork-to-fork delta as:
   `inherits`, `extends`, `overrides`, or `deprecates`.
2. Detect inconsistency classes such as partially restated overrides,
   conflicting constants, validation-order drift, example drift, markdown vs
   OpenRPC divergence, and ambiguous deprecations.
3. Build a fork-delta ledger for:
   `Paris -> Shanghai -> Cancun -> Prague -> Osaka -> Amsterdam`.

### Deliverables

- `Fork delta ledger`
- `Inconsistency report across spec generations`

## Phase 3: Static Spec Checkers

### Purpose

Automate detection of the most important spec-level mismatches before involving
live clients.

### Candidate checkers

1. `Delta checker`
   Compare inherited and modified definitions across fork documents.
2. `Markdown vs OpenRPC checker`
   Compare markdown-described method behavior and schemas against
   `src/engine/openrpc/methods/` and `src/engine/openrpc/schemas/`.
3. `Rule coverage checker`
   Check which atomic rules currently have no corresponding test intent.

### Deliverables

- Initial checker scripts
- Checker output reports

### Current baseline

- `scripts/engine-static-check.js` is the current fork-aware generic runner.
- `scripts/engine-static-check-data.js` stores issue-group definitions so
  coverage can be extended by data rather than runner rewrites.
- Current checker findings are intentionally limited to static artifact
  inconsistencies between fork-scoped markdown and OpenRPC methods or schemas.
- Generated docs are treated as downstream manifestations of YAML, not a
  primary findings surface for this phase.
- Dynamic method behavior, stateful routines, and client execution differences
  are explicitly deferred to later phases.
- Current implemented coverage spans `Paris -> Amsterdam`.
- Current checker coverage targets:
  `nullability/presence`, `versioned-union parameter projection`,
  `result-array null items`, `top-level result nullability`, and
  `static error-code presence`.

The current checker baseline still reports `7` findings across `5` issue
groups. Those findings are important oracle-hygiene debt, but they do not block
the stateful differential MVP. They must be tracked in parallel as
`shape-oracle debt`.

## Phase 4: Fixture-Level Single-Call Checks

### Purpose

Convert the subset of Engine API behavior that fits a single request-response
exchange into executable conformance fixtures.

### Responsibilities

- Use `tests/*.io` for single-round-trip shape and conformance checks only.
- Keep this layer compatible with `speccheck` and downstream Hive
  `rpc-compat`.
- Reuse chain assets such as `genesis.json`, `chain.rlp`, `forkenv.json`, and
  `headfcu.json` when useful, but do not treat them as a complete Engine API
  harness design.

### Notes

- The repository test format is valuable for schema conformance, invalid input
  rejection, and simple error-code expectations.
- It is insufficient for payload-build lifecycle, repeated
  `forkchoiceUpdated*`, `getPayload*` sequencing, or cross-client differential
  comparison.
- `rpctestgen` remains a reference tool for single-client, fixed-chain,
  recording-style fixture generation. It is not the foundational abstraction
  for Engine API stateful differential testing.

### Deliverables

- `Single-call conformance fixture set`
- `Stateful-only rule list`
- artifact set for each maintained fixture path:
  `code`, `script`, `config`, `test case`, and `log format`

## Phase 5: Hive-First EL Differential MVP

### Purpose

Move from static consistency and single-call conformance into controlled,
stateful differential testing of `EL client Engine API server-side behavior`
using Hive as the orchestration substrate.

### MVP boundary

The first implementation is intentionally narrow:

- first fork: `Paris`
- first client pair: `geth` and `reth`
- use `Hive` for lifecycle, isolation, networking, and artifact injection
- use `chain.rlp`-style bootstrap where state is persistent and comparable
- keep a thin custom Engine API driver only for runtime-only state such as
  `payloadId` and `getPayload` lifecycle
- first retained build-lifecycle sequence:
  `forkchoiceUpdatedV1 -> getPayloadV1 -> newPayloadV1`
- first markdown-derived no-build sequence:
  valid `forkchoiceUpdatedV1` with `payloadAttributes: null`

The MVP must use a Hive-first stack. It must not be squeezed into the
single-call `.io` fixture format, and it should not reimplement infrastructure
that Hive already solves.

### Additional entry criteria

Before full Phase 5 implementation, complete a runtime reality check plus two
targeted validation steps:

1. `Runtime reality check`
   Prove that a controlled runtime environment is available for real client
   experiments. At minimum, confirm Docker daemon access, a workable path to
   Hive installation or invocation, and a concrete plan for acquiring runnable
   `geth` and `reth` targets.
2. `Normalization prototype`
   Build a small response corpus from `geth` and `reth` for the planned MVP
   scenarios and validate the first normalization rules against real outputs.
3. `Determinism probe`
   Re-run the same `rlp_import_plus_headfcu` bootstrap and early scenario set
   multiple times per client to confirm stable within-client outcomes before
   relying on offline cross-client artifact diff.

Phase 5 should not proceed directly from plan to full simulator work without
these checks. Offline baselines are allowed as preparation artifacts, but they
do not replace a real runtime gate.

### Oracle policy

- OpenRPC YAML is the grammar and shape layer.
- Fork-scoped markdown is the semantic authority for high-value invariants,
  especially null semantics, error-code branches, and stateful behavior.
- Current static checker findings remain tracked as `shape-oracle debt`.
- Even for `Paris`, accepted YAML projection conventions mean markdown cannot be
  discarded as an oracle for null-sensitive branches.
- `rpc-compat` remains out of scope as the replacement vehicle because it is
  still single-call JSON-RPC conformance rather than stateful Engine API
  testing.

For concrete architecture, interfaces, state recipes, and scenario definitions,
see [el-differential-testing-plan.md](./el-differential-testing-plan.md).

### Deliverables

- Hive-first MVP for `geth` and `reth`
- reusable bootstrap definitions for `genesis_only`, `rlp_import`, and
  `rlp_import_plus_headfcu`
- normalization prototype and initial comparison rule set for `geth` and `reth`
- repeated-run determinism report for the bootstrap and early scenario set
- thin custom Engine API scenario layer for runtime-only state
- fixed request-sequence scenarios
- response normalization and offline pairwise differential comparison
- first markdown-derived boundary scenario library
- artifact set for every MVP step:
  `code`, `script`, `config`, `test case`, and `log format`

### Current status

The `Paris + geth/reth` Hive-first MVP is now complete and has passed the
explicit go/no-go checkpoint in
[paris-mvp-acceptance.decision.json](/Users/ningyuhe/Documents/execution-apis/context/plans/t15-mvp-acceptance/paris-mvp-acceptance.decision.json).

What is complete:

- provenance-gated Paris MVP oracle subset
- reusable bootstrap definitions for `B0` through `B4`
- real runtime `rlp-bootstrap-smoke` and `headfcu-bootstrap-smoke`
- real runtime custom scenarios for:
  `fcu-no-build`,
  `fcu-build-getpayload-newpayload`,
  `repeat-fcu-same-head`,
  `unknown-payloadid`
- normalization profile `v0`
- repeated-run determinism probe for the early bootstrap and scenario set
- offline `ResultEnvelope` generation and pairwise diff for the Paris
  `geth/reth` surface
- explicit `go` decision for the Paris MVP

### Remaining gap after the MVP

The main gap is no longer “can the Hive-first design work?”. That question is
answered. The remaining gap is between the accepted Paris MVP and the broader
original program:

- only `geth` and `reth` are in the differential matrix today
- only `Paris` is in the runtime differential matrix today
- stock Hive or EEST ownership for `valid-newpayload` and `invalid-newpayload`
  is mapped, but those stock-owned paths are not yet serialized into the local
  `ResultEnvelope` pipeline
- normalization remains intentionally conservative:
  `null_vs_omitted_when_explicitly_allowed` and
  `non_semantic_error_text` are still deferred until more corpus evidence
  exists
- `unknown-payloadid` currently covers only the provenance-aware
  “mutated real Paris V1 payloadId” class; arbitrary `DATA(8)` inputs are
  tracked as implementation-behavior observations rather than part of the
  normative comparison bucket
- the MVP still uses a thin HTTP-based custom runtime layer rather than a
  packaged custom Hive simulator, which is acceptable for the current scope but
  remains an engineering gap if the surface grows
- no blob, payload-bodies, or generated-state-machine coverage is in the MVP

## Phase 6: Client Expansion

### Purpose

Expand coverage only after the `Paris + geth/reth` Hive-first stack is stable
and the MVP result buckets are trustworthy.

### Order

1. Add `nethermind`
2. Add `besu`
3. Add `erigon`
4. Expand fork coverage beyond `Paris`
5. Add broader bootstrap and runtime state families
6. Revisit blob and payload-bodies families
7. Revisit generated state-machine exploration

### Deliverables

- `Expanded client matrix`
- `Expanded fork matrix`
- `Differential discrepancy report`

### Entry condition

Phase 6 is now unblocked because the `Paris + geth/reth` MVP has a `go`
decision and a stable offline diff path. Expansion should still remain
incremental:

1. add one new client to the existing Paris pipeline
2. rerun the same normalization, determinism, and offline diff discipline
3. only then widen fork coverage or scenario families

## Immediate Next Step

Begin Phase 6 by adding a third EL client to the accepted Paris pipeline.

Recommended order:

1. add `nethermind`
2. reuse the existing `T14` `ResultEnvelope` workflow without widening fork
   scope
3. preserve the current comparison-discipline constraints, especially:
   client-local runtime identifiers, conservative normalization, and the
   provenance-aware `unknown-payloadid` input class
4. only after the third-client Paris run remains stable, expand to `besu`,
   `erigon`, or later forks
