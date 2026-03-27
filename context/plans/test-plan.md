# Engine API Test Plan

## Goal

Build a complete test strategy for the Engine API across all fork-scoped specs in this repository, from `Paris` through `Amsterdam`, with three complementary objectives:

1. Verify consistency between Engine API rules and their higher-level sources.
2. Detect inconsistencies introduced by the "new spec modifies old spec" evolution model.
3. Verify that different execution clients implement the Engine API consistently.

This document is the persistent high-level plan for subsequent work.

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
- Downstream conformance execution in Hive `rpc-compat`

Out of scope for the initial phase:

- Full fuzzing infrastructure
- Full stateful differential execution against all clients
- Performance benchmarking

## Guiding Model

Treat the Engine API as a layered specification surface:

1. `High-level provenance layer`
   Map each Engine API rule to a source such as prior Engine API specs, consensus-layer specs, EIPs, or explicit repository design decisions.
2. `Spec evolution layer`
   Check whether fork-to-fork modifications preserve consistency when a newer document extends, overrides, or deprecates earlier rules.
3. `Implementation layer`
   Check whether execution clients expose equivalent observable behavior for the same Engine API inputs and protocol sequences.

## Test Axes

Every rule or test case should be tagged against one or more of the following axes:

- `Structure`
  Fields, types, optionality, nullability, presence semantics, versioned schemas, enum values, and object composition.
- `Routine`
  Validation steps, required ordering of checks, derived values, and preconditions.
- `Error behavior`
  Error codes, error grouping, rejection conditions, and deprecation behavior.
- `State behavior`
  Protocol state transitions such as payload building lifecycle, forkchoice progression, and blob retrieval behavior.
- `Cross-fork delta`
  What changed, what was inherited, and what was overridden from one fork spec to the next.

## Phase 0: Specification Surface Inventory

### Purpose

Define the full Engine API testing surface precisely before writing automated checks.
The initial inventory must cover not only callable methods, but also the data
structures they consume and produce, and the routines that define their
validation and stateful behavior.

### Tasks

1. Build a `method/version matrix` covering all Engine API methods from `Paris` through `Amsterdam`.
2. Build a `data structure inventory` for all payload, forkchoice, blob, transition, and capability-related structures.
3. Build a `routine inventory` for all validation and behavioral procedures described in the markdown specs.
4. For each method, structure, or routine, mark where it is:
   - introduced
   - extended
   - overridden
   - deprecated
5. Record where each artifact lives:
   - markdown spec
   - OpenRPC method YAML
   - OpenRPC schema YAML
   - generated documentation
6. Record cross-links:
   - which methods reference which structures
   - which methods or versions invoke which routines
   - which routines depend on which structures

### Deliverables

- `Engine API method/version matrix`
- `Engine API data structure inventory`
- `Engine API routine inventory`
- `Method-structure-routine linkage map`
- `Rule source index`

## Phase 1: Provenance And High-Level Consistency

### Purpose

Verify that Engine API requirements are justified by higher-level sources and that no rule exists without traceable provenance.

### Working assumption

There is not necessarily one single top-level EIP covering the entire Engine API. Provenance may be distributed across consensus specs, fork-specific protocol changes, EIPs, and prior Engine API versions.

### Tasks

1. Create a traceability matrix for atomic rules.
2. Decompose each spec section into atomic rules such as:
   - required field constraints
   - validation predicates
   - check ordering requirements
   - response obligations
   - error obligations
   - capability negotiation requirements
3. Assign each rule a provenance category:
   - inherited from previous Engine API spec
   - derived from consensus spec
   - derived from EIP
   - repository-local design decision
   - unknown provenance
4. Identify:
   - `Missing provenance`
   - `Stale projection`
   - `Over-specification`

### Deliverables

- `Traceability matrix`
- `Provenance gap report`

## Phase 2: Cross-Fork Spec Evolution Consistency

### Purpose

Check whether the incremental spec-writing style introduces contradictions or hidden drift from `Paris` to `Amsterdam`.

### Tasks

1. For every method and type, classify each fork-to-fork delta as:
   - `inherits`
   - `extends`
   - `overrides`
   - `deprecates`
2. Detect these inconsistency classes:
   - newer text modifies old behavior but does not fully restate the affected constraints
   - constants or constraints conflict across forks
   - validation order changes without clearly updating dependent text
   - examples and routines drift apart
   - markdown and OpenRPC definitions diverge
   - deprecated methods remain ambiguously specified
3. Build a fork-delta ledger from:
   - `Paris -> Shanghai`
   - `Shanghai -> Cancun`
   - `Cancun -> Prague`
   - `Prague -> Osaka`
   - `Osaka -> Amsterdam`

### Deliverables

- `Fork delta ledger`
- `Inconsistency report across spec generations`

## Phase 3: Static Spec Checkers

### Purpose

Automate detection of the most important spec-level mismatches before involving live clients.

### Candidate checkers

1. `Delta checker`
   Compare inherited and modified definitions across fork documents.
2. `Markdown vs OpenRPC checker`
   Compare markdown-described method behavior and schemas against:
   - `src/engine/openrpc/methods/`
   - `src/engine/openrpc/schemas/`
   Explicitly detect required vs optional vs nullable drift.
3. `Rule coverage checker`
   Check which atomic rules currently have no corresponding test intent.

### Deliverables

- Initial checker scripts
- Checker output reports

Current implementation:

- `scripts/engine-static-check.js` is now a fork-aware generic runner.
- `scripts/engine-static-check-data.js` holds issue-group definitions so future
  forks can extend coverage by adding data rather than rewriting the runner.
- Current checker findings are intentionally restricted to `static artifact
  inconsistencies` between fork-scoped markdown and OpenRPC methods/schemas.
  Generated docs are treated as downstream manifestations of YAML and are not a
  primary findings surface in the current phase. Dynamic method behavior,
  stateful routines, and client execution differences remain deferred to later
  phases.
- Current nullable-field convention accepts two equivalent YAML projections for
  a markdown `...|null` field: explicit null support, or omission from
  `required` so field absence is treated as null-equivalent. The same
  `optional-as-null` convention can also be applied to positional parameters
  when the review rule explicitly allows it.
- Method metadata such as markdown timeout annotations is currently treated as
  out of scope for the Markdown/OpenRPC inconsistency checker unless the
  repository establishes that such metadata must be represented in YAML.
- Current implemented coverage now spans `Paris -> Amsterdam`.
- The checker currently supports both `fork-local` and `cumulative` review
  modes.
- Current implemented rule coverage targets:
  - nullability and presence semantics
  - versioned-union parameter projection
  - result-array null-item projection
  - top-level result nullability
  - static method error-code presence and absence

## Phase 4: EL Differential Testing

### Purpose

Move from static spec consistency into live behavioral comparison across major
execution clients while keeping the test environment highly controlled.

### Testing target

The primary target is `EL client Engine API server-side behavior`.

The CL side is initially treated as a lightweight test driver rather than as a
system under test.

### Covered client set

- `geth`
- `nethermind`
- `erigon`
- `besu`
- `reth`

### Working model

The first dynamic phase should avoid a naturally evolving multi-node network.
Instead it should use:

1. one isolated sandbox per EL client
2. a state controller that pushes every EL client into the same abstract state
3. a lightweight CL-side driver that replays the same Engine API sequence to
   every client
4. a normalizer and comparator for differential analysis

### Spec input policy

- OpenRPC YAML is used for request skeletons, shape validation, and method
  discovery.
- Fork-scoped markdown is used for semantic edge enrichment, high-value
  mutations, and hard invariants.
- YAML must not be treated as a complete oracle where the static review has
  already shown markdown-only semantics.

### Initial deliverables

- harness MVP for at least two clients
- deterministic state fixtures
- fixed request-sequence scenarios
- normalized differential comparison
- first markdown-derived mutation library

See `context/plans/el-differential-testing-plan.md` for the concrete architecture and
phase breakdown.

## Phase 4: Fixture-Level Conformance Tests

### Purpose

Convert high-value rules into executable tests.

### Tasks

1. Identify which Engine API behaviors can be tested as single request-response fixtures.
2. Add or generate fixture candidates for:
   - schema conformance
   - version negotiation
   - error code behavior
   - invalid input rejection
3. Record which behaviors cannot be captured in a single round-trip and must be deferred to stateful testing.

### Notes

The repository test format under `tests/` is primarily single round-trip `.io` data. This is useful but insufficient for the full Engine API because many behaviors are sequence-sensitive.

### Deliverables

- `Single-call conformance fixture set`
- `Stateful-only rule list`

## Phase 5: Stateful Protocol Testing

### Purpose

Test Engine API behavior that depends on protocol state, ordering, and history.

### Tasks

1. Build a minimal Engine API state model including:
   - forkchoice state
   - payload build lifecycle
   - payload retrieval lifecycle
   - blob availability and retrieval state
   - deprecated vs supported method behavior by fork version
2. Define legal and illegal call sequences.
3. Encode high-value stateful scenarios such as:
   - repeated `forkchoiceUpdated`
   - `getPayload` before and after build completion
   - wrong versioned payload attributes
   - blob-related sequence constraints
   - deprecated transition configuration behavior

### Deliverables

- `Engine API protocol state model`
- `Stateful scenario suite`

## Phase 6: Differential Testing Across Execution Clients

### Purpose

Check whether different EL clients behave equivalently under the same Engine API workloads.

### Tasks

1. Select an initial client set, such as:
   - Geth
   - Nethermind
   - Besu
   - Erigon
2. Run golden conformance scenarios first.
3. Then run state-machine differential tests over the same action sequences.
4. Compare:
   - response shape
   - status values
   - error codes
   - observable state transitions
   - capability negotiation outcomes
5. Triaging policy:
   - spec bug
   - ambiguous spec
   - single-client bug
   - multi-client common divergence

### Deliverables

- `Golden conformance dashboard`
- `Differential discrepancy report`

## Recommended Start Order

The initial execution order should be:

1. Build the specification surface inventory for `Paris` through `Amsterdam`:
   - method/version matrix
   - data structure inventory
   - routine inventory
   - linkage map
2. Build the atomic rule table and provenance table.
3. Implement a first `delta checker`.
4. Implement a first `markdown vs OpenRPC` consistency checker.
5. Convert a small set of high-value rules into fixture candidates.
6. Define the minimal state machine for later differential testing.

## Immediate Next Step

The next concrete task is:

Complete the remaining `Amsterdam` static review pass using the established
`markdown <-> OpenRPC YAML` method, then consolidate cross-fork findings from
`Paris -> Osaka` before moving back up to the broader specification-surface
inventory work.
