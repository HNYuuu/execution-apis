# Hive-First Engine API MVP Task Tracker

This document converts the current Hive-first Engine API testing plan into an
executable task list. Each task is implementation-ready and includes:

- `inputs`
- `operation steps`
- `expected outputs`
- `validation method`

Default artifact expectation for every task:

- `code`
- `script`
- `config`
- `test case`
- `log format`

If a task intentionally omits one of these artifact types, the omission should
be recorded in that task's output notes.

Git requirement for every task:

- each completed task must end with a dedicated git commit
- the task record should include the commit hash and commit message once the
  task is done
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
| `T01` | MVP oracle surface freeze and provenance gate | `done` |
| `T02` | Bootstrap artifact contract and reusable bootstrap definitions | `done` |
| `T03` | `rlp-bootstrap-smoke` scenario | `done` |
| `T04` | `headfcu-bootstrap-smoke` scenario | `done` |
| `T05` | Runtime reality check plus Hive integration spike | `done` |
| `T06` | Stock Hive/EEST coverage mapping and gap report | `done` |
| `T07` | Thin HTTP-based runtime scenario-driver prototype over Hive-built client images | `done` |
| `T08` | Response corpus collection for `geth` and `reth` | `done` |
| `T09` | `NormalizationProfile` v0 | `done` |
| `T10` | Repeated-run determinism probe | `done` |
| `T11` | `fcu-no-build` runtime scenario | `done` |
| `T12` | `fcu-build-getpayload-newpayload` runtime scenario | `done` |
| `T13` | `repeat-fcu-same-head` and `unknown-payloadid` scenarios | `todo` |
| `T14` | `ResultEnvelope` generation and offline differential comparison | `todo` |
| `T15` | MVP acceptance review and go/no-go checkpoint | `todo` |

## Tasks

## `T01` MVP Oracle Surface Freeze And Provenance Gate

**Status**

`done`

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

**Artifacts**

- `code`
  [engine-mvp-oracle-gate.js](/Users/ningyuhe/Documents/execution-apis/scripts/engine-mvp-oracle-gate.js)
- `script`
  [run-engine-mvp-oracle-gate.sh](/Users/ningyuhe/Documents/execution-apis/scripts/run-engine-mvp-oracle-gate.sh)
- `config`
  [paris-mvp-oracle-gate.config.json](/Users/ningyuhe/Documents/execution-apis/context/plans/t01-mvp-oracle-gate/paris-mvp-oracle-gate.config.json)
- `test case`
  [paris-mvp-oracle-gate.test-case.json](/Users/ningyuhe/Documents/execution-apis/context/plans/t01-mvp-oracle-gate/paris-mvp-oracle-gate.test-case.json)
- `log format`
  [paris-mvp-oracle-gate.log-format.md](/Users/ningyuhe/Documents/execution-apis/context/plans/t01-mvp-oracle-gate/paris-mvp-oracle-gate.log-format.md)
- `log output`
  [paris-mvp-oracle-gate.log.json](/Users/ningyuhe/Documents/execution-apis/context/plans/t01-mvp-oracle-gate/paris-mvp-oracle-gate.log.json)
- `decision log`
  [paris-mvp-oracle-gate.decision-log.md](/Users/ningyuhe/Documents/execution-apis/context/plans/t01-mvp-oracle-gate/paris-mvp-oracle-gate.decision-log.md)

**Git Record**

- `commit`
  `07ddaf1` - `Implement T01 MVP oracle gate artifacts`

**Validation Method**

- Confirm every MVP `hard invariant` has non-`unknown` provenance.
- Confirm deferred rules are not referenced by runtime scenario acceptance
  checks.

## `T02` Bootstrap Artifact Contract And Reusable Bootstrap Definitions

**Status**

`done`

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

**Artifacts**

- `code`
  [engine-bootstrap-contract-check.js](/Users/ningyuhe/Documents/execution-apis/scripts/engine-bootstrap-contract-check.js)
- `script`
  [run-engine-bootstrap-contract-check.sh](/Users/ningyuhe/Documents/execution-apis/scripts/run-engine-bootstrap-contract-check.sh)
- `config`
  [paris-mvp-bootstrap-definitions.json](/Users/ningyuhe/Documents/execution-apis/context/plans/t02-bootstrap-contract/paris-mvp-bootstrap-definitions.json)
- `test case`
  [paris-mvp-bootstrap-contract.test-case.json](/Users/ningyuhe/Documents/execution-apis/context/plans/t02-bootstrap-contract/paris-mvp-bootstrap-contract.test-case.json)
- `log format`
  [paris-mvp-bootstrap-contract.log-format.md](/Users/ningyuhe/Documents/execution-apis/context/plans/t02-bootstrap-contract/paris-mvp-bootstrap-contract.log-format.md)
- `log output`
  [paris-mvp-bootstrap-contract.log.json](/Users/ningyuhe/Documents/execution-apis/context/plans/t02-bootstrap-contract/paris-mvp-bootstrap-contract.log.json)
- `notes`
  [paris-mvp-bootstrap-contract.notes.md](/Users/ningyuhe/Documents/execution-apis/context/plans/t02-bootstrap-contract/paris-mvp-bootstrap-contract.notes.md)

**Git Record**

- `commit`
  `5ce313c` - `Implement T02 bootstrap contract artifacts`

**Validation Method**

- Review that no bootstrap definition uses file injection for `B3` or `B4`.
- Confirm each bootstrap mode names a concrete confirmation rule.

## `T03` `rlp-bootstrap-smoke` Scenario

**Status**

`done`

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

**Current Progress**

- Real runtime bootstrap completed for `geth` and `reth`.
- Both clients imported `genesis + chain.rlp` and exposed RPC successfully.
- Two runs per client observed the same head number and head hash.

**Artifacts**

- `code`
  [engine-rlp-bootstrap-smoke.js](/Users/ningyuhe/Documents/execution-apis/scripts/engine-rlp-bootstrap-smoke.js)
- `script`
  [run-engine-rlp-bootstrap-smoke.sh](/Users/ningyuhe/Documents/execution-apis/scripts/run-engine-rlp-bootstrap-smoke.sh)
- `config`
  [paris-rlp-bootstrap-smoke.config.json](/Users/ningyuhe/Documents/execution-apis/context/plans/t03-rlp-bootstrap-smoke/paris-rlp-bootstrap-smoke.config.json)
- `test case`
  [paris-rlp-bootstrap-smoke.test-case.json](/Users/ningyuhe/Documents/execution-apis/context/plans/t03-rlp-bootstrap-smoke/paris-rlp-bootstrap-smoke.test-case.json)
- `log format`
  [paris-rlp-bootstrap-smoke.log-format.md](/Users/ningyuhe/Documents/execution-apis/context/plans/t03-rlp-bootstrap-smoke/paris-rlp-bootstrap-smoke.log-format.md)
- `log output`
  [paris-rlp-bootstrap-smoke.log.json](/Users/ningyuhe/Documents/execution-apis/context/plans/t03-rlp-bootstrap-smoke/paris-rlp-bootstrap-smoke.log.json)
- `notes`
  [paris-rlp-bootstrap-smoke.notes.md](/Users/ningyuhe/Documents/execution-apis/context/plans/t03-rlp-bootstrap-smoke/paris-rlp-bootstrap-smoke.notes.md)
- `raw log`
  [paris-rlp-bootstrap-smoke.log.geth.run1.raw.log](/Users/ningyuhe/Documents/execution-apis/context/plans/t03-rlp-bootstrap-smoke/paris-rlp-bootstrap-smoke.log.geth.run1.raw.log)
- `raw log`
  [paris-rlp-bootstrap-smoke.log.geth.run2.raw.log](/Users/ningyuhe/Documents/execution-apis/context/plans/t03-rlp-bootstrap-smoke/paris-rlp-bootstrap-smoke.log.geth.run2.raw.log)
- `raw log`
  [paris-rlp-bootstrap-smoke.log.reth.run1.raw.log](/Users/ningyuhe/Documents/execution-apis/context/plans/t03-rlp-bootstrap-smoke/paris-rlp-bootstrap-smoke.log.reth.run1.raw.log)
- `raw log`
  [paris-rlp-bootstrap-smoke.log.reth.run2.raw.log](/Users/ningyuhe/Documents/execution-apis/context/plans/t03-rlp-bootstrap-smoke/paris-rlp-bootstrap-smoke.log.reth.run2.raw.log)

**Git Record**

- `commit`
  `ba15ce4` - `Complete T03 real runtime rlp bootstrap smoke`

**Validation Method**

- Confirm both clients report the expected head number and head hash.
- Confirm repeated runs on the same client reproduce the same observable head.

## `T04` `headfcu-bootstrap-smoke` Scenario

**Status**

`done`

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

**Current Progress**

- Real runtime replay completed for `geth` and `reth`.
- Both clients accepted `engine_forkchoiceUpdatedV3` from `tests/headfcu.json`.
- Two runs per client returned `payloadStatus.status = VALID`.
- All observed `payloadId` values were `null`, as expected for
  `payloadAttributes: null`.

**Artifacts**

- `code`
  [engine-headfcu-bootstrap-smoke.js](/Users/ningyuhe/Documents/execution-apis/scripts/engine-headfcu-bootstrap-smoke.js)
- `script`
  [run-engine-headfcu-bootstrap-smoke.sh](/Users/ningyuhe/Documents/execution-apis/scripts/run-engine-headfcu-bootstrap-smoke.sh)
- `config`
  [paris-headfcu-bootstrap-smoke.config.json](/Users/ningyuhe/Documents/execution-apis/context/plans/t04-headfcu-bootstrap-smoke/paris-headfcu-bootstrap-smoke.config.json)
- `test case`
  [paris-headfcu-bootstrap-smoke.test-case.json](/Users/ningyuhe/Documents/execution-apis/context/plans/t04-headfcu-bootstrap-smoke/paris-headfcu-bootstrap-smoke.test-case.json)
- `log format`
  [paris-headfcu-bootstrap-smoke.log-format.md](/Users/ningyuhe/Documents/execution-apis/context/plans/t04-headfcu-bootstrap-smoke/paris-headfcu-bootstrap-smoke.log-format.md)
- `log output`
  [paris-headfcu-bootstrap-smoke.log.json](/Users/ningyuhe/Documents/execution-apis/context/plans/t04-headfcu-bootstrap-smoke/paris-headfcu-bootstrap-smoke.log.json)
- `notes`
  [paris-headfcu-bootstrap-smoke.notes.md](/Users/ningyuhe/Documents/execution-apis/context/plans/t04-headfcu-bootstrap-smoke/paris-headfcu-bootstrap-smoke.notes.md)
- `raw log`
  [paris-headfcu-bootstrap-smoke.log.geth.run1.raw.log](/Users/ningyuhe/Documents/execution-apis/context/plans/t04-headfcu-bootstrap-smoke/paris-headfcu-bootstrap-smoke.log.geth.run1.raw.log)
- `raw log`
  [paris-headfcu-bootstrap-smoke.log.geth.run2.raw.log](/Users/ningyuhe/Documents/execution-apis/context/plans/t04-headfcu-bootstrap-smoke/paris-headfcu-bootstrap-smoke.log.geth.run2.raw.log)
- `raw log`
  [paris-headfcu-bootstrap-smoke.log.reth.run1.raw.log](/Users/ningyuhe/Documents/execution-apis/context/plans/t04-headfcu-bootstrap-smoke/paris-headfcu-bootstrap-smoke.log.reth.run1.raw.log)
- `raw log`
  [paris-headfcu-bootstrap-smoke.log.reth.run2.raw.log](/Users/ningyuhe/Documents/execution-apis/context/plans/t04-headfcu-bootstrap-smoke/paris-headfcu-bootstrap-smoke.log.reth.run2.raw.log)

**Git Record**

- `commit`
  `426235a` - `Complete T04 headfcu bootstrap smoke`

**Validation Method**

- Confirm both clients accept the replayed FCU request.
- Confirm both clients land in a comparable `B2` state according to the
  bootstrap confirmation rule.

## `T05` Runtime Reality Check Plus Hive Integration Spike

**Status**

`done`

**Inputs**

- Hive execution environment
- bootstrap definitions from `T02`
- Hive documentation and local invocation notes
- client startup requirements for `geth` and `reth`
- local Docker environment state

**Operation Steps**

1. Probe whether Docker is installed and whether the daemon is reachable.
2. Probe whether `Hive` is already installed or whether a concrete install
   path exists.
3. Confirm how Hive passes `chain.rlp` and related artifacts to the target
   client environment.
4. Confirm JWT-authenticated Engine API access for `geth`.
5. Confirm JWT-authenticated Engine API access for `reth`.
6. Record per-client startup flags, artifact locations, and one proven Engine
   API request path.

**Expected Outputs**

- runtime reality-check log for Docker and Hive prerequisites
- Hive integration memo for `geth`
- Hive integration memo for `reth`
- one known-good Engine API request path per client
- explicit list of unresolved integration blockers, if any

**Current Progress**

- Docker CLI found locally.
- Docker Desktop app found locally.
- Docker endpoint identified as `unix:///Users/ningyuhe/.docker/run/docker.sock`.
- Official Hive repository cloned to `/tmp/hive`.
- Hive binary built successfully with `CGO_ENABLED=0`.
- Minimal real `ethereum/engine` smoke runs succeeded for both
  `go-ethereum` and `reth`.
- Local Docker Desktop compatibility patch captured as a repository artifact.
- `hive` is runnable from the cloned workspace, but not installed on `$PATH`.

**Artifacts**

- `code`
  [engine-hive-reality-check.js](/Users/ningyuhe/Documents/execution-apis/scripts/engine-hive-reality-check.js)
- `script`
  [run-engine-hive-reality-check.sh](/Users/ningyuhe/Documents/execution-apis/scripts/run-engine-hive-reality-check.sh)
- `config`
  [paris-hive-reality-check.config.json](/Users/ningyuhe/Documents/execution-apis/context/plans/t05-hive-reality-check/paris-hive-reality-check.config.json)
- `test case`
  [paris-hive-reality-check.test-case.json](/Users/ningyuhe/Documents/execution-apis/context/plans/t05-hive-reality-check/paris-hive-reality-check.test-case.json)
- `log format`
  [paris-hive-reality-check.log-format.md](/Users/ningyuhe/Documents/execution-apis/context/plans/t05-hive-reality-check/paris-hive-reality-check.log-format.md)
- `log output`
  [paris-hive-reality-check.log.json](/Users/ningyuhe/Documents/execution-apis/context/plans/t05-hive-reality-check/paris-hive-reality-check.log.json)
- `notes`
  [paris-hive-reality-check.notes.md](/Users/ningyuhe/Documents/execution-apis/context/plans/t05-hive-reality-check/paris-hive-reality-check.notes.md)
- `code`
  [engine-hive-engine-smoke.js](/Users/ningyuhe/Documents/execution-apis/scripts/engine-hive-engine-smoke.js)
- `script`
  [run-engine-hive-engine-smoke.sh](/Users/ningyuhe/Documents/execution-apis/scripts/run-engine-hive-engine-smoke.sh)
- `config`
  [paris-hive-engine-smoke.config.json](/Users/ningyuhe/Documents/execution-apis/context/plans/t05-hive-reality-check/paris-hive-engine-smoke.config.json)
- `test case`
  [paris-hive-engine-smoke.test-case.json](/Users/ningyuhe/Documents/execution-apis/context/plans/t05-hive-reality-check/paris-hive-engine-smoke.test-case.json)
- `log format`
  [paris-hive-engine-smoke.log-format.md](/Users/ningyuhe/Documents/execution-apis/context/plans/t05-hive-reality-check/paris-hive-engine-smoke.log-format.md)
- `log output`
  [paris-hive-engine-smoke.log.json](/Users/ningyuhe/Documents/execution-apis/context/plans/t05-hive-reality-check/paris-hive-engine-smoke.log.json)
- `memo`
  [paris-hive-integration-memo.md](/Users/ningyuhe/Documents/execution-apis/context/plans/t05-hive-reality-check/paris-hive-integration-memo.md)
- `patch`
  [hive-docker-desktop-compat.patch](/Users/ningyuhe/Documents/execution-apis/context/plans/t05-hive-reality-check/hive-docker-desktop-compat.patch)

**Git Record**

- `commit`
  `4879f9c` - `Implement T05 Hive runtime reality check artifacts`

**Validation Method**

- Confirm the probe identifies whether Docker and Hive are genuinely usable,
  not just present on `$PATH`.
- Confirm the memo names concrete JWT wiring and artifact injection details.
- Confirm at least one authenticated Engine API request succeeds per client in
  the target environment.

## `T06` Stock Hive/EEST Coverage Mapping And Gap Report

**Status**

`done`

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

**Current Progress**

- Stock-only coverage retained for baseline `valid-newpayload` and
  `invalid-newpayload`.
- Hybrid bootstrap ownership retained for `rlp-bootstrap-smoke` and
  `headfcu-bootstrap-smoke`.
- Remaining custom-runtime scope narrowed to:
  `fcu-no-build`, `fcu-build-getpayload-newpayload`,
  `repeat-fcu-same-head`, `unknown-payloadid`.
- `T07` scope should no longer include `T03` or `T04`.

**Artifacts**

- `code`
  [engine-stock-coverage-map.js](/Users/ningyuhe/Documents/execution-apis/scripts/engine-stock-coverage-map.js)
- `script`
  [run-engine-stock-coverage-map.sh](/Users/ningyuhe/Documents/execution-apis/scripts/run-engine-stock-coverage-map.sh)
- `config`
  [paris-stock-coverage.config.json](/Users/ningyuhe/Documents/execution-apis/context/plans/t06-stock-coverage/paris-stock-coverage.config.json)
- `test case`
  [paris-stock-coverage.test-case.json](/Users/ningyuhe/Documents/execution-apis/context/plans/t06-stock-coverage/paris-stock-coverage.test-case.json)
- `log format`
  [paris-stock-coverage.log-format.md](/Users/ningyuhe/Documents/execution-apis/context/plans/t06-stock-coverage/paris-stock-coverage.log-format.md)
- `log output`
  [paris-stock-coverage.log.json](/Users/ningyuhe/Documents/execution-apis/context/plans/t06-stock-coverage/paris-stock-coverage.log.json)
- `report`
  [paris-stock-coverage-report.md](/Users/ningyuhe/Documents/execution-apis/context/plans/t06-stock-coverage/paris-stock-coverage-report.md)

**Git Record**

- `commit`
  `78e4178` - `Complete T06 stock coverage mapping`

**Validation Method**

- Confirm every planned custom runtime scenario is justified by a documented
  stock coverage gap.
- Confirm no stock-covered path is redundantly implemented in the custom layer.

## `T07` Thin HTTP-Based Runtime Scenario-Driver Prototype Over Hive-Built Client Images

**Status**

`done`

**Inputs**

- Hive-built client images and Docker-backed runtime environment
- bootstrap definitions from `T02`
- integration memo from `T05`
- coverage gap report from `T06`

**Operation Steps**

1. Build the thinnest runnable HTTP-based driver over the already validated
   Docker bootstrap path using Hive-built EL client images.
2. Implement request execution against a bootstrapped EL client.
3. Add scenario loading and raw response capture.
4. Keep the driver scoped to gaps not already covered by stock Hive/EEST.

**Expected Outputs**

- minimal runnable scenario driver
- request/response capture path
- per-client invocation notes

**Current Progress**

- Real runtime driver completed for `geth` and `reth`.
- The driver loaded only the current custom-runtime scope from `T06`:
  `fcu-no-build` and `repeat-fcu-same-head`.
- Both clients replayed the two MVP scenarios successfully after `B2`
  bootstrap, with stable `VALID` plus `payloadId: null` results and unchanged
  imported head state.

**Artifacts**

- `code`
  [engine-runtime-scenario-driver.js](/Users/ningyuhe/Documents/execution-apis/scripts/engine-runtime-scenario-driver.js)
- `script`
  [run-engine-runtime-scenario-driver.sh](/Users/ningyuhe/Documents/execution-apis/scripts/run-engine-runtime-scenario-driver.sh)
- `config`
  [paris-runtime-driver.config.json](/Users/ningyuhe/Documents/execution-apis/context/plans/t07-runtime-driver/paris-runtime-driver.config.json)
- `test case`
  [paris-runtime-driver.test-case.json](/Users/ningyuhe/Documents/execution-apis/context/plans/t07-runtime-driver/paris-runtime-driver.test-case.json)
- `log format`
  [paris-runtime-driver.log-format.md](/Users/ningyuhe/Documents/execution-apis/context/plans/t07-runtime-driver/paris-runtime-driver.log-format.md)
- `log output`
  [paris-runtime-driver.log.json](/Users/ningyuhe/Documents/execution-apis/context/plans/t07-runtime-driver/paris-runtime-driver.log.json)
- `notes`
  [paris-runtime-driver.notes.md](/Users/ningyuhe/Documents/execution-apis/context/plans/t07-runtime-driver/paris-runtime-driver.notes.md)
- `scenario`
  [fcu-no-build.json](/Users/ningyuhe/Documents/execution-apis/context/plans/t07-runtime-driver/scenarios/fcu-no-build.json)
- `scenario`
  [repeat-fcu-same-head.json](/Users/ningyuhe/Documents/execution-apis/context/plans/t07-runtime-driver/scenarios/repeat-fcu-same-head.json)
- `raw log`
  [paris-runtime-driver.log.geth.raw.log](/Users/ningyuhe/Documents/execution-apis/context/plans/t07-runtime-driver/paris-runtime-driver.log.geth.raw.log)
- `raw log`
  [paris-runtime-driver.log.reth.raw.log](/Users/ningyuhe/Documents/execution-apis/context/plans/t07-runtime-driver/paris-runtime-driver.log.reth.raw.log)

**Git Record**

- `commit`
  `384b848` - `Complete T07 runtime scenario driver prototype`

**Adjustment**

- `T07` should no longer be phrased as a full Hive simulator task.
- `T07` should use the thin Docker-backed runtime path already validated by
  `T03`, `T04`, and `T05`, while keeping Hive responsibility limited to client
  image build provenance.

**Validation Method**

- Confirm the driver is scoped only to the remaining custom-runtime gaps from
  `T06`.
- Confirm the driver does not expand into a bespoke multi-client testbed or
  attempt to replace stock Hive/EEST ownership for `newPayload` baseline paths.
- Confirm the driver scope matches the gap report from `T06`.

## `T08` Response Corpus Collection For `geth` And `reth`

**Status**

`done`

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

**Current Progress**

- Corpus v0 was built from the completed real-runtime logs produced by `T03`,
  `T04`, and `T07`.
- The resulting corpus contains `7` sampled response pairs across bootstrap and
  runtime categories.
- The corpus already exposes one concrete normalization seed:
  `object_field_order_only` on `eth_getBlockByNumber(latest, false)` latest
  headers.
- `payloadId`-dependent and error-shape samples were not silently skipped; they
  are explicitly recorded as deferred inputs for `T12` and `T13`.

**Artifacts**

- `code`
  [engine-response-corpus.js](/Users/ningyuhe/Documents/execution-apis/scripts/engine-response-corpus.js)
- `script`
  [run-engine-response-corpus.sh](/Users/ningyuhe/Documents/execution-apis/scripts/run-engine-response-corpus.sh)
- `config`
  [paris-response-corpus.config.json](/Users/ningyuhe/Documents/execution-apis/context/plans/t08-response-corpus/paris-response-corpus.config.json)
- `test case`
  [paris-response-corpus.test-case.json](/Users/ningyuhe/Documents/execution-apis/context/plans/t08-response-corpus/paris-response-corpus.test-case.json)
- `log format`
  [paris-response-corpus.log-format.md](/Users/ningyuhe/Documents/execution-apis/context/plans/t08-response-corpus/paris-response-corpus.log-format.md)
- `log output`
  [paris-response-corpus.log.json](/Users/ningyuhe/Documents/execution-apis/context/plans/t08-response-corpus/paris-response-corpus.log.json)
- `samples`
  [paris-response-corpus.samples.json](/Users/ningyuhe/Documents/execution-apis/context/plans/t08-response-corpus/paris-response-corpus.samples.json)
- `notes`
  [paris-response-corpus.notes.md](/Users/ningyuhe/Documents/execution-apis/context/plans/t08-response-corpus/paris-response-corpus.notes.md)
- `report`
  [paris-response-corpus.report.md](/Users/ningyuhe/Documents/execution-apis/context/plans/t08-response-corpus/paris-response-corpus.report.md)

**Git Record**

- `commit`
  `f379f12` - `Complete T08 response corpus collection`

**Adjustment**

- `T08` now treats the response corpus as a `v0` artifact built from completed
  runtime evidence, not as a promise that every future scenario family has
  already been sampled.
- `fcu-build-getpayload-newpayload` and `unknown-payloadid` remain explicit
  deferred inputs, which keeps the corpus honest while still unblocking `T09`.

**Validation Method**

- Confirm the corpus contains both bootstrap and runtime scenario responses.
- Confirm the corpus is sufficient to drive the first normalization rules.

## `T09` `NormalizationProfile` V0

**Status**

`done`

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

**Current Progress**

- `NormalizationProfile v0` was generated from the `T08` corpus and validated
  against real sample pairs.
- The profile currently activates two rules:
  `stable_object_key_order` and `canonical_hex_quantity`.
- Two additional rules are recorded but remain deferred:
  `null_vs_omitted_when_explicitly_allowed` and
  `non_semantic_error_text`.
- The examples set contains `4` concrete sample pairs, including two accepted
  order-only normalization cases and two exact-match semantic examples.

**Artifacts**

- `code`
  [engine-normalization-profile.js](/Users/ningyuhe/Documents/execution-apis/scripts/engine-normalization-profile.js)
- `script`
  [run-engine-normalization-profile.sh](/Users/ningyuhe/Documents/execution-apis/scripts/run-engine-normalization-profile.sh)
- `config`
  [paris-normalization-profile.config.json](/Users/ningyuhe/Documents/execution-apis/context/plans/t09-normalization-profile/paris-normalization-profile.config.json)
- `test case`
  [paris-normalization-profile.test-case.json](/Users/ningyuhe/Documents/execution-apis/context/plans/t09-normalization-profile/paris-normalization-profile.test-case.json)
- `log format`
  [paris-normalization-profile.log-format.md](/Users/ningyuhe/Documents/execution-apis/context/plans/t09-normalization-profile/paris-normalization-profile.log-format.md)
- `log output`
  [paris-normalization-profile.log.json](/Users/ningyuhe/Documents/execution-apis/context/plans/t09-normalization-profile/paris-normalization-profile.log.json)
- `profile`
  [paris-normalization-profile.json](/Users/ningyuhe/Documents/execution-apis/context/plans/t09-normalization-profile/paris-normalization-profile.json)
- `examples`
  [paris-normalization-profile.examples.json](/Users/ningyuhe/Documents/execution-apis/context/plans/t09-normalization-profile/paris-normalization-profile.examples.json)
- `notes`
  [paris-normalization-profile.notes.md](/Users/ningyuhe/Documents/execution-apis/context/plans/t09-normalization-profile/paris-normalization-profile.notes.md)
- `report`
  [paris-normalization-profile.report.md](/Users/ningyuhe/Documents/execution-apis/context/plans/t09-normalization-profile/paris-normalization-profile.report.md)

**Git Record**

- `commit`
  `e43bd4c` - `Complete T09 normalization profile v0`

**Adjustment**

- `T09` is intentionally conservative: it only activates rules that are either
  directly observed in the corpus or required to keep quantity comparisons
  stable.
- Error-text normalization and null-vs-omitted normalization remain deferred
  until `T12` and `T13` contribute the needed evidence.

**Validation Method**

- Confirm the profile suppresses representation noise in the sample corpus.
- Confirm the documented examples are sufficient to review each equivalence rule
  against a real response pair.
- Confirm it does not suppress differences in error codes, payload status, or
  semantically meaningful field presence.

## `T10` Repeated-Run Determinism Probe

**Status**

`done`

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

**Current Progress**

- The probe reused repeated real-runtime evidence from `T03` and `T04`.
- It added `3` fresh reruns of the `T07` runtime driver, resulting in `4`
  runtime observations per client when combined with the committed baseline.
- All current early-surface ids were stable within each client after
  normalization:
  `rlp-bootstrap-smoke`, `headfcu-bootstrap-smoke`,
  `runtime-driver-early-scenarios`, `fcu-no-build`,
  `repeat-fcu-same-head`.
- No scenario is currently blocked for MVP diffing at this early-scenario
  surface.

**Artifacts**

- `code`
  [engine-determinism-probe.js](/Users/ningyuhe/Documents/execution-apis/scripts/engine-determinism-probe.js)
- `script`
  [run-engine-determinism-probe.sh](/Users/ningyuhe/Documents/execution-apis/scripts/run-engine-determinism-probe.sh)
- `config`
  [paris-determinism-probe.config.json](/Users/ningyuhe/Documents/execution-apis/context/plans/t10-determinism-probe/paris-determinism-probe.config.json)
- `test case`
  [paris-determinism-probe.test-case.json](/Users/ningyuhe/Documents/execution-apis/context/plans/t10-determinism-probe/paris-determinism-probe.test-case.json)
- `log format`
  [paris-determinism-probe.log-format.md](/Users/ningyuhe/Documents/execution-apis/context/plans/t10-determinism-probe/paris-determinism-probe.log-format.md)
- `log output`
  [paris-determinism-probe.log.json](/Users/ningyuhe/Documents/execution-apis/context/plans/t10-determinism-probe/paris-determinism-probe.log.json)
- `report`
  [paris-determinism-probe.report.json](/Users/ningyuhe/Documents/execution-apis/context/plans/t10-determinism-probe/paris-determinism-probe.report.json)
- `notes`
  [paris-determinism-probe.notes.md](/Users/ningyuhe/Documents/execution-apis/context/plans/t10-determinism-probe/paris-determinism-probe.notes.md)
- `report doc`
  [paris-determinism-probe.report.md](/Users/ningyuhe/Documents/execution-apis/context/plans/t10-determinism-probe/paris-determinism-probe.report.md)
- `runtime rerun`
  [paris-runtime-driver.rerun1.log.json](/Users/ningyuhe/Documents/execution-apis/context/plans/t10-determinism-probe/runtime-reruns/paris-runtime-driver.rerun1.log.json)
- `runtime rerun`
  [paris-runtime-driver.rerun2.log.json](/Users/ningyuhe/Documents/execution-apis/context/plans/t10-determinism-probe/runtime-reruns/paris-runtime-driver.rerun2.log.json)
- `runtime rerun`
  [paris-runtime-driver.rerun3.log.json](/Users/ningyuhe/Documents/execution-apis/context/plans/t10-determinism-probe/runtime-reruns/paris-runtime-driver.rerun3.log.json)

**Git Record**

- `commit`
  `d5730af` - `Complete T10 determinism probe`

**Adjustment**

- `T10` deliberately mixes existing repeated bootstrap evidence with fresh
  runtime reruns. Re-running `T03` and `T04` again would add cost without
  adding meaningful signal.
- The determinism claim is currently limited to the early-scenario surface and
  does not yet cover `fcu-build-getpayload-newpayload` or `unknown-payloadid`.

**Validation Method**

- Confirm repeatable scenarios produce stable normalized envelopes within one
  client.
- Confirm unstable scenarios are excluded from cross-client diff.

## `T11` `fcu-no-build` Runtime Scenario

**Status**

`done`

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

**Current Progress**

- The formal Paris scenario now runs `engine_forkchoiceUpdatedV1` with
  `payloadAttributes: null` after `B2` bootstrap.
- Both `geth` and `reth` returned the no-build branch with
  `payloadStatus.status = VALID`, `latestValidHash = headBlockHash`,
  `validationError = null`, and `payloadId = null`.
- All three approved `T01` hard invariants passed on both clients:
  `PARIS-METHOD-FCU-17`, `PARIS-METHOD-FCU-22`, `PARIS-METHOD-FCU-23`.

**Artifacts**

- `code`
  [engine-fcu-no-build-scenario.js](/Users/ningyuhe/Documents/execution-apis/scripts/engine-fcu-no-build-scenario.js)
- `script`
  [run-engine-fcu-no-build-scenario.sh](/Users/ningyuhe/Documents/execution-apis/scripts/run-engine-fcu-no-build-scenario.sh)
- `config`
  [paris-fcu-no-build.config.json](/Users/ningyuhe/Documents/execution-apis/context/plans/t11-fcu-no-build/paris-fcu-no-build.config.json)
- `test case`
  [paris-fcu-no-build.test-case.json](/Users/ningyuhe/Documents/execution-apis/context/plans/t11-fcu-no-build/paris-fcu-no-build.test-case.json)
- `log format`
  [paris-fcu-no-build.log-format.md](/Users/ningyuhe/Documents/execution-apis/context/plans/t11-fcu-no-build/paris-fcu-no-build.log-format.md)
- `log output`
  [paris-fcu-no-build.log.json](/Users/ningyuhe/Documents/execution-apis/context/plans/t11-fcu-no-build/paris-fcu-no-build.log.json)
- `scenario`
  [paris-fcu-no-build.scenario.json](/Users/ningyuhe/Documents/execution-apis/context/plans/t11-fcu-no-build/paris-fcu-no-build.scenario.json)
- `notes`
  [paris-fcu-no-build.notes.md](/Users/ningyuhe/Documents/execution-apis/context/plans/t11-fcu-no-build/paris-fcu-no-build.notes.md)
- `report`
  [paris-fcu-no-build.report.md](/Users/ningyuhe/Documents/execution-apis/context/plans/t11-fcu-no-build/paris-fcu-no-build.report.md)
- `raw log`
  [paris-fcu-no-build.log.geth.raw.log](/Users/ningyuhe/Documents/execution-apis/context/plans/t11-fcu-no-build/paris-fcu-no-build.log.geth.raw.log)
- `raw log`
  [paris-fcu-no-build.log.reth.raw.log](/Users/ningyuhe/Documents/execution-apis/context/plans/t11-fcu-no-build/paris-fcu-no-build.log.reth.raw.log)

**Git Record**

- `commit`
  `52858df` - `Complete T11 fcu-no-build runtime scenario`

**Adjustment**

- `T11` intentionally diverges from `T07`: the formal scenario method is
  `engine_forkchoiceUpdatedV1`, not `V3`, because `T11` is a Paris-spec
  scenario rather than a generic runtime-driver prototype.
- The bootstrap still reuses the repository-owned `headfcu.json` artifact to
  establish `B2` before the `V1` scenario call.

**Validation Method**

- Confirm the scenario stays in the no-build branch.
- Confirm the comparison never treats client-local runtime values as
  cross-client comparison keys.

## `T12` `fcu-build-getpayload-newpayload` Runtime Scenario

**Status**

`done`

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

**Current Progress**

- The Paris three-call runtime chain now runs end-to-end on `geth` and `reth`
  using task-local Paris-era fixtures generated with `hivechain` and
  `lastfork=merge`.
- Both clients returned `VALID` plus non-null `payloadId` from
  `engine_forkchoiceUpdatedV1`, then returned a payload from
  `engine_getPayloadV1`, and finally returned `VALID` from
  `engine_newPayloadV1`.
- Both approved `T01` hard invariants passed on both clients:
  `PARIS-METHOD-FCU-18` and `PARIS-METHOD-GP-01`.
- `payloadId` and built `blockHash` differ across clients as expected and are
  therefore kept out of cross-client equality checks.

**Artifacts**

- `code`
  [engine-fcu-build-getpayload-newpayload.js](/Users/ningyuhe/Documents/execution-apis/scripts/engine-fcu-build-getpayload-newpayload.js)
- `script`
  [run-engine-fcu-build-getpayload-newpayload.sh](/Users/ningyuhe/Documents/execution-apis/scripts/run-engine-fcu-build-getpayload-newpayload.sh)
- `config`
  [paris-fcu-build-getpayload-newpayload.config.json](/Users/ningyuhe/Documents/execution-apis/context/plans/t12-fcu-build-getpayload-newpayload/paris-fcu-build-getpayload-newpayload.config.json)
- `test case`
  [paris-fcu-build-getpayload-newpayload.test-case.json](/Users/ningyuhe/Documents/execution-apis/context/plans/t12-fcu-build-getpayload-newpayload/paris-fcu-build-getpayload-newpayload.test-case.json)
- `log format`
  [paris-fcu-build-getpayload-newpayload.log-format.md](/Users/ningyuhe/Documents/execution-apis/context/plans/t12-fcu-build-getpayload-newpayload/paris-fcu-build-getpayload-newpayload.log-format.md)
- `log output`
  [paris-fcu-build-getpayload-newpayload.log.json](/Users/ningyuhe/Documents/execution-apis/context/plans/t12-fcu-build-getpayload-newpayload/paris-fcu-build-getpayload-newpayload.log.json)
- `scenario`
  [paris-fcu-build-getpayload-newpayload.scenario.json](/Users/ningyuhe/Documents/execution-apis/context/plans/t12-fcu-build-getpayload-newpayload/paris-fcu-build-getpayload-newpayload.scenario.json)
- `notes`
  [paris-fcu-build-getpayload-newpayload.notes.md](/Users/ningyuhe/Documents/execution-apis/context/plans/t12-fcu-build-getpayload-newpayload/paris-fcu-build-getpayload-newpayload.notes.md)
- `report`
  [paris-fcu-build-getpayload-newpayload.report.md](/Users/ningyuhe/Documents/execution-apis/context/plans/t12-fcu-build-getpayload-newpayload/paris-fcu-build-getpayload-newpayload.report.md)
- `fixture`
  [genesis.json](/Users/ningyuhe/Documents/execution-apis/context/plans/t12-fcu-build-getpayload-newpayload/paris-fixtures/genesis.json)
- `fixture`
  [chain.rlp](/Users/ningyuhe/Documents/execution-apis/context/plans/t12-fcu-build-getpayload-newpayload/paris-fixtures/chain.rlp)
- `fixture`
  [forkenv.json](/Users/ningyuhe/Documents/execution-apis/context/plans/t12-fcu-build-getpayload-newpayload/paris-fixtures/forkenv.json)
- `fixture`
  [headfcu.json](/Users/ningyuhe/Documents/execution-apis/context/plans/t12-fcu-build-getpayload-newpayload/paris-fixtures/headfcu.json)
- `raw log`
  [paris-fcu-build-getpayload-newpayload.log.geth.raw.log](/Users/ningyuhe/Documents/execution-apis/context/plans/t12-fcu-build-getpayload-newpayload/paris-fcu-build-getpayload-newpayload.log.geth.raw.log)
- `raw log`
  [paris-fcu-build-getpayload-newpayload.log.reth.raw.log](/Users/ningyuhe/Documents/execution-apis/context/plans/t12-fcu-build-getpayload-newpayload/paris-fcu-build-getpayload-newpayload.log.reth.raw.log)

**Git Record**

- `commit`
  `4b8685c` - `Complete T12 build getPayload newPayload runtime scenario`

**Adjustment**

- `T12` required a fixture correction before implementation could succeed.
- The repository-level `tests/*` assets are post-Shanghai and reject
  `engine_forkchoiceUpdatedV1` build attributes with
  `fcuV1 called post-shanghai`.
- The task therefore uses task-local Paris fixtures instead of mutating the
  repository-wide shared fixtures.

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
