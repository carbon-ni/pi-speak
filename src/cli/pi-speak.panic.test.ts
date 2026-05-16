import { describe, expect, it, vi } from "vitest";
import { runPiSpeak } from "./pi-speak.js";

describe("pi-speak panic", () => {
  it("calls panic stop and prints confirmation", async () => {
    const logger = { info: vi.fn() };
    const panic = vi.fn(async () => undefined);

    await runPiSpeak(["panic"], { cwd: process.cwd(), logger, panic });

    expect(panic).toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith("Stopped speech playback");
  });
});
