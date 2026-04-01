# T01 Paris MVP Oracle Gate Log Format

This document defines the structured log emitted by
`scripts/engine-mvp-oracle-gate.js`.

## File

- `context/plans/t01-mvp-oracle-gate/paris-mvp-oracle-gate.log.json`

## Top-Level Fields

- `taskId`
  Task identifier. Expected value: `T01`.
- `generatedAt`
  ISO-8601 timestamp for the log emission time.
- `status`
  `pass` or `fail`.
- `inputs`
  Source files used for the gate run.
- `validations`
  Boolean gate checks.
- `summary`
  Scenario count, approved hard invariant count, and deferred rule count.
- `scenarios`
  Per-scenario approved hard invariants and deferred rules.
- `missingRules`
  Referenced rules that were not found in `paris-atomic-rules.md`.
- `unknownHardInvariants`
  Hard invariants still classified as `unknown` or missing from provenance config.

## Scenario Entry Fields

- `scenarioId`
  Scenario identifier from the T01 test-case file.
- `notes`
  Short scenario-specific decision note.
- `approvedHardInvariants`
  Array of approved hard invariants. Each entry includes:
  - `ruleId`
  - `provenanceCategory`
  - `provenanceRationale`
  - `projection`
  - `testLayer`
  - `ruleText`
  - `source`
- `deferredRules`
  Array of deferred rules. Each entry includes:
  - `ruleId`
  - `deferReason`
  - `projection`
  - `testLayer`
  - `ruleText`
  - `source`

## Pass Criteria

- `missingRules` is empty
- `unknownHardInvariants` is empty
- `validations.allHardInvariantsHaveKnownProvenance` is `true`
- `validations.allReferencedRulesExist` is `true`
