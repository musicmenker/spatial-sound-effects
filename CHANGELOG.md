# Changelog

## v0.0.4.0 — マルチOS配布基盤の拡張

- Linux RPM、Arch Linux pacman、Linux Portable tar.gzの配布スクリプトとGitHub Actionsを追加。
- Windows x64のPortable EXE（ZIP）と通常／オフラインNSIS Installerの自動生成を整備。Portableは識別ファイルでWebView2のデータ保存先をEXEの隣へ切り替える。
- macOS Intel（x86_64）、Apple Silicon（ARM64）、Universal（両アーキテクチャ対応）のDMG生成ジョブを用意。
- 配布物の4要素公開バージョン命名、ファイル形式の構造チェック、SHA-256生成、全成果物が揃った場合だけGitHub Releaseドラフトを作成する処理を追加。
- 既存の空間プリセット、音声加工、UI、WAV形式、JSON/ZIP形式の機能は変更しない。
- 本変更はビルド・配布系が対象で、各OSでの実機検証・コード署名・公証は別工程。

## v0.0.3.0 — プリセット・比較・処理状態

- `.mmsse`（UTF-8 JSON）形式の作成・保存・追加・永続登録・名前変更・削除・重複ID処理を追加。
- 既存の設定JSON・プロジェクトZIP、13標準プリセット、7エフェクト、3音響トグル、RMS自動音量補正・手動オフセットを維持。
- 標準プリセットは読み取り専用とし、編集した音響設定の「変更あり」検出と保存／破棄／取消の切り替え確認を追加。
- プリセットのA/B試聴を追加。同じ音源と再生位置を使用し、Aは以前の設定のPCMを別途レンダリングする。
- WAV出力初期値を24-bit PCMに変更（16-bit PCM・32-bit Floatも引き続き対応）。
- 既定の試聴対象を加工後に変更。加工結果未生成時は生成後に試聴する。
- キャンセル可能な読み込み・プレビュー・WAV PCM化・ZIP生成に取消操作を追加。単発のオフラインレンダリングは直ちに中断できないため、取消後の結果を破棄する。
- WAV PCM化とZIP生成は実処理進捗を表示し、レンダリングなど計測できない処理は無彩色の不定進捗表示を行う。
- MusicMenker Design System v1.0 Lightテーマを維持。

## v0.0.2.1 — FFT依存置換

- Meydaを削除し、スペクトル重心計算をfourier-transformへ移行。
- npm依存と第三者ライブラリ表記を更新。

## v0.0.2.0 — Tauri 2 desktop integration

- Tauri 2のWindows / macOS / Linux向け構成、Web版共通のVite UI・DSP、ネイティブファイル選択・保存、GitHub Actionsを追加。
- 加工後プレビューの二重リミッター処理を廃止し、WAVと同じ加工済みPCMから試聴するよう変更。

## v0.0.1.1 — MusicMenker UI revision

- MusicMenker Design System v1.0に準拠したLight UIを導入。
