import * as core from "@actions/core";
import * as io from "@actions/io";
import * as cp from "child_process";
import { run, runSetup } from "./run"; // Assuming the file is named setup.ts
import { getBruin } from "./bruin";
import { Error } from "./error";

jest.mock("@actions/core");
jest.mock("@actions/io");
jest.mock("child_process");
jest.mock("./bruin");

describe("runSetup", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("should return an error if no version is provided", async () => {
    (core.getInput as jest.Mock).mockReturnValue("");

    const result = await runSetup();

    expect(result).toEqual({ message: "a version was not provided" });
  });

  it("should return an error if getBruin fails", async () => {
    (core.getInput as jest.Mock).mockReturnValue("1.0.0");
    (getBruin as jest.Mock).mockResolvedValue({ message: "failed to download" });

    const result = await runSetup();

    expect(result).toEqual({ message: "failed to download" });
  });

  it("should return an error if bruin is not found in PATH", async () => {
    (core.getInput as jest.Mock).mockReturnValue("1.0.0");
    (getBruin as jest.Mock).mockResolvedValue("/mock/path");
    (io.which as jest.Mock).mockResolvedValue("");

    const result = await runSetup();

    expect(result).toEqual({ message: "bruin was not found on PATH" });
  });

  it("should successfully setup bruin", async () => {
    (core.getInput as jest.Mock).mockReturnValue("1.0.0");
    (getBruin as jest.Mock).mockResolvedValue("/mock/path");
    (io.which as jest.Mock).mockResolvedValue("/mock/path/bruin");
    (cp.execSync as jest.Mock).mockReturnValue("1.0.0\n");

    const result = await runSetup();

    expect(result).toBeNull();
    expect(core.addPath).toHaveBeenCalledWith("/mock/path");
    expect(core.info).toHaveBeenCalledWith("Successfully setup bruin version 1.0.0");
  });
});

describe("run", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("should set failure if runSetup returns an error", async () => {
    (core.getInput as jest.Mock).mockReturnValue("1.0.0");
    (getBruin as jest.Mock).mockResolvedValue("/mock/path");
    (io.which as jest.Mock).mockResolvedValue(""); // Simulating failure

    await run();

    expect(core.setFailed).toHaveBeenCalledWith("bruin was not found on PATH");
  });

  it("should not set failure if runSetup is successful", async () => {
    (core.getInput as jest.Mock).mockReturnValue("1.0.0");
    (getBruin as jest.Mock).mockResolvedValue("/mock/path");
    (io.which as jest.Mock).mockResolvedValue("/mock/path/bruin");
    (cp.execSync as jest.Mock).mockReturnValue("1.0.0\n");

    await run();

    expect(core.setFailed).not.toHaveBeenCalled();
  });
});
