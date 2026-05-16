import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

export type PiExtensionSettingsOptions = {
  namespace: string | string[];
  homeDir?: string;
  agentDir?: string;
  projectDir?: string;
};

type SettingsFile = Record<string, unknown>;
type SettingsObject = Record<string, unknown>;

export async function loadPiExtensionSettings<T extends SettingsObject>(options: PiExtensionSettingsOptions): Promise<Partial<T>> {
  const projectDir = options.projectDir ?? process.cwd();
  const agentDir = options.agentDir ?? process.env.PI_CODING_AGENT_DIR ?? join(options.homeDir ?? homedir(), ".pi", "agent");
  const paths = [join(agentDir, "settings.json"), join(projectDir, ".pi", "settings.json")];
  const namespaces = Array.isArray(options.namespace) ? options.namespace : [options.namespace];

  let merged: SettingsObject = {};
  for (const path of paths) {
    const parsed = await readSettingsFile(path);
    if (!parsed) continue;

    for (const namespace of namespaces) {
      const value = parsed[namespace];
      if (isSettingsObject(value)) merged = deepMerge(merged, value);
    }
  }

  return merged as Partial<T>;
}

async function readSettingsFile(path: string): Promise<SettingsFile | null> {
  try {
    const parsed = JSON.parse(await readFile(path, "utf8")) as unknown;
    return isSettingsObject(parsed) ? parsed : null;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return null;
    throw error;
  }
}

function deepMerge(base: SettingsObject, override: SettingsObject): SettingsObject {
  const merged: SettingsObject = { ...base };

  for (const [key, overrideValue] of Object.entries(override)) {
    const baseValue = merged[key];
    if (isSettingsObject(baseValue) && isSettingsObject(overrideValue)) {
      merged[key] = deepMerge(baseValue, overrideValue);
      continue;
    }

    merged[key] = overrideValue;
  }

  return merged;
}

function isSettingsObject(value: unknown): value is SettingsObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
