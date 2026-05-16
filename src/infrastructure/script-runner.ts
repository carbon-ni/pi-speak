import type { ScriptRunResult, ScriptRunner } from "../application/ports.js";
import { normalizeExecResult, type PartialExecLike } from "./process-exec.js";

export class PiExecScriptRunner implements ScriptRunner {
  constructor(private readonly exec: PartialExecLike) {}

  async run(command: string, args: string[]): Promise<ScriptRunResult> {
    const result = normalizeExecResult(await this.exec(command, args));
    return {
      ok: result.code === 0,
      stdout: result.stdout,
      stderr: result.stderr
    };
  }
}
