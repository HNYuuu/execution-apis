# P2-T02 Nethermind Startup Contract

## Acquisition Decision

Phase-2 should treat `nethermind` as a Hive-built wrapper client.

- source directory: `/tmp/hive/clients/nethermind`
- target wrapper image: `hive/clients/nethermind:latest`
- base image: `nethermindeth/nethermind:master`
- recommended phase-2 invocation: `./hive --sim ethereum/engine --client nethermind`

## Runtime Contract

- entrypoint: `/nethermind.sh`
- generated chainspec: `/chainspec/test.json`
- generated runtime config: `/configs/test.json`
- HTTP RPC: `8545`
- WebSocket RPC: `8546`
- unauthenticated extra RPC URL: `8550`
- JWT-authenticated Engine/API URL: `8551`
- JWT secret path: `/jwt.secret`
- bootnode file: `/nethermind/static-nodes.json`

## Parity Notes Against Phase-1 Clients

- `geth` and `reth` import `/chain.rlp` directly in their shell startup scripts
- `nethermind` delegates chain import and block directory handling through the
  generated config's `Hive` section
- `geth` uses `/jwtsecret`, while `reth` and `nethermind` use `/jwt.secret`
- `geth` and `reth` expose authrpc through command-line flags, while
  `nethermind` exposes it through generated config

## Explicit Blocker For P2-T03

- local `hive/clients/nethermind:latest` is not built yet
- observed command result:
  `docker image inspect hive/clients/nethermind:latest`
  -> `No such image`

This does not block `P2-T02`, but it is the first concrete blocker that
`P2-T03` must clear.
