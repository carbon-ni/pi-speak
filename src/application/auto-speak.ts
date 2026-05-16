export interface AutoSpeakState {
  isEnabled(): boolean;
  toggle(): boolean;
  set(enabled: boolean): boolean;
}

export function createAutoSpeakState(initial = false): AutoSpeakState {
  let enabled = initial;

  return {
    isEnabled: () => enabled,
    toggle: () => {
      enabled = !enabled;
      return enabled;
    },
    set: (value: boolean) => {
      enabled = value;
      return enabled;
    }
  };
}
