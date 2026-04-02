# P2-T06 Build-Lifecycle And Unknown-Payload Scenarios

## Goal

Extend the accepted Paris build-lifecycle and provenance-aware unknown-payload
checks to the third client without weakening the phase-1 comparison discipline.

## Scope

This task covers:

- `fcu-build-getpayload-newpayload`
- `unknown-payloadid`

## Acceptance

`P2-T06` is complete only if:

- the build-lifecycle scenario passes on `geth`, `reth`, and `nethermind`
- `payloadId` remains client-local and is not used as a cross-client key
- the unknown-payload check uses a mutated real Paris V1 `payloadId`
- no new build-lifecycle comparison-discipline insight is required to keep the
  third client in the matrix

## Observed Result

The accepted run passed on `geth`, `reth`, and `nethermind`.

- `fcu-build-getpayload-newpayload`
  - all three clients satisfied `PARIS-METHOD-FCU-18`
  - all three clients satisfied `PARIS-METHOD-GP-01`
  - all three clients returned `newPayload` status `VALID`
  - `payloadId` stayed client-local:
    - `geth`: `0x01bc552740e46b75`
    - `reth`: `0x49fa2ea2945931b2`
    - `nethermind`: `0xafedec6251b9db97`
- `unknown-payloadid`
  - all three clients returned error code `-38001`
  - all three clients normalized to category `unknown_payload`
  - `nethermind` used lowercase message text `unknown payload`, which remained
    non-semantic and did not require a new insight
