# P2-T04 Bootstrap Validation

## Goal

Extend the accepted phase-1 bootstrap checks to `nethermind` and prove that
the three-client matrix reaches the same observable `B1` and `B2` pre-states.

## Scope

This task validates two bootstrap states:

- `B1`: `rlp-bootstrap-smoke`
- `B2`: `headfcu-bootstrap-smoke`

Both are executed as real Docker runtime runs against:

- `geth`
- `reth`
- `nethermind`

## Acceptance

`P2-T04` is complete only if:

- both bootstrap scenarios pass for all three clients
- repeated runs are stable within each client
- cross-client observations agree for each bootstrap state
- all compared runs for the same bootstrap state carry the same
  `bootstrap_digest`

## Observed Result

The accepted run passed both bootstrap states across `geth`, `reth`, and
`nethermind`.

- `B1` `rlp-bootstrap-smoke`
  - head number: `0x2d`
  - head hash: `0xe27a3e81bd7cfe2aec2cc9e832c73a17c93e7efcf659cf4b39883b96c48708c2`
  - bootstrap digest:
    `95a4cab87a4b8ecb72f51dbcaabb894029f22c9c27df4c59494e3f86f631fd3e`
- `B2` `headfcu-bootstrap-smoke`
  - payload status: `VALID`
  - head number: `0x2d`
  - head hash: `0xe27a3e81bd7cfe2aec2cc9e832c73a17c93e7efcf659cf4b39883b96c48708c2`
  - bootstrap digest:
    `ef592ea141df7f49503b1fb1b276e8668df2186d41c364040e500b40e25ca944`

No new cross-client bootstrap discrepancy was exposed in this task.
