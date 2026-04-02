# P2-T05 Early Runtime Scenarios

## Goal

Extend the accepted early custom Paris runtime scenarios to `nethermind`
without changing the phase-1 comparison discipline.

## Scope

This task covers:

- `fcu-no-build`
- `repeat-fcu-same-head`

## Acceptance

`P2-T05` is complete only if:

- `nethermind` satisfies `PARIS-METHOD-FCU-17`, `PARIS-METHOD-FCU-22`, and
  `PARIS-METHOD-FCU-23` on `fcu-no-build`
- `nethermind` satisfies `PARIS-METHOD-FCU-03` on `repeat-fcu-same-head`
- no new early-runtime normalization or comparison-discipline insight is
  required to keep the third client in the matrix

## Observed Result

The accepted run passed for `geth`, `reth`, and `nethermind`.

- `fcu-no-build`
  - all three clients returned `VALID`
  - `latestValidHash` stayed at
    `0xe27a3e81bd7cfe2aec2cc9e832c73a17c93e7efcf659cf4b39883b96c48708c2`
  - `payloadId` remained `null`
- `repeat-fcu-same-head`
  - all three clients satisfied `PARIS-METHOD-FCU-03`
  - the repeated valid-ancestor shortcut stabilized on
    `0x71df9c95500c95f3abc30604fcfe3d431b210779f019e7018f0229646484be55`

No new early-runtime comparison-discipline insight was required for
`nethermind`.
