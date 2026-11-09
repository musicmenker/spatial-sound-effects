#!/usr/bin/env bash
# MusicMenker build, test, bundle, and explicit AppImage copy entry point.
# Does not elevate privileges, change system dependencies, or overwrite by default.
set -Eeuo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
mode="${1:-help}"; [[ $# -eq 0 ]] || shift
platform=web; offline=0; install_source=''; install_dir=''; overwrite=0
while (($#)); do
  case "$1" in
    web|desktop|rpm|linux-portable|arch|windows-portable|offline-windows|macos-universal) platform="$1" ;;
    --offline) offline=1 ;;
    --file|--dir)
      opt="$1"; shift; (( $# )) || { echo "Missing $opt value" >&2; exit 2; }
      if [[ "$opt" == '--file' ]]; then install_source="$1"; else install_dir="$1"; fi ;;
    --overwrite) overwrite=1 ;;
    *) echo "Unknown argument: $1" >&2; exit 2 ;;
  esac
  shift
done
log(){ printf '[MusicMenker] %s\n' "$*"; }
die(){ printf '[MusicMenker] ERROR: %s\n' "$*" >&2; exit 1; }
usage(){
  cat <<'HELP'
Usage:
  ./build-install.sh test
  ./build-install.sh build web [--offline]
  ./build-install.sh build desktop [--offline]       # Linux: deb + AppImage; Windows: NSIS; macOS: DMG
  ./build-install.sh build rpm [--offline]           # rpm-build required, Linux only
  ./build-install.sh build linux-portable [--offline]# Linux tar.gz, non-universal runtime dependencies
  ./build-install.sh build arch [--offline]          # on Arch Linux, with makepkg, non-root
  ./build-install.sh build windows-portable [--offline] # Windows x64 Portable ZIP + EXE
  ./build-install.sh build offline-windows [--offline]  # Windows offline NSIS
  ./build-install.sh build macos-universal [--offline]  # macOS ARM64/Intel universal DMG
  ./build-install.sh install --file /path/to/App.AppImage --dir /path/to/target [--overwrite]

Tools / OS libraries are prerequisites; this script does not install them.
Build logs are stored in logs/ and artifacts in release/ or src-tauri/target/.
HELP
}
if [[ "$mode" == help || "$mode" == -h || "$mode" == --help ]]; then usage; exit 0; fi
mkdir -p logs
stamp="$(date -u '+%Y%m%dT%H%M%SZ')-$$"
logfile="logs/build-$stamp.log"
exec > >(tee -a "$logfile") 2>&1
trap 'result=$?; if [[ $result -ne 0 ]]; then printf "[MusicMenker] Build failed (exit %s), log: %s\n" "$result" "$logfile" >&2; fi' EXIT
require_node(){
  command -v node >/dev/null || die 'Node.js required (>=20.19)'
  command -v npm >/dev/null || die 'npm required'
  node -e 'const [a,b]=process.versions.node.split(".").map(Number);if(a<20||(a===20&&b<19))process.exit(1)' || die 'Node.js >=20.19 required'
}
prepare_deps(){
  if [[ -s package-lock.json ]];then
    if ((offline));then npm ci --offline --no-audit --no-fund; else npm ci --no-audit --no-fund;fi
  elif ((offline));then
    die 'Offline mode requires package-lock.json and an npm cache'
  else
    log 'WARNING: package-lock.json missing; npm install will create it. Commit it for reproducible CI.'
    npm install --no-audit --no-fund
  fi
}
check_source(){
  npm run check:syntax
  npm run check:versions
  npm test
  npm run check:offline
}
prepare_cargo(){
  command -v cargo >/dev/null || die 'Rust Cargo is required to build desktop bundles'
  if ((offline));then
    [[ -s src-tauri/Cargo.lock ]] || die 'Offline mode requires src-tauri/Cargo.lock and cached crates'
    export CARGO_NET_OFFLINE=true
  elif [[ ! -s src-tauri/Cargo.lock ]];then
    log 'WARNING: Cargo.lock missing. Generate and commit it to make release builds reproducible.'
  fi
}
check_binary(){ [[ -s "$1" ]] || die "Tauri binary not found: $1"; }
bundle(){ npm run tauri -- build "$@" --ci; }
case "$mode" in
  test)
    require_node
    [[ -d node_modules/fourier-transform ]] || die 'Run npm install before testing'
    check_source
    ;;
  build)
    require_node
    prepare_deps
    check_source
    if [[ "$platform" == web ]];then
      npm run build
      [[ -s dist/index.html ]] || die 'Vite did not produce dist/index.html'
      npm run check:offline
      log 'Web build complete: dist/'
      exit 0
    fi
    prepare_cargo
    npm run icons
    case "$platform" in
      desktop)
        case "$(uname -s)" in
          Linux) bundles='deb,appimage' ;;
          Darwin) bundles='dmg' ;;
          MINGW*|MSYS*|CYGWIN*) bundles='nsis' ;;
          *) die "Unsupported host: $(uname -s)" ;;
        esac
        bundle --bundles "$bundles"
        log 'Desktop bundles available in src-tauri/target/release/bundle/'
        ;;
      rpm)
        [[ "$(uname -s)" == Linux ]] || die 'RPM target requires Linux'
        command -v rpmbuild >/dev/null || die 'RPM target requires rpm-build'
        bundle --bundles rpm
        node scripts/collect-artifacts.mjs --platform linux --arch x64 --formats rpm
        ;;
      linux-portable)
        [[ "$(uname -s)" == Linux ]] || die 'Linux Portable requires Linux host'
        bundle --no-bundle
        check_binary src-tauri/target/release/musicmenker-spatial-sound-effects
        bash scripts/package-linux-portable.sh
        ;;
      arch)
        [[ "$(uname -s)" == Linux ]] || die 'Arch package requires Linux host'
        command -v makepkg >/dev/null || die 'Arch package requires makepkg'
        bundle --no-bundle
        check_binary src-tauri/target/release/musicmenker-spatial-sound-effects
        bash scripts/package-arch.sh
        ;;
      windows-portable)
        case "$(uname -s)" in MINGW*|MSYS*|CYGWIN*) ;; *) die 'Windows Portable requires Windows host' ;; esac
        bundle --no-bundle
        check_binary src-tauri/target/release/musicmenker-spatial-sound-effects.exe
        node scripts/package-windows-portable.mjs
        ;;
      offline-windows)
        case "$(uname -s)" in MINGW*|MSYS*|CYGWIN*) ;; *) die 'Offline Windows NSIS requires Windows host' ;; esac
        bundle --bundles nsis --config src-tauri/tauri.offline-windows.conf.json
        node scripts/collect-artifacts.mjs --platform windows --arch x64 --formats nsis --mode offline
        ;;
      macos-universal)
        [[ "$(uname -s)" == Darwin ]] || die 'macOS Universal requires macOS host'
        bundle --bundles dmg --target universal-apple-darwin
        node scripts/collect-artifacts.mjs --platform macos --arch universal --formats dmg --target universal-apple-darwin
        ;;
      *) die "Unsupported platform: $platform" ;;
    esac
    ;;
  install)
    [[ -n "$install_source" && -n "$install_dir" ]] || die 'Provide --file and --dir'
    [[ "$install_source" == *.AppImage ]] || die 'Only direct AppImage installation supported'
    [[ -f "$install_source" ]] || die 'Missing AppImage'
    mkdir -p "$install_dir"
    dest="$install_dir/$(basename -- "$install_source")"
    if [[ -e "$dest" && $overwrite -eq 0 ]];then die "Refusing to overwrite $dest"; fi
    install -m 0755 -- "$install_source" "$dest"
    log "Copied: $dest"
    ;;
  *) die "Unsupported mode: $mode" ;;
esac
log "Success. Log: $logfile"
