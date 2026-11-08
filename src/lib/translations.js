import i18next from 'i18next';
const ja={
  app:'立体音響風エフェクター',studio:'スタジオ',presets:'プリセット',effects:'エフェクトチェーン',
  import:'音声を読み込む',demo:'デモ音源',source:'読み込んだ音源',empty:'音声を読み込むか、デモ音源を試してください',
  play:'再生',pause:'一時停止',stop:'停止',export:'WAVを書き出す',save:'プロジェクトを保存',
  saveJson:'設定JSON',saveZip:'音源込みZIP',load:'プロジェクトを開く',restore:'自動保存から復元',
  global:'マスター設定',mix:'加工音の混合率',master:'出力ゲイン',normalize:'書き出し正規化',
  rate:'サンプルレート',depth:'WAVビット深度',project:'プロジェクト',
  custom:'カスタム',noAudio:'音源未読み込み',on:'ON',off:'OFF',analysis:'ソース解析',
  exportPreset:'設定を保存',importIR:'IRを読み込む',clearIR:'IRを解除',
  headphones:'ヘッドホンでの試聴を推奨',changes:'変更は試聴と書き出しの両方に反映されます',
  reorder:'ドラッグして処理順序を変更',fileHint:'WAV / MP3 / FLACなど（ブラウザが対応する形式）',
  tips:'音はブラウザ内で処理され、サーバーに送信されません。',reset:'初期化',
  search:'プリセットを検索',selected:'選択中',info:'音声の書き出しには原音の長さに残響の余韻を追加します。',
};
const en={
  app:'Spatial-Style Audio Effects',studio:'Studio',presets:'Presets',effects:'Effect chain',
  import:'Import audio',demo:'Demo sound',source:'Source audio',empty:'Import audio or try the demo',
  play:'Play',pause:'Pause',stop:'Stop',export:'Export WAV',save:'Save project',
  saveJson:'Settings JSON',saveZip:'ZIP with audio',load:'Open project',restore:'Restore autosave',
  global:'Master settings',mix:'Processed audio mix',master:'Output gain',normalize:'Normalize export',
  rate:'Sample rate',depth:'WAV bit depth',project:'Project',
  custom:'Custom',noAudio:'No audio loaded',on:'ON',off:'OFF',analysis:'Source analysis',
  exportPreset:'Save settings',importIR:'Import IR',clearIR:'Clear IR',
  headphones:'Headphones recommended',changes:'Changes affect both preview and WAV export',
  reorder:'Drag to reorder processing',fileHint:'WAV / MP3 / FLAC, when supported by your browser',
  tips:'Audio stays in your browser and is not uploaded.',reset:'Reset',
  search:'Search presets',selected:'Selected',info:'WAV export includes extra time for reverb tails.',
};
i18next.init({lng:'ja',fallbackLng:'ja',resources:{ja:{translation:ja},en:{translation:en}},initImmediate:false});
export const t=(key)=>i18next.t(key);
export const setLanguage=(lang)=>i18next.changeLanguage(lang==='en'?'en':'ja');
