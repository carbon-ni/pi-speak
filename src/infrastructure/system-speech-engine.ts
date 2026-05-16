import type { SpeechEngine } from "../application/ports.js";

export type ExecResult = { code: number; stdout: string; stderr: string };
export type ExecLike = (command: string, args: string[]) => Promise<ExecResult>;

export class MacOsSaySpeechEngine implements SpeechEngine {
  constructor(private readonly exec: ExecLike) {}

  async speak(text: string): Promise<void> {
    await this.runSay([text]);
  }

  async stop(): Promise<void> {
    await this.exec("pkill", ["-x", "say"]);
  }

  async pause(): Promise<void> {
    await this.stop();
  }

  async resume(text: string): Promise<void> {
    await this.speak(text);
  }

  private async runSay(args: string[]): Promise<void> {
    const result = await this.exec("say", args);
    if (result.code !== 0) {
      throw new Error(result.stderr || "say failed");
    }
  }
}
