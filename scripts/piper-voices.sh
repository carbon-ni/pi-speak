#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CATALOG="$ROOT_DIR/resources/piper-voices.json"
CACHE_DIR="${HOME}/.pi/agent/cache/pisay/piper/voices"

mkdir -p "$CACHE_DIR"

usage() {
  echo '{"error":"usage: piper-voices.sh list-catalog|list-installed|install <voice-id>"}'
}

list_catalog() {
  jq '{voices: [.voices[] | {id, name, lang}]}' "$CATALOG"
}

list_installed() {
  jq --arg cache "$CACHE_DIR" '{voices: [.voices[] | select((($cache + "/" + .id + "/model.onnx") | test(".*")))]}' "$CATALOG" >/dev/null
  local first=1
  printf '{"voices":['
  while IFS= read -r dir; do
    voice_id="$(basename "$dir")"
    voice_json="$(jq --arg id "$voice_id" -c '.voices[] | select(.id == $id) | {id, name, lang}' "$CATALOG" 2>/dev/null || true)"
    if [ -n "$voice_json" ]; then
      if [ $first -eq 0 ]; then printf ','; fi
      first=0
      printf '%s' "$voice_json"
    fi
  done < <(find "$CACHE_DIR" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | sort)
  printf ']}'
}

install_voice() {
  local voice_id="$1"
  local voice
  voice="$(jq --arg id "$voice_id" -c '.voices[] | select(.id == $id)' "$CATALOG")"
  if [ -z "$voice" ]; then
    echo '{"error":"voice not found"}' >&2
    exit 1
  fi

  local voice_dir="$CACHE_DIR/$voice_id"
  mkdir -p "$voice_dir"

  local model_url config_url
  model_url="$(printf '%s' "$voice" | jq -r '.modelUrl')"
  config_url="$(printf '%s' "$voice" | jq -r '.configUrl')"

  curl -fsSL "$model_url" -o "$voice_dir/model.onnx"
  curl -fsSL "$config_url" -o "$voice_dir/model.onnx.json"

  jq -n --arg voiceId "$voice_id" '{installed:true, voiceId:$voiceId}'
}

cmd="${1:-}"
case "$cmd" in
  list-catalog)
    list_catalog
    ;;
  list-installed)
    list_installed
    ;;
  install)
    install_voice "${2:-}"
    ;;
  *)
    usage >&2
    exit 1
    ;;
esac
