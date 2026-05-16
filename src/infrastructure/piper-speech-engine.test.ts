import { describe, expect, it } from "vitest";
import { BundledPiperSpeechEngine } from "./piper-speech-engine.js";

const makeExec = () => {
  const calls: Array<{ command: string; args: string[] }> = [];
  const exec = async (command: string, args: string[]) => {
    calls.push({ command, args });
    return { code: 0, stdout: "", stderr: "" };
  };
  return { exec, calls };
};

describe("BundledPiperSpeechEngine", () => {
  it("uses bundled amy-medium model to speak text through piper", async () => {
    const { exec, calls } = makeExec();
    const engine = new BundledPiperSpeechEngine(exec, {
      modelPath: "/repo/voices/en_US-amy-medium.onnx",
      configPath: "/repo/voices/en_US-amy-medium.onnx.json",
      speakingRate: 1.15
    });

    await engine.speak("hello world");

    expect(calls).toHaveLength(3);
    expect(calls[2].command).toBe("bash");
    expect(calls[2].args[0]).toBe("-lc");
    expect(calls[2].args[1]).toContain("/repo/voices/en_US-amy-medium.onnx");
    expect(calls[2].args[1]).toContain("/repo/voices/en_US-amy-medium.onnx.json");
    expect(calls[2].args[1]).toContain("aGVsbG8gd29ybGQ=");
    expect(calls[2].args[1]).toContain("piper");
    expect(calls[2].args[1]).toContain("mktemp -t pisay-piper.XXXXXX");
    expect(calls[2].args[1]).toContain(".wav");
    expect(calls[2].args[1]).toContain("--length_scale 0.869565");
    expect(calls[2].args[1]).toContain("player=\"$(command -v afplay || command -v pw-play || command -v paplay || command -v aplay)\"");
    expect(calls[2].args[1]).toContain('nohup "$player" "$tmp"');
  });

  it("stops audio players and piper processes", async () => {
    const { exec, calls } = makeExec();
    const engine = new BundledPiperSpeechEngine(exec, {
      modelPath: "/repo/voices/en_US-amy-medium.onnx",
      configPath: "/repo/voices/en_US-amy-medium.onnx.json",
      speakingRate: 1.15
    });

    await engine.stop();

    expect(calls).toEqual([
      { command: "pkill", args: ["-f", "(afplay|pw-play|paplay|aplay) .*pisay-piper"] },
      { command: "pkill", args: ["-x", "piper"] }
    ]);
  });

  it("resumes by speaking text again", async () => {
    const { exec, calls } = makeExec();
    const engine = new BundledPiperSpeechEngine(exec, {
      modelPath: "/repo/voices/en_US-amy-medium.onnx",
      configPath: "/repo/voices/en_US-amy-medium.onnx.json",
      speakingRate: 1.15
    });

    await engine.resume("resume text");

    expect(calls).toHaveLength(3);
    expect(calls[2].args[1]).toContain("cmVzdW1lIHRleHQ=");
  });
});
