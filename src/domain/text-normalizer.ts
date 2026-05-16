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
    .replace(/```[\s\S]*?```/g, " ")
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
