# P2-T03 Nethermind Runtime Reality Check Log Format

The real-runtime smoke run writes a single JSON log at:

- [paris-nethermind-runtime-reality-check.log.json](/Users/ningyuhe/Documents/execution-apis/context/plans/phases/phase-2-paris-third-client/p2-t03-nethermind-runtime-reality-check/paris-nethermind-runtime-reality-check.log.json)

Required top-level fields:

- `task_id`
- `generated_at`
- `status`
- `execution_mode`
- `inputs`
- `summary`
- `validations`
- `runtime_contract_update`
- `copied_artifacts`
- `notes`

The log must prove four things:

- the local Hive clone still contains the Docker Desktop compatibility patch
- the `nethermind` wrapper image is available after the run
- the stock Hive `ethereum/engine` smoke suite passed for `nethermind`
- the same run exercised both `eth_*` and `engine_*` RPC methods

The task also copies stable raw evidence into this directory:

- `paris-nethermind-runtime-reality-check.hive-run.raw.log`
- `paris-nethermind-runtime-reality-check.simulator.raw.log`
- `paris-nethermind-runtime-reality-check.run.raw.json`
- `paris-nethermind-runtime-reality-check.hive.raw.json`
