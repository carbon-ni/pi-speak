import { spawn } from "node:child_process";
import type { ExecLike } from "./system-speech-engine.js";

/**
 * Panic button.
 * Best-effort stop of any ongoing TTS / playback processes.
 *
 * Intentionally blunt: used for emergency situations.
 */
export async function panicStop(exec: ExecLike = defaultExec): Promise<void> {
  // Kill playback first so sound stops ASAP.
  await exec("pkill", ["-f", "afplay .*pisay-piper"]);
  // backwards compatibility
  await exec("pkill", ["-f", "afplay .*read-out-loud-piper"]);

  // Then kill engines.
  await exec("pkill", ["-x", "piper"]);
  await exec("pkill", ["-x", "say"]);
}

async function defaultExec(command: string, args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
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
