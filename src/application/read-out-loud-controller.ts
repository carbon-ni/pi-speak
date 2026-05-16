import { idleState, type PlaybackState } from "../domain/playback-state.js";
import { normalizeForSpeech, type SpeechNormalizationOptions } from "../domain/text-normalizer.js";
import type { ReadableContent } from "../domain/readable-content.js";
import type { ContentResolver, SpeechEngine, StatusPresenter } from "./ports.js";

export class ReadOutLoudController {
  private state: PlaybackState = idleState();

  constructor(
    private readonly resolver: ContentResolver,
    private readonly speech: SpeechEngine,
    private readonly status: StatusPresenter,
    private readonly normalization: SpeechNormalizationOptions = {}
  ) {}

  getState(): PlaybackState {
    return this.state;
  }

  async playLatest(): Promise<void> {
    const content = await this.resolver.getLatestAssistantText();
    await this.playContent(content, "No readable message to read");
  }

  async playRange(startOffset: number, endOffset: number): Promise<void> {
    const content = await this.resolver.getMessageRange(startOffset, endOffset);
    await this.playContent(content, "No readable messages found in range");
  }

  async playSelection(): Promise<void> {
    const content = await this.resolver.getSelectedText();
    await this.playContent(content, "No selected text to read");
  }

  async playReadableContent(content: ReadableContent): Promise<void> {
    await this.playContent(content, "No readable content to read");
  }

  async toggleLatest(): Promise<void> {
    if (this.state.type === "playing") return this.pause();
    if (this.state.type === "paused") return this.resume();
    return this.playLatest();
  }

  async pause(): Promise<void> {
    if (this.state.type !== "playing") return;
    await this.speech.pause();
    this.state = { type: "paused", source: this.state.source };
    this.status.showState(this.state);
  }

  async resume(): Promise<void> {
    if (this.state.type !== "paused") return;
    const text = normalizeForSpeech(this.state.source.text, this.normalization);
    await this.speech.resume(text);
    this.state = { type: "playing", source: this.state.source };
    this.status.showState(this.state);
  }

  async stop(): Promise<void> {
    await this.speech.stop();
    this.state = idleState();
    this.status.showState(this.state);
  }

  showStatus(): void {
    this.status.showState(this.state);
  }

  private async playContent(content: ReadableContent | null, emptyMessage: string): Promise<void> {
    if (!content) {
      this.status.notifyError(emptyMessage);
      return;
    }

    const text = normalizeForSpeech(content.text, this.normalization);
    if (!text) {
      this.status.notifyError(emptyMessage);
      return;
    }

    this.state = { type: "loading", source: content };
    this.status.showState(this.state);

    try {
      await this.speech.stop();
      await this.speech.speak(text);
      this.state = { type: "playing", source: content };
      this.status.showState(this.state);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.state = { type: "error", message };
      this.status.showState(this.state);
      this.status.notifyError(message);
      this.state = idleState();
      this.status.showState(this.state);
    }
  }
}
