# T10 Determinism Probe Report

## Summary

- fork: `Paris`
- clients: `geth`, `reth`
- bootstrap evidence source: `T03`, `T04`
- runtime reruns added: `3`
- target repeatable ids: `5`

## Repeatable IDs

- `rlp-bootstrap-smoke`
- `headfcu-bootstrap-smoke`
- `runtime-driver-early-scenarios`
- `fcu-no-build`
- `repeat-fcu-same-head`

## Blocked IDs

- none at the current early-scenario surface

## Scope Limit

- This probe does not yet cover `fcu-build-getpayload-newpayload`
- This probe does not yet cover `unknown-payloadid`
