import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { runPisay } from "./pisay.js";

describe("createPisayCli", () => {
  it("scaffolds local project settings on init", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "pisay-cli-"));
    const logger = { info: vi.fn() };

    await runPisay(["init"], { cwd, logger });

    const saved = JSON.parse(await readFile(join(cwd, ".pi", "settings.json"), "utf8"));
    expect(saved).toEqual({
      pisay: {
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

    await runPisay([], { cwd: process.cwd(), logger });

    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining("pisay <command>"));
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining("init"));
  });

  it("installs a voice on install", async () => {
    const logger = { info: vi.fn() };
    const install = vi.fn(async () => ({ installed: true, voiceId: "ar_JO-kareem-low" }));

    await runPisay(["install", "ar_JO-kareem-low"], { cwd: process.cwd(), logger, install });

    expect(install).toHaveBeenCalledWith("ar_JO-kareem-low");
    expect(logger.info).toHaveBeenCalledWith("Installed ar_JO-kareem-low");
  });

  it("lists voices on install --list", async () => {
    const logger = { info: vi.fn() };
    const listAvailable = vi.fn(async () => ["a", "b"]);

    await runPisay(["install", "--list", "availables"], { cwd: process.cwd(), logger, listAvailable });

    expect(listAvailable).toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith("a\nb");
  });

  it("uninstalls a voice on uninstall", async () => {
    const logger = { info: vi.fn() };
    const uninstall = vi.fn(async () => ({ removed: true, voiceId: "ar_JO-kareem-low" }));

    await runPisay(["uninstall", "ar_JO-kareem-low"], { cwd: process.cwd(), logger, uninstall });

    expect(uninstall).toHaveBeenCalledWith("ar_JO-kareem-low");
    expect(logger.info).toHaveBeenCalledWith("Uninstalled ar_JO-kareem-low");
  });

  it("lists profiles", async () => {
    const logger = { info: vi.fn() };
    const listProfiles = vi.fn(async () => ["amy", "kareem"]);

    await runPisay(["profile", "list"], { cwd: process.cwd(), logger, listProfiles });

    expect(listProfiles).toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith("amy\nkareem");
  });

  it("sets project profile", async () => {
    const logger = { info: vi.fn() };
    const setProfile = vi.fn(async () => ({ scope: "project", profile: "kareem", path: "/p/.pi/settings.json" }));

    await runPisay(["profile", "set", "kareem"], { cwd: "/p", logger, setProfile });

    expect(setProfile).toHaveBeenCalledWith({ scope: "project", profile: "kareem", cwd: "/p" });
    expect(logger.info).toHaveBeenCalledWith("Set project profile to kareem");
  });

  it("creates a global profile scaffold", async () => {
    const logger = { info: vi.fn() };
    const createProfile = vi.fn(async () => ({ scope: "global", name: "foobar", path: "/h/.pi/agent/settings.json" }));

    await runPisay(["profile", "create", "foobar"], { cwd: "/p", logger, createProfile });

    expect(createProfile).toHaveBeenCalledWith({ scope: "global", name: "foobar", cwd: "/p" });
    expect(logger.info).toHaveBeenCalledWith("Created global profile foobar");
  });
});
