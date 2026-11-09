# MusicMenker Spatial Sound Effects v0.0.4.0 — Build and distribution

## Distribution artifacts

| OS/CPU | Format | Method | Requirements |
|---|---|---|---|
| Linux x86_64 | `.deb` | Tauri built-in (`--bundles deb`) | Ubuntu/Debian build host |
| Linux x86_64 | `.AppImage` | Tauri built-in (`--bundles appimage`) | compatible glibc/FUSE/runtime |
| Linux x86_64 | `.rpm` | Tauri built-in (`--bundles rpm`) | Fedora host and `rpm-build` |
| Arch Linux x86_64 | `.pkg.tar.zst` | native Arch binary + `makepkg` | Arch, `base-devel`, unprivileged package user |
| Linux x86_64 | `.tar.gz` | Tauri ELF + `run.sh` | WebKitGTK 4.1 and other host libraries |
| Windows x86_64 | NSIS Installer `.exe` | Tauri built-in | WebView2 (installer can bootstrap) |
| Windows x86_64 | Offline NSIS Installer `.exe` | Tauri offline config | bundled WebView2 installer; larger binary |
| Windows x86_64 | Portable `.zip` containing `.exe` | Native Tauri EXE + JSZip package script | system WebView2 runtime required |
| macOS Intel | `.dmg` | Tauri `x86_64-apple-darwin` | macOS host |
| macOS Apple Silicon | `.dmg` | Tauri `aarch64-apple-darwin` | macOS host |
| macOS Universal | `.dmg` | Tauri `universal-apple-darwin` | macOS host, both Rust targets |
| Web | `dist/` | Vite | Cloudflare Pages or static web host |

All native build types target x86_64 except the explicitly marked macOS ARM64 and Universal bundles. Linux ARM64 is not a validated release target in this pipeline. Formats not listed above are not automatically produced.

**Portable does not always mean no system dependencies.** Linux tar.gz uses WebKitGTK, GTK3, glibc and any other shared libraries required by the binary. Windows Portable requires an installed WebView2 runtime. Windows NSIS Offline and Portable are different packages.

## Versioning

Public MusicMenker version: `v0.0.4.0`.

Tauri/Cargo/npm internal SemVer: `0.0.5`, required by tools that accept three numeric version components. `src/data/effects.js` contains the public version and `scripts/check-versions.js` checks the mapping. The release assets are renamed to the public four-part version; Linux pacman uses its own four-part `pkgver=0.0.4.0`. Never change public versions without also updating the tests, release manifest and changelog.

## Preparing dependencies

Supported application development baseline: Node.js 22, Rust 1.90 or newer, the dependencies of Tauri 2, and a compatible C/C++ compiler. Packages differ by OS.

This source archive does not contain generated `package-lock.json` and `src-tauri/Cargo.lock`. Do not fabricate lockfile content or package hashes. Before enabling repeatable publishing, run the following *on an internet-connected development machine*, inspect the resulting files and commit both lockfiles to Git:

```sh
npm install
npm run icons
(cd src-tauri && cargo generate-lockfile)
npm ci
npm audit
npm test
npm run check:versions
```

The CI jobs can perform fresh package resolution when a lockfile is absent, but this is explicitly not a reproducible lockfile-controlled build. For final public releases, both locks must be committed.

## Local Linux (Debian 13)

Install the required Tauri development libraries and RPM build tools *separately* if desired; the build scripts will not install OS packages:

```sh
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev patchelf rpm
```

Build choices on Debian (Arch/pacman requires Arch Linux):

```sh
./build-install.sh test
./build-install.sh build web
./build-install.sh build desktop       # DEB + AppImage
./build-install.sh build linux-portable
./build-install.sh build rpm           # requires rpmbuild; tested in Fedora CI
```

An AppImage's exact compatibility must be tested on the target distribution. The Linux Portable archive is named `MusicMenker-SpatialSoundEffects-v0.0.4.0-linux-x64-portable.tar.gz`. Extract it and run `./run.sh`; it checks for missing ELF shared libraries. The NVIDIA/WebKitGTK GBM workaround on affected Debian 13 systems remains:

```sh
WEBKIT_DISABLE_DMABUF_RENDERER=1 npm run tauri:dev
# If the released binary shows the same issue:
WEBKIT_DISABLE_DMABUF_RENDERER=1 ./run.sh
```

Do not apply this environment variable to all GPU vendors automatically.

## Arch Linux pacman

Build **on Arch Linux**, not by renaming a DEB or RPM:

```sh
./build-install.sh build arch
```

The builder uses `makepkg` as a **non-root** user and creates a native Arch package containing the Tauri binary, icon, desktop entry, and third-party notices. The package is written to `release/` and can be installed with `sudo pacman -U <exact-package-file>` after reviewing its package metadata. The CI job builds the ELF in an Arch container and only executes `makepkg` as an unprivileged user. Package checksum fields are calculated from the actual staged assets, not placeholders.

## Windows x86_64

On a Windows host with Git Bash, Windows MSVC build tools, Rust and Node installed:

```sh
./build-install.sh build desktop           # normal NSIS
./build-install.sh build offline-windows   # offline NSIS with WebView2 installer
./build-install.sh build windows-portable  # portable ZIP containing an EXE
```

Windows Portable contains `MusicMenker-SpatialSoundEffects.exe`, `MusicMenker.portable`, and a README. The marker activates the early WebView2 user-data-folder override in Rust before the webview starts. The WebView2 profile and IndexedDB custom presets are stored in `app-data/webview2/` beside the EXE. A removable drive can move this folder as long as it is writable. Without the marker, the app uses normal installed-profile storage. The marker is deliberately **not** included in the NSIS installer. Migrating installed-app data into Portable requires an app-level JSON/ZIP/.mmsse export/import, not copying arbitrary browser profile files. The system WebView2 runtime is required for Portable use; the Portable ZIP does not include a fixed WebView2 runtime.

## macOS Intel, ARM64 and Universal

GitHub Actions creates three DMGs. Universal mode uses both Apple Rust targets and the Tauri `universal-apple-darwin` target. On a macOS host with both targets installed:

```sh
rustup target add x86_64-apple-darwin aarch64-apple-darwin
./build-install.sh build macos-universal
```

**Apple Developer ID signing and notarization are not configured**. Unsigned/unnotarized packages may be blocked by Gatekeeper and should not be advertised as production-ready macOS releases until signing, notarization, and tests on both Intel and Apple Silicon are completed.

## GitHub Actions

The workflow `.github/workflows/build.yml` runs tests first, then separately builds Linux standard, Fedora RPM, Arch pacman, Windows regular/offline/Portable, and macOS Intel/ARM64/Universal. Every build uploads its results as workflow artifacts (`distribution-*`). Tag `v0.0.4.0` triggers the final `release-draft` job only after all jobs succeed. The release validator checks 11 expected files, nonempty size, naming, and basic archive signatures; it does not claim full OS usability. It produces SHA256SUMS and uploads all assets to a **draft** GitHub Release. Manual verification and licensing/signing review are required before publishing the draft.

The product outbound source license is not yet established in this source snapshot. Choose and add a `LICENSE` appropriate to MusicMenker's policy before public redistribution of first-party source. Third-party notice information is in `THIRD_PARTY.md`.

## Verification and troubleshooting

- Run `npm audit`, syntax/test/build checks and verify project compatibility before tagging.
- Test audio decoding, A/B preset preview, processed playback, 24-bit WAV output, and `.mmsse` persistence on every target architecture.
- Check Linux dynamic dependencies (`ldd`) and execute native install/remove tests on Fedora and Arch.
- Test Windows Portable on a PC with only system WebView2 and a writable removable folder, including restart after adding a preset.
- Inspect GitHub Actions outputs rather than interpreting configuration-only tests as successful binaries.
- Avoid `npm audit fix --force`; evaluate advisories and dependency changes individually.

## Resources

- [Tauri distribution](https://v2.tauri.app/distribute/)
- [Tauri CLI](https://v2.tauri.app/reference/cli/)
- [Tauri Windows Installer](https://v2.tauri.app/distribute/windows-installer/)
- [Tauri AUR](https://v2.tauri.app/distribute/aur/)
- [ArchWiki package creation](https://wiki.archlinux.org/title/creating_packages)
- [Microsoft WebView2 environment overrides](https://learn.microsoft.com/en-us/microsoft-edge/webview2/reference/win32/webview2-idl)
