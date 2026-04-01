#!/usr/bin/env node

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      continue;
    }
    args[token.slice(2)] = argv[i + 1];
    i += 1;
  }
  return args;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function ensureArray(value, label) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${label} must be a non-empty array`);
  }
}

function ensureFile(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${label} is missing: ${filePath}`);
  }
}

function runCommand(command, args) {
  try {
    const stdout = execFileSync(command, args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return {
      ok: true,
      command,
      args,
      stdout: stdout.trim(),
      stderr: "",
    };
  } catch (error) {
    return {
      ok: false,
      command,
      args,
      stdout: (error.stdout || "").toString().trim(),
      stderr: (error.stderr || "").toString().trim(),
      code: error.status ?? null,
      message: error.message,
    };
  }
}

function which(binary) {
  const probe = runCommand("which", [binary]);
  return {
    binary,
    available: probe.ok,
    path: probe.ok ? probe.stdout : null,
    probe,
  };
}

function classifyDockerState(dockerBinary, dockerInfoResult) {
  if (!dockerBinary.available) {
    return {
      status: "blocked",
      reason: "docker-cli-missing",
    };
  }
  if (dockerInfoResult.ok) {
    let parsed = null;
    try {
      parsed = JSON.parse(dockerInfoResult.stdout || "{}");
    } catch (error) {
      parsed = null;
    }
    const serverErrors = Array.isArray(parsed && parsed.ServerErrors)
      ? parsed.ServerErrors
      : [];
    const combinedServerErrors = serverErrors.join("\n").toLowerCase();
    if (serverErrors.length > 0) {
      if (combinedServerErrors.includes("cannot connect to the docker daemon")) {
        return {
          status: "blocked",
          reason: "docker-daemon-not-running",
        };
      }
      if (combinedServerErrors.includes("permission denied")) {
        return {
          status: "blocked",
          reason: "docker-daemon-permission-denied",
        };
      }
      return {
        status: "blocked",
        reason: "docker-daemon-unavailable",
      };
    }
    return {
      status: "ready",
      reason: "docker-daemon-responding",
    };
  }
  const combined = `${dockerInfoResult.stderr}\n${dockerInfoResult.message}`.toLowerCase();
  if (combined.includes("cannot connect to the docker daemon")) {
    return {
      status: "blocked",
      reason: "docker-daemon-not-running",
    };
  }
  if (combined.includes("permission denied")) {
    return {
      status: "blocked",
      reason: "docker-daemon-permission-denied",
    };
  }
  return {
    status: "blocked",
    reason: "docker-daemon-unavailable",
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const configPath = args.config;
  const testCasePath = args["test-case"];
  const outputPath = args.output;

  if (!configPath || !testCasePath || !outputPath) {
    throw new Error("usage: --config <file> --test-case <file> --output <file>");
  }

  const config = readJson(configPath);
  const testCase = readJson(testCasePath);

  if (config.task_id !== "T05") {
    throw new Error("config.task_id must be T05");
  }
  if (testCase.task_id !== "T05") {
    throw new Error("testCase.task_id must be T05");
  }

  ensureArray(config.required_artifacts, "config.required_artifacts");
  ensureArray(config.required_tools, "config.required_tools");
  ensureArray(testCase.required_tools, "testCase.required_tools");
  ensureArray(testCase.acceptable_runtime_states, "testCase.acceptable_runtime_states");

  for (const artifactPath of config.required_artifacts) {
    ensureFile(artifactPath, "required artifact");
  }

  const toolChecks = {};
  for (const binary of testCase.required_tools) {
    toolChecks[binary] = which(binary);
  }

  const dockerInfoResult = toolChecks.docker.available
    ? runCommand("docker", ["info", "--format", "{{json .}}"])
    : {
        ok: false,
        stdout: "",
        stderr: "docker is not installed",
        message: "docker binary missing",
      };
  const dockerVersionResult = toolChecks.docker.available
    ? runCommand("docker", ["--version"])
    : {
        ok: false,
        stdout: "",
        stderr: "docker is not installed",
        message: "docker binary missing",
      };
  const dockerState = classifyDockerState(toolChecks.docker, dockerInfoResult);

  const dockerAppCandidates = [
    "/Applications/Docker.app",
    path.join(os.homedir(), "Applications", "Docker.app"),
  ];
  const dockerDesktopApp = dockerAppCandidates.find((candidate) => fs.existsSync(candidate)) || null;
  const realityState = {
    status: dockerState.status,
    reason: dockerState.reason,
    hive_binary_available: toolChecks.hive.available,
    brew_available: toolChecks.brew.available,
    docker_desktop_app_found: Boolean(dockerDesktopApp),
  };

  if (!testCase.acceptable_runtime_states.includes(realityState.status)) {
    throw new Error(`runtime state ${realityState.status} is not allowed by the test case`);
  }

  const nextActions = [];
  if (dockerState.reason === "docker-daemon-not-running") {
    nextActions.push("Start Docker Desktop or another local Docker daemon.");
  }
  if (dockerState.reason === "docker-daemon-permission-denied") {
    nextActions.push("Re-run the probe with Docker socket access or outside the sandbox.");
  }
  if (!toolChecks.hive.available) {
    nextActions.push("Install or clone the Hive CLI after Docker is confirmed healthy.");
  }
  if (dockerState.status === "ready" && !toolChecks.hive.available) {
    nextActions.push("Proceed to Hive installation and first client image selection.");
  }

  const output = {
    taskId: "T05",
    generatedAt: new Date().toISOString(),
    status: realityState.status,
    inputs: {
      configFile: configPath,
      testCaseFile: testCasePath,
    },
    summary: {
      fork: config.fork,
      clients: config.clients,
      runtime_state: realityState.status,
      runtime_reason: realityState.reason,
    },
    validations: [
      {
        check: "required artifacts exist",
        status: "pass",
        details: config.required_artifacts,
      },
      {
        check: "tool availability probe",
        status: "pass",
        details: Object.fromEntries(
          Object.entries(toolChecks).map(([binary, check]) => [
            binary,
            {
              available: check.available,
              path: check.path,
            },
          ]),
        ),
      },
      {
        check: "docker CLI version",
        status: dockerVersionResult.ok ? "pass" : "blocked",
        details: dockerVersionResult,
      },
      {
        check: "docker daemon access",
        status: dockerState.status === "ready" ? "pass" : "blocked",
        details: dockerInfoResult,
      },
      {
        check: "docker desktop app presence",
        status: dockerDesktopApp ? "pass" : "blocked",
        details: {
          found: dockerDesktopApp,
          candidates: dockerAppCandidates,
        },
      },
    ],
    environment: {
      platform: process.platform,
      arch: process.arch,
      docker_desktop_app: dockerDesktopApp,
    },
    nextActions,
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2) + "\n");
  console.log(
    `Hive reality check completed with status ${realityState.status} (${realityState.reason}).`,
  );
}

try {
  main();
} catch (error) {
  console.error(`Hive reality check failed: ${error.message}`);
  process.exit(1);
}
