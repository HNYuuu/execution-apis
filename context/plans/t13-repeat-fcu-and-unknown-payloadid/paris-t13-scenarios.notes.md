# T13 Scenario Notes

## Adjustment

- The historical task title says `repeat-fcu-same-head`, but the approved hard
  invariant from `T01` is `PARIS-METHOD-FCU-03`, which is specifically the
  valid-ancestor shortcut branch.
- To keep the formal runtime scenario aligned with the oracle, this task
  repeats the same valid-ancestor request twice after bootstrapping to the
  canonical head.

## Unknown Payload Handling

- The invariant checks the error code branch from `PARIS-METHOD-GP-02`.
- The scenario no longer uses an arbitrary hard-coded `bytes8` value, because
  `geth` classifies some arbitrary values as `Unsupported fork` rather than the
  unknown-payload branch.
- Instead, the task first creates a real Paris V1 build process, captures the
  returned `payloadId`, mutates that value, and then calls
  `engine_getPayloadV1` with the mutated id.
- Raw error-message text is recorded, but classification is based on the
  normalized category `unknown_payload`.
