import { describe, expect, it } from "vitest";
import type { ReadableContent } from "../domain/readable-content.js";
import { createAutoSpeakQueue } from "./auto-speak-queue.js";

const message = (sourceId: string, text: string): ReadableContent => ({
  sourceId,
  sourceType: "message",
  text,
  createdAt: 1
});

describe("createAutoSpeakQueue", () => {
  it("enqueues unique messages in fifo order", () => {
    const queue = createAutoSpeakQueue();

    queue.enqueue(message("1", "first"));
    queue.enqueue(message("2", "second"));
    queue.enqueue(message("1", "first"));

    expect(queue.size()).toBe(2);
    expect(queue.next()?.sourceId).toBe("1");
    expect(queue.next()?.sourceId).toBe("2");
    expect(queue.next()).toBeUndefined();
  });

  it("forgets ids after dequeue so future messages can be enqueued again", () => {
    const queue = createAutoSpeakQueue();

    queue.enqueue(message("1", "first"));
    expect(queue.next()?.sourceId).toBe("1");
    queue.enqueue(message("1", "first again"));

    expect(queue.next()?.text).toBe("first again");
  });

  it("clears queued messages and ids", () => {
    const queue = createAutoSpeakQueue();

    queue.enqueue(message("1", "first"));
    queue.enqueue(message("2", "second"));
    queue.clear();
    queue.enqueue(message("1", "first again"));

    expect(queue.size()).toBe(1);
    expect(queue.next()?.text).toBe("first again");
  });
});
