# Voice source

## Brave extension: Read Aloud

Extension investigated:
- name: `Read Aloud: A Text to Speech Voice Reader`
- id: `hdhinadidafjejdhmfkjgnolgimiaplp`

## Where downloaded voices are stored

Downloaded Piper voices are not stored inside extension code directory.

They are stored in Brave profile site storage, under Chromium WebStorage FileSystem:

- base dir:
  - `~/Library/Application Support/BraveSoftware/Brave-Browser/Default/WebStorage/112/FileSystem/`

Relevant files found for `amy-medium`:
- metadata/index:
  - `~/Library/Application Support/BraveSoftware/Brave-Browser/Default/WebStorage/112/FileSystem/t/01/00000101`
- likely model blob:
  - `~/Library/Application Support/BraveSoftware/Brave-Browser/Default/WebStorage/112/FileSystem/t/00/00000005`
- likely companion JSON:
  - `~/Library/Application Support/BraveSoftware/Brave-Browser/Default/WebStorage/112/FileSystem/t/00/00000003`

## Evidence

String search found these entries:
- `en_US-amy-medium`
- `en/en_US/amy/medium/en_US-amy-medium.onnx`
- `en/en_US/amy/medium/en_US-amy-medium.onnx.json`

These were found in:
- `~/Library/Application Support/BraveSoftware/Brave-Browser/Default/WebStorage/112/FileSystem/t/01/00000101`

Observed file sizes in same store:
- `t/00/00000005` ≈ `61 MB`
- `t/00/00000009` ≈ `61 MB`
- `t/00/00000003` ≈ `4.8 KB`
- `t/00/00000007` ≈ `4.9 KB`

This matches expected pattern:
- `.onnx` model => large blob
- `.onnx.json` => small metadata/config

## Important note

Chromium stores these as internal numbered files, not friendly filenames.

So `amy-medium` exists as Brave-managed FileSystem storage with a path mapping to:
- `en/en_US/amy/medium/en_US-amy-medium.onnx`
- `en/en_US/amy/medium/en_US-amy-medium.onnx.json`

but on disk the payload is stored as numbered blobs.

## Example config

User-local config file:
- `~/.pi/agent/pisay.json`

Example repo file:
- `pi/agent/extensions/pisay/pisay.example.json`

Example:

```json
{
  "piper": {
    "modelPath": "/absolute/path/to/en_US-amy-medium.onnx",
    "configPath": "/absolute/path/to/en_US-amy-medium.onnx.json",
    "speakingRate": 1.25
  }
}
```
