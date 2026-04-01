# T10 Determinism Probe Notes

## Approach

- Reuse the already completed repeated bootstrap logs from `T03` and `T04`.
- Add three fresh real reruns of the `T07` runtime driver.
- Compare within-client normalized snapshots using `NormalizationProfile v0`
  semantics, primarily stable object-key ordering.

## Why Mixed Input Is Acceptable

- `T03` and `T04` already recorded repeated real-runtime executions.
- Re-running them again would add cost without increasing signal.
- `T07` only had one committed baseline run, so determinism evidence is
  extended there with fresh reruns.

## Current Outcome Target

- `rlp-bootstrap-smoke`
- `headfcu-bootstrap-smoke`
- `runtime-driver-early-scenarios`
- `fcu-no-build`
- `repeat-fcu-same-head`

All five ids should remain repeatable before cross-client offline diffing
continues.
