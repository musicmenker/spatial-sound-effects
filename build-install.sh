#!/usr/bin/env bash
# MusicMenker: reproducible build entry point; never elevates privileges or installs OS packages.
set -Eeuo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"

mode="${1:-help}"
if [[ $# -gt 0 ]]; then shift; fi
platform="web"; offline=0; install_source=""; install_dir=""; overwrite=0
while (($#)); do
  case "$1" in
    web|desktop|offline-windows) platform="$1" ;;
    --offline) offline=1 ;;
    --file) shift; (( $# )) || { echo 'Missing --file argument' >&2; exit 2; }; install_source="$1" ;;
    --dir) shift; (( $# )) || { echo 'Missing --dir argument' >&2; exit 2; }; install_dir="$1" ;;
    --overwrite) overwrite=1 ;;
    *) echo "Unknown option: $1" >&2;exit 2 ;;
  esac
  shift
done
log(){ printf '[MusicMenker] %s\n' "$*"; }
die(){ printf '[MusicMenker] ERROR: %s\n' "$*" >&2;exit 1; }
command -v node >/dev/null || die 'Node.js is required (>=20.19)'
command -v npm >/dev/null || die 'npm is required'
node -e 'const [a,b]=process.versions.node.split(".").map(Number);if(a<20||(a===20&&b<19))process.exit(1)' || die 'Node.js >= 20.19 is required'

test_source(){
  log 'Running independent syntax, unit, and offline resource checks'
  npm run check:syntax
  npm test
  npm run check:offline
  npm run check:versions
}
prepare_deps(){
  if [[ ! -f package-lock.json ]]; then
    (( offline == 0 )) || die 'Offline mode requires a generated package-lock.json and cached dependencies.'
    log 'No lockfile: generating via npm install. Commit package-lock.json before CI/release.'
    npm install --no-audit --no-fund
  else
    if ((offline)); then npm ci --offline --no-audit --no-fund
    else npm ci --no-audit --no-fund; fi
  fi
}
prepare_cargo(){
  command -v cargo >/dev/null || die 'Rust/Cargo required for desktop builds'
  if ((offline)); then
    [[ -f src-tauri/Cargo.lock ]] || die 'Offline Tauri build requires Cargo.lock and cached crates'
    export CARGO_NET_OFFLINE=true
  fi
}
case "$mode" in
  help|-h|--help)
    cat <<'HELP'
Usage:
  ./build-install.sh test
  ./build-install.sh build [web|desktop|offline-windows] [--offline]
  ./build-install.sh install --file path/to/App.AppImage --dir /path/to/dir [--overwrite]
Test mode requires installed npm dependencies. Build modes install/restore dependencies before running tests.
System packages/Rust/Node are prerequisites, never auto-installed.
HELP
    ;;
  test)
    [[ -d node_modules/fourier-transform ]] || die 'Run npm install before testing (fourier-transform is required)'
    test_source
    ;;
  build)
    prepare_deps
    test_source
    if [[ "$platform" == web ]]; then
      npm run build
      [[ -s dist/index.html ]] || die 'Vite did not generate dist/index.html'
      npm run check:offline
  npm run check:versions
      log 'Web build generated in dist/'
    else
      prepare_cargo
      npm run icons
      case "$(uname -s)" in
        Linux) bundles='deb,appimage' ;;
        Darwin) bundles='dmg' ;;
        MINGW*|MSYS*|CYGWIN*) bundles='nsis' ;;
        *) die "Unsupported build host: $(uname -s)" ;;
      esac
      if [[ "$platform" == offline-windows && "$bundles" != 'nsis' ]];then die 'offline-windows only supported on Windows';fi
      mark="$(mktemp)"
      trap 'rm -f "$mark"' EXIT
      if [[ "$platform" == offline-windows ]];then
        npm run tauri -- build --bundles "$bundles" --config src-tauri/tauri.offline-windows.conf.json
      else
        npm run tauri -- build --bundles "$bundles"
      fi
      [[ -d src-tauri/target/release/bundle ]] || die 'Tauri did not create release/bundle'
      fresh="$(find src-tauri/target/release/bundle -type f -newer "$mark" \( -name '*.deb' -o -name '*.AppImage' -o -name '*.dmg' -o -name '*setup.exe' -o -name '*.exe' \) -print -quit)"
      [[ -n "$fresh" ]] || die 'No freshly built installer/artifact found'
      log "New packaged artifact verified: $fresh"
    fi
    ;;
  install)
    [[ -n "$install_source" && -n "$install_dir" ]] || die 'Use --file and --dir explicitly for local AppImage install'
    [[ "$install_source" == *.AppImage ]] || die 'Only local AppImage copy is supported; use package manager for DEB/RPM'
    [[ -f "$install_source" ]] || die 'Source AppImage does not exist'
    mkdir -p -- "$install_dir"
    dest="$install_dir/$(basename -- "$install_source")"
    if [[ -e "$dest" && $overwrite -eq 0 ]];then die "Refusing to overwrite: $dest (pass --overwrite explicitly)";fi
    install -m 0755 -- "$install_source" "$dest"
    log "Installed: $dest"
    ;;
  *) die "Unknown mode: $mode" ;;
esac
