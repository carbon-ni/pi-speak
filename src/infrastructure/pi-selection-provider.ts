import type { SelectionProvider } from "./pi-content-resolver.js";
import type { ExecLike } from "./system-speech-engine.js";

export interface ClipboardReader {
  readText(): Promise<string | null>;
}

export function createPiSelectionProvider(ctx: any, clipboard = createClipboardReader()): SelectionProvider {
  return {
    async getSelectedText(): Promise<string | null> {
      const direct = await firstNonEmpty([
        () => callMaybe(ctx?.getSelectedText),
        () => callMaybe(ctx?.ui?.getSelectedText),
        () => callMaybe(ctx?.sessionManager?.getSelectedText),
        () => callMaybe(ctx?.ui?.getSelection),
        () => callMaybe(ctx?.getSelection)
      ]);
      if (direct) return direct;
      return trimToNull(await clipboard.readText());
    }
  };
}

export function createClipboardReader(exec?: ExecLike): ClipboardReader {
  const run = exec ?? defaultExec;
  return {
    async readText(): Promise<string | null> {
      for (const [command, args] of [
        ["pbpaste", []],
        ["wl-paste", ["-n"]],
        ["xclip", ["-selection", "clipboard", "-o"]],
        ["xsel", ["--clipboard", "--output"]]
      ] as const) {
        try {
          const result = await run(command, [...args]);
          if (result.code === 0) {
            const text = trimToNull(result.stdout);
            if (text) return text;
          }
        } catch {
          // ignore and continue
        }
      }
      return null;
    }
  };
}

async function firstNonEmpty(readers: Array<() => Promise<string | null>>): Promise<string | null> {
  for (const read of readers) {
    const value = trimToNull(await read());
    if (value) return value;
  }
  return null;
}

async function callMaybe(fn: unknown): Promise<string | null> {
  if (typeof fn !== "function") return null;
  const result = await fn();
  return typeof result === "string" ? result : null;
}

async function defaultExec(command: string, args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  const { spawn } = await import("node:child_process");
  return await new Promise((resolve) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", () => resolve({ code: 1, stdout: "", stderr: "" }));
    child.on("close", (code) => resolve({ code: code ?? 1, stdout, stderr }));
  });
}

function trimToNull(value: string | null | undefined): string | null {
  const text = value?.trim();
  return text ? text : null;
}
