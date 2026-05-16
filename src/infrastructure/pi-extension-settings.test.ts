import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadPiExtensionSettings } from "./pi-extension-settings.js";

describe("loadPiExtensionSettings", () => {
  it("loads and deep merges extension settings from global then project files", async () => {
    const home = await makeHome();
    const projectDir = join(home, "workspace", "demo");

    await writeJson(join(home, ".pi", "agent", "settings.json"), {
      demo: {
        nested: { keep: "global", override: "global" },
        selected: "global"
      }
    });
    await writeJson(join(projectDir, ".pi", "settings.json"), {
      demo: {
        nested: { override: "project" }
      }
    });

    const settings = await loadPiExtensionSettings<Record<string, unknown>>({
      namespace: "demo",
      homeDir: home,
      projectDir
    });

    expect(settings).toEqual({
      nested: { keep: "global", override: "project" },
      selected: "global"
    });
  });

  it("lets later namespaces win inside same settings file", async () => {
    const home = await makeHome();
    await writeJson(join(home, ".pi", "agent", "settings.json"), {
      legacyDemo: { selected: "legacy", nested: { value: "legacy" } },
      demo: { selected: "current" }
    });

    const settings = await loadPiExtensionSettings<Record<string, unknown>>({
      namespace: ["legacyDemo", "demo"],
      homeDir: home,
      projectDir: join(home, "workspace", "empty")
    });

    expect(settings).toEqual({ selected: "current", nested: { value: "legacy" } });
  });

  it("supports explicit agent dir", async () => {
    const home = await makeHome();
    const agentDir = join(home, "custom-agent");
    await writeJson(join(agentDir, "settings.json"), { demo: { enabled: true } });

    const settings = await loadPiExtensionSettings<{ enabled?: boolean }>({
      namespace: "demo",
      homeDir: home,
      agentDir,
      projectDir: join(home, "workspace", "empty")
    });

    expect(settings.enabled).toBe(true);
  });
});

async function writeJson(path: string, data: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(data));
}

async function makeHome(): Promise<string> {
  const { mkdtemp } = await import("node:fs/promises");
  return mkdtemp(join(tmpdir(), "pi-extension-settings-home-"));
}
