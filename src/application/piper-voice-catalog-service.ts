import type { ScriptRunner } from "./ports.js";

export type PiperVoice = {
  id: string;
  name: string;
  lang: string;
};

export class PiperVoiceCatalogService {
  constructor(private readonly scripts: ScriptRunner) {}

  async listCatalog(): Promise<PiperVoice[]> {
    const result = await this.scripts.run("bash", ["scripts/piper-voices.sh", "list-catalog"]);
    if (!result.ok) throw new Error(result.stderr || "Failed to list Piper catalog");
    return this.parseJson(result.stdout).voices ?? [];
  }

  async listInstalled(): Promise<PiperVoice[]> {
    const result = await this.scripts.run("bash", ["scripts/piper-voices.sh", "list-installed"]);
    if (!result.ok) throw new Error(result.stderr || "Failed to list installed Piper voices");
    return this.parseJson(result.stdout).voices ?? [];
  }

  async install(voiceId: string): Promise<{ installed: boolean; voiceId: string }> {
    const result = await this.scripts.run("bash", ["scripts/piper-voices.sh", "install", voiceId]);
    if (!result.ok) throw new Error(result.stderr || `Failed to install Piper voice ${voiceId}`);
    return this.parseJson(result.stdout);
  }

  private parseJson(text: string): any {
    return JSON.parse(text);
  }
}
