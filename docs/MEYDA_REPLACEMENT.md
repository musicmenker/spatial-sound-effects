# Meyda置換の記録 (v0.0.2.1)

## 変更箇所

- `src/ui/studio.js`：Meyda importを削除し、`spectralCentroidHz` を利用。
- `src/audio/spectral-centroid.js`：MITライセンスの`fourier-transform@2.5.1`でFFTを実行。Hann窓と振幅の加重平均でスペクトル重心をHzで返す。
- `package.json`：`meyda`を削除し、`fourier-transform`を厳密に2.5.1へ固定。
- `tests/spectral-centroid.test.js`：無音、750Hz/1500Hz、異常入力をテスト。
- `tests/dependency-replacement.test.js`：依存構造・謝辞のテスト。
- `THIRD_PARTY.md`とUI謝辞を更新。

## 制約

旧版と同じく、入力音声の最初の2048サンプルだけが対象で、曲全体の音色を示す数値ではありません。現在の主要UIには表示されておらず、音響加工やWAV出力にも使用されません。音響処理本体は変更していません。

旧Meydaと窓関数やFFT実装が異なるため、スペクトル重心のHz値が完全一致する保証はありません。

## 脆弱性対応

`meyda -> @rollup/plugin-node-resolve -> deepmerge`という以前の依存経路を除外します。

ただし、別の依存経路を通じて脆弱なライブラリがインストールされる可能性があります。修正の成否は必ず実際の`npm audit`結果で判定してください。

```sh
npm install
npm ls meyda deepmerge @rollup/plugin-node-resolve fourier-transform
npm audit
npm run check:syntax
npm test
npm run build
```
