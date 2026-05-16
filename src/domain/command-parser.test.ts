import { describe, expect, it } from "vitest";
import { parseReadAloudCommand } from "./command-parser.js";

describe("parseReadAloudCommand", () => {
  it("defaults to latest", () => {
    expect(parseReadAloudCommand()).toEqual({ type: "latest" });
    expect(parseReadAloudCommand("   ")).toEqual({ type: "latest" });
  });

  it("parses known commands", () => {
    expect(parseReadAloudCommand("latest")).toEqual({ type: "latest" });
    expect(parseReadAloudCommand("selection")).toEqual({ type: "selection" });
    expect(parseReadAloudCommand("stop")).toEqual({ type: "stop" });
    expect(parseReadAloudCommand("pause")).toEqual({ type: "pause" });
    expect(parseReadAloudCommand("resume")).toEqual({ type: "resume" });
    expect(parseReadAloudCommand("status")).toEqual({ type: "status" });
    expect(parseReadAloudCommand("auto")).toEqual({ type: "auto" });
    expect(parseReadAloudCommand("init")).toEqual({ type: "init" });
    expect(parseReadAloudCommand("enable")).toEqual({ type: "enable" });
    expect(parseReadAloudCommand("disable")).toEqual({ type: "disable" });
  });

  it("parses message ranges", () => {
    expect(parseReadAloudCommand("-2 0")).toEqual({ type: "range", startOffset: -2, endOffset: 0 });
    expect(parseReadAloudCommand("0 0")).toEqual({ type: "range", startOffset: 0, endOffset: 0 });
  });

  it("parses last count", () => {
    expect(parseReadAloudCommand("last 3")).toEqual({ type: "last", count: 3 });
  });
});
