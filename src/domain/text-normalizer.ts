export type SpeechNormalizationOptions = {
  pathMode?: "ignore" | "read";
};

export const normalizeForSpeech = (
  text: string,
  options: SpeechNormalizationOptions = {}
): string => {
  const pathMode = options.pathMode ?? "read";
  const withoutPaths = pathMode === "ignore" ? stripPaths(text) : text;

  return withoutPaths
    .replace(/```text\s*\n([\s\S]*?)```/gi, "$1")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(^|\s)(\*|_)([^*_]+)(\2)(?=\s|[.,!?;:]|$)/g, "$1$3")
    .replace(/\s+/g, " ")
    .trim();
};

function stripPaths(text: string): string {
  return text
    .replace(/(?:\.?\.?\/|\/)[\w./-]+/g, " ")
    .replace(/\b[\w.-]+\/(?:[\w.-]+\/)*[\w.-]+\b/g, " ");
}
