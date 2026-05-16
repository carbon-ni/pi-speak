import type { ReadableContent } from "../domain/readable-content.js";

export type PiMessageLike = {
  role?: string;
  content?: Array<{ type: string; text?: string }>;
  timestamp?: number;
  id?: string;
};

export type PiSessionEntryLike = {
  type: string;
  message?: PiMessageLike;
  id?: string;
};

export type ReadableMessage = {
  id: string;
  text: string;
  createdAt: number;
};

export function toReadableAssistantContent(message: PiMessageLike): ReadableContent | null {
  if (message.role !== "assistant") return null;

  const text = extractTextParts(message.content);
  if (!text) return null;

  return {
    sourceId: message.id ?? `assistant-${message.timestamp ?? Date.now()}`,
    sourceType: "message",
    text,
    createdAt: message.timestamp ?? Date.now()
  };
}

export function getReadableAssistantMessages(entries: PiSessionEntryLike[]): ReadableMessage[] {
  return entries.flatMap((entry, index) => {
    if (entry.type !== "message") return [];
    if (entry.message?.role !== "assistant") return [];

    const text = extractTextParts(entry.message.content);
    if (!text) return [];

    return [{
      id: entry.id ?? `assistant-${index}`,
      text,
      createdAt: entry.message.timestamp ?? Date.now()
    }];
  });
}

export function resolveReadableMessageRange(messages: ReadableMessage[], startOffset: number, endOffset: number): ReadableContent | null {
  if (messages.length === 0) return null;

  const startIndex = resolveOffset(messages.length, startOffset);
  const endIndex = resolveOffset(messages.length, endOffset);
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
    createdAt: selected[0].createdAt
  };
}

function extractTextParts(content: PiMessageLike["content"]): string {
  return (content ?? [])
    .filter((part) => part.type === "text" && part.text)
    .map((part) => part.text)
    .join("\n")
    .trim();
}

function resolveOffset(length: number, offset: number): number | null {
  if (offset > 0) return null;
  const index = length - 1 + offset;
  if (index >= length) return null;
  return Math.max(0, index);
}
