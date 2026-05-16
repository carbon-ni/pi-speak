import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { loadReadOutLoudConfig } from "./read-out-loud-config.js";

describe("loadReadOutLoudConfig", () => {
  it("loads pi-speak config from global settings.json", async () => {
    const home = await makeHome();
    await writeJson(join(home, ".pi", "agent", "settings.json"), {
      "pi-speak": {
        piper: {
          modelPath: "/custom/amy.onnx",
          configPath: "/custom/amy.onnx.json",
          speakingRate: 1.2
        },
        speech: {
          pathMode: "read"
        }
      }
    });

    const config = await loadReadOutLoudConfig({ homeDir: home, projectDir: join(home, "workspace", "empty") });

    expect(config.piper).toEqual({
      modelPath: "/custom/amy.onnx",
      configPath: "/custom/amy.onnx.json",
      speakingRate: 1.2
    });
    expect(config.speech).toEqual({ pathMode: "read", autoSpeak: false });
  });

  it("loads project-local auto speak from .pi/settings.json", async () => {
    const home = await makeHome();
    const projectDir = join(home, "workspace", "demo");
    await writeJson(join(projectDir, ".pi", "settings.json"), {
      "pi-speak": {
        speech: {
          autoSpeak: true
        }
      }
    });

    const config = await loadReadOutLoudConfig({ homeDir: home, projectDir });

    expect(config.speech).toEqual({ pathMode: "ignore", autoSpeak: true });
  });

  it("merges project settings over global settings", async () => {
    const home = await makeHome();
    const projectDir = join(home, "workspace", "demo");
    await writeJson(join(home, ".pi", "agent", "settings.json"), {
      "pi-speak": {
        speech: {
          autoSpeak: false,
          pathMode: "read"
        }
      }
    });
    await writeJson(join(projectDir, ".pi", "settings.json"), {
      "pi-speak": {
        speech: {
          autoSpeak: true
        }
      }
    });

    const config = await loadReadOutLoudConfig({ homeDir: home, projectDir });

    expect(config.speech).toEqual({ pathMode: "read", autoSpeak: true });
  });

  it("uses PI_CODING_AGENT_DIR for global settings path", async () => {
    const home = await makeHome();
    const agentDir = join(home, "custom-agent-dir");
    await writeJson(join(agentDir, "settings.json"), {
      "pi-speak": {
        speech: {
          autoSpeak: true
        }
      }
    });

    const config = await loadReadOutLoudConfig({ homeDir: home, agentDir, projectDir: join(home, "workspace", "empty") });

    expect(config.speech).toEqual({ pathMode: "ignore", autoSpeak: true });
  });

  it("falls back to bundled voice when config file is missing", async () => {
    const home = await makeHome();
    const config = await loadReadOutLoudConfig({
      homeDir: home,
      projectDir: join(home, "workspace", "empty"),
      bundled: {
        modelPath: "/repo/voices/en_US-amy-medium.onnx",
        configPath: "/repo/voices/en_US-amy-medium.onnx.json",
        speakingRate: 1.15
      }
    });

    expect(config.piper).toEqual({
      modelPath: "/repo/voices/en_US-amy-medium.onnx",
      configPath: "/repo/voices/en_US-amy-medium.onnx.json",
      speakingRate: 1.15
    });
    expect(config.speech).toEqual({ pathMode: "ignore", autoSpeak: false });
  });

  it("rejects partial piper config", async () => {
    const home = await makeHome();
    await writeJson(join(home, ".pi", "agent", "settings.json"), {
      "pi-speak": {
        piper: {
          modelPath: "/custom/amy.onnx"
        }
      }
    });

    await expect(loadReadOutLoudConfig({ homeDir: home, projectDir: join(home, "workspace", "empty") })).rejects.toThrow(
      "Invalid pi-speak config: piper.modelPath and piper.configPath are both required"
    );
  });

  it("rejects invalid path mode", async () => {
    const home = await makeHome();
    await writeJson(join(home, ".pi", "agent", "settings.json"), {
      "pi-speak": {
        speech: {
          pathMode: "verbose"
        }
      }
    });

    await expect(loadReadOutLoudConfig({ homeDir: home, projectDir: join(home, "workspace", "empty") })).rejects.toThrow(
      "Invalid pi-speak config: speech.pathMode must be 'ignore' or 'read'"
    );
  });

  it("rejects non-boolean auto speak", async () => {
    const home = await makeHome();
    await writeJson(join(home, ".pi", "agent", "settings.json"), {
      "pi-speak": {
        speech: {
          autoSpeak: "yes"
        }
      }
    });

    await expect(loadReadOutLoudConfig({ homeDir: home, projectDir: join(home, "workspace", "empty") })).rejects.toThrow(
      "Invalid pi-speak config: speech.autoSpeak must be true or false"
    );
  });

  it("rejects non-positive speaking rate", async () => {
    const home = await makeHome();
    await writeJson(join(home, ".pi", "agent", "settings.json"), {
      "pi-speak": {
        piper: {
          modelPath: "/custom/amy.onnx",
          configPath: "/custom/amy.onnx.json",
          speakingRate: 0
        }
      }
    });

    await expect(loadReadOutLoudConfig({ homeDir: home, projectDir: join(home, "workspace", "empty") })).rejects.toThrow(
      "Invalid pi-speak config: piper.speakingRate must be greater than 0"
    );
  });

  it("supports profiles and selects active profile piper config", async () => {
    const home = await makeHome();
    await writeJson(join(home, ".pi", "agent", "settings.json"), {
      "pi-speak": {
        profile: "kareem",
        profiles: {
          kareem: {
            voiceId: "ar_JO-kareem-low",
            speakingRate: 1.4
          }
        }
      }
    });

    const config = await loadReadOutLoudConfig({ homeDir: home, projectDir: join(home, "workspace", "empty") });

    expect(config.profile).toBe("kareem");
    expect(config.piper.modelPath).toBe(`${home}/.pi/agent/cache/pi-speak/piper/voices/ar_JO-kareem-low/model.onnx`);
    expect(config.piper.configPath).toBe(`${home}/.pi/agent/cache/pi-speak/piper/voices/ar_JO-kareem-low/model.onnx.json`);
    expect(config.piper.speakingRate).toBe(1.4);
  });
});

async function writeJson(path: string, data: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(data));
}

async function makeHome(): Promise<string> {
  const dir = await import("node:fs/promises").then(({ mkdtemp }) => mkdtemp(join(tmpdir(), "pi-speak-home-")));
  return dir;
}
