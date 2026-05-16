#!/usr/bin/env node
import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";
import { initProjectSpeakSettings } from "../infrastructure/project-speak-settings.js";
import { installPiperVoiceFromHuggingFace } from "../infrastructure/piper-voice-installer.js";
import { uninstallPiperVoice } from "../infrastructure/piper-voice-uninstaller.js";
import { createReadOutLoudProfile, listReadOutLoudProfiles, setReadOutLoudProfile } from "../infrastructure/profile-settings.js";
import { panicStop } from "../infrastructure/panic-stop.js";

type Logger = {
  info(message: string): void;
};

type PisayArgs = {
  _: (string | number)[];
  voiceId?: string;
};

const defaultCacheDir = (): string => {
  const home = process.env.HOME;
  if (!home) throw new Error("HOME is not set");
  return `${home}/.pi/agent/cache/pisay/piper/voices`;
};

export function createPisayCli(argv: string[] = []) {
  return yargs(argv)
    .scriptName("pisay")
    .exitProcess(false)
    .help(false)
    .version(false)
    .command("init", "Scaffold local .pi/settings.json for pisay")
    .command("install [voiceId]", "Install a Piper voice into Pi cache", (cmd) => {
      return cmd
        .positional("voiceId", { type: "string" })
        .option("list", { type: "boolean", default: false, describe: "List available voices" });
    })
    .command("uninstall <voiceId>", "Uninstall a Piper voice from Pi cache")
    .command("panic", "Emergency stop: kill any ongoing speech playback")
    .command(
      "profile <cmd> [name]",
      "Manage voice profiles (list/set)",
      (cmd) => cmd.positional("cmd", { type: "string" }).positional("name", { type: "string" })
    );
}

export async function runPisay(
  argv: string[],
  options?: {
    cwd?: string;
    logger?: Logger;
    install?: (voiceId: string) => Promise<{ installed: boolean; voiceId: string }>;
    uninstall?: (voiceId: string) => Promise<{ removed: boolean; voiceId: string }>;
    listAvailable?: () => Promise<string[]>;
    listProfiles?: () => Promise<string[]>;
    setProfile?: (args: { scope: "project" | "global"; profile: string; cwd: string }) => Promise<{ scope: string; profile: string; path: string }>;
    createProfile?: (args: { scope: "project" | "global"; name: string; cwd: string }) => Promise<{ scope: string; name: string; path: string }>;
    panic?: () => Promise<void>;
  }
): Promise<void> {
  const cwd = options?.cwd ?? process.cwd();
  const logger = options?.logger ?? console;
  const install =
    options?.install ??
    (async (voiceId: string) => {
      return installPiperVoiceFromHuggingFace({ voiceId, cacheDir: defaultCacheDir() });
    });

  const uninstall =
    options?.uninstall ??
    (async (voiceId: string) => {
      return uninstallPiperVoice({ voiceId, cacheDir: defaultCacheDir() });
    });

  const listAvailable =
    options?.listAvailable ??
    (async () => {
      const mod = await import("../infrastructure/piper-voice-installer.js");
      return mod.listAvailablePiperVoicesFromHuggingFace({ fetch });
    });

  const listProfiles = options?.listProfiles ?? (async () => listReadOutLoudProfiles({ cwd }));

  const setProfile =
    options?.setProfile ??
    (async ({ scope, profile, cwd }: { scope: "project" | "global"; profile: string; cwd: string }) => {
      const result = await setReadOutLoudProfile({ scope, profile, cwd });
      return { scope: result.scope, profile: result.profile, path: result.path };
    });

  const createProfile =
    options?.createProfile ??
    (async ({ scope, name, cwd }: { scope: "project" | "global"; name: string; cwd: string }) => {
      const result = await createReadOutLoudProfile({ scope, name, cwd });
      return { scope: result.scope, name: result.name, path: result.path };
    });

  const panic = options?.panic ?? (async () => panicStop());

  const parsed = (await createPisayCli(argv).parse()) as PisayArgs;
  const command = String(parsed._[0] ?? "");

  switch (command) {
    case "init": {
      const result = await initProjectSpeakSettings({ projectDir: cwd });
      logger.info(`${result.created ? "Created" : "Updated"} ${result.path}`);
      return;
    }
    case "install": {
      const wantsList = Boolean((parsed as any).list);
      if (wantsList) {
        const voices = await listAvailable();
        logger.info(voices.join("\n"));
        return;
      }

      const voiceId = String(parsed.voiceId ?? parsed._[1] ?? "").trim();
      if (!voiceId) throw new Error("Usage: pisay install <voiceId> OR pisay install --list");
      const result = await install(voiceId);
      logger.info(`Installed ${result.voiceId}`);
      return;
    }
    case "uninstall": {
      const voiceId = String(parsed.voiceId ?? parsed._[1] ?? "").trim();
      if (!voiceId) throw new Error("Usage: pisay uninstall <voiceId>");
      const result = await uninstall(voiceId);
      logger.info(`Uninstalled ${result.voiceId}`);
      return;
    }
    case "panic": {
      await panic();
      logger.info("Stopped speech playback");
      return;
    }
    case "profile": {
      const sub = String((parsed as any).cmd ?? parsed._[1] ?? "").trim();
      if (sub === "list") {
        const profiles = await listProfiles();
        logger.info(profiles.join("\n"));
        return;
      }
      if (sub === "set") {
        const profile = String((parsed as any).name ?? parsed._[2] ?? "").trim();
        if (!profile) throw new Error("Usage: pisay profile set <name>");
        const result = await setProfile({ scope: "project", profile, cwd });
        logger.info(`Set ${result.scope} profile to ${result.profile}`);
        return;
      }
      if (sub === "create") {
        const name = String((parsed as any).name ?? parsed._[2] ?? "").trim();
        if (!name) throw new Error("Usage: pisay profile create <name>");
        const result = await createProfile({ scope: "global", name, cwd });
        logger.info(`Created ${result.scope} profile ${result.name}`);
        return;
      }
      throw new Error("Usage: pisay profile list | pisay profile set <name> | pisay profile create <name>");
    }
    default:
      logger.info(
        "pisay <command>\n\nCommands:\n  init                     Scaffold local .pi/settings.json for pisay\n  install <voiceId>        Install a Piper voice into Pi cache\n  install --list           List available voices\n  uninstall <voiceId>      Uninstall a Piper voice from Pi cache\n  panic                    Emergency stop: kill any ongoing speech playback\n  profile list             List configured pisay profiles\n  profile set <name>       Set project pisay profile\n  profile create <name>    Scaffold a global pisay profile"
      );
      return;
  }
}

const isMain = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (isMain) {
  runPisay(hideBin(process.argv)).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
