import { describe, expect, it } from "vitest";
import { createPiSelectionProvider, type ClipboardReader } from "./pi-selection-provider.js";

describe("createPiSelectionProvider", () => {
  it("uses ctx.getSelectedText when available", async () => {
    const provider = createPiSelectionProvider({
      getSelectedText: async () => " selected from ctx "
    });

    await expect(provider.getSelectedText()).resolves.toBe("selected from ctx");
  });

  it("uses ctx.ui.getSelectedText when available", async () => {
    const provider = createPiSelectionProvider({
      ui: {
        getSelectedText: async () => " ui selection "
      }
    });

    await expect(provider.getSelectedText()).resolves.toBe("ui selection");
  });

  it("falls back to clipboard when context has no selection API", async () => {
    const clipboard: ClipboardReader = {
      readText: async () => " clipboard selection "
    };
    const provider = createPiSelectionProvider({}, clipboard);

    await expect(provider.getSelectedText()).resolves.toBe("clipboard selection");
  });

  it("returns null when all providers are empty", async () => {
    const clipboard: ClipboardReader = {
      readText: async () => "  "
    };
    const provider = createPiSelectionProvider({}, clipboard);

    await expect(provider.getSelectedText()).resolves.toBeNull();
  });
});
