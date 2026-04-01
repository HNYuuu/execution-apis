# Phase 3: Paris Full Client Matrix

## Status

`todo`

## Goal

Turn the accepted Paris design into a broader primary-client baseline by
covering the major EL clients on the same disciplined differential workflow.

Recommended expansion order inside this phase:

1. `besu`
2. `erigon`

## Scope

- fork remains `Paris`
- extend from the phase-2 matrix to the main EL client set
- fold stock-owned `valid-newpayload` and `invalid-newpayload` paths into the
  local `ResultEnvelope` pipeline so the local offline diff has a more complete
  Paris baseline

## Acceptance Target

Phase 3 is accepted only if:

- the target Paris client matrix produces complete envelopes for the agreed
  scenario set
- stock-owned `newPayload` acceptance and rejection paths are represented in
  the local envelope workflow
- comparison-discipline insights are updated where new client behavior exposes
  new non-semantic differences
- any remaining discrepancies are reproducible and triaged rather than hidden
  by normalization
- an explicit phase-3 go/no-go review confirms that fork expansion is safer
  than widening the Paris surface further
