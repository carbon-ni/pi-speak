import { describe, expect, it } from "vitest";
import { normalizeForSpeech } from "./text-normalizer.js";

describe("normalizeForSpeech", () => {
  it("removes fenced code and markdown noise", () => {
    const input = "# Title\n\nhello `world` and **bold** plus *italic* and __strong__ and _em_\n\n```ts\nconst x = 1\n```\n\n[docs](https://example.com)";
    expect(normalizeForSpeech(input)).toBe("Title hello world and bold plus italic and strong and em docs");
  });

  it("removes markdown heading markers before speech", () => {
    const input = "## Current status\n\n### Next steps";
    expect(normalizeForSpeech(input)).toBe("Current status Next steps");
  });

  it("dictates fenced text blocks", () => {
    const input = "Intro\n\n```text\nPlease read this aloud.\nSecond line.\n```\n\nDone";
    expect(normalizeForSpeech(input)).toBe("Intro Please read this aloud. Second line. Done");
  });

  it("removes markdown emphasis markers", () => {
    const input = "This is *important* and **very important** and _emphasized_.";
    expect(normalizeForSpeech(input)).toBe("This is important and very important and emphasized.");
  });

  it("ignores file paths when path mode is ignore", () => {
    const input = "Open /tmp/project/src/index.ts and ./scripts/setup.sh now.";
    expect(normalizeForSpeech(input, { pathMode: "ignore" })).toBe("Open and now.");
  });

  it("keeps file paths when path mode is read", () => {
    const input = "Open /tmp/project/src/index.ts and ./scripts/setup.sh now.";
    expect(normalizeForSpeech(input, { pathMode: "read" })).toBe("Open /tmp/project/src/index.ts and ./scripts/setup.sh now.");
  });
});
