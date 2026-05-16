import { describe, expect, it, vi } from "vitest";
import { ReadOutLoudController } from "./read-out-loud-controller.js";
import type { ContentResolver, SpeechEngine, StatusPresenter } from "./ports.js";
import type { ReadableContent } from "../domain/readable-content.js";

const latest: ReadableContent = {
  sourceId: "assistant-1",
  sourceType: "latest",
  text: "hello world",
  createdAt: 1
};

const makeDeps = (overrides?: {
  resolver?: Partial<ContentResolver>;
  speech?: Partial<SpeechEngine>;
  status?: Partial<StatusPresenter>;
}) => {
  const speechCalls: string[] = [];
  const statuses: string[] = [];
  const resolver: ContentResolver = {
    getLatestAssistantText: async () => latest,
    getMessageRange: async () => latest,
    getSelectedText: async () => null,
    ...overrides?.resolver
  };
  const speech: SpeechEngine = {
    speak: async (text: string) => {
      speechCalls.push(`speak:${text}`);
    },
    stop: async () => {
      speechCalls.push("stop");
    },
    pause: async () => {
      speechCalls.push("pause");
    },
    resume: async (text: string) => {
      speechCalls.push(`resume:${text}`);
    },
    ...overrides?.speech
  };
  const status: StatusPresenter = {
    showState: (state) => {
      statuses.push(state.type);
    },
    notifyError: vi.fn(),
    notifyInfo: vi.fn(),
    ...overrides?.status
  };
  return { resolver, speech, status, speechCalls, statuses };
};

describe("ReadOutLoudController", () => {
  it("plays latest assistant message", async () => {
    const deps = makeDeps();
    const controller = new ReadOutLoudController(deps.resolver, deps.speech, deps.status);

    await controller.playLatest();

    expect(deps.speechCalls).toEqual(["stop", "speak:hello world"]);
    expect(deps.statuses).toEqual(["loading", "playing"]);
    expect(controller.getState().type).toBe("playing");
  });

  it("plays a message range", async () => {
    const deps = makeDeps({ resolver: { getMessageRange: async () => ({ ...latest, sourceType: "message", text: "first second" }) } });
    const controller = new ReadOutLoudController(deps.resolver, deps.speech, deps.status);

    await controller.playRange(-2, 0);

    expect(deps.speechCalls).toEqual(["stop", "speak:first second"]);
    expect(controller.getState().type).toBe("playing");
  });

  it("plays selected text", async () => {
    const deps = makeDeps({ resolver: { getSelectedText: async () => ({ ...latest, sourceId: "selection", sourceType: "selection", text: "selected snippet" }) } });
    const controller = new ReadOutLoudController(deps.resolver, deps.speech, deps.status);

    await controller.playSelection();

    expect(deps.speechCalls).toEqual(["stop", "speak:selected snippet"]);
    expect(controller.getState().type).toBe("playing");
  });

  it("reports missing content", async () => {
    const deps = makeDeps({ resolver: { getLatestAssistantText: async () => null } });
    const controller = new ReadOutLoudController(deps.resolver, deps.speech, deps.status);

    await controller.playLatest();

    expect(deps.speechCalls).toEqual([]);
    expect(deps.status.notifyError).toHaveBeenCalledWith("No readable message to read");
  });

  it("reports missing selection", async () => {
    const deps = makeDeps({ resolver: { getSelectedText: async () => null } });
    const controller = new ReadOutLoudController(deps.resolver, deps.speech, deps.status);

    await controller.playSelection();

    expect(deps.speechCalls).toEqual([]);
    expect(deps.status.notifyError).toHaveBeenCalledWith("No selected text to read");
  });

  it("pauses and resumes current content", async () => {
    const deps = makeDeps();
    const controller = new ReadOutLoudController(deps.resolver, deps.speech, deps.status);

    await controller.playLatest();
    await controller.pause();
    await controller.resume();

    expect(deps.speechCalls).toEqual(["stop", "speak:hello world", "pause", "resume:hello world"]);
    expect(controller.getState().type).toBe("playing");
  });

  it("stops on request", async () => {
    const deps = makeDeps();
    const controller = new ReadOutLoudController(deps.resolver, deps.speech, deps.status);

    await controller.playLatest();
    await controller.stop();

    expect(deps.speechCalls).toEqual(["stop", "speak:hello world", "stop"]);
    expect(controller.getState()).toEqual({ type: "idle" });
  });
});
