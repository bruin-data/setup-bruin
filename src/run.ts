import cp from "child_process";
import * as os from "os";
import * as path from "path";
import * as core from "@actions/core";
import * as io from "@actions/io";
import * as exec from "@actions/exec";
import { getBruin } from "./bruin";
import { Error, isError } from "./error";

// Status is the status of a command execution.
enum Status {
  // Unknown is the default status.
  Unknown = 0,
  // Passed is the status of a successful command execution.
  Passed,
  // Failed is the status of a failed command execution.
  Failed,
  // Skipped is the status of a skipped command execution.
  Skipped,
}

// Result is the result of a command execution.
interface Result extends exec.ExecOutput {
  status: Status;
}

export async function run(): Promise<void> {
  try {
    const result = await runSetup();
    if (result !== null && isError(result)) {
      core.setFailed(result.message);
    }
  } catch (error) {
    // In case we ever fail to catch an error
    // in the call chain, we catch the error
    // and mark the build as a failure. The
    // user is otherwise prone to false positives.
    if (isError(error)) {
      core.setFailed(error.message);
      return;
    }
    core.setFailed("Internal error");
  }
}

// runSetup runs the bruin-setup action, and returns
// a non-empty error if it fails.
async function runSetup(): Promise<null | Error> {
  const version = core.getInput("version");
  if (version === "") {
    return {
      message: "a version was not provided",
    };
  }

  const installOnly  = core.getInput("install_only");
  if (installOnly) {
    core.info("It's a install Only action")
  }

  core.info(`Setting up bruin version "${version}"`);
  const installDir = await getBruin(version);
  if (isError(installDir)) {
    return installDir;
  }

  core.info("Adding bruin binary to PATH");
  let binaryPath = "";
  if (os.platform() === "win32") {
    core.addPath(installDir);
  } else {
    core.addPath(path.join(installDir, "bin"));
  }
  binaryPath = await io.which("bruin", true);
  if (binaryPath === "") {
    return {
      message: "bruin was not found on PATH",
    };
  }

  core.info(`Successfully setup bruin version ${version}`);
  core.info(cp.execSync(`${binaryPath} --version`).toString());

  if (installOnly != "true") {
    const command = core.getInput("command");
    if (command === "") {
      return {
        message: "a command was not provided",
      };
    }

    if (["validate", "run", "format", "lineage"].includes(command)) {
      return {
        message: "a command was provided is not supported by the action, Please provide a command like run, validate, format and lineage",
      };
    }

    const args = core.getInput("args");
    if (args === "") {
      core.warning("a args was not provided")
    }

    await runCommand(binaryPath, command, args)
  }
  return null;
}


async function runCommand(bruinPath: string, command: string, args: string) : Promise<Result>  {
  core.debug("Running command")
  const output = await exec.getExecOutput(bruinPath, [command, args], {})
  return {
    ...output,
    status: output.exitCode == 0 ? Status.Passed : Status.Failed,
  }
}

// getEnv returns the case insensitive value of the environment variable.
// Prefers the lowercase version of the variable if it exists.
export function getEnv(name: string): string {
  return (
    process.env[name.toLowerCase()] ?? process.env[name.toUpperCase()] ?? ""
  );
}