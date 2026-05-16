import { createChildProcessExec, type ExecLike } from "./process-exec.js";

/**
 * Panic button.
 * Best-effort stop of any ongoing TTS / playback processes.
 *
 * Intentionally blunt: used for emergency situations.
 */
export async function panicStop(exec: ExecLike = createChildProcessExec()): Promise<void> {
  // Kill playback first so sound stops ASAP.
  await exec("pkill", ["-f", "afplay .*pi-speak-piper"]);
  // backwards compatibility
  await exec("pkill", ["-f", "afplay .*read-out-loud-piper"]);

  // Then kill engines.
  await exec("pkill", ["-x", "piper"]);
  await exec("pkill", ["-x", "say"]);
}
