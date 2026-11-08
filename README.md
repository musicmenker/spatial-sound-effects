# MusicMenker — 立体音響風エフェクター v0.0.2.1

浴室、地下室、トンネル、遠距離・壁越し、8D風移動などを再現するステレオ音響エフェクターです。開発・配布名義は **MusicMenker** です。

## 対応版

- **Web**：Vite静的Webサイト。Cloudflare Pagesなどにデプロイ。
- **デスクトップ**：Tauri 2を用いたWindows NSIS `.exe`、macOS `.dmg`、Linux `.deb` / `.AppImage` 構成。
- **オフライン**：インストール後のデスクトップ音声編集はローカル完結。初回WebViewランタイム導入やアプリ更新は別条件です。

**状態：ソースパッケージ。** 本版のVite/Tauri本番ビルドおよび3OS実機検証は未完了です。OS向けバイナリは同梱していません。詳細は `BUILD_STATUS.md` に記載しています。

## 必要環境

Web版開発：Node.js 20.19以上、npm。

**依存の修正**：Meydaは削除し、`fourier-transform@2.5.1` に置換しました。`src/audio/spectral-centroid.js` で音源先頭2048サンプルのスペクトル重心を計算します。エフェクト・RMS・ピーク・WAV処理には影響しません。

デスクトップ版：Rust 1.90以上、OSごとに必要なTauri 2開発依存ライブラリ。Debian 13での主な開発依存：

```sh
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev patchelf
```

依存パッケージやRustはビルドスクリプトから勝手にインストールしません。

## 起動・ビルド

```sh
npm install
npm audit                 # 依存関係のセキュリティ確認
npm run dev                 # Web開発
npm run tauri:dev           # Tauri開発 (要Rust/OS依存)
# Debian 13 + NVIDIAでGBM描画エラーが出る場合:
# WEBKIT_DISABLE_DMABUF_RENDERER=1 npm run tauri:dev
./build-install.sh test     # JS構文・単体・構成チェック
./build-install.sh build web
./build-install.sh build desktop
```

WindowsでのオフラインNSISビルドは `./build-install.sh build offline-windows` です（Bash環境が必要）。ネイティブの `.exe` / `.dmg` / `.deb` / `.AppImage` は対象OSのビルド環境で生成します。GitHub Actions例は `.github/workflows/build.yml` にあります。

**依存ロックファイルの初期作成方法**：`docs/DEPENDENCY_AND_RELEASE.md` を参照。初回はネット接続が必要です。オフラインビルドはキャッシュ・ロックファイルが揃っている場合に限ります。

## 使い方

1. 音声ファイルを開くか、デモ音源を生成します。
2. 13プリセットから選び、5種類の主要調整と7種の詳細エフェクトを操作します。
3. 直接音・残響音分離、高音保護、距離と音量減衰の分離を独立してON/OFFできます。
4. 原音またはリアルタイム加工音を試聴し、「加工結果を生成」で処理後の独立波形・試聴を確認します。
5. WAVを16/24-bit PCMまたは32-bit Floatで書き出すか、設定JSON / 音声付きZIPを保存します。

自動音量補正は**冒頭最大12秒のRMS推定**であり、LUFS計測ではありません。手動補正は±12 dBです。加工後波形は、設定が変わると再生成が必要です。音声処理・書き出しはAudioBufferベースのため、長い音源はRAMを多く使用します。5.1/7.1の実サラウンド出力には対応しません。

## 保存とプライバシー

デスクトップのファイル選択・書き出しはOS標準ダイアログを使用します。Webではブラウザ標準のファイル選択・ダウンロードを使用します。IndexedDBによる自動保存は両版で使えますが、保存領域は異なります。移行・バックアップには `.sse.zip` を使ってください。音声は外部サーバーに送信しません。

## 構造とドキュメント

- `src/`：Alpine.js UI、Tone.js DSP、WaveSurfer.js、Web/desktop共通の処理
- `src/platform/files.js`：Tauri Dialog/FSとWebダウンロードの境界
- `src-tauri/`：Tauri 2のRustエントリ、権限、配布設定
- `docs/FEATURE_MATRIX.md`：機能対応表と検証状況
- `docs/PLATFORM_OFFLINE.md`：WebView・オフライン条件
- `docs/DEPENDENCY_AND_RELEASE.md`：依存関係・ロックファイル・リリース手順
- `docs/MEYDA_REPLACEMENT.md`：Meydaからの移行内容と確認事項
- `THIRD_PARTY.md`：依存ライブラリの情報

MusicMenker Design System v1.0に基づく**Lightテーマ**、角丸0px、無彩色のUIを維持します。
# spatial-sound-effects
