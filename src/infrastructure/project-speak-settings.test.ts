import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { initProjectSpeakSettings } from "./project-speak-settings.js";

describe("initProjectSpeakSettings", () => {
  it("creates .pi/settings.json with pi-speak defaults", async () => {
    const projectDir = await mkdtemp(join(tmpdir(), "read-out-loud-project-"));

    const result = await initProjectSpeakSettings({ projectDir });
    const saved = JSON.parse(await readFile(join(projectDir, ".pi", "settings.json"), "utf8"));

    expect(result.created).toBe(true);
    expect(saved).toEqual({
      "pi-speak": {
        speech: {
          autoSpeak: false,
          pathMode: "ignore"
        }
      }
    });
  });

  it("preserves existing settings and adds pi-speak defaults", async () => {
    const projectDir = await mkdtemp(join(tmpdir(), "read-out-loud-project-"));
    await initProjectSettings(projectDir, {
      theme: "dark"
    });

    const result = await initProjectSpeakSettings({ projectDir });
    const saved = JSON.parse(await readFile(join(projectDir, ".pi", "settings.json"), "utf8"));

    expect(result.created).toBe(false);
    expect(saved).toEqual({
      theme: "dark",
      "pi-speak": {
        speech: {
          autoSpeak: false,
          pathMode: "ignore"
        }
      }
    });
  });

  it("migrates legacy readOutLoud settings into pi-speak without overriding", async () => {
    const projectDir = await mkdtemp(join(tmpdir(), "read-out-loud-project-"));
    await initProjectSettings(projectDir, {
      readOutLoud: {
        speech: {
          autoSpeak: true,
          pathMode: "read"
        }
      }
    });

    await initProjectSpeakSettings({ projectDir });
    const saved = JSON.parse(await readFile(join(projectDir, ".pi", "settings.json"), "utf8"));

    expect(saved).toEqual({
      readOutLoud: {
        speech: {
          autoSpeak: true,
          pathMode: "read"
        }
      },
      "pi-speak": {
        speech: {
          autoSpeak: true,
          pathMode: "read"
        }
      }
    });
  });
});

async function initProjectSettings(projectDir: string, data: unknown): Promise<void> {
  await import("node:fs/promises").then(async ({ mkdir, writeFile }) => {
    await mkdir(join(projectDir, ".pi"), { recursive: true });
    await writeFile(join(projectDir, ".pi", "settings.json"), JSON.stringify(data, null, 2));
  });
}
