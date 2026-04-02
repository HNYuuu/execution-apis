# P2-T03 Nethermind Runtime Reality Check

## Goal

Prove that `nethermind` can be launched through the accepted Hive-first local
runtime path before phase-2 bootstrap and scenario work begins.

## Runtime Claim

`P2-T03` is considered complete only if the same real Hive run proves:

- the local Hive clone is usable on Docker Desktop
- the `nethermind` wrapper image is available locally
- HTTP RPC is reachable
- JWT-authenticated Engine RPC is reachable
- the stock `ethereum/engine` smoke suite passes

## Blocker Resolution

`P2-T02-B01` is cleared when `hive/clients/nethermind:latest` exists after the
runtime smoke run and the stock `engine-exchange-capabilities` suite succeeds.

## Observed Runtime Result

The accepted `P2-T03` run produced:

- Hive summary: `suites=1`, `tests=5`, `failed=0`
- observed client version: `1.37.0-unstable+a9532d5f`
- observed Hive source commit: `96bf24da632ad88cfdbfe4f676eb043671f474e1`

The copied simulator log shows both request classes in the same run:

- HTTP RPC evidence: `eth_getBlockByNumber`
- Engine RPC evidence:
  `engine_exchangeCapabilities`,
  `engine_forkchoiceUpdatedV1/V2/V3`,
  `engine_getPayloadV1/V2/V3`,
  `engine_newPayloadV1/V2/V3`

This is sufficient to mark the local Docker/Hive path as phase-2-ready and to
unblock `P2-T04`.
