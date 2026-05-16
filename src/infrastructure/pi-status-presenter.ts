import type { PlaybackState } from "../domain/playback-state.js";
import type { StatusPresenter } from "../application/ports.js";

export interface PiUiLike {
  setStatus(key: string, value: string): void;
  notify(message: string, level: "info" | "error"): void;
}

export class PiStatusPresenter implements StatusPresenter {
  constructor(private readonly ui: PiUiLike) {}

  showState(state: PlaybackState): void {
    this.ui.setStatus("pisay", this.format(state));
  }

  notifyError(message: string): void {
    this.ui.notify(message, "error");
  }

  notifyInfo(message: string): void {
    this.ui.notify(message, "info");
  }

  private format(state: PlaybackState): string {
    switch (state.type) {
      case "idle":
        return "idle";
      case "loading":
        return `loading ${state.source.sourceType}`;
      case "playing":
        return `playing ${state.source.sourceType}`;
      case "paused":
        return `paused ${state.source.sourceType}`;
      case "error":
        return `error: ${state.message}`;
    }
  }
}
