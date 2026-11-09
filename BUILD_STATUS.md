# MusicMenker v0.0.4.0 — 検証とリリース状況

## 検証（このソース生成環境で実施）

- JavaScript/Node.js構文検査：**31/31合格**（`.mjs`配布スクリプトも対象）。
- 公開版 `v0.0.4.0` とnpm/Cargo/Tauri内部版 `0.0.5` の整合検査：合格。
- Bash構文：`build-install.sh`、Linux tar.gz／Archパッケージ化／Linux launcherを検査、合格。
- GitHub Actions YAML：RubyのYAMLパーサーで構造を検査、合格。
- 音響設定、既存UI、.mmsse、配布スクリプト等の依存不要なテスト群：**37件合格、1件スキップ（Windows Portable ZIPのJSZip依存が未導入）**。
- Linux tar.gz：x86_64 ELFを使って実際にアーカイブを作成し、内容を展開一覧で確認。非ELFを拒否する異常系も合格。これは**アプリ本体のビルド試験ではなく**包装処理の試験です。
- リリース署名・バージョン・11種類の成果物の存在確認：構造試験合格。実際のOSでインストール可能であることの保証ではありません。

## 未検証

- npmレジストリおよびRustクレートを取得する通信が利用できず、ここでは `npm install`、`npm audit`、Vite本番ビルド、Rustコンパイル、全44件の依存付きテストを完了できない。
- GitHub ActionsでのFedora RPM、Arch pacman、Windows Installer／Portable、macOS Intel／ARM／Universalの実ビルドは未実施。
- Windows Portable EXE内のWebView2データ保存場所の実動作、macOS Gatekeeper、各OSでのインストール／アンインストールは未検証。
- 音声再生、加工後プレビュー、WAV保存、.mmsse永続保存の実機回帰テストは未実施。
- `package-lock.json`、`src-tauri/Cargo.lock` はこのソースZIPには未同梱。実環境で生成・コミットが必要。

## 先行版で確認された事実

ユーザー環境ではv0.0.3.0に対してnpm監査0件、36/36テスト合格、Vite本番ビルド成功が報告されている。ただし、本版のRust変更や新パッケージ形式の動作確認を意味しない。

## 配布判定

本ZIPは**実装ソース（No-Test：ネイティブ配布物未検証）**。GitHub Actionsは成果物を自動生成し、タグ一致かつ必要な配布物が揃った場合だけGitHub Releaseのドラフトへ追加する。公開Releaseにする前に実機・音声・署名・ライセンスを検証する。
