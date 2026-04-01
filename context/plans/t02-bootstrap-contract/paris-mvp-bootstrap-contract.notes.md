# T02 Bootstrap Contract Notes

`T02` freezes the reusable bootstrap contract before Hive wiring begins.

Scope of this MVP step:

- define bootstrap modes for `B0` through `B4`
- tie each mode to concrete local artifacts already present in `tests/`
- capture the minimum per-client notes needed by `geth` and `reth`
- enforce that `B3` and `B4` remain runtime-only states

Out of scope for `T02`:

- starting Hive
- launching `geth` or `reth`
- proving JWT wiring
- replaying `headfcu.json`

Those behaviors begin in `T03` through `T05`. `T02` only guarantees that later
steps share the same bootstrap vocabulary and artifact contract.
