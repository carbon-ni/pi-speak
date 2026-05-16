import { describe, expect, it } from "vitest";
import { PiExecScriptRunner } from "./script-runner.js";

describe("PiExecScriptRunner", () => {
  it("normalizes optional exec fields into the application port result", async () => {
    const runner = new PiExecScriptRunner(async () => ({ code: undefined, stdout: undefined, stderr: undefined }));

    await expect(runner.run("echo", ["hello"])).resolves.toEqual({
      ok: true,
      stdout: "",
      stderr: ""
    });
  });
});
