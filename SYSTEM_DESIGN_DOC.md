# Read Out Loud — System Design Doc

## Status
- Planned
- No implementation yet

## Problem
Pi can read and write text well, but long assistant responses are tiring to consume visually.
Need local, low-friction text-to-speech for latest assistant output, selected message text, and explicit user-triggered reads.

## Goals
- Read assistant output aloud inside pi
- Keep user in control: start, pause, resume, stop, skip
- Prefer local / OS voices first
- Work without external network by default
- Deterministic command behavior
- Small surface area; no surprise autoplay

## Non-goals
- Browser page scraping
- Premium cloud voice marketplace
- Background account system
- Cross-device sync
- Always-on microphone / speech recognition
- Silent collection of conversation data

## Success criteria
- User can run a command to read latest assistant message aloud
- User can stop/pause/resume without losing session state
- Extension can read explicit text selection when editor/UI exposes it
- Default path uses local TTS engine only
- Cloud/provider-based voices are optional and explicit
- Failures are visible and recoverable

## Primary use cases
1. Read latest assistant answer
2. Read current message under cursor/focus
3. Read selected text from editor/transcript
4. Replay from current paragraph/sentence
5. Change voice, rate, pitch, volume
6. Stop automatically when session changes or message source disappears

## Principles
- Local first
- Explicit over implicit
- One obvious way to start reading
- No hidden network calls
- State machine over ad-hoc flags
- UI controls mirror command surface

## User experience

### Commands
- `/speak` — read latest assistant message
- `/speak -2 0` — read assistant message range
- `/speak last 3` — read last 3 assistant messages
- `/speak selection` — read selected text
- `/speak stop`
- `/speak pause`
- `/speak resume`
- `/speak next`
- `/speak prev`
- `/speak voice <id>`
- `/speak rate <value>`
- `/speak volume <value>`
- `/speak pitch <value>`
- `/speak status`

### Optional keybindings
- `Alt+P` play/pause
- `Alt+O` stop
- `Alt+,` rewind sentence/paragraph
- `Alt+.` forward sentence/paragraph

### Visible UI
- Small footer/player state in status area
- Current voice + rate + playback state
- Reading source label: `latest`, `selection`, `message:<id>`
- Error toast on failure

## High-level architecture

```text
pi events / commands
        |
        v
ReadOutLoudController
        |
        +--> ContentResolver
        |       - latest assistant message
        |       - selected text
        |       - focused message
        |
        +--> TextChunker
        |       - normalize text
        |       - split into paragraphs/sentences/chunks
        |
        +--> PlaybackStateMachine
        |       - idle
        |       - loading
        |       - playing
        |       - paused
        |       - stopped
        |       - error
        |
        +--> SpeechEngineAdapter
                - MacOSSayEngine / WebSpeech / future cloud adapters
```

## Main components

### 1) Extension entrypoint
Responsibility:
- register commands
- subscribe to pi lifecycle events
- wire UI updates
- load config

Likely file:
- `src/index.ts`

### 2) ReadOutLoudController
Responsibility:
- orchestration boundary
- validate command args
- resolve content source
- start/stop/pause/resume playback
- update UI state

Notes:
- no direct TTS implementation logic here
- depends on interfaces only

### 3) ContentResolver
Responsibility:
- extract readable text from pi session state
- choose source by command intent
- strip code fences optionally
- ignore empty/system-only/tool-only content

Public interface sketch:
```ts
interface ContentResolver {
  getLatestAssistantText(ctx: PiContext): Promise<ReadableContent | null>
  getSelectedText(ctx: PiContext): Promise<ReadableContent | null>
  getFocusedMessageText(ctx: PiContext): Promise<ReadableContent | null>
}
```

### 4) TextNormalizer + TextChunker
Responsibility:
- convert markdown-ish output into speakable text
- preserve list order
- decide what to do with code blocks, tables, links
- split text into stable chunks for pause/seek/restart

Rules:
- collapse repeated whitespace
- speak headings with short pause
- by default skip code fences, optionally read inline code verbatim
- render links as label first, URL optional by setting
- chunk by paragraph, fallback to sentence

### 5) PlaybackStateMachine
Responsibility:
- single source of truth for playback state
- reject invalid transitions
- carry cursor position and source metadata

State:
```ts
type PlaybackState =
  | { type: 'idle' }
  | { type: 'loading', source: ReadableContent }
  | { type: 'playing', source: ReadableContent, chunkIndex: number }
  | { type: 'paused', source: ReadableContent, chunkIndex: number }
  | { type: 'error', message: string }
```

Transitions:
- `idle -> loading -> playing`
- `playing -> paused -> playing`
- `playing -> idle`
- `playing -> error`
- `session_switch -> idle`
- `message_deleted/source_missing -> idle`

### 6) SpeechEngineAdapter
Responsibility:
- abstract concrete TTS backend
- enumerate voices
- speak chunk
- stop/pause/resume if backend supports it

Interface sketch:
```ts
interface SpeechEngine {
  name(): string
  listVoices(): Promise<Voice[]>
  speak(input: SpeakRequest): Promise<PlaybackHandle>
  stop(): Promise<void>
  pause?(): Promise<void>
  resume?(): Promise<void>
  isAvailable(): Promise<boolean>
}
```

## Engine strategy

### Default engine: local OS TTS
Prefer local commands and native APIs.

Candidate order:
1. macOS `say`
2. platform-native API exposed by pi runtime, if available
3. browser/web speech only if extension host supports it reliably

Why:
- zero network
- low privacy risk
- simple install story
- predictable failure modes

### Optional engines
Later, explicit opt-in only:
- OpenAI TTS
- ElevenLabs
- local Piper service

Rules for optional engines:
- disabled by default
- config requires explicit provider selection
- UI indicates remote provider in use
- no fallback from local to remote without explicit consent

## Data model

```ts
type ReadableContent = {
  sourceId: string
  sourceType: 'latest' | 'selection' | 'message'
  title?: string
  text: string
  createdAt: number
}

type VoiceConfig = {
  engine: 'system' | 'openai' | 'piper'
  voiceId: string | null
  rate: number
  pitch: number
  volume: number
}

type ExtensionConfig = {
  autoReadNewAssistantMessages: boolean
  skipCodeBlocks: boolean
  speakInlineCode: boolean
  maxCharsPerChunk: number
  preferredEngine: 'system' | 'openai' | 'piper'
  preferredVoiceId: string | null
  rate: number
  pitch: number
  volume: number
}
```

## Pi extension integration

### Extension packaging and discovery
This feature will integrate as a normal pi TypeScript extension.
Preferred placement for hot reload:
1. project-local `.pi/extensions/pisay/`
2. global `~/.pi/agent/extensions/pisay/`

Package-style manifest:
```json
{
  "name": "pisay",
  "type": "module",
  "pi": {
    "extensions": ["./src/index.ts"]
  }
}
```

Entrypoint contract:
```ts
export default function (pi: ExtensionAPI) {
  // register commands, events, UI integrations
}
```

### Integration style
This extension should be command-driven, not tool-driven, for the MVP.

Why:
- user-initiated audio is explicit
- avoids surprise autoplay triggered by the LLM
- fits pi extension APIs well: commands, events, `ctx.ui`, session state

Therefore the first release should use:
- `pi.registerCommand()` for control surface
- `pi.on(...)` for lifecycle integration
- `ctx.ui.setStatus()` and `ctx.ui.notify()` for UI
- `ctx.sessionManager` for content resolution
- `pi.appendEntry()` for persisted extension state

Not in MVP:
- custom tool callable by the LLM
- automatic reading of every response by default
- remote provider fallback without user action

### Command integration
Primary interface will be slash commands:
- `/speak`
- `/speak -2 0`
- `/speak last 3`
- `/speak selection`
- `/speak stop`
- `/speak pause`
- `/speak resume`
- `/speak status`

The default `/speak` behavior should resolve to the safest obvious action:
- read latest assistant message

### Session integration
Readable content should come from pi session state first.
Primary source for MVP:
- `ctx.sessionManager.getBranch()`

Resolution order:
1. explicit command source, e.g. `selection`
2. focused message, if pi exposes it cleanly
3. latest assistant message on current branch

The extension must ignore:
- tool result messages as speech source by default
- system/internal extension state entries
- empty assistant messages

### UI integration
Use lightweight pi UI primitives first.

MVP UI:
- `ctx.ui.setStatus("pisay", "...")` for playback state
- `ctx.ui.notify(...)` for errors and user feedback

Optional later UI:
- custom footer component for richer player state
- keyboard shortcut registration
- custom picker for voice selection

### Runtime integration
Speech playback should run behind an adapter managed by the extension runtime.
For macOS MVP, use local `say` through a process boundary.

Rules:
- exactly one active playback per session
- stop playback on `session_switch`
- stop playback on `session_shutdown`
- treat process cleanup as mandatory, not best-effort

### Persistence integration
Persist user preferences and minimal playback metadata via extension state.
Use `pi.appendEntry("pisay-state", data)` for durable, branch-aware restoration where needed.

Persist:
- chosen engine
- chosen voice
- rate
- pitch
- volume

Avoid persisting:
- raw spoken conversation text
- provider secrets
- large synthesized payloads

### Future optional tool integration
A custom tool may be added later only if we explicitly want the LLM to trigger reading.
If added, it must stay opt-in and disabled by default.
Reason: speech output is user-facing side effect, so explicit user commands are the safer default.

## Config
Pi-style lookup:
1. project-local `.pi/pisay.json`
2. global `~/.pi/agent/pisay.json`

Example:
```json
{
  "autoReadNewAssistantMessages": false,
  "skipCodeBlocks": true,
  "speakInlineCode": false,
  "maxCharsPerChunk": 800,
  "preferredEngine": "system",
  "preferredVoiceId": "Samantha",
  "rate": 1,
  "pitch": 1,
  "volume": 1
}
```

## Event integration
Subscribe to:
- `session_start` — initialize state and restore preferences
- `session_switch` — stop playback, clear stale source
- `session_shutdown` — terminate active process and cleanup resources
- `message_end` — allow latest message to be read
- `message_update` — ignore partial stream by default, unless future streaming mode enabled
- `turn_end` — finalize latest readable snapshot

Policy:
- read finalized content, not mid-stream text, unless user opts into streaming
- do not auto-play on `message_end` in MVP
- extension commands are first-class control surface; events support state sync, not surprise behavior

## Error handling
Failures must be explicit.

Examples:
- no readable text found
- engine unavailable
- chosen voice missing
- playback interrupted
- config invalid

Behavior:
- show toast / status line error
- transition to `error`, then `idle`
- never silently switch to remote provider

## Privacy and security

### Default posture
- local only
- no network needed
- no account needed
- no telemetry

### If remote engines added later
- explicit opt-in
- provider endpoint shown in UI/config
- redact or warn for sensitive text if requested
- document exactly what text leaves local machine

### Sensitive data
Conversation text can contain secrets.
Therefore:
- default engine must be local
- remote mode must be obvious
- logs must not persist spoken text by default

## Accessibility
- keyboard-first controls
- clear status labels
- voice/rate persisted between sessions
- no visual-only state changes
- stop command must always work even during engine failure recovery

## Performance
- Chunk lazily, not whole-document synthesis when possible
- Cap chunk size to avoid long blocking operations
- Reuse normalized content snapshot for current source
- Single active playback per session

## Observability
Minimal logs:
- engine selected
- playback start/stop
- state transition
- non-sensitive error reason

Avoid logging:
- raw conversation text
- API keys
- secret-looking strings

## Testing strategy
TDD first.

### Unit tests
- command parsing
- content resolution
- text normalization
- chunking behavior
- state transitions
- config normalization

### Integration tests
- latest assistant message -> play request sent
- stop on session switch
- voice change reflected in next playback
- error path when no engine available

### Contract tests
- SpeechEngineAdapter behavior via fake engine
- identical command input => identical state transitions

### Manual verification
- macOS local voice playback works
- pause/resume/stop works repeatedly
- selection reading works
- no network traffic in default mode

## Proposed project structure

Preferred runtime location for actual pi integration:

```text
.pi/extensions/pisay/
  SYSTEM_DESIGN_DOC.md
  README.md
  package.json
  src/
    index.ts
    application/
      read-out-loud-controller.ts
    domain/
      playback-state.ts
      readable-content.ts
      text-chunker.ts
      text-normalizer.ts
      voice-config.ts
    infrastructure/
      config-store.ts
      pi-content-resolver.ts
      system-speech-engine.ts
      process-runner.ts
      status-view.ts
    tests/
      *.test.ts
```

If this repository exposes extensions as a package, the same extension can also live under:

```text
pi/agent/extensions/pisay/
```

with `package.json` declaring:

```json
{
  "pi": {
    "extensions": ["./src/index.ts"]
  }
}
```

## Proposed milestones

### Milestone 1 — local MVP
- `/readaloud latest`
- `/readaloud stop`
- system engine only
- basic footer status
- deterministic tests

### Milestone 2 — selection + controls
- selection source
- pause/resume
- next/prev chunk
- config file support

### Milestone 3 — richer UX
- voice picker
- rate/pitch/volume commands
- focused message source
- optional keybindings

### Milestone 4 — optional providers
- explicit provider adapter model
- opt-in remote engines
- privacy warnings

## Open questions
- What exact pi API exposes focused message / selected transcript text?
- Is there a stable footer/status API to render player controls?
- Does pi permit long-running child processes cleanly across session switches?
- Should code blocks be skipped, summarized, or read with special pronunciation mode?
- Should streaming assistant output be speakable before message end?

## Recommendation
Start with a strict local-only MVP using macOS `say`.
That gives best privacy, lowest complexity, and fastest path to value.
Design adapters now so future engines stay isolated from core playback logic.
