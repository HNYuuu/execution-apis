# Phase 4: Multi-Fork Core Expansion

## Status

`todo`

## Goal

Extend the established differential method beyond `Paris` for the core Engine
API surface, while preserving the phase-1 comparison discipline.

Recommended fork order:

1. `Shanghai`
2. `Cancun`
3. `Prague`
4. `Osaka`
5. `Amsterdam`

## Scope

- core Engine API behavior only:
  bootstrap,
  `forkchoiceUpdated*`,
  `newPayload*`,
  `getPayload*`
- start from the smallest client matrix that still gives useful cross-client
  signal, then widen only after the fork-local path is stable

## Acceptance Target

Phase 4 is accepted only if:

- each newly added fork has an explicit bootstrap contract, scenario library,
  normalization notes, determinism evidence, and offline diff artifacts
- fork-era fixture alignment is made explicit rather than assumed
- cross-fork expansion does not regress the accepted Paris comparison
  discipline
- any fork-specific discrepancy is attributable to a triaged cause rather than
  a missing harness contract
- an explicit phase-4 go/no-go review decides whether to expand the API family
  surface
