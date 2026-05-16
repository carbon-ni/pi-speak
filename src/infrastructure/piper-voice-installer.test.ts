import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  getHuggingFacePiperVoiceUrls,
  installPiperVoiceFromHuggingFace,
  listAvailablePiperVoicesFromHuggingFace
} from "./piper-voice-installer.js";

describe("getHuggingFacePiperVoiceUrls", () => {
  it("builds huggingface URLs from piper voice id", () => {
    expect(getHuggingFacePiperVoiceUrls("ar_JO-kareem-low")).toEqual({
      modelUrl:
        "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/ar/ar_JO/kareem/low/ar_JO-kareem-low.onnx",
      configUrl:
        "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/ar/ar_JO/kareem/low/ar_JO-kareem-low.onnx.json"
    });
  });
});

describe("listAvailablePiperVoicesFromHuggingFace", () => {
  it("returns sorted voice ids from HuggingFace voices.json", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(JSON.stringify({ b: { key: "b" }, a: { key: "a" } }), { status: 200 });
    });

    await expect(listAvailablePiperVoicesFromHuggingFace({ fetch: fetchMock as any })).resolves.toEqual(["a", "b"]);
  });
});

describe("installPiperVoiceFromHuggingFace", () => {
  it("downloads model + config into cache dir", async () => {
    const cacheDir = await mkdtemp(join(tmpdir(), "piper-voice-cache-"));

    const fetchMock = vi.fn(async (url: string) => {
      const body = url.endsWith(".onnx") ? "MODEL" : "CONFIG";
      return new Response(body, { status: 200 });
    });

    await installPiperVoiceFromHuggingFace({ voiceId: "ar_JO-kareem-low", cacheDir, fetch: fetchMock as any });

    const model = await readFile(join(cacheDir, "ar_JO-kareem-low", "model.onnx"), "utf8");
    const config = await readFile(join(cacheDir, "ar_JO-kareem-low", "model.onnx.json"), "utf8");

    expect(model).toBe("MODEL");
    expect(config).toBe("CONFIG");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("fails when voice id does not match <locale>-<name>-<quality>", async () => {
    await expect(
      installPiperVoiceFromHuggingFace({ voiceId: "invalid", cacheDir: "/tmp/any", fetch: vi.fn() as any })
    ).rejects.toThrow("Invalid piper voice id");
  });
});
