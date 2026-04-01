# EL Differential Testing Plan

## Goal

Build a differential-testing system for the Engine API that compares the
observable behavior of execution-layer clients under equivalent states and
equivalent Engine API request sequences.

This plan replaces the earlier standalone-testbed direction with a `Hive-first`
approach:

- use `Hive` for client lifecycle, isolation, networking, and artifact
  injection
- use `genesis.json`, `chain.rlp`, `forkenv.json`, and `headfcu.json` where
  they naturally establish comparable client state
- keep a thin custom Engine API scenario layer only for runtime-only state such
  as `payloadId` and `getPayload` lifecycle

The target remains `EL client Engine API server-side behavior`. The change is
about implementation strategy and engineering cost, not about test intent.

Forward rollout after the accepted Paris MVP is now organized under
[phases/README.md](./phases/README.md), where the current accepted Paris
`geth/reth` implementation is treated as `phase-1`.

## Artifact Rule

Every implementation step in the Hive-first MVP must emit durable artifacts.
The minimum artifact set per step is:

- `code`
- `script`
- `config`
- `test case`
- `log format`

If a step omits one of these, the omission must be explicit and justified in
the step output. The default expectation is to produce all five.

Every completed step must also produce a dedicated git commit. The commit hash
and commit message are part of the execution record for that step and serve as
the rollback anchor for later iterations.

## Why Hive-First

The repository already uses the same artifact model as Hive:

- `tools/mkchain.sh` generates `genesis`, `chain`, `forkenv`, `headstate`,
  `txinfo`, `accounts`, and `headfcu` via `hivechain`
- `rpctestgen` imports `chain.rlp` and replays `headfcu.json` to bring a client
  into a deterministic post-merge state

That means the difficult part is not inventing a new state artifact format. The
main choice is whether to build custom infrastructure around those artifacts or
reuse the orchestration that Hive already provides.

The revised answer is:

- do not treat `rpc-compat` as the target replacement
- do not rely on stock Hive simulators alone
- do build on top of Hive as the orchestration substrate

Reference material:

- <https://eest.ethereum.org/main/running_tests/running/>
- <https://eest.ethereum.org/main/running_tests/consume/simulators/>
- <https://eest.ethereum.org/main/running_tests/test_formats/blockchain_test_engine/>
- <https://eest.ethereum.org/main/running_tests/execute/hive/>

## Testing Target And Non-Targets

Primary target:

- `EL client Engine API server-side behavior`

Current non-targets:

- full CL-client correctness
- p2p networking behavior
- performance benchmarking
- generated state-machine exploration in the first iteration
- a single process controlling multiple EL clients simultaneously

`rpc-compat` remains useful for single-call JSON-RPC conformance. It is not the
replacement target for stateful Engine API testing.

## Stack Structure

The revised testing stack has three layers.

### Layer A: stock Hive or EEST coverage

Use existing Hive or EEST simulators first for the paths they already cover
well:

- `consume rlp` for deterministic chain bootstrap via imported RLP blocks
- `consume engine` for `newPayload*` and `forkchoiceUpdated*`-driven block
  validation and post-merge Engine behavior

This layer owns:

- chain import correctness
- deterministic block-history bootstrap
- block validation correctness
- server-side payload acceptance and rejection
- post-merge Engine API ingestion behavior

### Layer B: thin custom Hive Engine scenario layer

Add a small custom simulator or scenario suite only for stateful Engine API
sequences not obviously covered by stock documentation:

- `forkchoiceUpdated(null payloadAttributes)` no-build branch
- `forkchoiceUpdated -> getPayload -> newPayload`
- repeated `forkchoiceUpdated`
- payloadId reuse and unknown payloadId branches
- markdown-derived null and error semantic checks

This layer must not reinvent client startup or environment management. It
should only:

- read scenario definitions
- call Engine API against the Hive-provisioned client
- record raw responses
- normalize responses
- emit result envelopes

Implementation preference for the MVP:

- start with the thinnest workable HTTP-based scenario driver inside the Hive
  environment
- only promote that driver into a fuller custom simulator shape after the
  normalization prototype and determinism probe show that the comparison model
  is useful

### Layer C: offline differential comparison

Run the same scenario set across clients under Hive and compare the resulting
artifacts offline.

Recommended first shape:

- one Hive execution per client
- identical bootstrap artifacts
- identical scenario ids
- identical normalization rules
- artifact diff after the run

The first version should not require a single coordinator process to hold
multiple EL clients open at once.

## Hive Integration Spike

Before building the first reusable runtime scenario layer, complete a small
integration spike focused on Hive-specific operational details:

- JWT-authenticated Engine API wiring
- `chain.rlp` and related artifact injection path
- per-client startup flag differences relevant to `geth` and `reth`
- the minimal invocation shape for the thin HTTP-based scenario driver

This spike exists to reduce hidden integration cost. Its output should be a
short per-client startup memo and one proven request path, not a polished
framework.

## Runtime Reality Check

Before treating any bootstrap scenario as complete, run a small environment
probe that answers three concrete questions:

- is Docker installed and is the daemon actually reachable
- is there a workable path to invoke or install Hive
- is there a concrete acquisition path for runnable `geth` and `reth`
  targets in the controlled environment

This step is intentionally earlier than full Hive integration. Its purpose is
to prevent offline assumptions from accumulating into later scenario, driver,
and normalization work. A blocked result is acceptable if it clearly records
the missing prerequisite and the next action needed to unblock it.

## State Bootstrap Model

Use file-based bootstrap only for persistent, client-comparable state. Use
runtime request replay for transient Engine API session state.

### StateBootstrap

Every bootstrap definition must use this field set:

- `bootstrap_mode`
- `required_artifacts`
- `startup_steps`
- `observable_confirmation`

Allowed `bootstrap_mode` values:

- `genesis_only`
- `rlp_import`
- `rlp_import_plus_headfcu`
- `runtime_request_replay`

### State mapping

Use these bootstrap modes for the current state families:

- `B0 bootstrap`
  `genesis_only`
- `B1 chain-known`
  `rlp_import`
- `B2 forkchoice-established`
  `rlp_import_plus_headfcu`

Do not use `chain.rlp` as the primary mechanism for:

- `B3 build-session-open`
- `B4 payload-processed` when the scenario depends on the exact `payloadId`
  returned in the current run

Reason:

- `chain.rlp` can preload chain history and canonical head
- it cannot pre-materialize runtime-only Engine session state such as an active
  build process and its associated `payloadId`

For `B3` and `B4`, use `runtime_request_replay`.

## Public Interfaces

### NormalizationProfile

Every normalization profile must use this field set:

- `profile_id`
- `comparison_fields`
- `equivalence_rules`
- `ignored_fields`
- `client_notes`

### HiveScenario

Every scenario definition must use this field set:

- `scenario_id`
- `fork`
- `pre_state`
- `bootstrap`
- `request_sequence`
- `hard_invariants`
- `normalization_rules`

### ResultEnvelope

Every scenario result must use this field set:

- `scenario_id`
- `client`
- `fork`
- `bootstrap_digest`
- `raw_responses`
- `normalized_responses`
- `outcome_bucket`

Additional runtime-only state fields:

- `client_runtime_state`

`client_runtime_state` must retain per-client ephemeral values such as
`payloadId`. These values must be tracked and consumed per client run. They are
not valid cross-client comparison targets.

`bootstrap_digest` must be computed from the normalized bootstrap definition
used for the run:

- `bootstrap_mode`
- ordered list of required artifact paths
- cryptographic hash of each referenced artifact file
- ordered `startup_steps`

The purpose of `bootstrap_digest` is to prove that compared runs used the same
bootstrap contract, not merely the same scenario id.

Allowed `outcome_bucket` values:

- `all agree`
- `agree after normalization`
- `diverge across clients`
- `violates hard invariant`

Assignment timing:

- `violates hard invariant` may be assigned during scenario execution once the
  scenario-local oracle fails
- `all agree`, `agree after normalization`, and `diverge across clients` must
  be assigned by the offline comparison stage after normalized envelopes are
  available from all compared clients

Therefore `ResultEnvelope` must support partial filling at scenario-runtime
write time, followed by final bucket completion during offline diff.

## Specification Inputs And Oracle Policy

Use a layered oracle model.

### OpenRPC YAML role

Use `src/engine/openrpc/methods/*.yaml` and
`src/engine/openrpc/schemas/*.yaml` for:

- request skeleton generation
- method and version discovery
- schema-aware serialization
- basic shape validation

### Markdown role

Use `src/engine/*.md` for:

- null semantics
- error-code expectations
- cross-field constraints
- sequence-sensitive behavior
- fork-specific semantic rules

### Oracle rule

YAML is not a complete semantic oracle for Engine API testing.

Use three layers:

1. `shape oracle`
   JSON-RPC and schema-shape checks
2. `hard semantic invariants`
   markdown-derived rules explicit enough to enforce
3. `cross-client differential oracle`
   divergence across clients is the main signal

The current static checker baseline still reports `7` findings across `5`
issue groups. Those findings remain parallel `shape-oracle debt`. They do not
block the Hive-first MVP, but they confirm that YAML alone is insufficient.

### Provenance gate for hard invariants

No `hard invariant` may be added to the MVP scenario set if the underlying rule
is still classified as `unknown` in the provenance inventory.

Allowed temporary state:

- `unknown` provenance may remain elsewhere in the broader `Paris -> Amsterdam`
  inventory
- `unknown` provenance may not remain in the subset of rules promoted into the
  MVP oracle

## Normalization Workstream

Response normalization is a first-class workstream, not a final cleanup step.

The MVP must define normalization rules early for at least:

- JSON field ordering
- semantically equivalent hex quantity encodings
- null vs omitted field cases explicitly accepted by the scenario
- non-semantic error message text

The MVP must not normalize away:

- error code differences
- payload status differences
- presence or absence of semantically meaningful fields
- state-transition differences

The MVP must also preserve one specific input-class distinction for
`engine_getPayloadV1`:

- arbitrary `DATA(8)` values are not automatically equivalent to an unknown but
  otherwise valid Paris V1 `payloadId`
- the `unknown-payloadid` differential scenario should use a mutated
  client-local `payloadId` derived from a real Paris V1 build process
- any `Unsupported fork` or similar classification observed for arbitrary
  `DATA(8)` inputs should be tracked as a separate implementation-behavior
  observation, not normalized into the `-38001 Unknown payload` bucket

Before custom simulator work expands, build a small sampled response corpus from
`geth` and `reth` and validate the initial `NormalizationProfile` against that
corpus.

## Determinism Validation

The offline differential model depends on within-client determinism for the
chosen bootstrap and scenario set.

Before enabling cross-client diff as the main signal:

1. run `rlp_import_plus_headfcu` bootstrap multiple times per client
2. run the early scenario set multiple times per client
3. confirm stable within-client `ResultEnvelope` shape after normalization

If a scenario is not repeatable within one client, it is not eligible for the
first offline differential MVP.

## Observed Paris MVP Comparison Insights

Implementation-level comparison insights discovered during `T03` through `T13`
are tracked in
[paris-differential-insights.md](./paris-differential-insights.md).

`T14` and later offline diff work should treat that note as a comparison
discipline supplement, especially for:

- representation-only JSON differences
- fork-era fixture alignment
- client-local runtime identifiers
- success-category comparisons
- provenance-aware unknown-payload inputs

## MVP Scope

The first implementation is intentionally narrow:

- fork: `Paris`
- clients: `geth`, `reth`
- primary API family: `forkchoiceUpdated*`, `newPayload*`
- one retained build-lifecycle scenario:
  `engine_forkchoiceUpdatedV1 -> engine_getPayloadV1 -> engine_newPayloadV1`
- one bootstrap sanity scenario using `chain.rlp + headfcu.json`
- one markdown-derived no-build scenario with `payloadAttributes: null`

The first implementation explicitly does not cover:

- `nethermind`, `besu`, or `erigon`
- full fork coverage from `Paris` through `Amsterdam`
- `engine_getPayloadBodies*`
- `engine_getBlobs*`
- fuzzing or generated state machines
- replacing all custom logic with stock Hive simulators

## Current MVP Status

The original Paris MVP objective has now been met for `geth` and `reth`.

Completed scope:

- real runtime bootstrap validation for `rlp-bootstrap-smoke` and
  `headfcu-bootstrap-smoke`
- real runtime custom scenarios for:
  `fcu-no-build`,
  `fcu-build-getpayload-newpayload`,
  `repeat-fcu-same-head`,
  `unknown-payloadid`
- conservative normalization profile and sampled response corpus
- repeated-run determinism probe for the early bootstrap and scenario set
- offline `ResultEnvelope` generation and pairwise diff
- explicit MVP acceptance review with final decision `go`

The accepted Paris MVP therefore answers the original feasibility question:
the Hive-first stack is sufficient for a real EL Engine API differential
pipeline without first building a bespoke standalone testbed.

## Remaining Gap To The Broader Plan

The residual gap is not inside the accepted Paris `geth/reth` MVP itself. The
gap is between that accepted MVP and the broader multi-client, multi-fork
program that was originally envisioned.

Still missing:

- third and later EL clients:
  `nethermind`, `besu`, `erigon`
- later forks beyond `Paris`
- blob and payload-bodies families
- generated state-machine exploration
- unified local `ResultEnvelope` coverage for stock-owned `valid-newpayload`
  and `invalid-newpayload` paths
- evidence-driven activation of deferred normalization rules:
  `null_vs_omitted_when_explicitly_allowed` and
  `non_semantic_error_text`
- a formal comparison lane for arbitrary `DATA(8)` `payloadId` inputs, which
  currently remain implementation-behavior observations rather than part of the
  normative `PARIS-METHOD-GP-02` bucket

Accepted residual risk in the current MVP:

- the custom runtime layer is still a thin HTTP-based driver rather than a
  packaged custom Hive simulator
- the determinism probe covers the early bootstrap and scenario set; broader
  determinism evidence should be extended before widening client or fork scope

## MVP Implementation Sequence

The first implementation should proceed in this order:

1. runtime reality check for Docker, Hive, and client acquisition
2. bootstrap validation with `rlp-bootstrap-smoke` and
   `headfcu-bootstrap-smoke`
3. Hive integration spike for JWT wiring, artifact injection, and startup flags
4. stock Hive or EEST coverage mapping and gap report
5. thin HTTP-based scenario-driver prototype inside the Hive environment
6. normalization prototype on sampled `geth` and `reth` responses
7. repeated-run determinism probe on the bootstrap and early scenario set
8. thin custom runtime scenarios
9. offline cross-client differential comparison

This ordering is intentional. It reduces the risk of building a complete custom
scenario layer before knowing whether the comparison model is stable enough to
produce useful signals.

## MVP Scenarios

### Bootstrap validation

#### `rlp-bootstrap-smoke`

- start from `genesis + chain.rlp`
- verify expected head number and head hash
- verify the same artifacts produce the same observable pre-state across
  `geth` and `reth`
- treat offline fixture-derived baselines only as preparation, not as final
  completion evidence

#### `headfcu-bootstrap-smoke`

- start from `genesis + chain.rlp + headfcu.json`
- verify post-merge forkchoice establishment
- verify the replayed `headfcu` request lands the client in a comparable
  forkchoice-known state

### Engine ingestion via stock Hive or EEST coverage

- valid `newPayload`
- invalid `newPayload`
- `forkchoiceUpdated` head establishment
- post-merge block processing through Engine API

### Thin custom runtime scenarios

#### `fcu-no-build`

- valid `engine_forkchoiceUpdatedV1`
- `payloadAttributes: null`
- assert the no-build branch and null-equivalent `payloadId`

#### `fcu-build-getpayload-newpayload`

- `engine_forkchoiceUpdatedV1` with valid build attributes
- `engine_getPayloadV1` with the client-local returned `payloadId`
- `engine_newPayloadV1` with the returned payload
- track `payloadId` per client in `client_runtime_state`
- never compare `payloadId` values across clients

#### `repeat-fcu-same-head`

- repeated valid `forkchoiceUpdatedV1`
- assert stable observable response category

#### `unknown-payloadid`

- call `engine_getPayloadV1` with an unknown `payloadId`
- derive that unknown value by mutating a real client-local Paris V1
  `payloadId`, not by inventing an arbitrary `DATA(8)` literal
- compare error category and shape after normalization

## Acceptance Criteria

- the same bootstrap artifacts reproduce the same observable pre-state across
  `geth` and `reth`
- `chain.rlp` is only used where state is persistent and client-comparable
- runtime-only Engine state is created by request replay, not file injection
- normalization rules suppress expected representation noise without erasing
  semantic differences
- the early bootstrap and scenario set are repeatable within one client before
  they are used for offline cross-client diff
- stock Hive or EEST coverage is used wherever it already covers the path
- the first custom runtime implementation may remain a thin HTTP-based driver
  until simulator packaging is justified by proven signal quality
- custom code is limited to scenario driving, normalization, and result
  recording

## Rollout After The MVP

Only after the `Paris + geth/reth` MVP is stable should the stack expand in
this order:

1. add `nethermind`
2. add `besu`
3. add `erigon`
4. add later forks
5. add `engine_getPayloadBodies*`
6. add `engine_getBlobs*`
7. revisit generated state-machine exploration

Given the current accepted state, the practical next expansion step is:

1. add `nethermind` on the existing Paris pipeline
2. rerun normalization, determinism, and offline diff before changing fork
   scope
3. only then add `besu`
4. only then add `erigon`
5. expand beyond `Paris` after the third-client discipline remains stable

## Immediate Next Step

Execute the first post-MVP expansion step:

- keep fork scope fixed at `Paris`
- add `nethermind` as the third EL client
- reuse the accepted `ResultEnvelope` and offline diff workflow from `T14`
- preserve current comparison discipline from
  [paris-differential-insights.md](./paris-differential-insights.md)
- do not activate deferred normalization rules without new corpus evidence
- do not widen to later forks until the `Paris + 3 clients` path remains
  stable
