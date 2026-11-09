#!/usr/bin/env bash
# Build a real, checked native-binary tarball. Never downloads or installs OS packages.
set -Eeuo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."
project="$PWD"
version="$(node -e 'import("./src/data/effects.js").then(m=>console.log(m.APP_VERSION))')"
binary="${1:-src-tauri/target/release/musicmenker-spatial-sound-effects}"
output="${2:-release}"
arch="${3:-$(uname -m)}"
case "$arch" in x86_64|x64) arch=x64 ;; aarch64|arm64) arch=arm64 ;; *) echo "Unsupported Linux architecture: $arch" >&2; exit 2 ;; esac
[[ -f "$binary" && -x "$binary" ]] || { echo "Missing executable: $binary" >&2; exit 1; }
# Refuse accidentally distributing a script, stale path, or a different target format.
magic="$(od -An -tx1 -N4 "$binary" | tr -d ' \n')"
[[ "$magic" == '7f454c46' ]] || { echo 'Not an ELF executable' >&2; exit 1; }
machine="$(od -An -tu2 -j18 -N2 "$binary" | tr -d ' \n')"
case "$arch:$machine" in x64:62|arm64:183) ;; *) echo "ELF CPU mismatch: $arch (e_machine=$machine)" >&2; exit 1 ;; esac
mkdir -p -- "$output"
output="$(cd "$output" && pwd -P)"
name="MusicMenker-SpatialSoundEffects-${version}-linux-${arch}-portable"
tmp="$(mktemp -d)"
trap 'rm -rf -- "$tmp"' EXIT
stage="$tmp/$name"
mkdir -p "$stage/bin" "$stage/icons"
install -m 0755 -- "$binary" "$stage/bin/musicmenker-spatial-sound-effects"
install -m 0755 -- packaging/linux/run.sh "$stage/run.sh"
install -m 0644 -- packaging/linux/README-PORTABLE.txt "$stage/README-PORTABLE.txt"
install -m 0644 -- src-tauri/icons/icon.png "$stage/icons/icon.png"
install -m 0644 -- THIRD_PARTY.md "$stage/THIRD_PARTY.md"
install -m 0644 -- README.md "$stage/README.md"
tar -C "$tmp" -czf "$output/$name.tar.gz.tmp" "$name"
tar -tzf "$output/$name.tar.gz.tmp" >/dev/null
mv -f -- "$output/$name.tar.gz.tmp" "$output/$name.tar.gz"
printf '[MusicMenker] Generated: %s\n' "$output/$name.tar.gz"
