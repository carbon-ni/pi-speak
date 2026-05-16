import { describe, expect, it } from "vitest";
import { getSpeakCommandCompletions } from "./speak-command-completions.js";

describe("getSpeakCommandCompletions", () => {
  const voiceIds = ["en_US-amy-medium", "en_GB-alan-medium"];

  it("suggests top-level commands", () => {
    const items = getSpeakCommandCompletions("", voiceIds);
    expect(items).not.toBeNull();
    expect(items!.map((item) => item.value)).toContain("stop");
    expect(items!.map((item) => item.value)).toContain("auto");
    expect(items!.map((item) => item.value)).toContain("init");
    expect(items!.map((item) => item.value)).toContain("enable");
    expect(items!.map((item) => item.value)).toContain("disable");
    expect(items!.map((item) => item.value)).toContain("voices");
    expect(items!.map((item) => item.value)).toContain("last 3");
  });

  it("filters voice subcommands by prefix", () => {
    const items = getSpeakCommandCompletions("voices i", voiceIds);
    expect(items).not.toBeNull();
    expect(items!.map((item) => item.value)).toContain("voices install");
    expect(items!.map((item) => item.value)).toContain("voices installed");
  });

  it("suggests installable voice ids", () => {
    const items = getSpeakCommandCompletions("voices install en_", voiceIds);
    expect(items).not.toBeNull();
    expect(items!.map((item) => item.value)).toEqual([
      "voices install en_US-amy-medium",
      "voices install en_GB-alan-medium"
    ]);
  });

  it("returns null when no completion matches", () => {
    expect(getSpeakCommandCompletions("zzz", voiceIds)).toBeNull();
  });
});
