import { describe, expect, it } from "vitest";
import { panicStop } from "./panic-stop.js";

describe("panicStop", () => {
  it("kills piper, say, and afplay playback for pi-speak and legacy tmp names", async () => {
    const calls: Array<{ command: string; args: string[] }> = [];

    await panicStop(async (command, args) => {
      calls.push({ command, args });
      return { code: 0, stdout: "", stderr: "" };
    });

    expect(calls).toEqual([
      { command: "pkill", args: ["-f", "afplay .*pi-speak-piper"] },
      { command: "pkill", args: ["-f", "afplay .*read-out-loud-piper"] },
      { command: "pkill", args: ["-x", "piper"] },
      { command: "pkill", args: ["-x", "say"] }
    ]);
  });
});
