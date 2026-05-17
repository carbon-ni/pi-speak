# pi-speak

Pi extension + CLI that reads assistant messages aloud with local Piper TTS.

## What it does

Adds `speak` and `silence` commands to Pi.

Supported commands:
- `speak` — read latest assistant message
- `speak -2 0` — read assistant message range
- `speak last 3` — read last 3 assistant messages
- `speak selection` — read selected text, falling back to clipboard text when needed
- `speak pause`
- `speak resume`
- `speak stop`
- `speak status`
- `speak enable` — re-enable speaking for current session after `silence`
- `speak disable` — disable speaking for current session
- `speak auto` — toggle auto speak for assistant messages as they finish
- `speak init` — scaffold `.pi/settings.json` with `pi-speak` defaults for current project
- `speak voices` — list catalog voices
- `speak voices installed` — list installed voices
- `speak voices install <voice-id>` — install a voice into local cache
- `silence` — stop all reading immediately and disable speaking for the rest of current session until `speak enable`

## How it works

Flow:
1. `src/index.ts` registers `speak` and `silence`
2. `src/domain/command-parser.ts` parses command args
3. `src/infrastructure/pi-content-resolver.ts` resolves latest message, range, or selection
4. `src/domain/text-normalizer.ts` removes markdown noise
5. `src/application/read-out-loud-controller.ts` manages playback state (internal name; config key is `pi-speak`)
6. `src/infrastructure/piper-speech-engine.ts` runs `piper` and `afplay`
7. `src/infrastructure/pi-status-presenter.ts` updates Pi UI status

## Requirements

## Required runtime

- macOS
- `piper` available on `PATH`
- `afplay` available on `PATH`

## External CLI dependencies

Required for speech playback:
- `piper` — text-to-speech engine
- `afplay` — audio playback on macOS

Required for voice management commands:
- network access to Hugging Face `rhasspy/piper-voices`

Optional for `speak selection` fallback:
- `pbpaste` on macOS
- `wl-paste` on Wayland
- `xclip` on X11
- `xsel` on X11

Notes:
- on macOS, `afplay`, `bash`, and `pbpaste` are typically already available
- `speak selection` works best when selected text is copied to clipboard
- without clipboard tools or a direct Pi selection API, `speak selection` may not find text to read

## Voice configuration

By default extension uses bundled voice files:
- `voices/en_US-amy-medium.onnx`
- `voices/en_US-amy-medium.onnx.json`

Config lives in standard Pi settings files, merged in this order:
- `~/.pi/agent/settings.json`
- `<project>/.pi/settings.json`

`<project>` means current working directory where `pi` is running.
Global config dir also follows `PI_CODING_AGENT_DIR` when set.

Example:

```json
{
  "pi-speak": {
    "piper": {
      "modelPath": "/absolute/path/to/model.onnx",
      "configPath": "/absolute/path/to/model.onnx.json",
      "speakingRate": 1.15
    },
    "speech": {
      "pathMode": "ignore",
      "autoSpeak": false
    }
  }
}
```

Rules:
- project settings override global settings
- nested `pi-speak` keys merge like normal Pi settings (legacy `readOutLoud` is still read for backwards compatibility)
- if no config file is found, bundled voice is used
- `piper.modelPath` and `piper.configPath` are both required when `piper` is set
- `piper.speakingRate` must be greater than `0`
- `speech.pathMode` must be `ignore` or `read`
- `speech.autoSpeak` must be `true` or `false`
- default `speech.pathMode` is `ignore`
- default `speech.autoSpeak` is `false`

## Voice install cache

Installed voices are stored under:

`~/.pi/agent/cache/pi-speak/piper/voices/<voice-id>/`

Files:
- `model.onnx`
- `model.onnx.json`

## Development

Install deps:

```bash
npm install
```

Run checks:

```bash
npm run typecheck
npm test
```

## Project layout

- `src/domain` — pure parsing, normalization, state
- `src/application` — controller and ports
- `src/infrastructure` — Pi adapters, config, scripts, process execution
- `resources/piper-voices.json` — legacy small voice catalog fixture
- `scripts/piper-voices.sh` — legacy voice list/install script

## Notes

- markdown emphasis markers like `*bold*`, `**bold**`, and `_italic_` are stripped before speech
- `speech.pathMode: "ignore"` removes file paths from spoken text
- `speech.pathMode: "read"` keeps file paths in spoken text
- `speech.autoSpeak: true` enables auto speak for that project/session path on startup
- `speak init` writes missing `pi-speak` defaults into `<project>/.pi/settings.json`
- `speak auto` toggles automatic reading of assistant messages as they arrive
- auto-speak uses a unique FIFO queue and stops on next user message
- `speak selection` first tries Pi/runtime selection hooks, then falls back to clipboard text
- playback stops on session switch
- playback stops on session shutdown
- default speech mode is local-only
- voice listing/install downloads Piper files from Hugging Face
- no remote TTS provider fallback is implemented
