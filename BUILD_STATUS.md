# MusicMenker Spatial Sound Effects v0.0.2.1 — 検証状況

## 実施済み（このZIPの作成環境）

- Meydaのnpm依存・import・UI謝辞削除、fourier-transform@2.5.1への置換。
- スペクトル重心の分析処理を独立モジュール化。
- JS構文チェック22ファイル合格、バージョン整合・オフライン資産静的チェック合格。
- 依存不要の単体・構成テスト20件すべて合格。
- デザインLight規約、音響エンジン、WAV、保存処理は変更していない。

## 未実施・要検証

- この環境ではnpmレジストリがEAI_AGAINのため、npm install / npm audit / npm run buildは実行不可。
- fourier-transformを実際にimportしてFFTが働く4件の統合テストはnpm install後に実施すること。
- `npm test` の全24件は依存未取得のため未完了（依存未取得による失敗を機能の不具合と混同しない）。
- Cargo/Rustのネイティブビルド、3OS実機テストは未実施。
- npmおよびCargoロックファイルは実依存解決前であり同梱しない（捏造しない）。
- npm auditが0件になるかどうかは利用者環境で検証を要する。

## 利用者環境での必須コマンド

```sh
npm install
npm ls meyda deepmerge @rollup/plugin-node-resolve fourier-transform
npm audit
npm run check:syntax
npm test
npm run build
WEBKIT_DISABLE_DMABUF_RENDERER=1 npm run tauri:dev
```

なおTauri Linux実機では、既知のNVIDIA GBM描画エラーに対して上記の環境変数を利用する。
