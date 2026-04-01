# Hive-First Engine API MVP Task Tracker

This document converts the current Hive-first Engine API testing plan into an
executable task list. Each task is implementation-ready and includes:

- `inputs`
- `operation steps`
- `expected outputs`
- `validation method`

Status values:

- `todo`
- `in_progress`
- `blocked`
- `done`

## Summary

| Task ID | Task | Status |
| --- | --- | --- |
| `T01` | MVP oracle surface freeze and provenance gate | `todo` |
| `T02` | Bootstrap artifact contract and reusable bootstrap definitions | `todo` |
| `T03` | `rlp-bootstrap-smoke` scenario | `todo` |
| `T04` | `headfcu-bootstrap-smoke` scenario | `todo` |
| `T05` | Hive integration spike for JWT wiring and artifact injection | `todo` |
| `T06` | Stock Hive/EEST coverage mapping and gap report | `todo` |
| `T07` | Thin HTTP-based scenario-driver prototype in Hive | `todo` |
| `T08` | Response corpus collection for `geth` and `reth` | `todo` |
| `T09` | `NormalizationProfile` v0 | `todo` |
| `T10` | Repeated-run determinism probe | `todo` |
| `T11` | `fcu-no-build` runtime scenario | `todo` |
| `T12` | `fcu-build-getpayload-newpayload` runtime scenario | `todo` |
| `T13` | `repeat-fcu-same-head` and `unknown-payloadid` scenarios | `todo` |
| `T14` | `ResultEnvelope` generation and offline differential comparison | `todo` |
| `T15` | MVP acceptance review and go/no-go checkpoint | `todo` |

## Tasks

## `T01` MVP Oracle Surface Freeze And Provenance Gate

**Status**

`todo`

**Inputs**

- [test-plan.md](./test-plan.md)
- [el-differential-testing-plan.md](./el-differential-testing-plan.md)
- [paris-atomic-rules.md](../rules/paris-atomic-rules.md)
- `Paris` MVP scenario surface:
  `rlp-bootstrap-smoke`, `headfcu-bootstrap-smoke`, `fcu-no-build`,
  `fcu-build-getpayload-newpayload`, `repeat-fcu-same-head`,
  `unknown-payloadid`

**Operation Steps**

1. Enumerate the atomic rules touched by the MVP scenarios.
2. Map each rule to its provenance category.
3. Remove or defer any candidate `hard invariant` whose provenance is still
   `unknown`.
4. Record the approved MVP oracle subset in a short decision log.

**Expected Outputs**

- MVP rule subset for `Paris`
- explicit list of allowed `hard invariants`
- explicit list of deferred rules blocked by `unknown` provenance

**Validation Method**

- Confirm every MVP `hard invariant` has non-`unknown` provenance.
- Confirm deferred rules are not referenced by runtime scenario acceptance
  checks.

## `T02` Bootstrap Artifact Contract And Reusable Bootstrap Definitions

**Status**

`todo`

**Inputs**

- `tests/genesis.json`
- `tests/chain.rlp`
- `tests/forkenv.json`
- `tests/headfcu.json`
- [el-differential-testing-plan.md](./el-differential-testing-plan.md)

**Operation Steps**

1. Define concrete bootstrap records for `genesis_only`, `rlp_import`, and
   `rlp_import_plus_headfcu`.
2. Record required artifact paths and startup sequencing for `geth` and
   `reth`.
3. Record observable confirmations for each bootstrap mode.
4. Record which state families remain `runtime_request_replay` only.

**Expected Outputs**

- reusable `StateBootstrap` definitions
- per-client bootstrap notes for `geth` and `reth`
- observable confirmation checklist for `B0`, `B1`, and `B2`

**Validation Method**

- Review that no bootstrap definition uses file injection for `B3` or `B4`.
- Confirm each bootstrap mode names a concrete confirmation rule.

## `T03` `rlp-bootstrap-smoke` Scenario

**Status**

`todo`

**Inputs**

- `rlp_import` bootstrap definition
- `tests/genesis.json`
- `tests/chain.rlp`

**Operation Steps**

1. Start one client from `genesis + chain.rlp`.
2. Query the canonical head after import.
3. Capture head number, head hash, and any other minimal comparable state.
4. Repeat for `geth` and `reth`.

**Expected Outputs**

- one scenario definition
- raw boot logs and head observations per client
- initial scenario result records

**Validation Method**

- Confirm both clients report the expected head number and head hash.
- Confirm repeated runs on the same client reproduce the same observable head.

## `T04` `headfcu-bootstrap-smoke` Scenario

**Status**

`todo`

**Inputs**

- `rlp_import_plus_headfcu` bootstrap definition
- `tests/headfcu.json`
- `tests/genesis.json`
- `tests/chain.rlp`

**Operation Steps**

1. Start one client from `genesis + chain.rlp`.
2. Replay `headfcu.json` over authenticated Engine API.
3. Record whether the replay is accepted.
4. Capture the resulting forkchoice-known observable state.
5. Repeat for `geth` and `reth`.

**Expected Outputs**

- one scenario definition
- per-client replay records for `headfcu.json`
- comparable `B2` state confirmation records

**Validation Method**

- Confirm both clients accept the replayed FCU request.
- Confirm both clients land in a comparable `B2` state according to the
  bootstrap confirmation rule.

## `T05` Hive Integration Spike For JWT Wiring And Artifact Injection

**Status**

`todo`

**Inputs**

- Hive execution environment
- bootstrap definitions from `T02`
- Hive documentation and local invocation notes
- client startup requirements for `geth` and `reth`

**Operation Steps**

1. Confirm how Hive passes `chain.rlp` and related artifacts to the target
   client environment.
2. Confirm JWT-authenticated Engine API access for `geth`.
3. Confirm JWT-authenticated Engine API access for `reth`.
4. Record per-client startup flags, artifact locations, and one proven Engine
   API request path.

**Expected Outputs**

- Hive integration memo for `geth`
- Hive integration memo for `reth`
- one known-good Engine API request path per client
- explicit list of unresolved integration blockers, if any

**Validation Method**

- Confirm the memo names concrete JWT wiring and artifact injection details.
- Confirm at least one authenticated Engine API request succeeds per client in
  the target environment.

## `T06` Stock Hive/EEST Coverage Mapping And Gap Report

**Status**

`todo`

**Inputs**

- Hive/EEST documentation referenced in the current plan
- MVP scenario set
- outputs from `T01` through `T05`

**Operation Steps**

1. Map which MVP behaviors are already covered by stock Hive/EEST paths.
2. Map which behaviors still require the custom runtime layer.
3. Record any unnecessary custom work that can be removed.
4. Record deferred behavior not covered by either stock paths or the MVP.

**Expected Outputs**

- stock-coverage matrix
- custom-layer gap report
- deferred behavior list

**Validation Method**

- Confirm every planned custom runtime scenario is justified by a documented
  stock coverage gap.
- Confirm no stock-covered path is redundantly implemented in the custom layer.

## `T07` Thin HTTP-Based Scenario-Driver Prototype In Hive

**Status**

`todo`

**Inputs**

- Hive execution environment
- bootstrap definitions from `T02`
- integration memo from `T05`
- coverage gap report from `T06`

**Operation Steps**

1. Build the thinnest runnable HTTP-based driver inside the Hive environment.
2. Implement request execution against a Hive-provisioned EL client.
3. Add scenario loading and raw response capture.
4. Keep the driver scoped to gaps not already covered by stock Hive/EEST.

**Expected Outputs**

- minimal runnable scenario driver
- request/response capture path
- per-client invocation notes

**Validation Method**

- Confirm the driver can execute `T03` and `T04` end to end.
- Confirm the driver does not own client lifecycle beyond what Hive already
  provides.
- Confirm the driver scope matches the gap report from `T06`.

## `T08` Response Corpus Collection For `geth` And `reth`

**Status**

`todo`

**Inputs**

- scenario driver from `T07`
- outputs from `T03` and `T04`
- early runtime scenario requests for `fcu-no-build` and
  `fcu-build-getpayload-newpayload`

**Operation Steps**

1. Collect raw responses for the MVP scenarios from `geth`.
2. Collect raw responses for the same scenarios from `reth`.
3. Store a small sampled corpus focused on representation differences.
4. Label obvious noise categories and semantic categories.

**Expected Outputs**

- sampled response corpus
- preliminary list of legal representation differences
- preliminary list of semantically meaningful comparison fields

**Validation Method**

- Confirm the corpus contains both bootstrap and runtime scenario responses.
- Confirm the corpus is sufficient to drive the first normalization rules.

## `T09` `NormalizationProfile` V0

**Status**

`todo`

**Inputs**

- response corpus from `T08`
- `ResultEnvelope` requirements from
  [el-differential-testing-plan.md](./el-differential-testing-plan.md)

**Operation Steps**

1. Define `comparison_fields`.
2. Define `equivalence_rules` for JSON ordering, hex quantity representation,
   null-vs-omitted cases explicitly accepted by the scenario, and
   non-semantic error text.
3. Define `ignored_fields` conservatively.
4. Record client-specific notes only where necessary.

**Expected Outputs**

- `NormalizationProfile` v0
- documented normalization examples
- 3-5 concrete sample pairs showing accepted normalization cases
- explicit non-normalizable field list

**Validation Method**

- Confirm the profile suppresses representation noise in the sample corpus.
- Confirm the documented examples are sufficient to review each equivalence rule
  against a real response pair.
- Confirm it does not suppress differences in error codes, payload status, or
  semantically meaningful field presence.

## `T10` Repeated-Run Determinism Probe

**Status**

`todo`

**Inputs**

- `rlp-bootstrap-smoke`
- `headfcu-bootstrap-smoke`
- `NormalizationProfile` v0
- scenario driver from `T07`

**Operation Steps**

1. Run the same bootstrap path multiple times on `geth`.
2. Run the same bootstrap path multiple times on `reth`.
3. Run the early scenario set multiple times on each client.
4. Compare normalized outputs within each client.
5. Mark non-repeatable scenarios as blocked for MVP diffing.

**Expected Outputs**

- repeated-run determinism report
- list of repeatable scenarios
- list of blocked or unstable scenarios

**Validation Method**

- Confirm repeatable scenarios produce stable normalized envelopes within one
  client.
- Confirm unstable scenarios are excluded from cross-client diff.

## `T11` `fcu-no-build` Runtime Scenario

**Status**

`todo`

**Inputs**

- `runtime_request_replay` bootstrap path
- approved MVP oracle subset from `T01`
- `NormalizationProfile` v0
- coverage gap report from `T06`

**Operation Steps**

1. Build the request sequence for valid `engine_forkchoiceUpdatedV1` with
   `payloadAttributes: null`.
2. Execute it through the scenario driver.
3. Capture raw and normalized responses.
4. Apply approved `hard invariants`.

**Expected Outputs**

- scenario definition
- per-client raw and normalized result records
- invariant evaluation records

**Validation Method**

- Confirm the scenario stays in the no-build branch.
- Confirm the comparison never treats client-local runtime values as
  cross-client comparison keys.

## `T12` `fcu-build-getpayload-newpayload` Runtime Scenario

**Status**

`todo`

**Inputs**

- `runtime_request_replay` bootstrap path
- approved MVP oracle subset from `T01`
- `NormalizationProfile` v0
- coverage gap report from `T06`

**Operation Steps**

1. Execute `engine_forkchoiceUpdatedV1` with valid build attributes.
2. Store the returned `payloadId` in client-local runtime state.
3. Execute `engine_getPayloadV1` with that client-local `payloadId`.
4. Execute `engine_newPayloadV1` with the returned payload.
5. Capture raw and normalized responses for each step.

**Expected Outputs**

- scenario definition
- per-client `client_runtime_state` holding `payloadId`
- per-step raw and normalized responses

**Validation Method**

- Confirm `payloadId` is tracked per client and never compared across clients.
- Confirm the scenario reaches the expected response categories for all three
  calls.

## `T13` `repeat-fcu-same-head` And `unknown-payloadid` Scenarios

**Status**

`todo`

**Inputs**

- scenario driver from `T07`
- `NormalizationProfile` v0
- approved MVP oracle subset from `T01`

**Operation Steps**

1. Define repeated valid `forkchoiceUpdatedV1` on the same head.
2. Define `engine_getPayloadV1` with an unknown `payloadId`.
3. Execute both scenarios on `geth` and `reth`.
4. Capture raw and normalized outputs.

**Expected Outputs**

- two scenario definitions
- per-client result records
- comparison-ready normalized outputs

**Validation Method**

- Confirm repeated FCU remains stable within one client.
- Confirm unknown `payloadId` handling is classified by normalized error
  category, not raw message text.

## `T14` `ResultEnvelope` Generation And Offline Differential Comparison

**Status**

`todo`

**Inputs**

- normalized outputs from `T03` through `T13`
- `ResultEnvelope` contract from
  [el-differential-testing-plan.md](./el-differential-testing-plan.md)

**Operation Steps**

1. Serialize scenario results into `ResultEnvelope`.
2. Compute `bootstrap_digest` from the normalized bootstrap definition:
   bootstrap mode, required artifact paths, file hashes, and startup steps.
3. Write scenario-runtime fields first, including `violates hard invariant`
   when applicable.
4. Diff normalized envelopes offline across `geth` and `reth`.
5. Assign the final comparison buckets:
   `all agree`, `agree after normalization`, or `diverge across clients`.

**Expected Outputs**

- serialized `ResultEnvelope` artifacts
- documented `bootstrap_digest` calculation rule
- explicit runtime-write vs offline-finalization write model
- offline diff output
- first discrepancy list

**Validation Method**

- Confirm every compared scenario produces a complete `ResultEnvelope`.
- Confirm all compared envelopes sharing a comparison set also share the same
  `bootstrap_digest`.
- Confirm offline comparison, not scenario-runtime code, assigns the final
  cross-client buckets.

## `T15` MVP Acceptance Review And Go/No-Go Checkpoint

**Status**

`todo`

**Inputs**

- outputs from `T01` through `T14`
- MVP acceptance criteria from
  [el-differential-testing-plan.md](./el-differential-testing-plan.md)

**Operation Steps**

1. Review all MVP acceptance criteria against observed outputs.
2. Confirm provenance gate compliance.
3. Confirm normalization noise is under control.
4. Confirm determinism is sufficient for offline diff.
5. Decide whether to continue to broader client expansion.

**Expected Outputs**

- MVP review summary
- explicit go/no-go decision
- next-step task list for client expansion or remediation

**Validation Method**

- Confirm every acceptance criterion is marked pass, fail, or blocked.
- Confirm any blocked criterion has a concrete remediation owner and follow-up
  task.
