# T13 Scenario Report

## Summary

- fork: `Paris`
- clients: `geth`, `reth`
- repeat scenario mode: `valid_ancestor_shortcut_repeated`
- unknown payload id mode: `mutate_known_v1_payload_id`

## Hard Invariants

- `PARIS-METHOD-FCU-03`
- `PARIS-METHOD-GP-02`

## Expected Categories

- repeated ancestor FCU: `VALID` with `payloadId = null`
- unknown payload id: error code `-38001`
