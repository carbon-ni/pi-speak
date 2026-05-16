import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { ReadOutLoudController } from "./read-out-loud-controller.js";
import type { ContentResolver, StatusPresenter } from "./ports.js";
import type { ReadableContent } from "../domain/readable-content.js";
import { BundledPiperSpeechEngine } from "../infrastructure/piper-speech-engine.js";

const rootUrl = new URL("../../", import.meta.url);
const modelPath = new URL("../../voices/en_US-amy-medium.onnx", import.meta.url);
const configPath = new URL("../../voices/en_US-amy-medium.onnx.json", import.meta.url);

const latest: ReadableContent = {
  sourceId: "assistant-e2e",
  sourceType: "latest",
  text: "hello from pisay end to end test. ".repeat(20),
  createdAt: 1
};

const hasPiper = (): boolean =>
  spawnSync("bash", ["-lc", "command -v piper >/dev/null 2>&1"], { stdio: "ignore" }).status === 0;

const hasBundledVoice = (): boolean => existsSync(modelPath) && existsSync(configPath);

const makeExec = () => async (command: string, args: string[]) => {
  const result = spawnSync(command, args, {
    cwd: rootUrl.pathname,
    encoding: "utf8"
  });
  return {
    code: result.status ?? 0,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? ""
  };
};

const pgrep = async (pattern: string): Promise<string> => {
  const result = spawnSync("pgrep", ["-f", pattern], { encoding: "utf8" });
  return result.status === 0 ? (result.stdout ?? "").trim() : "";
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("ReadOutLoudController e2e", () => {
  const enabled = hasPiper() && hasBundledVoice();
  const run = enabled ? it : it.skip;

  run("plays bundled amy-medium voice and stops playback", async () => {
    const statuses: string[] = [];
    const resolver: ContentResolver = {
      getLatestAssistantText: async () => latest,
      getMessageRange: async () => latest,
      getSelectedText: async () => latest
    };
    const status: StatusPresenter = {
      showState: (state) => statuses.push(state.type),
      notifyError: () => undefined,
      notifyInfo: () => undefined
    };

    const speech = new BundledPiperSpeechEngine(makeExec(), {
      modelPath: modelPath.pathname,
      configPath: configPath.pathname,
      speakingRate: 1.15
    });
    const controller = new ReadOutLoudController(resolver, speech, status);

    await controller.stop();
    await controller.playLatest();
    await sleep(500);

    const active = await pgrep("(afplay|pw-play|paplay|aplay) .*pisay-piper");

    expect(statuses).toEqual(["idle", "loading", "playing"]);
    expect(controller.getState().type).toBe("playing");
    expect(active).not.toBe("");

    await controller.stop();
    await sleep(200);

    const afterStop = await pgrep("(afplay|pw-play|paplay|aplay) .*pisay-piper");
    expect(afterStop).toBe("");
    expect(controller.getState()).toEqual({ type: "idle" });
  }, 15000);
});
