export type AutocompleteItem = {
  value: string;
  label: string;
};

export function getSpeakCommandCompletions(prefix: string, voiceIds: string[]): AutocompleteItem[] | null {
  const base: AutocompleteItem[] = [
    { value: "selection", label: "selection" },
    { value: "stop", label: "stop" },
    { value: "pause", label: "pause" },
    { value: "resume", label: "resume" },
    { value: "status", label: "status" },
    { value: "auto", label: "auto" },
    { value: "init", label: "init" },
    { value: "enable", label: "enable" },
    { value: "disable", label: "disable" },
    { value: "voices", label: "voices" },
    { value: "voices installed", label: "voices installed" },
    { value: "voices install", label: "voices install" },
    { value: "last 3", label: "last 3" },
    { value: "-2 0", label: "-2 0" }
  ];

  const installVoiceItems = voiceIds.map((voiceId) => ({
    value: `voices install ${voiceId}`,
    label: `voices install ${voiceId}`
  }));

  const items = [...base, ...installVoiceItems].filter((item) => item.value.startsWith(prefix));
  return items.length ? items : null;
}
