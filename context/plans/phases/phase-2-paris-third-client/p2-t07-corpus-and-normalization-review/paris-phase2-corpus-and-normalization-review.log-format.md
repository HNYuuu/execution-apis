# P2-T07 Corpus And Normalization Review Log Format

The phase-2 normalization review writes a single JSON log at:

- [paris-phase2-corpus-and-normalization-review.log.json](/Users/ningyuhe/Documents/execution-apis/context/plans/phases/phase-2-paris-third-client/p2-t07-corpus-and-normalization-review/paris-phase2-corpus-and-normalization-review.log.json)

Required top-level fields:

- `taskId`
- `generatedAt`
- `status`
- `executionMode`
- `inputs`
- `summary`
- `validations`

Companion artifacts in the same directory:

- `paris-phase2-response-corpus.samples.json`
- `paris-phase2-discrepancy-ledger.json`
- `paris-phase2-corpus-and-normalization-review.report.md`
- `paris-phase2-normalization-decision-log.md`
- `paris-phase2-insight-note.md`

The review must prove:

- the three-client corpus covers the accepted phase-2 runtime surface
- existing active rules remain unchanged
- any candidate deferred-rule activation is recorded in the discrepancy ledger
  and not auto-activated
