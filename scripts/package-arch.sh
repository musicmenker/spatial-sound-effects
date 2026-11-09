#!/usr/bin/env bash
# Package a Linux binary *built on Arch* using Arch's own makepkg/pacman format.
# This script neither obtains root privileges nor installs system dependencies.
set -Eeuo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."
version="$(node -e 'import("./src/data/effects.js").then(m=>console.log(m.APP_VERSION.slice(1)))')"
binary="${1:-src-tauri/target/release/musicmenker-spatial-sound-effects}"
output="${2:-release}"
[[ -x "$binary" ]] || { echo "Missing executable: $binary" >&2; exit 1; }
command -v makepkg >/dev/null || { echo 'Requires Arch Linux makepkg (pacman)' >&2; exit 1; }
[[ $(id -u) -ne 0 ]] || { echo 'Run makepkg as a normal unprivileged user' >&2; exit 1; }
magic="$(od -An -tx1 -N4 "$binary" | tr -d ' \n')"
[[ "$magic" == '7f454c46' ]] || { echo 'Not an ELF executable' >&2; exit 1; }
actual_machine="$(od -An -tu2 -j18 -N2 "$binary" | tr -d ' \n')"
case "$actual_machine" in 62) arch=x86_64 ;; 183) arch=aarch64 ;; *) echo "Unsupported CPU (ELF $actual_machine)" >&2; exit 1;; esac
host_arch="$(uname -m)"
[[ "$arch" == "$host_arch" ]] || { echo "Native Arch build required ($arch vs $host_arch)" >&2; exit 1; }
mkdir -p -- "$output"
output="$(cd "$output" && pwd -P)"
tmp="$(mktemp -d)"
trap 'rm -rf -- "$tmp"' EXIT
install -m 0755 -- "$binary" "$tmp/musicmenker-spatial-sound-effects"
install -m 0644 -- src-tauri/icons/128x128.png "$tmp/icon.png"
install -m 0644 -- packaging/linux/musicmenker-spatial-sound-effects.desktop "$tmp/musicmenker-spatial-sound-effects.desktop"
install -m 0644 -- THIRD_PARTY.md "$tmp/THIRD_PARTY.md"
sha=()
for f in musicmenker-spatial-sound-effects icon.png musicmenker-spatial-sound-effects.desktop THIRD_PARTY.md; do
  sha+=("$(sha256sum "$tmp/$f" | cut -d' ' -f1)")
done
cat > "$tmp/PKGBUILD" <<PKG
pkgname=musicmenker-spatial-sound-effects
pkgver=$version
pkgrel=1
pkgdesc='MusicMenker spatial audio effects editor (Tauri 2)'
arch=('$arch')
url='https://github.com/musicmenker/spatial-sound-effects'
license=('custom')
depends=('webkit2gtk-4.1' 'gtk3' 'libappindicator' 'librsvg' 'hicolor-icon-theme')
options=('!debug')
source=('musicmenker-spatial-sound-effects' 'icon.png' 'musicmenker-spatial-sound-effects.desktop' 'THIRD_PARTY.md')
sha256sums=('${sha[0]}' '${sha[1]}' '${sha[2]}' '${sha[3]}')
package() {
  install -Dm755 "\$srcdir/musicmenker-spatial-sound-effects" "\$pkgdir/usr/bin/musicmenker-spatial-sound-effects"
  install -Dm644 "\$srcdir/musicmenker-spatial-sound-effects.desktop" "\$pkgdir/usr/share/applications/musicmenker-spatial-sound-effects.desktop"
  install -Dm644 "\$srcdir/icon.png" "\$pkgdir/usr/share/icons/hicolor/128x128/apps/musicmenker-spatial-sound-effects.png"
  install -Dm644 "\$srcdir/THIRD_PARTY.md" "\$pkgdir/usr/share/doc/musicmenker-spatial-sound-effects/THIRD_PARTY.md"
}
PKG
(
 cd "$tmp"
 export PKGDEST="$output"
 makepkg --force --noconfirm --nodeps
)
shopt -s nullglob
matches=("$output"/musicmenker-spatial-sound-effects-"$version"-1-"$arch".pkg.tar.zst)
[[ ${#matches[@]} -eq 1 && -s "${matches[0]}" ]] || { echo 'Arch package not produced' >&2; exit 1; }
printf '[MusicMenker] Generated: %s\n' "${matches[0]}"
