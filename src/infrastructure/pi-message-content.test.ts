import { describe, expect, it } from "vitest";
import { toReadableAssistantContent } from "./pi-message-content.js";

describe("toReadableAssistantContent", () => {
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

  it("ignores non-assistant and empty messages", () => {
    expect(toReadableAssistantContent({ role: "user", content: [{ type: "text", text: "hi" }] })).toBeNull();
    expect(toReadableAssistantContent({ role: "assistant", content: [{ type: "tool_result", text: "x" }] })).toBeNull();
  });
});
