import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { parseReadAloudCommand } from "./domain/command-parser.js";
import { getSpeakCommandCompletions } from "./domain/speak-command-completions.js";
import { ReadOutLoudController } from "./application/read-out-loud-controller.js";
import { createAutoSpeakState } from "./application/auto-speak.js";
import { createAutoSpeakQueue } from "./application/auto-speak-queue.js";
import { PiperVoiceCatalogService } from "./application/piper-voice-catalog-service.js";
import { PiContentResolver } from "./infrastructure/pi-content-resolver.js";
import { createPiSelectionProvider } from "./infrastructure/pi-selection-provider.js";
import { PiStatusPresenter } from "./infrastructure/pi-status-presenter.js";
import { toReadableAssistantContent } from "./infrastructure/pi-message-content.js";
import { PiExecScriptRunner } from "./infrastructure/script-runner.js";
import { BundledPiperSpeechEngine } from "./infrastructure/piper-speech-engine.js";
import { loadReadOutLoudConfig } from "./infrastructure/read-out-loud-config.js";
import { initProjectSpeakSettings } from "./infrastructure/project-speak-settings.js";
import voiceCatalog from "../resources/piper-voices.json" with { type: "json" };

export default function (pi: ExtensionAPI) {
  const api = pi as any;
  let controller: ReadOutLoudController | null = null;
  let piperCatalog: PiperVoiceCatalogService | null = null;
  let speechConfigPromise: Promise<{
    piper: { modelPath: string; configPath: string; speakingRate: number };
    speech: { pathMode: "ignore" | "read"; autoSpeak: boolean };
  }> | null = null;
  const autoSpeak = createAutoSpeakState(false);
  const autoSpeakQueue = createAutoSpeakQueue();
  let drainingAutoSpeakQueue = false;
  let speakingEnabled = true;

  const ensurePiperCatalog = (): PiperVoiceCatalogService => {
    if (piperCatalog) return piperCatalog;
    piperCatalog = new PiperVoiceCatalogService(
      new PiExecScriptRunner((command, args) => pi.exec(command, args))
    );
    return piperCatalog;
  };

  const ensureSpeechConfig = () => {
    if (speechConfigPromise) return speechConfigPromise;
    speechConfigPromise = loadReadOutLoudConfig({
      projectDir: process.cwd(),
      bundled: {
        modelPath: new URL("../voices/en_US-amy-medium.onnx", import.meta.url).pathname,
        configPath: new URL("../voices/en_US-amy-medium.onnx.json", import.meta.url).pathname,
        speakingRate: 1.15
      }
    });
    return speechConfigPromise;
  };

  const ensureController = async (ctx: any): Promise<ReadOutLoudController> => {
    if (controller) return controller;

    const exec = async (command: string, args: string[]) => {
      const result = await pi.exec(command, args);
      return {
        code: result.code ?? 0,
        stdout: result.stdout ?? "",
        stderr: result.stderr ?? ""
      };
    };

    const resolver = new PiContentResolver(ctx.sessionManager, createPiSelectionProvider(ctx));

    const status = new PiStatusPresenter({
      setStatus: (key, value) => ctx.ui.setStatus(key, value),
      notify: (message, level) => ctx.ui.notify(message, level)
    });

    const config = await ensureSpeechConfig();
    autoSpeak.set(config.speech.autoSpeak);
    const speech = new BundledPiperSpeechEngine(exec, config.piper);

    controller = new ReadOutLoudController(resolver, speech, status, config.speech);
    return controller;
  };

  const silenceAllReading = async (ctx: any) => {
    autoSpeakQueue.clear();
    await (await ensureController(ctx)).stop();
  };

  api.registerCommand("speak", {
    description: "Speak latest assistant message aloud, or a range like '-2 0' / 'last 3'",
    getArgumentCompletions: (prefix: string) =>
      getSpeakCommandCompletions(prefix, voiceCatalog.voices.map((voice) => voice.id)),
    handler: async (args: string | undefined, ctx: any) => {
      const trimmed = args?.trim() ?? "";
      if (trimmed === "voices") {
        const voices = await ensurePiperCatalog().listCatalog();
        const summary = voices.map((voice) => `${voice.id} (${voice.lang})`).join("\n");
        ctx.ui.notify(summary || "No Piper voices found", "info");
        return;
      }
      if (trimmed === "voices installed") {
        const voices = await ensurePiperCatalog().listInstalled();
        const summary = voices.map((voice) => `${voice.id} (${voice.lang})`).join("\n");
        ctx.ui.notify(summary || "No Piper voices installed", "info");
        return;
      }
      if (trimmed.startsWith("voices install ")) {
        const voiceId = trimmed.slice("voices install ".length).trim();
        const result = await ensurePiperCatalog().install(voiceId);
        ctx.ui.notify(`Installed ${result.voiceId}`, "info");
        return;
      }

      const current = await ensureController(ctx);
      const command = parseReadAloudCommand(args);

      if (command.type === "enable") {
        speakingEnabled = true;
        ctx.ui.notify("Speaking enabled", "info");
        return;
      }

      if (command.type === "disable") {
        speakingEnabled = false;
        await silenceAllReading(ctx);
        ctx.ui.notify("Speaking disabled for this session", "info");
        return;
      }

      if (
        !speakingEnabled
        && (command.type === "latest"
          || command.type === "range"
          || command.type === "last"
          || command.type === "selection"
          || command.type === "pause"
          || command.type === "resume"
          || command.type === "stop")
      ) {
        ctx.ui.notify("Speaking disabled for this session. Run /speak enable", "info");
        return;
      }

      switch (command.type) {
        case "latest":
          await current.playLatest();
          return;
        case "range":
          await current.playRange(command.startOffset, command.endOffset);
          return;
        case "last":
          await current.playRange(-(command.count - 1), 0);
          return;
        case "selection":
          await current.playSelection();
          return;
        case "stop":
          await current.stop();
          return;
        case "pause":
          await current.pause();
          return;
        case "resume":
          await current.resume();
          return;
        case "status":
          current.showStatus();
          ctx.ui.notify(`Auto speak ${autoSpeak.isEnabled() ? "on" : "off"}`, "info");
          ctx.ui.notify(`Speaking ${speakingEnabled ? "enabled" : "disabled"}`, "info");
          return;
        case "auto": {
          const enabled = autoSpeak.toggle();
          ctx.ui.notify(`Auto speak ${enabled ? "on" : "off"}`, "info");
          return;
        }
        case "init": {
          const result = await initProjectSpeakSettings({ projectDir: process.cwd() });
          ctx.ui.notify(`${result.created ? "Created" : "Updated"} ${result.path}`, "info");
          speechConfigPromise = null;
          const config = await ensureSpeechConfig();
          autoSpeak.set(config.speech.autoSpeak);
          return;
        }
      }
    }
  });

  api.registerCommand("silence", {
    description: "Stop all reading immediately",
    handler: async (_args: string | undefined, ctx: any) => {
      speakingEnabled = false;
      await silenceAllReading(ctx);
      ctx.ui.notify("Speaking disabled for this session", "info");
    }
  });

  const drainAutoSpeakQueue = async (ctx: any) => {
    if (drainingAutoSpeakQueue || !autoSpeak.isEnabled()) return;
    drainingAutoSpeakQueue = true;
    try {
      let next = autoSpeakQueue.next();
      while (next && autoSpeak.isEnabled()) {
        await (await ensureController(ctx)).playReadableContent(next);
        next = autoSpeakQueue.next();
      }
    } finally {
      drainingAutoSpeakQueue = false;
    }
  };

  api.on("message_end", async (event: any, ctx: any) => {
    if (event?.message?.role === "user") {
      await silenceAllReading(ctx);
      return;
    }

    if (!autoSpeak.isEnabled() || !speakingEnabled) return;
    const content = toReadableAssistantContent(event?.message);
    if (!content) return;
    autoSpeakQueue.enqueue(content);
    await drainAutoSpeakQueue(ctx);
  });

  api.on("session_start", async (_event: any, ctx: any) => {
    (await ensureController(ctx)).showStatus();
  });

  api.on("session_switch", async (_event: any, ctx: any) => {
    await silenceAllReading(ctx);
  });

  api.on("session_shutdown", async (_event: any, ctx: any) => {
    await silenceAllReading(ctx);
  });
}
