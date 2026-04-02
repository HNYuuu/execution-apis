# P2-T09 Three-Client ResultEnvelope Diff Report

## Summary

- scenarios compared: `6`
- envelopes generated: `18`
- pairwise comparisons: `18`
- discrepancy ledger entries: `16`
- matrix bucket counts: `{"all agree":0,"agree after normalization":6,"diverge across clients":0,"violates hard invariant":0}`

## Matrix Buckets

- `rlp-bootstrap-smoke`: `agree after normalization`
- `headfcu-bootstrap-smoke`: `agree after normalization`
- `fcu-no-build`: `agree after normalization`
- `fcu-build-getpayload-newpayload`: `agree after normalization`
- `repeat-fcu-same-head`: `agree after normalization`
- `unknown-payloadid`: `agree after normalization`

## Pairwise Coverage

- `rlp-bootstrap-smoke` / `geth/reth`: `agree after normalization`
- `rlp-bootstrap-smoke` / `geth/nethermind`: `agree after normalization`
- `rlp-bootstrap-smoke` / `reth/nethermind`: `agree after normalization`
- `headfcu-bootstrap-smoke` / `geth/reth`: `agree after normalization`
- `headfcu-bootstrap-smoke` / `geth/nethermind`: `agree after normalization`
- `headfcu-bootstrap-smoke` / `reth/nethermind`: `agree after normalization`
- `fcu-no-build` / `geth/reth`: `all agree`
- `fcu-no-build` / `geth/nethermind`: `agree after normalization`
- `fcu-no-build` / `reth/nethermind`: `agree after normalization`
- `fcu-build-getpayload-newpayload` / `geth/reth`: `agree after normalization`
- `fcu-build-getpayload-newpayload` / `geth/nethermind`: `agree after normalization`
- `fcu-build-getpayload-newpayload` / `reth/nethermind`: `agree after normalization`
- `repeat-fcu-same-head` / `geth/reth`: `all agree`
- `repeat-fcu-same-head` / `geth/nethermind`: `agree after normalization`
- `repeat-fcu-same-head` / `reth/nethermind`: `agree after normalization`
- `unknown-payloadid` / `geth/reth`: `agree after normalization`
- `unknown-payloadid` / `geth/nethermind`: `agree after normalization`
- `unknown-payloadid` / `reth/nethermind`: `agree after normalization`

## Triage

- `rlp-bootstrap-smoke` / `geth/reth`: `inherited-baseline`, `normalization issue`, bucket `agree after normalization`
- `rlp-bootstrap-smoke` / `geth/nethermind`: `new-in-phase-2`, `normalization issue`, bucket `agree after normalization`
- `rlp-bootstrap-smoke` / `reth/nethermind`: `new-in-phase-2`, `normalization issue`, bucket `agree after normalization`
- `headfcu-bootstrap-smoke` / `geth/reth`: `inherited-baseline`, `normalization issue`, bucket `agree after normalization`
- `headfcu-bootstrap-smoke` / `geth/nethermind`: `new-in-phase-2`, `normalization issue`, bucket `agree after normalization`
- `headfcu-bootstrap-smoke` / `reth/nethermind`: `new-in-phase-2`, `normalization issue`, bucket `agree after normalization`
- `fcu-no-build` / `geth/nethermind`: `new-in-phase-2`, `normalization issue`, bucket `agree after normalization`
- `fcu-no-build` / `reth/nethermind`: `new-in-phase-2`, `normalization issue`, bucket `agree after normalization`
- `fcu-build-getpayload-newpayload` / `geth/reth`: `inherited-baseline`, `normalization issue`, bucket `agree after normalization`
- `fcu-build-getpayload-newpayload` / `geth/nethermind`: `new-in-phase-2`, `normalization issue`, bucket `agree after normalization`
- `fcu-build-getpayload-newpayload` / `reth/nethermind`: `new-in-phase-2`, `normalization issue`, bucket `agree after normalization`
- `repeat-fcu-same-head` / `geth/nethermind`: `new-in-phase-2`, `normalization issue`, bucket `agree after normalization`
- `repeat-fcu-same-head` / `reth/nethermind`: `new-in-phase-2`, `normalization issue`, bucket `agree after normalization`
- `unknown-payloadid` / `geth/reth`: `inherited-baseline`, `normalization issue`, bucket `agree after normalization`
- `unknown-payloadid` / `geth/nethermind`: `new-in-phase-2`, `normalization issue`, bucket `agree after normalization`
- `unknown-payloadid` / `reth/nethermind`: `new-in-phase-2`, `normalization issue`, bucket `agree after normalization`

