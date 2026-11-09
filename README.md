# MusicMenker — 立体音響風エフェクター v0.0.4.0

浴室、地下室、トンネル、遠距離・壁越し、8D風移動などを再現するステレオ音響エフェクターです。開発・配布名義は **MusicMenker** です。

## 対応版

- **Web**：Vite静的Webサイト。Cloudflare Pagesなどにデプロイ。
- **デスクトップ**：Tauri 2を用いたWindows `.exe` Installer / Portable、macOS Intel・ARM64・Universal `.dmg`、Linux `.deb` / `.rpm` / `.AppImage` / `.pkg.tar.zst` / Portable `.tar.gz` 構成。
- **オフライン**：インストール後のデスクトップ音声編集はローカル完結。初回WebViewランタイム導入やアプリ更新は別条件です。

**状態：ソースパッケージ。** この実行環境ではVite/Tauri本番ビルドおよび各OS実機検証を完了していません。OS向けバイナリは同梱していません。以前のv0.0.3.0は利用者環境でnpm監査0件、36テスト、Viteビルドが成功しましたが、これをv0.0.4.0の実機検証結果として扱いません。詳細は `BUILD_STATUS.md` に記載しています。

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

追加形式のビルドとGitHub Actions・GitHub Releaseドラフトの使い方は **`docs/DISTRIBUTION.md`** を参照してください。WindowsでのオフラインNSISビルドは `./build-install.sh build offline-windows` です（Git BashなどのBash環境が必要）。各種ネイティブ成果物は対応するOSのビルド環境で生成します。

**依存ロックファイルの初期作成方法**：`docs/DEPENDENCY_AND_RELEASE.md` を参照。初回はネット接続が必要です。オフラインビルドはキャッシュ・ロックファイルが揃っている場合に限ります。

## 使い方

1. 音声ファイルを開くか、デモ音源を生成します。
2. 13種類の標準プリセット・追加済み.mmsseプリセットを選び、5種類の主要調整と7種の詳細エフェクトを操作します。
3. 直接音・残響音分離、高音保護、距離と音量減衰の分離を独立してON/OFFできます。
4. 初期選択の加工後、原音、リアルタイム加工音を切り替えて試聴し、「加工結果を生成」で処理後の独立波形・試聴を確認します。
5. 初期設定の24-bit PCM、または16-bit PCM / 32-bit FloatでWAVを書き出すか、従来の設定JSON / 音声付きZIPを保存します。

自動音量補正は**冒頭最大12秒のRMS推定**であり、LUFS計測ではありません。手動補正は±12 dBです。加工後波形は、設定が変わると再生成が必要です。音声処理・書き出しはAudioBufferベースのため、長い音源はRAMを多く使用します。5.1/7.1の実サラウンド出力には対応しません。

## 空間プリセット（.mmsse）

- 「プリセットを保存」「別名で保存」でカスタムプリセットを登録します。IndexedDBに永続保存され、次回起動後も「追加」カテゴリから選べます。
- 「.mmsse書き出し」でUTF-8 JSONを出力、「.mmsseを追加」でプリセット一覧に追加します。従来の.sse.json／.sse.zipによるプロジェクト保存は継続します。
- 標準プリセットの上書きは不可。重複IDの場合は別ID追加、カスタムプリセット上書き、キャンセルから選びます。
- 設定の変更は「変更あり」と表示され、プリセットを切り替えるときは保存／破棄／キャンセルを選びます。
- A/B比較で変更前の音響設定と現在の設定を、同じ音源・再生位置からそれぞれ加工して試聴できます。
- WAV PCM化とZIP生成では数値進捗を表示し、Tone.Offline等の進捗不明な処理では不定進捗を表示します。キャンセル後の未確定結果は保存しません。
- `.mmsse` に外部IRの音声データは含まれません。必要なIRは別途読み込んでください。

詳細な形式と互換性は `docs/MMSSE_SPECIFICATION.md` を参照してください。

## 保存とプライバシー

デスクトップのファイル選択・書き出しはOS標準ダイアログを使用します。Webではブラウザ標準のファイル選択・ダウンロードを使用します。IndexedDBによる自動保存は両版で使えますが、保存領域は異なります。移行・バックアップには `.sse.zip` を使ってください。音声は外部サーバーに送信しません。

## 構造とドキュメント

- `src/`：Alpine.js UI、Tone.js DSP、WaveSurfer.js、Web/desktop共通の処理
- `examples/浴室-カスタム.mmsse`：インポート確認用のサンプルプリセット
- `src/platform/files.js`：Tauri Dialog/FSとWebダウンロードの境界
- `src-tauri/`：Tauri 2のRustエントリ、権限、配布設定
- `docs/FEATURE_MATRIX.md`：機能対応表と検証状況
- `docs/MMSSE_SPECIFICATION.md`：プリセット形式と互換性
- `docs/PLATFORM_OFFLINE.md`：WebView・オフライン条件
- `docs/DEPENDENCY_AND_RELEASE.md`：依存関係・ロックファイル・リリース手順
- `docs/DISTRIBUTION.md`：OS別ビルド、GitHub Actions、Portable、対応形式、バージョン変換、検証
- `docs/MEYDA_REPLACEMENT.md`：Meydaからの移行内容と確認事項
- `THIRD_PARTY.md`：依存ライブラリの情報

MusicMenker Design System v1.0に基づく**Lightテーマ**、角丸0px、無彩色のUIを維持します。
