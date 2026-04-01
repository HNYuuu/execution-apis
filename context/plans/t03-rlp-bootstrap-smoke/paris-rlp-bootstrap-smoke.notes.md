# T03 RLP Bootstrap Smoke Notes

`T03` is now executed as a real-runtime bootstrap check using the Hive-built
client images proved in `T05`.

What this step proves:

- `geth` can import `genesis + chain.rlp` and expose RPC on the expected head
- `reth` can import `genesis + chain.rlp` and expose RPC on the expected head
- `eth_blockNumber` and `eth_getBlockByNumber(latest, false)` agree on:
  - head number `0x2d`
  - head hash `0xe27a3e81bd7cfe2aec2cc9e832c73a17c93e7efcf659cf4b39883b96c48708c2`
- two repeated runs per client produce the same observation

Implementation note:

- the client startup scripts move `/genesis.json`, so bind-mounting directly to
  `/genesis.json` is not viable
- the working runtime path is:
  `docker create -> docker cp genesis/chain -> docker start -> RPC query -> docker rm -f`

What this step does not prove:

- authenticated Engine API behavior
- `headfcu.json` replay
- generic scenario-driver logic inside Hive

Those remain in later tasks.
