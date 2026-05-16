import { describe, expect, it, vi } from "vitest";
import { runPisay } from "./pisay.js";

describe("pisay panic", () => {
  it("calls panic stop and prints confirmation", async () => {
    const logger = { info: vi.fn() };
    const panic = vi.fn(async () => undefined);

    await runPisay(["panic"], { cwd: process.cwd(), logger, panic });

    expect(panic).toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith("Stopped speech playback");
  });
});
