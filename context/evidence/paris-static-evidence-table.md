# Paris Static Evidence Table

## Purpose

This document is a review-oriented evidence table for the current `Paris`
static findings. It is intentionally limited to `markdown <-> OpenRPC YAML`
semantic inconsistencies across these repository artifacts:

- markdown spec under `src/engine/paris.md`
- OpenRPC method YAML under `src/engine/openrpc/methods/`
- OpenRPC schema YAML under `src/engine/openrpc/schemas/`

It does not make any claim about:

- generated docs under `docs-api/api/`
- runtime execution behavior
- stateful protocol semantics
- client implementation correctness

## Review Notes

- `paris.md` is treated as the primary normative source for `Paris`.
- `methods/*.yaml` and `schemas/*.yaml` are treated as machine-readable
  projections of that source.
- For nullable object fields, the current review convention accepts either:
  - explicit null support in schema, or
  - omission from `required`, treating field absence as equivalent to `null`
- `docs-api/*.mdx` is a downstream generated artifact and is intentionally
  excluded from this evidence table.
- A row is included only when the inconsistency can be observed from files in
  this repository without running any client.

## Current Result

Under the current review conventions, `Paris` has no confirmed
`markdown <-> OpenRPC YAML` static inconsistencies.

Current command:

```bash
npm run engine:static-check -- --fork paris
```

Current result:

- `0` findings
- `0` failing issue groups

## Scope Boundary

Rows intentionally excluded from this evidence table:

- any `docs-api/api/*.mdx` manifestation, because it is downstream of YAML
- internal YAML example-quality issues that do not contradict markdown
- markdown-only timeout metadata that is not intended to be projected into YAML
- markdown-only routine obligations that have no direct OpenRPC projection
- any claim requiring a live client to confirm behavior
- any claim that depends on state transitions across multiple calls

Those belong either to separate downstream documentation checks or to later
dynamic and differential testing phases.
