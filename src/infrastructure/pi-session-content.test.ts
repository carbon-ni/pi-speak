import { describe, expect, it } from "vitest";
import { getReadableAssistantMessages, resolveReadableMessageRange, toReadableAssistantContent } from "./pi-session-content.js";

describe("pi session content", () => {
  it("extracts readable assistant message content", () => {
    const result = toReadableAssistantContent({
      id: "m1",
      role: "assistant",
      timestamp: 123,
      content: [
        { type: "text", text: "hello" },
        { type: "text", text: "world" }
      ]
    });

    expect(result).toEqual({
      sourceId: "m1",
      sourceType: "message",
      text: "hello\nworld",
      createdAt: 123
    });
  });

  it("filters branch entries to readable assistant messages", () => {
    const messages = getReadableAssistantMessages([
      { type: "message", id: "1", message: { role: "user", content: [{ type: "text", text: "hi" }], timestamp: 1 } },
      { type: "message", id: "2", message: { role: "assistant", content: [{ type: "text", text: "a1" }], timestamp: 2 } },
      { type: "tool", id: "3" },
      { type: "message", id: "4", message: { role: "assistant", content: [{ type: "tool_result", text: "x" }], timestamp: 4 } }
    ]);

    expect(messages).toEqual([{ id: "2", text: "a1", createdAt: 2 }]);
  });

  it("resolves negative offsets to a readable assistant message range", () => {
    const range = resolveReadableMessageRange(
      [
        { id: "1", text: "a1", createdAt: 1 },
        { id: "2", text: "a2", createdAt: 2 },
        { id: "3", text: "a3", createdAt: 3 }
      ],
      -1,
      0
    );

    expect(range).toEqual({
      sourceId: "2..3",
      sourceType: "message",
      title: "range -1 0",
      text: "a2\n\na3",
      createdAt: 2
    });
  });

  it("rejects positive range offsets", () => {
    expect(resolveReadableMessageRange([{ id: "1", text: "a1", createdAt: 1 }], 1, 0)).toBeNull();
  });
});
