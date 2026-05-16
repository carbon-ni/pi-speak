import type { PlaybackState } from "../domain/playback-state.js";
import type { ReadableContent } from "../domain/readable-content.js";

export interface SpeechEngine {
  speak(text: string): Promise<void>;
  stop(): Promise<void>;
  pause(): Promise<void>;
  resume(text: string): Promise<void>;
}

export interface ContentResolver {
  getLatestAssistantText(): Promise<ReadableContent | null>;
  getMessageRange(startOffset: number, endOffset: number): Promise<ReadableContent | null>;
  getSelectedText(): Promise<ReadableContent | null>;
}

export interface StatusPresenter {
  showState(state: PlaybackState): void;
  notifyError(message: string): void;
  notifyInfo(message: string): void;
}

export type ScriptRunResult = {
  ok: boolean;
  stdout: string;
  stderr: string;
};

export interface ScriptRunner {
  run(command: string, args: string[]): Promise<ScriptRunResult>;
}
