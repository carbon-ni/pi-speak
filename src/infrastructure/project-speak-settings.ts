import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

type SettingsFile = Record<string, unknown> & {
  // new namespace
  "pi-speak"?: {
    speech?: {
      autoSpeak?: boolean;
      pathMode?: "ignore" | "read";
    };
  };
  // backwards compatible namespace
  readOutLoud?: {
    speech?: {
      autoSpeak?: boolean;
      pathMode?: "ignore" | "read";
    };
  };
};

export async function initProjectSpeakSettings(options?: { projectDir?: string }): Promise<{ path: string; created: boolean }> {
  const projectDir = options?.projectDir ?? process.cwd();
  const path = join(projectDir, ".pi", "settings.json");
  const existing = await readSettings(path);
  const created = existing == null;
  const prev = existing?.["pi-speak"] ?? existing?.readOutLoud;
  const next: SettingsFile = {
    ...(existing ?? {}),
    "pi-speak": {
      ...(prev ?? {}),
      speech: {
        autoSpeak: prev?.speech?.autoSpeak ?? false,
        pathMode: prev?.speech?.pathMode ?? "ignore"
      }
    }
  };

  await mkdir(join(projectDir, ".pi"), { recursive: true });
  await writeFile(path, `${JSON.stringify(next, null, 2)}\n`);
  return { path, created };
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
