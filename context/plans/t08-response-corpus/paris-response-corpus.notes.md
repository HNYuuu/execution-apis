# T08 Response Corpus Notes

## Scope

- This corpus is intentionally built from the already completed real-runtime
  logs from `T03`, `T04`, and `T07`.
- The goal is not full scenario completion. The goal is to seed `T09`
  normalization with real observed response pairs.

## Included Samples

- `T03` `rlp-bootstrap-smoke`
- `T04` `headfcu-bootstrap-smoke`
- `T07` `fcu-no-build`
- `T07` `repeat-fcu-same-head`

## Deferred Inputs

- `fcu-build-getpayload-newpayload` remains deferred to `T12`
- `unknown-payloadid` remains deferred to `T13`

## Why This Is Enough For T09

- It already includes both bootstrap and runtime responses.
- It already includes one real representation-difference class:
  object field order in `eth_getBlockByNumber(latest, false)` block headers.
- It already fixes the first semantic field inventory around
  `payloadStatus.status`, `latestValidHash`, `payloadId`, `number`, and `hash`.
