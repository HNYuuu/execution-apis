# T11 FCU No-Build Report

## Summary

- fork: `Paris`
- method under test: `engine_forkchoiceUpdatedV1`
- clients: `geth`, `reth`
- bootstrap state: `B2`
- hard invariants: `3`

## Required Hard Invariants

- `PARIS-METHOD-FCU-17`
- `PARIS-METHOD-FCU-22`
- `PARIS-METHOD-FCU-23`

## Expected Branch

- `payloadStatus.status = VALID`
- `payloadStatus.latestValidHash = headBlockHash`
- `payloadStatus.validationError = null`
- `payloadId = null`
