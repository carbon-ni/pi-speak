export type ReadAloudCommand =
  | { type: "latest" }
  | { type: "range"; startOffset: number; endOffset: number }
  | { type: "last"; count: number }
  | { type: "selection" }
  | { type: "stop" }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "status" }
  | { type: "auto" }
  | { type: "init" }
  | { type: "enable" }
  | { type: "disable" };

export const parseReadAloudCommand = (args?: string): ReadAloudCommand => {
  const value = args?.trim().toLowerCase() ?? "";
  if (!value) return { type: "latest" };

  const rangeMatch = value.match(/^(-?\d+)\s+(-?\d+)$/);
  if (rangeMatch) {
    return {
      type: "range",
      startOffset: Number(rangeMatch[1]),
      endOffset: Number(rangeMatch[2])
    };
  }

  const lastMatch = value.match(/^last\s+(\d+)$/);
  if (lastMatch) {
    return {
      type: "last",
      count: Math.max(1, Number(lastMatch[1]))
    };
  }

  switch (value) {
    case "latest":
      return { type: "latest" };
    case "selection":
      return { type: "selection" };
    case "stop":
      return { type: "stop" };
    case "pause":
      return { type: "pause" };
    case "resume":
      return { type: "resume" };
    case "status":
      return { type: "status" };
    case "auto":
      return { type: "auto" };
    case "init":
      return { type: "init" };
    case "enable":
      return { type: "enable" };
    case "disable":
      return { type: "disable" };
    default:
      return { type: "latest" };
  }
};
