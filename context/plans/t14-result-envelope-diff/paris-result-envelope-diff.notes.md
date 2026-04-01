# T14 ResultEnvelope Diff Notes

## Scope

- This task serializes the final Paris MVP scenarios into offline-comparable
  `ResultEnvelope` artifacts.
- It intentionally excludes `T07` prototype output from final envelope
  generation because `T11` and `T13` supersede the prototype with formal Paris
  runtime scenarios.

## Comparison Discipline

- `T03` and `T04` are allowed to land in `agree after normalization` because
  latest-header key-order differences are representation noise.
- `T12` uses a scenario-specific normalized projection. It does not compare
  client-local runtime identifiers such as `payloadId`, and it does not use the
  built payload `blockHash` as a cross-client equality key.
- `T13` keeps the `mutated real Paris V1 payloadId` input class distinct from
  arbitrary `DATA(8)` values.

## Output Model

- `ResultEnvelope` stores raw responses and normalized responses together.
- Final cross-client buckets are assigned only by the offline diff stage in
  this task.
