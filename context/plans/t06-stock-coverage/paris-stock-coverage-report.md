# T06 Stock Coverage Report

## Summary

- fork: `Paris`
- covered by stock only: `2`
- hybrid keep-custom paths: `2`
- custom-runtime required: `4`
- deferred behaviors: `4`

## Matrix

| Behavior | Stock Coverage | Recommended Owner | Primary Stock Path |
| --- | --- | --- | --- |
| `rlp-bootstrap-smoke` | `partial` | `hybrid_keep_custom` | EEST consume-rlp simulator |
| `headfcu-bootstrap-smoke` | `partial` | `hybrid_keep_custom` | Hive ethereum/engine forkchoice coverage |
| `valid-newpayload` | `full` | `stock_only` | Hive ethereum/engine payload execution suites |
| `invalid-newpayload` | `full` | `stock_only` | Hive ethereum/engine invalid payload suites |
| `fcu-no-build` | `partial` | `custom_runtime` | Hive engine forkchoice and payload-attributes suites |
| `fcu-build-getpayload-newpayload` | `partial` | `custom_runtime` | Hive payload ID and payload execution suites |
| `repeat-fcu-same-head` | `none` | `custom_runtime` | No explicit stock same-head idempotence scenario |
| `unknown-payloadid` | `none` | `custom_runtime` | No explicit stock unknown payloadId suite |

## Remove From Custom Scope

- `valid-newpayload`: Do not build a separate MVP custom scenario for baseline valid newPayload acceptance because stock Hive engine coverage already owns that path.
- `invalid-newpayload`: Do not allocate custom MVP driver scope to baseline invalid newPayload acceptance or rejection branches already covered by stock Hive suites.

## Custom Runtime Scope

- `fcu-no-build`: Keep a thin custom runtime scenario for the exact no-build null-semantics branch and response-shape assertions.
- `fcu-build-getpayload-newpayload`: Keep a custom scenario for the exact forkchoiceUpdated -> getPayload -> newPayload chain and client-local payloadId handling.
- `repeat-fcu-same-head`: Keep a custom runtime scenario for repeated same-head requests and stable response-category checks.
- `unknown-payloadid`: Keep a custom runtime scenario for unknown payloadId error shape and normalization.

## Deferred

- `jwt-auth-negative-variants`: Stock auth coverage exists in Hive, but these variants are outside the current Paris MVP scenario set.
- `engine_getPayloadBodies*`: Explicitly deferred by the current MVP plan.
- `engine_getBlobs*`: Explicitly deferred by the current MVP plan.
- `full multi-fork and multi-client expansion`: Planned only after the Paris geth/reth MVP stabilizes.

## Recommended T07 Scope

- `fcu-no-build`
- `fcu-build-getpayload-newpayload`
- `repeat-fcu-same-head`
- `unknown-payloadid`

## Evidence

### `rlp-bootstrap-smoke`

- rationale: Stock consume-rlp covers generic imported-chain bootstrap, but the repository-specific genesis plus chain assets, repeated-run determinism, and fixed observable head checks are still owned by the custom bootstrap script.
- documentation: https://eest.ethereum.org/main/running_tests/consume/simulators/
- local evidence: `/Users/ningyuhe/Documents/execution-apis/context/plans/t03-rlp-bootstrap-smoke/paris-rlp-bootstrap-smoke.log.json`

### `headfcu-bootstrap-smoke`

- rationale: Stock Hive engine coverage already exercises forkchoiceUpdated head establishment and related Eth RPC effects, but replaying the exact repository headfcu artifact and asserting the resulting B2 bootstrap state remains custom.
- local evidence: `/tmp/hive/simulators/ethereum/engine/README.md`
- local evidence: `/tmp/hive/simulators/ethereum/engine/suites/engine/forkchoice.go`
- local evidence: `/Users/ningyuhe/Documents/execution-apis/context/plans/t04-headfcu-bootstrap-smoke/paris-headfcu-bootstrap-smoke.log.json`

### `valid-newpayload`

- rationale: Generic valid newPayload acceptance and execution are already first-class stock engine-suite concerns.
- local evidence: `/tmp/hive/simulators/ethereum/engine/README.md`
- local evidence: `/tmp/hive/simulators/ethereum/engine/suites/engine/payload_execution.go`

### `invalid-newpayload`

- rationale: Negative newPayload handling is already deeply covered by stock invalid-payload and bad-hash suites.
- local evidence: `/tmp/hive/simulators/ethereum/engine/README.md`
- local evidence: `/tmp/hive/simulators/ethereum/engine/suites/engine/invalid_payload.go`
- local evidence: `/tmp/hive/simulators/ethereum/engine/suites/engine/bad_hash.go`

### `fcu-no-build`

- rationale: Stock suites cover forkchoiceUpdated error and syncing branches plus invalid payload attributes, but they do not clearly pin the exact markdown-derived no-build branch for payloadAttributes null and payloadId null using the repository artifact contract.
- local evidence: `/tmp/hive/simulators/ethereum/engine/suites/engine/forkchoice.go`
- local evidence: `/tmp/hive/simulators/ethereum/engine/suites/engine/payload_attributes.go`

### `fcu-build-getpayload-newpayload`

- rationale: Stock suites already exercise payload build and payload execution mechanics, but the exact differential sequence with per-client payloadId tracking and normalization remains MVP-specific custom work.
- local evidence: `/tmp/hive/simulators/ethereum/engine/suites/engine/payload_id.go`
- local evidence: `/tmp/hive/simulators/ethereum/engine/suites/engine/payload_execution.go`

### `repeat-fcu-same-head`

- rationale: Current stock materials do not expose a dedicated repeated same-head forkchoiceUpdated stability scenario for the MVP shape.
- local evidence: `/tmp/hive/simulators/ethereum/engine/README.md`
- local evidence: `/tmp/hive/simulators/ethereum/engine/suites/engine/forkchoice.go`

### `unknown-payloadid`

- rationale: The stock suite covers payload ID uniqueness but does not present a dedicated unknown payloadId error-branch scenario for the MVP comparison target.
- local evidence: `/tmp/hive/simulators/ethereum/engine/README.md`
- local evidence: `/tmp/hive/simulators/ethereum/engine/suites/engine/payload_id.go`

