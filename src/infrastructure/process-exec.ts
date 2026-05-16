import { spawn } from "node:child_process";

export type ExecResult = { code: number; stdout: string; stderr: string };
export type ExecLike = (command: string, args: string[]) => Promise<ExecResult>;
export type PartialExecResult = { code?: number; stdout?: string; stderr?: string };
export type PartialExecLike = (command: string, args: string[]) => Promise<PartialExecResult>;

export function normalizeExecResult(result: PartialExecResult): ExecResult {
  return {
    code: result.code ?? 0,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? ""
  };
}

export async function runChecked(exec: ExecLike, command: string, args: string[], fallbackMessage = `${command} failed`): Promise<ExecResult> {
  const result = await exec(command, args);
  if (result.code !== 0) {
    throw new Error(result.stderr || fallbackMessage);
  }
  return result;
}

export function createChildProcessExec(): ExecLike {
  return async (command, args) => await new Promise((resolve) => {
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
