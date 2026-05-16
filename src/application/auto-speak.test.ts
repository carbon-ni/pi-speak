import { describe, expect, it } from "vitest";
import { createAutoSpeakState } from "./auto-speak.js";

describe("createAutoSpeakState", () => {
  it("defaults to off and toggles on/off", () => {
    const autoSpeak = createAutoSpeakState();

    expect(autoSpeak.isEnabled()).toBe(false);
    expect(autoSpeak.toggle()).toBe(true);
    expect(autoSpeak.isEnabled()).toBe(true);
    expect(autoSpeak.toggle()).toBe(false);
    expect(autoSpeak.isEnabled()).toBe(false);
  });

  it("can be explicitly set", () => {
    const autoSpeak = createAutoSpeakState();

    expect(autoSpeak.set(true)).toBe(true);
    expect(autoSpeak.isEnabled()).toBe(true);
    expect(autoSpeak.set(false)).toBe(false);
    expect(autoSpeak.isEnabled()).toBe(false);
  });
});
