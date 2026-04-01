# T12 FCU Build/GetPayload/NewPayload Report

## Summary

- fork: `Paris`
- clients: `geth`, `reth`
- bootstrap state: `B2`
- hard invariants: `2`

## Required Hard Invariants

- `PARIS-METHOD-FCU-18`
- `PARIS-METHOD-GP-01`

## Expected Response Categories

- `engine_forkchoiceUpdatedV1`: `VALID` with non-null `payloadId`
- `engine_getPayloadV1`: successful payload return for the client-local
  `payloadId`
- `engine_newPayloadV1`: `VALID` or `ACCEPTED`
