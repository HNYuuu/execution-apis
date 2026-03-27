# Paris Atomic Rule Table

## Purpose

This document decomposes the `Paris` Engine API spec into atomic, testable
rules. It is the durable `Paris` rule inventory and the bridge from descriptive
spec reading to executable checks. Under the current review conventions,
`Paris` has no confirmed `markdown <-> OpenRPC YAML` static findings; see
`context/evidence/paris-static-evidence-table.md`.

Each rule is tagged with:

- `projection`
  - `projected`: represented adequately in OpenRPC
  - `md-only`: markdown-only semantic rule
  - `drift`: projected, but with semantic mismatch
- `test layer`
  - `schema-static`: static validation against schemas/OpenRPC/docs
  - `single-call`: request/response fixture or direct method check
  - `stateful`: sequence- or history-dependent behavior

## Structure Rules

### `ExecutionPayloadV1`

Section source:

- `src/engine/paris.md:45-58`
- `src/engine/openrpc/schemas/payload.yaml:51-113`

| id | src | rule | projection | test layer |
| --- | --- | --- | --- | --- |
| `PARIS-STRUCT-EPV1-01` | `paris.md:45` | `ExecutionPayloadV1.parentHash` must be `DATA`, 32 bytes. | projected | schema-static |
| `PARIS-STRUCT-EPV1-02` | `paris.md:46` | `ExecutionPayloadV1.feeRecipient` must be `DATA`, 20 bytes. | projected | schema-static |
| `PARIS-STRUCT-EPV1-03` | `paris.md:47` | `ExecutionPayloadV1.stateRoot` must be `DATA`, 32 bytes. | projected | schema-static |
| `PARIS-STRUCT-EPV1-04` | `paris.md:48` | `ExecutionPayloadV1.receiptsRoot` must be `DATA`, 32 bytes. | projected | schema-static |
| `PARIS-STRUCT-EPV1-05` | `paris.md:49` | `ExecutionPayloadV1.logsBloom` must be `DATA`, 256 bytes. | projected | schema-static |
| `PARIS-STRUCT-EPV1-06` | `paris.md:50` | `ExecutionPayloadV1.prevRandao` must be `DATA`, 32 bytes. | projected | schema-static |
| `PARIS-STRUCT-EPV1-07` | `paris.md:51` | `ExecutionPayloadV1.blockNumber` must be a 64-bit quantity. | projected | schema-static |
| `PARIS-STRUCT-EPV1-08` | `paris.md:52` | `ExecutionPayloadV1.gasLimit` must be a 64-bit quantity. | projected | schema-static |
| `PARIS-STRUCT-EPV1-09` | `paris.md:53` | `ExecutionPayloadV1.gasUsed` must be a 64-bit quantity. | projected | schema-static |
| `PARIS-STRUCT-EPV1-10` | `paris.md:54` | `ExecutionPayloadV1.timestamp` must be a 64-bit quantity. | projected | schema-static |
| `PARIS-STRUCT-EPV1-11` | `paris.md:55` | `ExecutionPayloadV1.extraData` must be `DATA` of length 0 to 32 bytes. | projected | schema-static |
| `PARIS-STRUCT-EPV1-12` | `paris.md:56` | `ExecutionPayloadV1.baseFeePerGas` must be a 256-bit quantity. | projected | schema-static |
| `PARIS-STRUCT-EPV1-13` | `paris.md:57` | `ExecutionPayloadV1.blockHash` must be `DATA`, 32 bytes. | projected | schema-static |
| `PARIS-STRUCT-EPV1-14` | `paris.md:58` | `ExecutionPayloadV1.transactions` must be an array of encoded transaction byte strings. | projected | schema-static, single-call |

### `ForkchoiceStateV1`

Section source:

- `src/engine/paris.md:64-68`
- `src/engine/openrpc/schemas/forkchoice.yaml:1-17`

| id | src | rule | projection | test layer |
| --- | --- | --- | --- | --- |
| `PARIS-STRUCT-FCSTATE-01` | `paris.md:64` | `ForkchoiceStateV1.headBlockHash` must be `DATA`, 32 bytes. | projected | schema-static |
| `PARIS-STRUCT-FCSTATE-02` | `paris.md:65` | `ForkchoiceStateV1.safeBlockHash` must be `DATA`, 32 bytes. | projected | schema-static |
| `PARIS-STRUCT-FCSTATE-03` | `paris.md:66` | `ForkchoiceStateV1.finalizedBlockHash` must be `DATA`, 32 bytes. | projected | schema-static |
| `PARIS-STRUCT-FCSTATE-04` | `paris.md:65` | `safeBlockHash` must equal or be an ancestor of `headBlockHash`. | md-only | stateful |
| `PARIS-STRUCT-FCSTATE-05` | `paris.md:68` | `safeBlockHash` and `finalizedBlockHash` may be zero hashes until transition block finalization. | md-only | stateful |

### `PayloadAttributesV1`

Section source:

- `src/engine/paris.md:74-76`
- `src/engine/openrpc/schemas/forkchoice.yaml:30-46`

| id | src | rule | projection | test layer |
| --- | --- | --- | --- | --- |
| `PARIS-STRUCT-PATTR-01` | `paris.md:74` | `PayloadAttributesV1.timestamp` must be a 64-bit quantity. | projected | schema-static |
| `PARIS-STRUCT-PATTR-02` | `paris.md:75` | `PayloadAttributesV1.prevRandao` must be `DATA`, 32 bytes. | projected | schema-static |
| `PARIS-STRUCT-PATTR-03` | `paris.md:76` | `PayloadAttributesV1.suggestedFeeRecipient` must be `DATA`, 20 bytes. | projected | schema-static |

### `PayloadStatusV1`

Section source:

- `src/engine/paris.md:82-84`
- `src/engine/openrpc/schemas/payload.yaml:1-21`

| id | src | rule | projection | test layer |
| --- | --- | --- | --- | --- |
| `PARIS-STRUCT-PSTATUS-01` | `paris.md:82` | `PayloadStatusV1.status` must be one of `VALID`, `INVALID`, `SYNCING`, `ACCEPTED`, `INVALID_BLOCK_HASH`. | projected | schema-static, single-call |
| `PARIS-STRUCT-PSTATUS-02` | `paris.md:83` | `PayloadStatusV1.latestValidHash` must accept `DATA` or explicit `null`. | projected | schema-static, single-call |
| `PARIS-STRUCT-PSTATUS-03` | `paris.md:84` | `PayloadStatusV1.validationError` must accept `String` or explicit `null`. | projected | schema-static, single-call |

### `TransitionConfigurationV1`

Section source:

- `src/engine/paris.md:89-91`
- `src/engine/openrpc/schemas/transition_configuration.yaml:1-17`

| id | src | rule | projection | test layer |
| --- | --- | --- | --- | --- |
| `PARIS-STRUCT-TCONF-01` | `paris.md:89` | `TransitionConfigurationV1.terminalTotalDifficulty` must be a 256-bit quantity. | projected | schema-static |
| `PARIS-STRUCT-TCONF-02` | `paris.md:90` | `TransitionConfigurationV1.terminalBlockHash` must be `DATA`, 32 bytes. | projected | schema-static |
| `PARIS-STRUCT-TCONF-03` | `paris.md:91` | `TransitionConfigurationV1.terminalBlockNumber` must be a 64-bit quantity. | projected | schema-static |

## Routine Rules

### `Payload validation`

Section source:

- `src/engine/paris.md:99-118`

| id | src | rule | projection | test layer |
| --- | --- | --- | --- | --- |
| `PARIS-ROUTINE-PV-01` | `paris.md:99` | Client may execute ancestors to obtain parent state during payload validation. | md-only | stateful |
| `PARIS-ROUTINE-PV-02` | `paris.md:99` | Every ancestor executed as part of parent-state acquisition must itself pass payload validation. | md-only | stateful |
| `PARIS-ROUTINE-PV-03` | `paris.md:101` | The most recent PoW ancestor must satisfy terminal block conditions from EIP-3675. | md-only | stateful |
| `PARIS-ROUTINE-PV-04` | `paris.md:101` | If terminal block validation fails, the response must be `{status: INVALID, latestValidHash: zeroHash}`. | md-only | single-call, stateful |
| `PARIS-ROUTINE-PV-05` | `paris.md:101` | Every descendant of an invalid terminal block must be deemed `INVALID`. | md-only | stateful |
| `PARIS-ROUTINE-PV-06` | `paris.md:103-104` | If payload validation succeeds, the response must be `{status: VALID, latestValidHash: payload.blockHash}`. | md-only | single-call |
| `PARIS-ROUTINE-PV-07` | `paris.md:105-111` | If payload validation fails, the response must be `{status: INVALID, latestValidHash: validHash}` with `validHash` following the specified nearest-valid-ancestor semantics. | md-only | stateful |
| `PARIS-ROUTINE-PV-08` | `paris.md:112` | Client software must not surface an `INVALID` payload over any API endpoint or p2p interface. | md-only | stateful |
| `PARIS-ROUTINE-PV-09` | `paris.md:114` | Payload validation must be idempotent with respect to `VALID | INVALID`. | md-only | stateful |
| `PARIS-ROUTINE-PV-10` | `paris.md:114` | Client may change observed status from `INVALID` to `SYNCING | ACCEPTED` only if subsequent validation still yields `INVALID`. | md-only | stateful |
| `PARIS-ROUTINE-PV-11` | `paris.md:116` | Client may provide `validationError` details for invalid payloads. | md-only | single-call |
| `PARIS-ROUTINE-PV-12` | `paris.md:118` | Canonical-chain payload validation must not be blocked by side-branch sync. | md-only | stateful |

### `Sync`

Section source:

- `src/engine/paris.md:122-127`

| id | src | rule | projection | test layer |
| --- | --- | --- | --- | --- |
| `PARIS-ROUTINE-SYNC-01` | `paris.md:124` | Sync may include pulling data from remote peers. | md-only | stateful |
| `PARIS-ROUTINE-SYNC-02` | `paris.md:125` | Sync may include validating ancestors and deriving parent state. | md-only | stateful |
| `PARIS-ROUTINE-SYNC-03` | `paris.md:127` | Exact sync behavior is implementation dependent. | md-only | manual-review |

### `Payload building`

Section source:

- `src/engine/paris.md:133-145`

| id | src | rule | projection | test layer |
| --- | --- | --- | --- | --- |
| `PARIS-ROUTINE-PBUILD-01` | `paris.md:133` | The build process must honor provided payload parameters except `suggestedFeeRecipient`, which may be overridden in the built payload. | md-only | stateful |
| `PARIS-ROUTINE-PBUILD-02` | `paris.md:135` | Client should build an initial payload with an empty transaction set. | md-only | stateful |
| `PARIS-ROUTINE-PBUILD-03` | `paris.md:137` | Client should start updating the payload after building the initial version. | md-only | stateful |
| `PARIS-ROUTINE-PBUILD-04` | `paris.md:139` | Payload updating should stop on `engine_getPayload` or after `SECONDS_PER_SLOT` from the target timestamp. | md-only | stateful |
| `PARIS-ROUTINE-PBUILD-05` | `paris.md:141-142` | New `PayloadAttributes` that do not match an existing build process must start a new uniquely identified build process. | md-only | stateful |
| `PARIS-ROUTINE-PBUILD-06` | `paris.md:144` | If matching `PayloadAttributes` already exist, the build process should not be restarted. | md-only | stateful |

## Method Rules

### `engine_newPayloadV1`

Section source:

- `src/engine/paris.md:164-187`
- `src/engine/openrpc/methods/payload.yaml:1-63`

| id | src | rule | projection | test layer |
| --- | --- | --- | --- | --- |
| `PARIS-METHOD-NP-01` | `paris.md:164` | Client must validate that every transaction has non-zero length. | md-only | single-call |
| `PARIS-METHOD-NP-02` | `paris.md:164` | Transaction non-zero-length validation must run even during active sync on any branch. | md-only | stateful |
| `PARIS-METHOD-NP-03` | `paris.md:166` | Client must validate `blockHash` against `Keccak256(RLP(ExecutionBlockHeader))` using the specified EIP-3675 and EIP-4399 header mapping. | md-only | single-call |
| `PARIS-METHOD-NP-04` | `paris.md:166` | `blockHash` validation must run even during active sync on any branch. | md-only | stateful |
| `PARIS-METHOD-NP-05` | `paris.md:168` | Client may initiate sync if requisite data for payload validation are missing. | md-only | stateful |
| `PARIS-METHOD-NP-06` | `paris.md:170` | If the payload extends the canonical chain and requisite data are available locally, the client must validate the payload. | md-only | stateful |
| `PARIS-METHOD-NP-07` | `paris.md:172` | If the payload does not belong to the canonical chain, the client may choose not to validate it. | md-only | stateful |
| `PARIS-METHOD-NP-08` | `paris.md:175` | Invalid or zero-length transactions must yield `{status: INVALID, latestValidHash: null, validationError: errorMessage | null}`. | projected | single-call |
| `PARIS-METHOD-NP-09` | `paris.md:176` | Invalid `blockHash` must yield `{status: INVALID_BLOCK_HASH, latestValidHash: null, validationError: errorMessage | null}`. | projected | single-call |
| `PARIS-METHOD-NP-10` | `paris.md:177` | Failed terminal block conditions must yield `{status: INVALID, latestValidHash: zeroHash, validationError: errorMessage | null}`. | projected | single-call, stateful |
| `PARIS-METHOD-NP-11` | `paris.md:178` | Missing requisite data for acceptance or validation must yield `{status: SYNCING, latestValidHash: null, validationError: null}`. | projected | single-call, stateful |
| `PARIS-METHOD-NP-12` | `paris.md:179` | Fully validated payloads must return the result of the `Payload validation` routine. | md-only | single-call, stateful |
| `PARIS-METHOD-NP-13` | `paris.md:180-185` | A payload that is well-formed, has valid transactions, has valid `blockHash`, has known well-formed ancestors, does not extend the canonical chain, and has not been fully validated must yield `{status: ACCEPTED, latestValidHash: null, validationError: null}`. | projected | stateful |
| `PARIS-METHOD-NP-14` | `paris.md:187` | Errors outside normal method processing must be surfaced as an error object. | md-only | single-call |

### `engine_forkchoiceUpdatedV1`

Section source:

- `src/engine/paris.md:211-242`
- `src/engine/openrpc/methods/forkchoice.yaml:1-44`
- `src/engine/openrpc/schemas/forkchoice.yaml:18-29`

| id | src | rule | projection | test layer |
| --- | --- | --- | --- | --- |
| `PARIS-METHOD-FCU-01` | `paris.md:211` | Client may initiate sync if `headBlockHash` is unknown or missing requisite validation data. | md-only | stateful |
| `PARIS-METHOD-FCU-02` | `paris.md:213` | If `headBlockHash` references a `VALID` ancestor of the canonical head, the client may skip the forkchoice update and must not start payload building. | md-only | stateful |
| `PARIS-METHOD-FCU-03` | `paris.md:213` | In the valid-ancestor shortcut case, the response must be `{payloadStatus: {status: VALID, latestValidHash: headBlockHash, validationError: null}, payloadId: null}`. | projected | single-call, stateful |
| `PARIS-METHOD-FCU-04` | `paris.md:215` | If `headBlockHash` references a PoW block, the client must validate terminal block conditions against EIP-3675. | md-only | stateful |
| `PARIS-METHOD-FCU-05` | `paris.md:215` | If terminal block validation fails for a PoW head, the client must not update forkchoice and must not begin payload building. | md-only | stateful |
| `PARIS-METHOD-FCU-06` | `paris.md:217` | Before updating forkchoice, the client must ensure validity of the payload referenced by `headBlockHash` and may validate it during the call. | md-only | stateful |
| `PARIS-METHOD-FCU-07` | `paris.md:217` | If payload validation fails, the client must not update forkchoice and must not begin payload building. | md-only | stateful |
| `PARIS-METHOD-FCU-08` | `paris.md:219-221` | If `headBlockHash` and `finalizedBlockHash` reference `VALID` payloads, the client must update forkchoice according to EIP-3675 and apply the update atomically. | md-only | stateful |
| `PARIS-METHOD-FCU-09` | `paris.md:223` | If `headBlockHash` is `VALID` but `safeBlockHash` or `finalizedBlockHash` is not on its chain, the method must return `-38002 Invalid forkchoice state`. | projected | single-call, stateful |
| `PARIS-METHOD-FCU-10` | `paris.md:225` | `payloadAttributes` must be processed only after successful forkchoice application and only when `headBlockHash` is `VALID`. | md-only | stateful |
| `PARIS-METHOD-FCU-11` | `paris.md:227` | `payloadAttributes.timestamp` must be greater than the timestamp of the block referenced by `headBlockHash`; otherwise return `-38003 Invalid payload attributes`. | projected | single-call, stateful |
| `PARIS-METHOD-FCU-12` | `paris.md:229` | Valid `payloadAttributes` must start a build process on top of `headBlockHash` and produce `buildProcessId`. | md-only | stateful |
| `PARIS-METHOD-FCU-13` | `paris.md:231` | If `payloadAttributes` validation fails, the forkchoice update must not be rolled back. | md-only | stateful |
| `PARIS-METHOD-FCU-14` | `paris.md:234` | Unknown head or missing requisite validation data must yield `{payloadStatus: {status: SYNCING, latestValidHash: null, validationError: null}, payloadId: null}`. | projected | single-call, stateful |
| `PARIS-METHOD-FCU-15` | `paris.md:235` | Invalid payloads must yield `{payloadStatus: {status: INVALID, latestValidHash: validHash, validationError: errorMessage | null}, payloadId: null}`. | projected | single-call, stateful |
| `PARIS-METHOD-FCU-16` | `paris.md:236` | Invalid terminal block or zero-hash invalidation branch must yield `{payloadStatus: {status: INVALID, latestValidHash: zeroHash, validationError: errorMessage | null}, payloadId: null}`. | projected | single-call, stateful |
| `PARIS-METHOD-FCU-17` | `paris.md:237` | A valid head without a started build process must yield `{payloadStatus: {status: VALID, latestValidHash: headBlockHash, validationError: null}, payloadId: null}`. | projected | single-call, stateful |
| `PARIS-METHOD-FCU-18` | `paris.md:238` | A valid head with a started build process must yield `{payloadStatus: {status: VALID, latestValidHash: headBlockHash, validationError: null}, payloadId: buildProcessId}`. | projected | single-call, stateful |
| `PARIS-METHOD-FCU-19` | `paris.md:239` | Invalid or inconsistent `forkchoiceState` must yield error `-38002`. | projected | single-call |
| `PARIS-METHOD-FCU-20` | `paris.md:240` | Invalid `payloadAttributes` after a successful forkchoice application must yield error `-38003`. | projected | single-call, stateful |
| `PARIS-METHOD-FCU-21` | `paris.md:242` | Errors outside normal method processing must be surfaced as an error object. | md-only | single-call |
| `PARIS-METHOD-FCU-22` | `paris.md:195-196` | The second positional parameter accepts explicit `null` as well as `PayloadAttributesV1`. | projected | schema-static, single-call |
| `PARIS-METHOD-FCU-23` | `paris.md:206` | `ForkchoiceUpdatedResponseV1.payloadId` accepts explicit `null`. | projected | schema-static, single-call |

### `engine_getPayloadV1`

Section source:

- `src/engine/paris.md:260-264`
- `src/engine/openrpc/methods/payload.yaml:277-315`

| id | src | rule | projection | test layer |
| --- | --- | --- | --- | --- |
| `PARIS-METHOD-GP-01` | `paris.md:260` | Given `payloadId`, the client must return the most recent payload version available in the corresponding build process at call time. | md-only | stateful |
| `PARIS-METHOD-GP-02` | `paris.md:262` | Unknown `payloadId` must yield error `-38001 Unknown payload`. | projected | single-call |
| `PARIS-METHOD-GP-03` | `paris.md:264` | Client may stop the corresponding build process after serving the call. | md-only | stateful |

### `engine_exchangeTransitionConfigurationV1`

Section source:

- `src/engine/paris.md:282-294`
- `src/engine/openrpc/methods/transition_configuration.yaml:1-25`

| id | src | rule | projection | test layer |
| --- | --- | --- | --- | --- |
| `PARIS-METHOD-ETC-01` | `paris.md:282` | Execution client must respond with configurable settings according to EIP-3675 client-software configuration. | md-only | single-call |
| `PARIS-METHOD-ETC-02` | `paris.md:284` | Execution client should surface an error to the user on local mismatch with received values, except `terminalBlockNumber`. | md-only | manual-review |
| `PARIS-METHOD-ETC-03` | `paris.md:286` | Consensus client should surface an error to the user on local mismatch with returned values. | md-only | manual-review |
| `PARIS-METHOD-ETC-04` | `paris.md:288` | Consensus client should poll this endpoint every 60 seconds. | md-only | stateful |
| `PARIS-METHOD-ETC-05` | `paris.md:290` | Execution client should surface an error if it receives no request on this endpoint for at least 120 seconds. | md-only | stateful |
| `PARIS-METHOD-ETC-06` | `paris.md:292` | In the absence of `TERMINAL_BLOCK_NUMBER`, the consensus client may use `0` for `terminalBlockNumber` in the request. | md-only | single-call |
| `PARIS-METHOD-ETC-07` | `paris.md:294` | In the absence of `TERMINAL_TOTAL_DIFFICULTY`, both clients must use `2**256-2**10` for `terminalTotalDifficulty`. | md-only | single-call |

## Summary

The `Paris` slice now has a structured atomic rule set spanning:

- structure rules
- routine rules
- method rules

## Current Automation

Initial automated coverage now exists in:

- `scripts/engine-static-check-data.js`
- `scripts/engine-static-check.js`
- `npm run engine:static-check`

This automation is intentionally limited to `artifact-level static
inconsistencies` between markdown and OpenRPC method/schema YAML. Generated
docs are treated as downstream artifacts and are not part of the primary
findings surface in the current phase. The checker does not classify runtime
behavior, state-machine semantics, or client implementation differences as
findings.

The checker is now data-driven by issue group and supports fork filtering, for example:

- `npm run engine:static-check -- --fork paris`

Current Paris regression coverage is configured for these issue groups:

- `PARIS-PSTATUS-PROJECTION`
- `PARIS-FCU-PARAM-PROJECTION`
- `PARIS-FCU-PAYLOADID-PROJECTION`

Current automated checks cover these rule IDs:

- `PARIS-STRUCT-PSTATUS-02`
- `PARIS-STRUCT-PSTATUS-03`
- `PARIS-METHOD-FCU-23`
- `PARIS-METHOD-FCU-22`

Current checker output for `npm run engine:static-check -- --fork paris` is:

- `0` findings
- `0` failing issue groups

The highest-value rule classes for early automation are:

1. previously drift-prone nullability and positional-parameter rules
2. named error branches
3. method-specific precondition checks
4. stateful routine obligations around payload validation and building
