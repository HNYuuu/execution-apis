# T05 Hive Integration Memo

## What Was Proved

- Docker Desktop is reachable through
  `unix:///Users/ningyuhe/.docker/run/docker.sock`
- the official Hive source can be cloned locally to `/tmp/hive`
- `Hive` can be built locally with:
  `CGO_ENABLED=0 go build .`
- the `ethereum/engine` simulator can run real tests against:
  - `go-ethereum`
  - `reth`
- a minimal authenticated Engine API path was exercised through the
  `engine-exchange-capabilities` suite

## Client Startup Path

### `go-ethereum`

Observed from:
- `/tmp/hive/clients/go-ethereum/geth.sh`

Key points:
- initializes from `/genesis.json`
- imports `/chain.rlp` if present
- creates `/jwtsecret` when merge settings are present
- exposes HTTP on `8545`
- exposes authenticated Engine RPC on `8551`

### `reth`

Observed from:
- `/tmp/hive/clients/reth/reth.sh`

Key points:
- initializes from `/genesis.json`
- imports `/chain.rlp` if present
- creates `/jwt.secret` when merge settings are present
- exposes HTTP on `8545`
- exposes authenticated Engine RPC through `--authrpc.jwtsecret=/jwt.secret`

## Docker Desktop Compatibility Note

The upstream Hive clone in `/tmp/hive` needed a local compatibility patch in
`internal/libdocker/container.go`.

Repository artifact:
- [hive-docker-desktop-compat.patch](/Users/ningyuhe/Documents/execution-apis/context/plans/t05-hive-reality-check/hive-docker-desktop-compat.patch)

Reason:
- Docker Desktop reported the client container IP in
  `NetworkSettings.Networks.<name>.IPAddress`
- the older `NetworkSettings.IPAddress` field was empty
- without the patch, simulator containers received `HIVE_SIMULATOR=http://:8081`
  and failed to contact `hiveproxy`

## Proven Request Path

Minimal proven path for both clients:

- Hive launches client container
- Hive launches `ethereum/engine` simulator
- simulator executes `engine_exchangeCapabilities`
- suite `engine-exchange-capabilities` completes with:
  `1 suite`, `5 tests`, `0 failed`

## Remaining Gap Before `T03`/`T04` Completion

- this memo proves Engine API connectivity and client startup
- it does not yet prove our custom `rlp-bootstrap-smoke` and
  `headfcu-bootstrap-smoke` scenarios end to end
- those scenario-specific runs remain the next runtime target
