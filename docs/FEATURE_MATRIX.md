# Feature compatibility matrix — MusicMenker v0.0.4.0

| Contract | Location | Status in source | Test in this ZIP |
|---|---|---|---|
| MusicMenker Light UI, 0 px radius | `src/style.css`, `index.html` | retained | existing design-system tests |
| 13 built-in plus persisted .mmsse presets / 7 effect modules | `src/data/{presets,effects}.js` | retained | config tests |
| Parallel reverb, high-frequency protection, independent distance level | `src/audio/engine.js` | retained | option tests (configuration only) |
| Auto RMS offset + manual ±12 dB | `src/audio/engine.js`, `src/ui/studio-v3.js` | retained | bounds tests (not acoustic verification) |
| Original/processed waveform and preview | `src/ui/{studio-v2,waveform}.js` | retained | structural tests |
| Processed preview bypasses additional limiter | `src/ui/studio-v2.js` | fixed | Tauri integration static test |
| WAV 16/24/32f (24-bit default) | `src/audio/wav.js` | retained; Float32 does not forcibly clamp | actual decode/listening still required |
| Project JSON / ZIP compatibility | `src/storage/projects.js` | retained | no binary compatibility regression test run |
| Browser IndexedDB autosave | `src/storage/projects.js` | retained in browser and WebView | desktop runtime verification required |
| Native open / save | `src/platform/files.js` | implemented with official Tauri plugins | static integration tests; desktop runtime not tested |
| Web deployment | Vite `dist` | configured | Vite build not run in preparation environment |
| Offline use after desktop install | bundled local `dist` | designed | airplane-mode launch/playback test required |
| Windows NSIS / offline NSIS | Tauri config + Actions | configured | native build not run |
| macOS Intel / Apple Silicon DMG | Actions | configured | native build / signing not run |
| Linux DEB / AppImage | Actions | configured | native build not run |
| Windows x64 Portable ZIP / marker-based WebView2 profile | `scripts/package-windows-portable.mjs`, `src-tauri/src/lib.rs` | implemented in source | fake-PE ZIP test requires JSZip; OS runtime pending |
| Linux tar.gz Portable | `scripts/package-linux-portable.sh` | implemented in source; system WebKitGTK required | native ELF archive structure verified |
| Linux Fedora RPM | Tauri rpm bundle + Fedora CI | configured | Fedora build / install pending |
| Arch pacman | `scripts/package-arch.sh` + native Arch CI | configured | makepkg / pacman installation pending |
| macOS universal Intel/ARM64 | multi-target Tauri DMG + macOS CI | configured | macOS build / notarization pending |
| Release checksum and asset validation | `scripts/verify-release.mjs` + GitHub Actions | configured | basic format signatures tested; OS integration pending |
| EBU R128 LUFS / True Peak analyzer | — | **not implemented** — existing RMS method retained | none |
| Memory-bounded streaming reverb/export | — | **not implemented**; current buffer-based renderer kept | none |
| Signed and notarized installers | — | **not implemented**; signing identities not provided | none |

| .mmsse preset import/export, IndexedDB persistence, duplicate ID handling | `src/data/custom-presets.js`, `src/ui/studio-v4.js`, `src/storage/projects.js` | implemented in source | pure format tests; IndexedDB UI E2E pending |
| A/B processed preview, unsaved changes prompts | `src/ui/studio-v4.js`, `index.html` | implemented in source | visual/audio E2E pending |
| Cancelable PCM encode / indeterminate renderer | `src/audio/wav.js`, `src/ui/studio-v4.js` | implemented in source | live integration pending |

This is a source implementation matrix, not a claim that every function was executed.
