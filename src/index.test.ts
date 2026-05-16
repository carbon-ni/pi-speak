import { describe, expect, it } from "vitest";
import registerExtension from "./index.js";

describe("extension commands", () => {
  it("silence disables speaking for session", async () => {
    const { commands, notifications, ctx } = setup();

    await commands.get("silence")!.handler(undefined, ctx);
    await commands.get("speak")!.handler(undefined, ctx);

    expect(notifications).toContain("Speaking disabled for this session");
    expect(notifications).toContain("Speaking disabled for this session. Run /speak enable");
  });

  it("speak enable re-enables reading after silence", async () => {
    const { commands, notifications, ctx } = setup();

    await commands.get("silence")!.handler(undefined, ctx);
    await commands.get("speak")!.handler("enable", ctx);
    await commands.get("speak")!.handler("status", ctx);

    expect(notifications).toContain("Speaking enabled");
    expect(notifications).toContain("Speaking enabled");
  });
});

function setup() {
  const commands = new Map<string, any>();
  const notifications: string[] = [];

  const pi = {
    registerCommand: (name: string, config: any) => commands.set(name, config),
    on: () => {},
    exec: async () => ({ code: 0, stdout: "", stderr: "" })
  };

  registerExtension(pi as any);

  const ctx = {
    sessionManager: {},
    ui: {
      notify: (message: string) => notifications.push(message),
      setStatus: () => {}
    }
  };

  return { commands, notifications, ctx };
}
