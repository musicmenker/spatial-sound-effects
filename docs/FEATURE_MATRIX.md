# Feature compatibility matrix — MusicMenker v0.0.2.1

| Contract | Location | Status in source | Test in this ZIP |
|---|---|---|---|
| MusicMenker Light UI, 0 px radius | `src/style.css`, `index.html` | retained | existing design-system tests |
| 13 presets / 7 effect modules | `src/data/{presets,effects}.js` | retained | config tests |
| Parallel reverb, high-frequency protection, independent distance level | `src/audio/engine.js` | retained | option tests (configuration only) |
| Auto RMS offset + manual ±12 dB | `src/audio/engine.js`, `src/ui/studio-v3.js` | retained | bounds tests (not acoustic verification) |
| Original/processed waveform and preview | `src/ui/{studio-v2,waveform}.js` | retained | structural tests |
| Processed preview bypasses additional limiter | `src/ui/studio-v2.js` | fixed | Tauri integration static test |
| WAV 16/24/32f | `src/audio/wav.js` | retained; Float32 does not forcibly clamp | actual decode/listening still required |
| Project JSON / ZIP compatibility | `src/storage/projects.js` | retained | no binary compatibility regression test run |
| Browser IndexedDB autosave | `src/storage/projects.js` | retained in browser and WebView | desktop runtime verification required |
| Native open / save | `src/platform/files.js` | implemented with official Tauri plugins | static integration tests; desktop runtime not tested |
| Web deployment | Vite `dist` | configured | Vite build not run in preparation environment |
| Offline use after desktop install | bundled local `dist` | designed | airplane-mode launch/playback test required |
| Windows NSIS / offline NSIS | Tauri config + Actions | configured | native build not run |
| macOS Intel / Apple Silicon DMG | Actions | configured | native build / signing not run |
| Linux DEB / AppImage | Actions | configured | native build not run |
| EBU R128 LUFS / True Peak analyzer | — | **not implemented** — existing RMS method retained | none |
| Memory-bounded streaming reverb/export | — | **not implemented**; current buffer-based renderer kept | none |
| Signed and notarized installers | — | **not implemented**; signing identities not provided | none |

This is a source implementation matrix, not a claim that every function was executed.
