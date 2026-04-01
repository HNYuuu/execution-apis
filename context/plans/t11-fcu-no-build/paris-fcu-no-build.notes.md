# T11 FCU No-Build Notes

## Adjustment From T07

- `T07` used `engine_forkchoiceUpdatedV3` as part of a thin runtime-driver
  prototype.
- `T11` formalizes the Paris scenario and therefore switches the scenario call
  itself to `engine_forkchoiceUpdatedV1`.
- The bootstrap still reuses `tests/headfcu.json` to establish `B2`, because
  that artifact is repository-owned and already validated by `T04`.

## Oracle Surface

- `PARIS-METHOD-FCU-17`
- `PARIS-METHOD-FCU-22`
- `PARIS-METHOD-FCU-23`

## Comparison Discipline

- `payloadId` is still recorded, but the scenario requires it to be `null`.
- Client-local execution metadata such as container name and raw log file path
  are excluded from comparison keys.
