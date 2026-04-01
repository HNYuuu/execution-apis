# T05 Hive Engine Smoke Log Format

The real-runtime smoke run writes a single JSON log file at:

- [paris-hive-engine-smoke.log.json](/Users/ningyuhe/Documents/execution-apis/context/plans/t05-hive-reality-check/paris-hive-engine-smoke.log.json)

Required top-level fields:

- `taskId`
- `generatedAt`
- `status`
- `executionMode`
- `inputs`
- `summary`
- `validations`
- `notes`

Per-client validation details must include:

- `client`
- `summary.suites`
- `summary.tests`
- `summary.failed`
- `results_root`
- `log_files`

This smoke artifact is intentionally narrow. It proves that Hive, Docker,
client image build, simulator startup, JWT-authenticated Engine API access, and
one real Engine API request path all work for the targeted client pair.
