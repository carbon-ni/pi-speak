import { describe, expect, it, vi } from "vitest";
import { PiperVoiceCatalogService } from "./piper-voice-catalog-service.js";

describe("PiperVoiceCatalogService", () => {
  it("lists catalog voices", async () => {
    const script = {
      run: vi.fn(async (_command: string, _args: string[]) => ({
        ok: true,
        stdout: JSON.stringify({ voices: [{ id: "en_US-amy-medium", name: "Amy", lang: "en-US" }] }),
        stderr: ""
      }))
    };
    const service = new PiperVoiceCatalogService(script as any);

    await expect(service.listCatalog()).resolves.toEqual([
      { id: "en_US-amy-medium", name: "Amy", lang: "en-US" }
    ]);
  });

  it("installs a voice", async () => {
    const script = {
      run: vi.fn(async () => ({
        ok: true,
        stdout: JSON.stringify({ installed: true, voiceId: "en_US-amy-medium" }),
        stderr: ""
      }))
    };
    const service = new PiperVoiceCatalogService(script as any);

    await expect(service.install("en_US-amy-medium")).resolves.toEqual({ installed: true, voiceId: "en_US-amy-medium" });
  });
});
