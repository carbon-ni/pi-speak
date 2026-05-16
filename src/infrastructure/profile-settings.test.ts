import { mkdtemp, readFile, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createReadOutLoudProfile, listReadOutLoudProfiles, setReadOutLoudProfile } from "./profile-settings.js";

describe("profile-settings", () => {
  it("lists profiles from global settings", async () => {
    const home = await mkdtemp(join(tmpdir(), "rol-home-"));
    await mkdir(join(home, ".pi", "agent"), { recursive: true });
    await writeFile(
      join(home, ".pi", "agent", "settings.json"),
      JSON.stringify({
        readOutLoud: {
          profiles: {
            amy: { voiceId: "en_US-amy-medium" },
            kareem: { voiceId: "ar_JO-kareem-low" }
          }
        }
      })
    );

    await expect(listReadOutLoudProfiles({ cwd: join(home, "project"), homeDir: home })).resolves.toEqual(["amy", "kareem"]);
  });

  it("sets project profile into <cwd>/.pi/settings.json", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "rol-project-"));

    const result = await setReadOutLoudProfile({ scope: "project", profile: "kareem", cwd });

    expect(result.scope).toBe("project");
    expect(result.profile).toBe("kareem");

    const saved = JSON.parse(await readFile(join(cwd, ".pi", "settings.json"), "utf8"));
    expect(saved["pi-speak"].profile).toBe("kareem");
  });

  it("sets global profile into ~/.pi/agent/settings.json", async () => {
    const home = await mkdtemp(join(tmpdir(), "rol-home-"));

    const result = await setReadOutLoudProfile({ scope: "global", profile: "amy", homeDir: home });

    expect(result.scope).toBe("global");
    expect(result.profile).toBe("amy");
    expect(result.path).toBe(join(home, ".pi", "agent", "settings.json"));

    const saved = JSON.parse(await readFile(join(home, ".pi", "agent", "settings.json"), "utf8"));
    expect(saved["pi-speak"].profile).toBe("amy");
  });

  it("preserves existing keys when setting profile", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "rol-project-"));
    await mkdir(join(cwd, ".pi"), { recursive: true });
    await writeFile(join(cwd, ".pi", "settings.json"), JSON.stringify({ other: 123, readOutLoud: { speech: { autoSpeak: true } } }));

    await setReadOutLoudProfile({ scope: "project", profile: "kareem", cwd });

    const saved = JSON.parse(await readFile(join(cwd, ".pi", "settings.json"), "utf8"));
    expect(saved.other).toBe(123);
    // legacy preserved
    expect(saved.readOutLoud.speech.autoSpeak).toBe(true);
    // new namespace written
    expect(saved["pi-speak"].speech.autoSpeak).toBe(true);
    expect(saved["pi-speak"].profile).toBe("kareem");
  });

  it("creates a profile scaffold in global settings", async () => {
    const home = await mkdtemp(join(tmpdir(), "rol-home-"));

    const result = await createReadOutLoudProfile({ scope: "global", name: "foobar", homeDir: home });

    expect(result.scope).toBe("global");
    expect(result.name).toBe("foobar");

    const saved = JSON.parse(await readFile(join(home, ".pi", "agent", "settings.json"), "utf8"));
    expect(saved["pi-speak"].profiles.foobar).toEqual({ speakingRate: 1.15 });
  });
});
