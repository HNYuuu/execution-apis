# T05 Hive Reality Check Notes

This task is the runtime gate for the Hive-first MVP.

Why it was moved forward:

- offline assumptions about `geth`, `reth`, Docker, and Hive would otherwise
  accumulate into later tasks
- `T03` and `T04` need a real runtime before they can be treated as completed
- JWT wiring and artifact injection depend on actual daemon and client startup
  behavior, not just on document assumptions

Minimum success bar:

- Docker CLI is present
- Docker daemon is reachable
- a path exists to install or invoke Hive

Current measured state on this machine:

- `docker` CLI exists
- `brew` exists
- Docker Desktop app exists at `/Applications/Docker.app`
- Docker Desktop uses endpoint
  `unix:///Users/ningyuhe/.docker/run/docker.sock`
- official Hive source was cloned to `/tmp/hive`
- `CGO_ENABLED=0 go build .` succeeded in `/tmp/hive`
- a minimal Hive `ethereum/engine` run reached Docker image build, but the
  daemon was not stable enough to complete the first real run
- after Docker was stabilized and Hive was patched for Docker Desktop IP
  discovery, minimal real `go-ethereum` and `reth` runs succeeded

If the daemon is down or Hive is missing, the task should emit a `blocked` log
instead of pretending that runtime execution is available.
