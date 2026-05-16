import type { SpeechEngine } from "../application/ports.js";
import type { ExecLike } from "./system-speech-engine.js";

export type PiperVoicePaths = {
  modelPath: string;
  configPath: string;
  speakingRate: number;
};

export class BundledPiperSpeechEngine implements SpeechEngine {
  constructor(
    private readonly exec: ExecLike,
    private readonly voice: PiperVoicePaths
  ) {}

  async speak(text: string): Promise<void> {
    await this.stop();
    const script = this.createSpeakScript(text);
    const result = await this.exec("bash", ["-lc", script]);
    if (result.code !== 0) {
      throw new Error(result.stderr || "piper failed");
    }
  }

  async stop(): Promise<void> {
    await this.exec("pkill", ["-f", "(afplay|pw-play|paplay|aplay) .*pi-speak-piper"]);
    await this.exec("pkill", ["-x", "piper"]);
  }

  async pause(): Promise<void> {
    await this.stop();
  }

  async resume(text: string): Promise<void> {
    await this.speak(text);
  }

  private createSpeakScript(text: string): string {
    const encoded = Buffer.from(text, "utf8").toString("base64");
    const modelPath = shellQuote(this.voice.modelPath);
    const configPath = shellQuote(this.voice.configPath);
    const lengthScale = (1 / this.voice.speakingRate).toFixed(6);
    return [
      "set -euo pipefail",
      'tmp="$(mktemp -t pi-speak-piper.XXXXXX).wav"',
      `printf %s ${shellQuote(encoded)} | base64 --decode | piper --model ${modelPath} --config ${configPath} --length_scale ${lengthScale} --output_file \"$tmp\"`,
      'player="$(command -v afplay || command -v pw-play || command -v paplay || command -v aplay)"',
      'nohup "$player" "$tmp" >/dev/null 2>&1 &'
    ].join("; ");
  }
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}
