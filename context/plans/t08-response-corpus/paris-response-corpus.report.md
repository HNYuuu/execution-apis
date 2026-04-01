# T08 Response Corpus Report

## Summary

- source tasks: `T03`, `T04`, `T07`
- categories: `bootstrap`, `runtime`
- sampled pairs: `7`
- observed normalization-seed category: `object_field_order_only`

## Observed Legal Representation Differences

- `object-field-order`
  The `latest` block header responses from `geth` and `reth` are semantically
  equal but appear in different raw JSON field orders.
- `wrapper-metadata-variance`
  Container names and raw log paths vary per run and are not comparison
  targets.

## Semantic Fields To Preserve

- `result.payloadStatus.status`
- `result.payloadStatus.latestValidHash`
- `result.payloadId`
- `number`
- `hash`
- `parentHash`
- `transactions`
- `withdrawals`

## Deferred

- `fcu-build-getpayload-newpayload`
- `unknown-payloadid`
