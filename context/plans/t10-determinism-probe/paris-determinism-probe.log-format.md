# T10 Determinism Probe Log Format

## Files

- `paris-determinism-probe.log.json`
- `paris-determinism-probe.report.json`

## Log File

- `taskId`: fixed to `T10`
- `generatedAt`: ISO-8601 timestamp
- `status`: `pass` or `fail`
- `executionMode`: expected `mixed-existing-and-real-rerun`
- `inputs`: config path, test-case path, normalization profile path, and rerun
  count
- `summary`: profile id, clients, repeatable ids, blocked ids, and rerun
  directory
- `validations`: artifact checks, bootstrap determinism checks, runtime
  determinism checks, and MVP-blocked scenario checks

## Report File

- `taskId`: fixed to `T10`
- `generatedAt`: ISO-8601 timestamp
- `profile_id`
- `repeatable_ids`
- `blocked_ids`
- `rerun_count`
- `records`: stability summary per client and task or scenario id

## Runtime Reruns

- Each rerun emits one runtime-driver log in `runtime-reruns/`
- File pattern:
  - `paris-runtime-driver.rerun1.log.json`
  - `paris-runtime-driver.rerun2.log.json`
  - `paris-runtime-driver.rerun3.log.json`
