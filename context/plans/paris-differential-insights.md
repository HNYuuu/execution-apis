# Paris Differential Insights

This note records implementation insights from the Paris `geth/reth` MVP that
should constrain later offline differential comparison. These are not all spec
rules. They are comparison-discipline points learned from real task execution.

## I01 Object Key Order Is Representation Noise

Observed in:

- [T08 response corpus notes](/Users/ningyuhe/Documents/execution-apis/context/plans/t08-response-corpus/paris-response-corpus.notes.md)
- [T09 normalization examples](/Users/ningyuhe/Documents/execution-apis/context/plans/t09-normalization-profile/paris-normalization-profile.examples.json)

Insight:

- `eth_getBlockByNumber(latest, false)` can produce raw JSON objects with
  different key orders across clients while preserving the same semantic block
  content.
- This difference should stay in the normalization layer as
  `object_field_order_only`, not in the differential discrepancy bucket.

## I02 Do Not Claim Null-Or-Omitted Equivalence Without Evidence

Observed in:

- [T09 normalization notes](/Users/ningyuhe/Documents/execution-apis/context/plans/t09-normalization-profile/paris-normalization-profile.notes.md)

Insight:

- `null_vs_omitted_when_explicitly_allowed` is still a deferred rule.
- Later diff runs must not silently normalize `null` and omitted fields unless
  the scenario explicitly permits that equivalence and the corpus contains real
  evidence for it.

## I03 Fork-Era Fixture Alignment Matters

Observed in:

- [T11 no-build notes](/Users/ningyuhe/Documents/execution-apis/context/plans/t11-fcu-no-build/paris-fcu-no-build.notes.md)
- [T12 build/getPayload/newPayload notes](/Users/ningyuhe/Documents/execution-apis/context/plans/t12-fcu-build-getpayload-newpayload/paris-fcu-build-getpayload-newpayload.notes.md)
- [task tracker T12 section](/Users/ningyuhe/Documents/execution-apis/context/plans/hive-first-mvp-task-tracker.md#L957)

Insight:

- Repository-owned bootstrap assets can be useful even when they were authored
  under later method versions, but formal Paris scenario calls must still use
  Paris methods.
- Repository-level `tests/*` fixtures are post-Shanghai for build-attribute
  behavior and can reject `engine_forkchoiceUpdatedV1` with
  `fcuV1 called post-shanghai`.
- Offline diff must not compare runs that mix fork-misaligned fixture eras
  under the same scenario identity.

## I04 Client-Local Runtime Values Must Not Become Cross-Client Keys

Observed in:

- [T11 no-build notes](/Users/ningyuhe/Documents/execution-apis/context/plans/t11-fcu-no-build/paris-fcu-no-build.notes.md)
- [T12 build/getPayload/newPayload notes](/Users/ningyuhe/Documents/execution-apis/context/plans/t12-fcu-build-getpayload-newpayload/paris-fcu-build-getpayload-newpayload.notes.md)

Insight:

- `payloadId` is client-local runtime state.
- Built payload identity derived from that runtime state should also be treated
  as client-local unless the comparison is explicitly about semantic payload
  content rather than identifier equality.
- Differential comparison must not use these values as cross-client equality
  keys.

## I05 `engine_newPayloadV1` Success Is A Category, Not One Fixed Status

Observed in:

- [T12 build/getPayload/newPayload notes](/Users/ningyuhe/Documents/execution-apis/context/plans/t12-fcu-build-getpayload-newpayload/paris-fcu-build-getpayload-newpayload.notes.md)
- [T12 build/getPayload/newPayload report](/Users/ningyuhe/Documents/execution-apis/context/plans/t12-fcu-build-getpayload-newpayload/paris-fcu-build-getpayload-newpayload.report.md)

Insight:

- For the current Paris runtime chain, successful `engine_newPayloadV1` should
  be treated as the category `{VALID, ACCEPTED}`.
- If the status is `VALID`, `latestValidHash` should equal `payload.blockHash`.
- If the status is `ACCEPTED`, `latestValidHash` should remain `null`.
- Future offline diff must compare this as a structured success-category rule,
  not as a naive one-status-only equality check.

## I06 `feeRecipient` Must Not Be Hard-Tied To `suggestedFeeRecipient`

Observed in:

- [T12 build/getPayload/newPayload notes](/Users/ningyuhe/Documents/execution-apis/context/plans/t12-fcu-build-getpayload-newpayload/paris-fcu-build-getpayload-newpayload.notes.md)

Insight:

- Paris payload building explicitly allows the built payload's `feeRecipient`
  to deviate from `suggestedFeeRecipient`.
- Cross-client diff should not flag this difference as a failure unless a later
  fork-specific rule narrows that freedom.

## I07 Unknown Payload Needs A Provenance-Aware Input Class

Observed in:

- [T13 scenario notes](/Users/ningyuhe/Documents/execution-apis/context/plans/t13-repeat-fcu-and-unknown-payloadid/paris-t13-scenarios.notes.md)

Insight:

- Do not collapse arbitrary `DATA(8)` inputs and mutated real Paris V1
  `payloadId` values into the same `unknown-payloadid` comparison bucket.
- Only the mutated real Paris V1 `payloadId` class is currently accepted as
  evidence for `PARIS-METHOD-GP-02`.
- Arbitrary `DATA(8)` values that trigger `Unsupported fork` or a similar
  branch should be tracked as a separate implementation-behavior observation.
