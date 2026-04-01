# T04 Headfcu Bootstrap Smoke Notes

`T04` extends the real-runtime bootstrap from `T03` by replaying
`tests/headfcu.json` over the authenticated Engine API.

What this step is meant to prove:

- both clients accept the replayed `engine_forkchoiceUpdatedV3` request
- the replay lands the client in a comparable `B2` forkchoice-known state
- the accepted response carries a successful `payloadStatus` branch
- the latest block hash remains aligned with the `headBlockHash` referenced in
  `tests/headfcu.json`

Implementation note:

- the same `docker create -> docker cp -> docker start` flow from `T03` is
  reused because the client startup scripts rewrite `/genesis.json`
- the Engine API request is sent to the mapped authrpc port with a JWT derived
  from the fixed secret written by the client startup scripts when
  `HIVE_TERMINAL_TOTAL_DIFFICULTY` is present

This step is still bootstrap-focused. It does not yet cover:

- custom runtime scenario sequencing
- per-client `payloadId` lifecycle
- `newPayload` differential behavior
