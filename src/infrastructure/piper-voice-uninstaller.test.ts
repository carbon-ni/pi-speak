import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { uninstallPiperVoice } from "./piper-voice-uninstaller.js";

describe("uninstallPiperVoice", () => {
  it("removes the voice directory", async () => {
    const cacheDir = await mkdtemp(join(tmpdir(), "piper-voice-cache-"));
    const voiceDir = join(cacheDir, "ar_JO-kareem-low");
    await mkdir(voiceDir, { recursive: true });
    await writeFile(join(voiceDir, "model.onnx"), "x");

    await expect(uninstallPiperVoice({ voiceId: "ar_JO-kareem-low", cacheDir })).resolves.toEqual({
      removed: true,
      voiceId: "ar_JO-kareem-low"
    });
  });

  it("is ok when voice is not present", async () => {
    const cacheDir = await mkdtemp(join(tmpdir(), "piper-voice-cache-"));

    await expect(uninstallPiperVoice({ voiceId: "missing", cacheDir })).resolves.toEqual({ removed: false, voiceId: "missing" });
  });
});
