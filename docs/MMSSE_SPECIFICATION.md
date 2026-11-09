# MusicMenker Spatial Sound Effects — `.mmsse` v1

## 目的

`.mmsse` は空間プリセットを他の端末へ配布・追加するための **UTF-8 JSON** 形式です。音源やIRのバイナリデータを含みません。従来の `.sse.json` と `.sse.zip` はプロジェクト保存形式として引き続き使用します。

## データ項目

| フィールド | 型 | 規則 |
|---|---|---|
| `format` | string | 固定値 `mmsse-preset-v1` |
| `schemaVersion` | integer | `1` |
| `id` | string | 最大100文字、英数字・`_`・`-` |
| `title` | string | 必須、1～100文字 |
| `en` | string | 表示名。通常はtitleと同値 |
| `category` | string | `追加`（インポート時に正規化） |
| `description` | string | 0～400文字 |
| `author` | string | 0～100文字 |
| `irName` | string | 外部IRのファイル名（あれば） |
| `settings` | object | 7個の既知エフェクトと音響トグルの設定 |

`settings` にWAVビット深度やサンプルレートなど書き出し用設定、音源由来の自動計算ゲイン、再生位置などは保存しません。

### 形式例

```json
{
  "format": "mmsse-preset-v1",
  "schemaVersion": 1,
  "id": "custom-audiospace-001",
  "title": "地下ホーム",
  "en": "地下ホーム",
  "category": "追加",
  "description": "コンクリート壁面の反響",
  "author": "MusicMenker user",
  "irName": "",
  "settings": {
    "masterDb": 0,
    "mix": 100,
    "splitReverb": true,
    "protectHighs": true,
    "splitDistance": true,
    "highLossIntentional": false,
    "dryLevel": 100,
    "wetLevel": 40,
    "distanceLevelDb": 0,
    "autoGain": true,
    "manualGainDb": 0,
    "effects": [
      {"id":"filter","enabled":false,"highpass":40,"lowpass":16000},
      {"id":"eq","enabled":false,"low":0,"mid":0,"high":0},
      {"id":"reverb","enabled":true,"decay":2.2,"predelay":24,"wet":32},
      {"id":"delay","enabled":false,"time":180,"feedback":27,"wet":18},
      {"id":"distortion","enabled":false,"amount":18,"wet":25},
      {"id":"distance","enabled":false,"muffle":40,"far":0,"attenuation":6},
      {"id":"surround","enabled":false,"mode":"wide","width":65,"speed":0.23,"depth":75}
    ]
  }
}
```

## 取り扱い

- 読み込むファイルの拡張子を `.mmsse` に限定し、1MiBまで。形式識別子、バージョン、各エフェクトのIDと一意性を検査します。
- IDが既存プリセットと重複した場合は、別IDで追加／カスタムプリセットを置換／キャンセルの選択肢を表示します。標準プリセットは上書き不可です。
- インポート成功後はIndexedDBのカスタムプリセット領域へ永続登録します。Web版とTauri版では保存領域が別です。
- 標準プリセットの編集結果は上書きせず、ユーザープリセットとして保存します。変更の判定は音響設定の内容比較に基づきます。
- 外部IRの音声データは含みません。`irName` が必要な場合はUIに注意を表示し、別途IRを読み込む必要があります。
- `.mmsse` は音声実行コードやスクリプトを持たないデータ形式であり、外部リソースの自動ダウンロードは行いません。

## 互換性

未対応の形式バージョンや未知のエフェクトは、無断で省略せず読み込みエラーとします。将来の形式拡張は`schemaVersion`を更新し、旧版を読むための移行経路を明示的に実装します。
