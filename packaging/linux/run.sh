#!/usr/bin/env bash
set -Eeuo pipefail
here="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
binary="$here/bin/musicmenker-spatial-sound-effects"
if [[ ! -x "$binary" ]]; then
  printf 'MusicMenker: executable not found: %s\n' "$binary" >&2
  exit 1
fi
if command -v ldd >/dev/null 2>&1; then
  missing="$(ldd "$binary" 2>&1 | grep 'not found' || true)"
  if [[ -n "$missing" ]]; then
    printf 'MusicMenker: required Linux runtime libraries are missing:\n%s\n' "$missing" >&2
    exit 1
  fi
fi
exec "$binary" "$@"
