# P2-T01 Phase-2 Scope Memo

## Decision

Phase-2 is frozen to the accepted Paris phase-1 surface.

- fork remains `Paris`
- first new client remains `nethermind`
- no new scenario enters phase-2 before `nethermind` runs the full accepted
  phase-1 scenario set

## Reused Scenario Surface

- `rlp-bootstrap-smoke`
- `headfcu-bootstrap-smoke`
- `fcu-no-build`
- `fcu-build-getpayload-newpayload`
- `repeat-fcu-same-head`
- `unknown-payloadid`

## Comparison Discipline Carried Forward

- representation-only object key order remains normalization-only noise
- `null` vs omitted stays deferred until phase-2 has real evidence
- Paris scenarios must keep Paris-era fixture alignment
- client-local runtime identifiers must not become cross-client equality keys
- `engine_newPayloadV1` success stays a structured category, not a single fixed
  status
- `feeRecipient` must not be hard-tied to `suggestedFeeRecipient`
- `unknown-payloadid` keeps the mutated-real-Paris-`payloadId` input class

## Phase-2 Open Questions

- choose the pinned `nethermind` image tag or build path
- identify any `nethermind`-specific bootstrap or startup contract
- determine whether `nethermind` introduces new representation-only outputs
  that need conservative normalization review
