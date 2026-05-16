import type { ContentResolver } from "../application/ports.js";
import type { ReadableContent } from "../domain/readable-content.js";

export interface SessionEntryLike {
  type: string;
  message?: {
    role?: string;
    content?: Array<{ type: string; text?: string }>;
    timestamp?: number;
  };
  id?: string;
}

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
    const messages = this.getReadableMessages();
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
    const messages = this.getReadableMessages();
    if (messages.length === 0) return null;

    const startIndex = this.resolveOffset(messages.length, startOffset);
    const endIndex = this.resolveOffset(messages.length, endOffset);
    if (startIndex === null || endIndex === null) return null;

    const from = Math.min(startIndex, endIndex);
    const to = Math.max(startIndex, endIndex);
    const selected = messages.slice(from, to + 1);
    if (selected.length === 0) return null;

    return {
      sourceId: `${selected[0].id}..${selected[selected.length - 1].id}`,
      sourceType: "message",
      title: `range ${startOffset} ${endOffset}`,
      text: selected.map((message) => message.text).join("\n\n"),
      createdAt: selected[0].createdAt,
    };
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

  private getReadableMessages(): Array<{ id: string; text: string; createdAt: number }> {
    return this.sessionManager
      .getBranch()
      .flatMap((entry, index) => {
        if (entry.type !== "message") return [];
        const role = entry.message?.role;
        if (role !== "assistant") return [];
        const text = (entry.message?.content || [])
          .filter((part) => part.type === "text" && part.text)
          .map((part) => part.text)
          .join("\n")
          .trim();
        if (!text) return [];
        return [{
          id: entry.id ?? `${role}-${index}`,
          text,
          createdAt: entry.message?.timestamp ?? Date.now(),
        }];
      });
  }

  private resolveOffset(length: number, offset: number): number | null {
    if (offset > 0) return null;
    const index = length - 1 + offset;
    if (index >= length) return null;
    return Math.max(0, index);
  }
}

