import type { ReadableContent } from "./readable-content.js";

export type PlaybackState =
  | { type: "idle" }
  | { type: "loading"; source: ReadableContent }
  | { type: "playing"; source: ReadableContent }
  | { type: "paused"; source: ReadableContent }
  | { type: "error"; message: string };

export const idleState = (): PlaybackState => ({ type: "idle" });
