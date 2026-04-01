# T09 Normalization Profile Report

## Summary

- profile: `paris-v0`
- active rules: `2`
- deferred rules: `2`
- normalization examples: `4`

## Active Rules

- `stable_object_key_order`
  Accepts object-field-order differences where stable-key normalization makes
  the values equal.
- `canonical_hex_quantity`
  Keeps quantity fields as comparison targets while comparing them in canonical
  JSON form.

## Deferred Rules

- `null_vs_omitted_when_explicitly_allowed`
- `non_semantic_error_text`

## Non-Normalizable Fields

- `result.payloadStatus.status`
- `result.payloadStatus.latestValidHash`
- `result.payloadId`
- `error.code`
- `error.message`
- `number`
- `hash`
- `parentHash`
- `transactions`
- `withdrawals`

## Example Seeds

- `t03-latest-header`
- `t04-latest-header`
- `t04-headfcu-response`
- `t07-fcu-no-build`
