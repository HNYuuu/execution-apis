# T03 RLP Bootstrap Smoke Notes

`T03` is started here as an offline-baseline MVP because the current workspace
does not contain runnable `geth`, `reth`, or Hive orchestration.

What this step does now:

- freezes the `rlp-bootstrap-smoke` scenario definition
- fixes the post-import expected head to `0x2d`
- fixes the expected latest block hash to
  `0xe27a3e81bd7cfe2aec2cc9e832c73a17c93e7efcf659cf4b39883b96c48708c2`
- records the exact two-request sequence later runtime execution must issue

What remains for full completion:

- start `geth` from `genesis + chain.rlp`
- start `reth` from `genesis + chain.rlp`
- execute the same request sequence against both clients
- replace the current `planned` client records with real observations and boot
  logs

Until `T05` and `T07` land, the `T03` artifacts are best understood as the
scenario contract and the observation baseline, not the final runtime proof.
