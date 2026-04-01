# T12 FCU Build/GetPayload/NewPayload Notes

## Scope

- This task formalizes the three-call Paris runtime chain:
  `engine_forkchoiceUpdatedV1` with valid build attributes,
  `engine_getPayloadV1`, and `engine_newPayloadV1`.
- `payloadId` is treated as client-local runtime state and is never used as a
  cross-client comparison key.
- This task uses task-local Paris-era fixtures generated via `hivechain` with
  `lastfork=merge`, because the repository-level `tests/*` assets are
  post-Shanghai and reject `fcuV1` build attributes.

## Hard Invariants

- `PARIS-METHOD-FCU-18`
- `PARIS-METHOD-GP-01`

## NewPayload Handling

- `newPayloadV1` status is validated as a success-category response.
- Allowed statuses are currently `VALID` or `ACCEPTED`.
- If the status is `VALID`, `latestValidHash` must equal `payload.blockHash`.
- If the status is `ACCEPTED`, `latestValidHash` must remain `null`.

## Non-Assertions

- `feeRecipient` is not hard-asserted to equal `suggestedFeeRecipient`, because
  the Paris payload-building section explicitly allows deviation there.
