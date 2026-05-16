import type { ReadableContent } from "../domain/readable-content.js";

export interface AutoSpeakQueue {
  enqueue(content: ReadableContent): void;
  next(): ReadableContent | undefined;
  clear(): void;
  size(): number;
}

export function createAutoSpeakQueue(): AutoSpeakQueue {
  const items: ReadableContent[] = [];
  const seen = new Set<string>();

  return {
    enqueue(content) {
      if (seen.has(content.sourceId)) return;
      items.push(content);
      seen.add(content.sourceId);
    },
    next() {
      const item = items.shift();
      if (item) seen.delete(item.sourceId);
      return item;
    },
    clear() {
      items.length = 0;
      seen.clear();
    },
    size() {
      return items.length;
    }
  };
}
