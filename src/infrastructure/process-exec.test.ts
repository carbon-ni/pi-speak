import { describe, expect, it } from "vitest";
import { createChildProcessExec, normalizeExecResult, runChecked } from "./process-exec.js";

describe("process exec helpers", () => {
  it("normalizes optional exec result fields", () => {
    expect(normalizeExecResult({ code: undefined, stdout: undefined, stderr: undefined })).toEqual({
      code: 0,
      stdout: "",
      stderr: ""
    });
  });

  it("throws command stderr when checked command fails", async () => {
    await expect(runChecked(async () => ({ code: 2, stdout: "", stderr: "boom" }), "cmd", [])).rejects.toThrow("boom");
  });

  it("executes a child process and captures stdout", async () => {
    const exec = createChildProcessExec();

    await expect(exec(process.execPath, ["-e", "console.log('ok')"])).resolves.toEqual({
      code: 0,
      stdout: "ok\n",
      stderr: ""
    });
  });
});
