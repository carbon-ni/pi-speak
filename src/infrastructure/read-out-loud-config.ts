import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { PiperVoicePaths } from "./piper-speech-engine.js";

export type ReadOutLoudConfig = {
  piper: PiperVoicePaths;
  speech: {
    pathMode: "ignore" | "read";
    autoSpeak: boolean;
  };
  profiles: Record<string, ReadOutLoudProfile>;
  profile?: string;
};

export type ReadOutLoudProfile = {
  // Preferred: reference a locally installed voice by id.
  voiceId?: string;
  // Advanced: explicit absolute paths.
  modelPath?: string;
  configPath?: string;
  speakingRate?: number;
};

type RawConfig = {
  piper?: { modelPath?: string; configPath?: string; speakingRate?: number };
  speech?: { pathMode?: string; autoSpeak?: boolean };
  profiles?: Record<string, ReadOutLoudProfile>;
  // preferred key
  profile?: string;
  // backwards compatible key
  activeProfile?: string;
};

type SettingsFile = {
  // new namespace
  pisay?: RawConfig;
  // backwards compatible namespace
  readOutLoud?: RawConfig;
};

export async function loadReadOutLoudConfig(options?: {
  homeDir?: string;
  agentDir?: string;
  projectDir?: string;
  bundled?: PiperVoicePaths;
}): Promise<ReadOutLoudConfig> {
  const bundled = options?.bundled ?? {
    modelPath: "",
    configPath: "",
    speakingRate: 1.15
  };
  const defaults: ReadOutLoudConfig = {
    piper: bundled,
    speech: {
      pathMode: "ignore",
      autoSpeak: false
    },
    profiles: {},
    profile: undefined
  };

  const projectDir = options?.projectDir ?? process.cwd();
  const agentDir = options?.agentDir ?? process.env.PI_CODING_AGENT_DIR ?? join(options?.homeDir ?? homedir(), ".pi", "agent");
  const paths = [join(agentDir, "settings.json"), join(projectDir, ".pi", "settings.json")];

  let merged: RawConfig = {};
  for (const path of paths) {
    const parsed = await readConfigFile(path);

    // Merge legacy first, then new namespace so `pisay` wins when both exist.
    if (parsed?.readOutLoud) merged = mergeConfig(merged, parsed.readOutLoud);
    if (parsed?.pisay) merged = mergeConfig(merged, parsed.pisay);
  }

  validateConfig(merged);

  const homeDir = options?.homeDir ?? homedir();
  const cacheDir = join(homeDir, ".pi", "agent", "cache", "pisay", "piper", "voices");

  const profiles = merged.profiles ?? {};
  const selectedProfile = merged.profile ?? merged.activeProfile;

  const profilePiper = selectedProfile ? resolveProfilePiper(profiles[selectedProfile], cacheDir, bundled) : null;

  return {
    piper: profilePiper ??
      (merged.piper
        ? {
            modelPath: merged.piper.modelPath!,
            configPath: merged.piper.configPath!,
            speakingRate: merged.piper.speakingRate ?? bundled.speakingRate
          }
        : defaults.piper),
    speech: {
      pathMode: merged.speech?.pathMode === "read" ? "read" : defaults.speech.pathMode,
      autoSpeak: merged.speech?.autoSpeak ?? defaults.speech.autoSpeak
    },
    profiles,
    profile: selectedProfile
  };
}

async function readConfigFile(path: string): Promise<SettingsFile | null> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as SettingsFile;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return null;
    throw error;
  }
}

function mergeConfig(base: RawConfig, override: RawConfig): RawConfig {
  const piper = { ...base.piper, ...override.piper };
  const speech = { ...base.speech, ...override.speech };
  const profiles = { ...(base.profiles ?? {}), ...(override.profiles ?? {}) };

  return {
    piper: Object.keys(piper).length > 0 ? piper : undefined,
    speech: Object.keys(speech).length > 0 ? speech : undefined,
    profiles: Object.keys(profiles).length > 0 ? profiles : undefined,
    profile: override.profile ?? base.profile,
    activeProfile: override.activeProfile ?? base.activeProfile
  };
}

function validateConfig(config: RawConfig): void {
  if (config.speech?.pathMode != null && config.speech.pathMode !== "ignore" && config.speech.pathMode !== "read") {
    throw new Error("Invalid pisay config: speech.pathMode must be 'ignore' or 'read'");
  }
  if (config.speech?.autoSpeak != null && typeof config.speech.autoSpeak !== "boolean") {
    throw new Error("Invalid pisay config: speech.autoSpeak must be true or false");
  }
  if (config.piper && (!config.piper.modelPath || !config.piper.configPath)) {
    throw new Error("Invalid pisay config: piper.modelPath and piper.configPath are both required");
  }
  if (config.piper?.speakingRate != null && config.piper.speakingRate <= 0) {
    throw new Error("Invalid pisay config: piper.speakingRate must be greater than 0");
  }

  const selectedProfile = config.profile ?? config.activeProfile;
  if (selectedProfile != null && (!config.profiles || !config.profiles[selectedProfile])) {
    throw new Error("Invalid pisay config: profile must refer to an existing profile");
  }

  if (config.profiles) {
    for (const [key, profile] of Object.entries(config.profiles)) {
      if (!key.trim()) throw new Error("Invalid pisay config: profile key must be non-empty");
      if (profile.speakingRate != null && profile.speakingRate <= 0) {
        throw new Error("Invalid pisay config: profile.speakingRate must be greater than 0");
      }
      const hasPaths = Boolean(profile.modelPath || profile.configPath);
      if (hasPaths && (!profile.modelPath || !profile.configPath)) {
        throw new Error("Invalid pisay config: profile.modelPath and profile.configPath are both required when set");
      }
    }
  }
}

function resolveProfilePiper(profile: ReadOutLoudProfile | undefined, cacheDir: string, bundled: PiperVoicePaths): PiperVoicePaths | null {
  if (!profile) return null;

  const speakingRate = profile.speakingRate ?? bundled.speakingRate;

  if (profile.modelPath && profile.configPath) {
    return {
      modelPath: profile.modelPath,
      configPath: profile.configPath,
      speakingRate
    };
  }

  if (profile.voiceId) {
    return {
      modelPath: join(cacheDir, profile.voiceId, "model.onnx"),
      configPath: join(cacheDir, profile.voiceId, "model.onnx.json"),
      speakingRate
    };
  }

  return null;
}
