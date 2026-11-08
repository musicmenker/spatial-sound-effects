# Changelog

## v0.0.2.0 — Tauri desktop source integration

- Public publisher name normalized to **MusicMenker**; product title retained.
- Added Tauri 2 Rust desktop wrapper and native open/save adapter using official dialog and FS plugins.
- Added Windows NSIS + separate offline installer configuration, macOS DMG, Linux DEB / AppImage build targets.
- Added GitHub Actions build matrix and local `build-install.sh` with a failing offline-cache guard.
- Bundled no runtime CDN dependencies; existing static Vite Web build remains supported.
- Fixed processed preview replay: now uses the raw playback graph without an extra limiter, retaining the same render buffer as WAV export.
- Changed 32-bit float WAV conversion not to clamp finite floating-point samples prematurely.
- Retained the prior MusicMenker Design System Light UI, 13 presets, seven modules, three acoustic toggles, auto/manual compensation and project format.
- Added release compatibility matrix, offline behavior docs, and Tauri configuration tests.

**Release status:** source-only / not ready for general release until native builds, lockfiles, offline integration, sound regression and license checks are completed.

## v0.0.1.1 — MusicMenker UI revision

Previous UI and audio behavior; see `CHANGELOG_MUSICMENKER_UI.md`.

## v0.0.2.1 — 2026-11-01 (依存整理・安全性改善)

- npm依存 meyda を削除し、MITの fourier-transform@2.5.1 に置換。
- 先頭2048サンプルのスペクトル重心を src/audio/spectral-centroid.js へ分離。
- 無音・不正入力・既知周波数の検証テストを追加。
- ヘルプ謝辞・ライブラリ一覧・Tauri/npm/Cargo内部版番号を更新。
- 音響エンジン、波形、プリセット、保存処理、Tauriの基本設計は変更なし。
- 本ソースではnpm/Cargoの依存解決や本番ビルドは未実施。
