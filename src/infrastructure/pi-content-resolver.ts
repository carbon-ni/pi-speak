import type { ContentResolver } from "../application/ports.js";
import type { ReadableContent } from "../domain/readable-content.js";
import { getReadableAssistantMessages, resolveReadableMessageRange, type PiSessionEntryLike } from "./pi-session-content.js";

export type SessionEntryLike = PiSessionEntryLike;

export interface SessionManagerLike {
  getBranch(): SessionEntryLike[];
}

export interface SelectionProvider {
  getSelectedText(): Promise<string | null>;
}

export class PiContentResolver implements ContentResolver {
  constructor(
    private readonly sessionManager: SessionManagerLike,
    private readonly selectionProvider: SelectionProvider
  ) {}

  async getLatestAssistantText(): Promise<ReadableContent | null> {
    const messages = getReadableAssistantMessages(this.sessionManager.getBranch());
    const latest = messages.at(-1);
    if (!latest) return null;
    return {
      sourceId: latest.id,
      sourceType: "latest",
      text: latest.text,
      createdAt: latest.createdAt,
    };
  }

  async getMessageRange(startOffset: number, endOffset: number): Promise<ReadableContent | null> {
    return resolveReadableMessageRange(getReadableAssistantMessages(this.sessionManager.getBranch()), startOffset, endOffset);
  }

  async getSelectedText(): Promise<ReadableContent | null> {
    const text = (await this.selectionProvider.getSelectedText())?.trim();
    if (!text) return null;
    return {
      sourceId: "selection",
      sourceType: "selection",
      text,
      createdAt: Date.now(),
    };
  }
}
