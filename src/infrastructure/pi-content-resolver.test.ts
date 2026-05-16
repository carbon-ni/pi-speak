import { describe, expect, it } from "vitest";
import { PiContentResolver } from "./pi-content-resolver.js";

describe("PiContentResolver", () => {
  it("returns latest readable text", async () => {
    const resolver = new PiContentResolver(
      {
        getBranch: () => [
          { type: "message", id: "1", message: { role: "user", content: [{ type: "text", text: "hi" }], timestamp: 1 } },
          { type: "message", id: "2", message: { role: "assistant", content: [{ type: "text", text: "first" }], timestamp: 2 } },
          { type: "message", id: "3", message: { role: "assistant", content: [{ type: "text", text: "latest" }], timestamp: 3 } }
        ]
      },
      { getSelectedText: async () => null }
    );

    await expect(resolver.getLatestAssistantText()).resolves.toEqual({
      sourceId: "3",
      sourceType: "latest",
      text: "latest",
      createdAt: 3
    });
  });

  it("returns a readable message range", async () => {
    const resolver = new PiContentResolver(
      {
        getBranch: () => [
          { type: "message", id: "1", message: { role: "user", content: [{ type: "text", text: "u1" }], timestamp: 1 } },
          { type: "message", id: "2", message: { role: "assistant", content: [{ type: "text", text: "a1" }], timestamp: 2 } },
          { type: "message", id: "3", message: { role: "assistant", content: [{ type: "text", text: "a2" }], timestamp: 3 } }
        ]
      },
      { getSelectedText: async () => null }
    );

    await expect(resolver.getMessageRange(-2, 0)).resolves.toEqual({
      sourceId: "2..3",
      sourceType: "message",
      title: "range -2 0",
      text: "a1\n\na2",
      createdAt: 2
    });
  });

  it("ignores user messages for latest/range resolution", async () => {
    const resolver = new PiContentResolver(
      {
        getBranch: () => [
          { type: "message", id: "1", message: { role: "user", content: [{ type: "text", text: "u1" }], timestamp: 1 } },
          { type: "message", id: "2", message: { role: "assistant", content: [{ type: "text", text: "a1" }], timestamp: 2 } },
          { type: "message", id: "3", message: { role: "user", content: [{ type: "text", text: "u2" }], timestamp: 3 } }
        ]
      },
      { getSelectedText: async () => null }
    );

    await expect(resolver.getLatestAssistantText()).resolves.toEqual({
      sourceId: "2",
      sourceType: "latest",
      text: "a1",
      createdAt: 2
    });
  });

  it("returns selected text when available", async () => {
    const resolver = new PiContentResolver(
      { getBranch: () => [] },
      { getSelectedText: async () => " selected text " }
    );

    const result = await resolver.getSelectedText();
    expect(result?.sourceType).toBe("selection");
    expect(result?.text).toBe("selected text");
  });
});
