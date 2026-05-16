import type { SpeechEngine } from "../application/ports.js";
import { runChecked, type ExecLike } from "./process-exec.js";

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
    await runChecked(this.exec, "say", args, "say failed");
  }
}
