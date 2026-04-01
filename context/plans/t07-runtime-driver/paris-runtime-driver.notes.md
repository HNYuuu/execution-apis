# T07 Runtime Driver Notes

## Scope

- This task no longer tries to build a full Hive simulator.
- The driver reuses the thin Docker-backed bootstrap path already validated in
  `T03`, `T04`, and `T05`.
- Hive responsibility remains limited to providing the client images and prior
  integration evidence.

## MVP Surface

- included now:
  - `fcu-no-build`
  - `repeat-fcu-same-head`
- intentionally excluded until later tasks:
  - `fcu-build-getpayload-newpayload`
  - `unknown-payloadid`
  - stock-only `valid-newpayload`
  - stock-only `invalid-newpayload`

## Why This Split

- `fcu-no-build` and `repeat-fcu-same-head` exercise the driver loop without
  introducing payload build lifecycle state.
- `payloadId`-dependent scenarios need a separate response-corpus and
  normalization pass, which is already modeled by `T08` through `T13`.
