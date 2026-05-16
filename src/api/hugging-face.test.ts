import { describe, expect, it, vi } from "vitest";
import { HuggingFaceClient, getHuggingFacePiperVoiceUrls } from "./hugging-face.js";

describe("getHuggingFacePiperVoiceUrls", () => {
  it("builds Piper voice asset URLs from a voice id", () => {
    expect(getHuggingFacePiperVoiceUrls("ar_JO-kareem-low")).toEqual({
      modelUrl:
        "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/ar/ar_JO/kareem/low/ar_JO-kareem-low.onnx",
      configUrl:
        "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/ar/ar_JO/kareem/low/ar_JO-kareem-low.onnx.json"
    });
  });

  it("fails for invalid Piper voice ids", () => {
    expect(() => getHuggingFacePiperVoiceUrls("invalid")).toThrow("Invalid piper voice id");
  });
});

describe("HuggingFaceClient", () => {
  it("lists sorted Piper voice ids", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(JSON.stringify({ b: { key: "b" }, a: { key: "a" } }), { status: 200 });
    });

    const client = new HuggingFaceClient({ fetch: fetchMock as any });

    await expect(client.listPiperVoiceIds()).resolves.toEqual(["a", "b"]);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://huggingface.co/rhasspy/piper-voices/raw/v1.0.0/voices.json",
      { redirect: "follow" }
    );
  });

  it("downloads Piper voice assets", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      const body = url.endsWith(".onnx") ? "MODEL" : "CONFIG";
      return new Response(body, { status: 200 });
    });

    const client = new HuggingFaceClient({ fetch: fetchMock as any });
    const assets = await client.downloadPiperVoice("ar_JO-kareem-low");

    expect(new TextDecoder().decode(assets.model)).toBe("MODEL");
    expect(new TextDecoder().decode(assets.config)).toBe("CONFIG");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("fails on unsuccessful responses", async () => {
    const fetchMock = vi.fn(async () => new Response("missing", { status: 404, statusText: "Not Found" }));
    const client = new HuggingFaceClient({ fetch: fetchMock as any });

    await expect(client.listPiperVoiceIds()).rejects.toThrow("Failed to download");
  });
});
