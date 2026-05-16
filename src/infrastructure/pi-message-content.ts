import type { ReadableContent } from "../domain/readable-content.js";

export function toReadableAssistantContent(message: any): ReadableContent | null {
  if (message?.role !== "assistant") return null;

  const text = (message?.content || [])
    .filter((part: any) => part.type === "text" && part.text)
    .map((part: any) => part.text)
    .join("\n")
    .trim();

  if (!text) return null;

  return {
    sourceId: message.id ?? `assistant-${message.timestamp ?? Date.now()}`,
    sourceType: "message",
    text,
    createdAt: message.timestamp ?? Date.now()
  };
}
