# 第三者ライブラリ

このアプリのソースコードは、下記パッケージをnpmでインストールして動作します。ソースとバンドルを配布する際は、各パッケージが要求する著作権表記・ライセンス条項に従ってください。**本ファイルは正式なライセンス全文の代わりにはなりません。**

| パッケージ | 参照 |
|---|---|
| alpinejs / @alpinejs/persist | https://github.com/alpinejs/alpine |
| tone | https://github.com/Tonejs/Tone.js |
| wavesurfer.js | https://github.com/katspaugh/wavesurfer.js |
| wavefile | https://github.com/rochars/wavefile |
| fourier-transform | https://github.com/scijs/fourier-transform （MIT、FFTとスペクトル重心算出に利用） |
| ajv | https://github.com/ajv-validator/ajv |
| dexie | https://github.com/dexie/Dexie.js |
| jszip | https://github.com/Stuk/jszip |
| sortablejs | https://github.com/SortableJS/Sortable |
| i18next | https://github.com/i18next/i18next |
| vite | https://github.com/vitejs/vite |

依存関係のバージョン・推移的依存関係のライセンスまで確認するため、実行環境で `npm install` 後にライセンス監査を実施してください。

## デスクトップ版で追加した依存関係

| パッケージ / クレート | 参照 |
|---|---|
| tauri, tauri-build, @tauri-apps/api, @tauri-apps/cli | https://github.com/tauri-apps/tauri |
| tauri-plugin-dialog, @tauri-apps/plugin-dialog | https://github.com/tauri-apps/plugins-workspace |
| tauri-plugin-fs, @tauri-apps/plugin-fs | https://github.com/tauri-apps/plugins-workspace |

Tauriの公式クレート・プラグインはMIT / Apache-2.0のデュアルライセンスを基礎としています。生成した実際の依存ロックファイルに基づき、すべての推移的依存関係と音声コーデック/GStreamer関連ライセンスを再確認してください。

**製品本体のライセンスは未指定です。** MusicMenkerが公開条件を決定するまで、ソース公開によって自動的にBSD-2-Clause等のライセンスが付与されるものではありません。
