import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { installPiperVoice, listAvailablePiperVoices } from "./piper-voice-installer.js";

describe("listAvailablePiperVoices", () => {
  it("returns sorted voice ids from HuggingFace voices.json", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(JSON.stringify({ b: { key: "b" }, a: { key: "a" } }), { status: 200 });
    });

    await expect(listAvailablePiperVoices({ fetch: fetchMock as any })).resolves.toEqual(["a", "b"]);
  });
});

describe("installPiperVoice", () => {
  it("downloads model + config into cache dir", async () => {
    const cacheDir = await mkdtemp(join(tmpdir(), "piper-voice-cache-"));

    const fetchMock = vi.fn(async (url: string) => {
      const body = url.endsWith(".onnx") ? "MODEL" : "CONFIG";
      return new Response(body, { status: 200 });
    });

    await installPiperVoice({ voiceId: "ar_JO-kareem-low", cacheDir, fetch: fetchMock as any });

    const model = await readFile(join(cacheDir, "ar_JO-kareem-low", "model.onnx"), "utf8");
    const config = await readFile(join(cacheDir, "ar_JO-kareem-low", "model.onnx.json"), "utf8");

    expect(model).toBe("MODEL");
    expect(config).toBe("CONFIG");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("fails when voice id does not match <locale>-<name>-<quality>", async () => {
    await expect(
      installPiperVoice({ voiceId: "invalid", cacheDir: "/tmp/any", fetch: vi.fn() as any })
    ).rejects.toThrow("Invalid piper voice id");
  });
});
