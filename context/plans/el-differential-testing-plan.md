# EL Differential Testing Plan

## Goal

Build a differential-testing system for the Engine API that compares the
observable behavior of major execution-layer clients under equivalent states and
equivalent Engine API request sequences.

Primary client set:

- `geth` - <https://github.com/ethereum/go-ethereum>
- `nethermind` - <https://github.com/NethermindEth/nethermind>
- `erigon` - <https://github.com/erigontech/erigon>
- `besu` - <https://github.com/hyperledger/besu>
- `reth` - <https://github.com/paradigmxyz/reth>

## Testing Target

The current target is:

- `EL client Engine API server-side behavior`

The current non-targets are:

- full CL-client correctness
- CL-side forkchoice or payload-decision logic
- p2p networking behavior
- performance benchmarking

CL-side logic is used as a controllable test driver, not as the primary system
under test.

## Core Position

The Engine API is not a plain stateless RPC surface. Most high-value methods are
stateful and depend on:

- current fork activation
- current canonical head, safe head, and finalized head
- payload-building lifecycle
- prior `engine_forkchoiceUpdated*` calls
- prior `engine_newPayload*` calls
- availability of block bodies, blobs, and proofs
- prior history imported into the client

Because of that, the testing system must control client state before comparing
responses.

## High-Level Architecture

The first version should not rely on a full private network with naturally
evolving nodes. Instead, it should use a controlled single-node-per-client
model.

Main components:

1. `EL sandbox`
   One isolated runtime per client, each with its own datadir, ports, JWT, and
   fork configuration.
2. `state controller`
   Pushes each EL client into the same abstract test state.
3. `lightweight CL-side driver`
   Sends the same Engine API request sequence to every EL client. It is a test
   driver, not a full consensus client.
4. `response normalizer`
   Canonicalizes responses before comparison.
5. `differential comparator`
   Compares normalized outputs and flags cross-client divergence.
6. `scenario runner`
   Executes fixed or generated stateful scenarios and records evidence.

## Why Not Start With A Real CL Or A Private Network

Starting with a real CL client or a multi-node private network introduces too
many uncontrolled variables:

- request timing drift
- chain progress drift
- different retry behavior
- divergent downstream decisions after the first client-specific response

For the first phase, controllability matters more than realism.

The driver only needs to make each EL client believe it is interacting with a
valid CL-side peer. It does not need to implement full CL behavior.

## State Model

Testing should be organized around `test precondition families`, not around
claimed EL-internal implementation states.

These precondition families are externally defined and externally observable.
They exist to answer one question:

- what conditions must hold so that a given Engine API request family becomes
  meaningful and comparable across clients?

The first implementation should use these six state families only.

### B0 bootstrap

- fresh process
- known genesis and fork schedule
- no useful Engine API history
- no active payload build process

### B1 chain-known

- client has imported a deterministic fixed chain
- client knows a stable canonical head
- block hashes and block numbers used by tests are valid and reproducible

### B2 forkchoice-established

- client has successfully processed at least one valid
  `engine_forkchoiceUpdated*`
- the harness knows the exact forkchoice inputs used to establish the state

### B3 build-session-open

- client has started a build process
- a valid `payloadId` has been returned
- the harness retains that exact `payloadId`

### B4 payload-processed

- at least one payload has already been submitted via `engine_newPayload*`
- the harness knows which payload was submitted and what response was returned

### B5 incomplete-data

- client is intentionally placed in a state where some relevant data is absent
- examples: missing block bodies, missing blobs, missing proofs, or historical
  gaps

These states should be defined externally and reproducibly, not by inspecting
private client internals.

## State Control Strategy

The preferred order of state setup is:

1. common genesis and fork schedule
2. common prebuilt chain data or deterministic fixtures
3. common Engine API request sequence to advance state
4. only if necessary, client-specific import helpers

Avoid mutating client databases directly.

The state controller should always record:

- what initial artifacts were injected
- what request sequence was replayed
- what state checkpoint was expected
- what observable evidence confirms state alignment

Every usable state family must therefore have both:

- a reproducible setup recipe
- an observable confirmation rule

## Specification Inputs

The testing system should use a layered spec model.

### YAML role

`src/engine/openrpc/methods/*.yaml` and `src/engine/openrpc/schemas/*.yaml`
should be used for:

- request skeleton generation
- basic shape validation
- method/version discovery
- schema-aware serialization

### Markdown role

`src/engine/*.md` should be used for:

- semantic seed enrichment
- boundary-value selection
- null semantics
- mandatory error-code expectations
- cross-field constraints
- fork-specific behavior rules

### Combined effect

Use YAML to generate syntactically plausible seeds, then use markdown-derived
rules to mutate those seeds toward semantically sensitive edges.

## Oracle Strategy

Do not rely on YAML alone as a full oracle.

Use a thin-oracle plus differential-comparison model:

1. `shape oracle`
   Basic JSON-RPC and schema-shape checks.
2. `hard semantic invariants`
   A small set of markdown-derived rules that are explicit enough to enforce.
3. `cross-client differential oracle`
   Treat divergence across EL clients as the main signal.

Expected result buckets:

- `all agree`
- `agree after normalization`
- `diverge across clients`
- `violates hard invariant`

The goal is not to fully formalize the whole spec before testing starts.

## Normalization Rules

Before comparison, normalize:

- JSON field ordering
- equivalent `null` and omission patterns when explicitly accepted
- non-semantic error message text
- hex formatting that is semantically equal
- fork-version aliases when the spec treats them as equivalent in context

Comparison should prioritize:

- result category
- error code
- payload status
- presence and value of key fields such as `payloadId`, `latestValidHash`,
  `validationError`
- top-level nullability
- item-level nullability in ordered result arrays

## Scenario Types

The first implementation should focus on a small number of scenario classes.

### Class A: deterministic happy-path sequences

Examples:

- `forkchoiceUpdated -> getPayload`
- `forkchoiceUpdated -> getPayload -> newPayload`
- `newPayload -> forkchoiceUpdated`

### Class B: semantic boundary sequences

Examples:

- invalid parameter size or length boundaries
- null-sensitive inputs and outputs
- fork-version mismatch paths
- payload body and blob retrieval boundary sizes
- required error-code branches

### Class C: degraded-data sequences

Examples:

- missing payload bodies
- missing blobs
- old-version blob/proof availability cases

## Why We Do Not Use The Full Cross Product

We should not run:

- every state family
- times every method
- times every method version
- times every parameter possibility

Reasons:

1. most combinations are not semantically meaningful
2. parameter space is effectively unbounded
3. many combinations only repeat the same branch, such as repeated `Unknown
   payload` outcomes
4. stateful methods are better covered by a few high-value sequences than by a
   huge bag of disconnected one-shot calls

So coverage must be guided by `state-method applicability`, not by raw
Cartesian enumeration.

## Method Prioritization

Start with the methods that matter most for CL/EL interaction and downstream
fork behavior.

Priority tier 1:

- `engine_forkchoiceUpdated*`
- `engine_getPayload*`
- `engine_newPayload*`

Priority tier 2:

- `engine_getPayloadBodiesByHash*`
- `engine_getPayloadBodiesByRange*`
- `engine_getBlobs*`

Priority tier 3:

- `engine_exchangeCapabilities`
- `engine_exchangeTransitionConfigurationV1`

## State-Method Applicability Matrix

The first MVP should follow this matrix.

Legend:

- `skip`: not worth targeting in this state for the MVP
- `basic`: include a small number of sanity and invalid-input cases
- `focus`: high-priority coverage for this state

| State | exchange* | forkchoiceUpdated* | getPayload* | newPayload* | getPayloadBodies* | getBlobs* |
|---|---|---|---|---|---|---|
| `B0 bootstrap` | `basic` | `basic` | `basic` | `basic` | `skip` | `skip` |
| `B1 chain-known` | `skip` | `basic` | `skip` | `basic` | `focus` | `basic` |
| `B2 forkchoice-established` | `skip` | `focus` | `basic` | `basic` | `skip` | `skip` |
| `B3 build-session-open` | `skip` | `basic` | `focus` | `basic` | `skip` | `skip` |
| `B4 payload-processed` | `skip` | `focus` | `basic` | `focus` | `skip` | `skip` |
| `B5 incomplete-data` | `skip` | `basic` | `basic` | `basic` | `focus` | `focus` |

## Recommended Parameter Classes Per Method Family

### engine_forkchoiceUpdated*

- valid forkchoice with no payload build request
- valid forkchoice with payload build request
- repeated same forkchoice
- unknown head block hash
- inconsistent safe/finalized relation
- fork-sensitive payloadAttributes variation
- null-sensitive `payloadAttributes`

### engine_getPayload*

- known valid `payloadId`
- unknown `payloadId`
- stale or expired `payloadId` if observable
- fork-version-specific payload schema checks

### engine_newPayload*

- well-formed valid payload
- malformed payload shape
- wrong fork-version payload
- markdown-derived boundary values
- markdown-derived error or invalidity branches

### engine_getPayloadBodiesByHash* and engine_getPayloadBodiesByRange*

- known existing blocks
- unknown blocks
- partially unavailable history
- range-size boundary
- invalid `start` / `count`
- null-position semantics

### engine_getBlobs*

- all blobs available
- some blobs missing
- all blobs missing
- too-large request
- versioned-hash ordering cases
- top-level null vs positional-null cases where fork-specific

## Client Coverage Plan

The target set remains:

- `geth`
- `nethermind`
- `erigon`
- `besu`
- `reth`

Suggested rollout:

1. `geth` + `reth`
   Fastest path to a usable first comparison pair.
2. Add `nethermind`
3. Add `besu`
4. Add `erigon`

Coverage should expand only after the harness is stable with a smaller pair.

## Phase Plan

### Phase 1: harness MVP

Deliver:

- process launcher for at least two EL clients
- common genesis and fork configuration support
- lightweight CL-side driver
- scenario runner for fixed request sequences
- response capture and normalization
- pairwise differential comparison

### Phase 2: state fixtures

Deliver:

- reproducible state fixtures `B0` to `B5`
- deterministic chain/import setup
- checkpoint and reset support

### Phase 3: semantic mutation layer

Deliver:

- YAML-based request skeleton generator
- markdown-derived mutation library
- focused boundary mutations from the current null and static-review findings

### Phase 4: richer client matrix

Deliver:

- expansion from 2 clients to all 5 target clients
- common execution scripts
- reproducible failure capture

### Phase 5: state-machine differential testing

Deliver:

- abstract state-machine model
- generated operation sequences
- coverage tracking per method family and state family

## Immediate Next Step

Build a design document and first implementation plan for the harness MVP with
these minimum requirements:

- support `geth` and `reth`
- support one fork first, preferably `Paris` or `Shanghai`
- support state families `B0`, `B2`, `B3`, and `B4` first
- support one deterministic sequence:
  `forkchoiceUpdated -> getPayload -> newPayload`
- support one boundary sequence based on a markdown-derived invariant

## Client-Specific State Controller Handoff

The first client-specific implementation task, such as `geth`, should not try
to solve the whole differential-testing stack. It should only solve the state
controller slice.

Required deliverables for a client-specific state controller:

1. A repeatable way to launch isolated client instances with:
   - deterministic datadir
   - deterministic genesis
   - Engine API enabled
   - JWT-based auth ready for the test driver
2. A repeatable way to prepare the client for:
   - `B0 bootstrap`
   - `B1 chain-known`
   - `B2 forkchoice-established`
   - `B3 build-session-open`
   - `B4 payload-processed`
3. For each state family above:
   - exact setup recipe
   - exact request sequence used to enter the state
   - exact observable evidence that the state has been reached
4. A reset strategy:
   - either destroy and recreate the instance
   - or restore from a known clean checkpoint

Non-goals for that subtask:

- implementing the full multi-client comparator
- defining cross-client normalization policy
- generating all semantic mutations

For every client-specific implementation, require this output shape:

- `state_family`
- `supported_forks`
- `setup_inputs`
- `setup_steps`
- `observable_confirmation`
- `known_limitations`
- `reset_strategy`

## Relationship To The Completed Static Review

The completed markdown/OpenRPC static-review phase remains useful as input to
this dynamic phase:

- it identifies places where YAML should not be treated as a complete oracle
- it identifies markdown-only semantic rules to convert into seed mutations
- it provides a starting set of high-value null and error-code edge cases

Static review is therefore not the final objective. It is the oracle-hygiene
step that prepares the differential-testing system.
