import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { loadReadOutLoudConfig } from "./read-out-loud-config.js";

type SettingsFile = Record<string, unknown> & {
  pisay?: Record<string, unknown>;
  // backwards compatible
  readOutLoud?: Record<string, unknown>;
};

export async function listReadOutLoudProfiles(options?: { cwd?: string; homeDir?: string }): Promise<string[]> {
  const cwd = options?.cwd ?? process.cwd();
  const config = await loadReadOutLoudConfig({ projectDir: cwd, homeDir: options?.homeDir });
  return Object.keys(config.profiles ?? {}).sort();
}

function resolveSettingsPath(options: { scope: "project" | "global"; cwd: string; homeDir?: string; agentDir?: string }): string {
  if (options.scope === "project") return join(options.cwd, ".pi", "settings.json");
  return join(options.agentDir ?? process.env.PI_CODING_AGENT_DIR ?? join(options.homeDir ?? homedir(), ".pi", "agent"), "settings.json");
}

export async function setReadOutLoudProfile(options: {
  scope: "project" | "global";
  profile: string;
  cwd?: string;
  homeDir?: string;
  agentDir?: string;
}): Promise<{ scope: "project" | "global"; profile: string; path: string; created: boolean }> {
  const cwd = options.cwd ?? process.cwd();
  const targetPath = resolveSettingsPath({ scope: options.scope, cwd, homeDir: options.homeDir, agentDir: options.agentDir });

  const existing = await readSettings(targetPath);
  const created = existing == null;
  const prev = (existing?.pisay as any) ?? (existing?.readOutLoud as any) ?? {};
  const next: SettingsFile = {
    ...(existing ?? {}),
    pisay: {
      ...prev,
      profile: options.profile
    }
  };

  await mkdir(join(targetPath, ".."), { recursive: true });
  await writeFile(targetPath, `${JSON.stringify(next, null, 2)}\n`);
  return { scope: options.scope, profile: options.profile, path: targetPath, created };
}

export async function createReadOutLoudProfile(options: {
  scope: "project" | "global";
  name: string;
  cwd?: string;
  homeDir?: string;
  agentDir?: string;
}): Promise<{ scope: "project" | "global"; name: string; path: string; created: boolean }> {
  const cwd = options.cwd ?? process.cwd();
  const targetPath = resolveSettingsPath({ scope: options.scope, cwd, homeDir: options.homeDir, agentDir: options.agentDir });

  const existing = await readSettings(targetPath);
  const created = existing == null;

  const prev = (existing?.pisay as any) ?? (existing?.readOutLoud as any) ?? {};
  const currentProfiles = (prev.profiles ?? {}) as Record<string, unknown>;

  const next: SettingsFile = {
    ...(existing ?? {}),
    pisay: {
      ...prev,
      profiles: {
        ...currentProfiles,
        [options.name]: {
          speakingRate: 1.15
        }
      }
    }
  };

  await mkdir(join(targetPath, ".."), { recursive: true });
  await writeFile(targetPath, `${JSON.stringify(next, null, 2)}\n`);
  return { scope: options.scope, name: options.name, path: targetPath, created };
}

async function readSettings(path: string): Promise<SettingsFile | null> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as SettingsFile;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return null;
    throw error;
  }
}
