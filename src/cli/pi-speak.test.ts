import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { runPiSpeak } from "./pi-speak.js";

describe("createPiSpeakCli", () => {
  it("scaffolds local project settings on init", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "pi-speak-cli-"));
    const logger = { info: vi.fn() };

    await runPiSpeak(["init"], { cwd, logger });

    const saved = JSON.parse(await readFile(join(cwd, ".pi", "settings.json"), "utf8"));
    expect(saved).toEqual({
      "pi-speak": {
        speech: {
          autoSpeak: false,
          pathMode: "ignore"
        }
      }
    });
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining(join(cwd, ".pi", "settings.json")));
  });

  it("prints help with no command", async () => {
    const logger = { info: vi.fn() };

    await runPiSpeak([], { cwd: process.cwd(), logger });

    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining("pi-speak <command>"));
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining("init"));
  });

  it("installs a voice on install", async () => {
    const logger = { info: vi.fn() };
    const install = vi.fn(async () => ({ installed: true, voiceId: "ar_JO-kareem-low" }));

    await runPiSpeak(["install", "ar_JO-kareem-low"], { cwd: process.cwd(), logger, install });

    expect(install).toHaveBeenCalledWith("ar_JO-kareem-low");
    expect(logger.info).toHaveBeenCalledWith("Installed ar_JO-kareem-low");
  });

  it("lists voices on install --list", async () => {
    const logger = { info: vi.fn() };
    const listAvailable = vi.fn(async () => ["a", "b"]);

    await runPiSpeak(["install", "--list", "availables"], { cwd: process.cwd(), logger, listAvailable });

    expect(listAvailable).toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith("a\nb");
  });

  it("uninstalls a voice on uninstall", async () => {
    const logger = { info: vi.fn() };
    const uninstall = vi.fn(async () => ({ removed: true, voiceId: "ar_JO-kareem-low" }));

    await runPiSpeak(["uninstall", "ar_JO-kareem-low"], { cwd: process.cwd(), logger, uninstall });

    expect(uninstall).toHaveBeenCalledWith("ar_JO-kareem-low");
    expect(logger.info).toHaveBeenCalledWith("Uninstalled ar_JO-kareem-low");
  });

  it("lists profiles", async () => {
    const logger = { info: vi.fn() };
    const listProfiles = vi.fn(async () => ["amy", "kareem"]);

    await runPiSpeak(["profile", "list"], { cwd: process.cwd(), logger, listProfiles });

    expect(listProfiles).toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith("amy\nkareem");
  });

  it("sets project profile", async () => {
    const logger = { info: vi.fn() };
    const setProfile = vi.fn(async () => ({ scope: "project", profile: "kareem", path: "/p/.pi/settings.json" }));

    await runPiSpeak(["profile", "set", "kareem"], { cwd: "/p", logger, setProfile });

    expect(setProfile).toHaveBeenCalledWith({ scope: "project", profile: "kareem", cwd: "/p" });
    expect(logger.info).toHaveBeenCalledWith("Set project profile to kareem");
  });

  it("creates a global profile scaffold", async () => {
    const logger = { info: vi.fn() };
    const createProfile = vi.fn(async () => ({ scope: "global", name: "foobar", path: "/h/.pi/agent/settings.json" }));

    await runPiSpeak(["profile", "create", "foobar"], { cwd: "/p", logger, createProfile });

    expect(createProfile).toHaveBeenCalledWith({ scope: "global", name: "foobar", cwd: "/p" });
    expect(logger.info).toHaveBeenCalledWith("Created global profile foobar");
  });
});
