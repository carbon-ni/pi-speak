import type { ScriptRunResult, ScriptRunner } from "../application/ports.js";

export class PiExecScriptRunner implements ScriptRunner {
  constructor(private readonly exec: (command: string, args: string[]) => Promise<{ code?: number; stdout?: string; stderr?: string }>) {}

  async run(command: string, args: string[]): Promise<ScriptRunResult> {
    const result = await this.exec(command, args);
    return {
      ok: (result.code ?? 0) === 0,
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? ""
    };
  }
}
