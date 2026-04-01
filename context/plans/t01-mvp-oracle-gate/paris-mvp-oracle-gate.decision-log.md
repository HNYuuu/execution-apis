# T01 Paris MVP Oracle Gate Decision Log

## Scope

This decision log freezes the minimal `Paris` MVP oracle subset for `T01` and
records which rules are approved as `hard invariants` versus deferred.

Artifacts used:

- `scripts/engine-mvp-oracle-gate.js`
- `scripts/run-engine-mvp-oracle-gate.sh`
- `context/plans/t01-mvp-oracle-gate/paris-mvp-oracle-gate.config.json`
- `context/plans/t01-mvp-oracle-gate/paris-mvp-oracle-gate.test-case.json`
- `context/rules/paris-atomic-rules.md`

## Approved Hard Invariants

### `fcu-no-build`

- `PARIS-METHOD-FCU-17`
- `PARIS-METHOD-FCU-22`
- `PARIS-METHOD-FCU-23`

### `fcu-build-getpayload-newpayload`

- `PARIS-METHOD-FCU-18`
- `PARIS-METHOD-GP-01`

### `repeat-fcu-same-head`

- `PARIS-METHOD-FCU-03`

### `unknown-payloadid`

- `PARIS-METHOD-GP-02`

## Deferred Rules

### `fcu-no-build`

- `PARIS-METHOD-FCU-10`
- `PARIS-METHOD-FCU-13`

### `fcu-build-getpayload-newpayload`

- `PARIS-METHOD-FCU-12`
- `PARIS-ROUTINE-PV-06`

### `repeat-fcu-same-head`

- `PARIS-METHOD-FCU-02`

## Bootstrap Scenarios

- `rlp-bootstrap-smoke`
- `headfcu-bootstrap-smoke`

These remain bootstrap-only in `T01`. They do not yet promote Paris runtime
rules into `hard invariants`.

## Gate Result

- No approved hard invariant is classified as `unknown`.
- Deferred rules are explicitly separated from the MVP oracle subset.
- `T01` is satisfied for the minimal Paris MVP oracle gate.
