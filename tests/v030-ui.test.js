import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('v0.0.3.0 entry uses Alpine studio V4 and independent existing modes',()=>{
  assert.match(read('src/main.js'),/studioV4/);
  const h=read('index.html');
  for(const field of ['originalWave','processedWave','fromProjectInput','fromPresetInput','splitReverb','protectHighs','splitDistance','manualGainDb','helpOpen','creditsOpen'])assert.ok(h.includes(field),field);
});
test('WAV 24-bit and processed playback are defaults in data and UI layers',()=>{
  assert.match(read('src/data/effects.js'),/bitDepth:'24'/);
  assert.match(read('src/ui/studio.js'),/bitDepth:'24'/);
  assert.match(read('src/ui/studio-v2.js'),/previewMode:'processed'/);
  assert.match(read('src/ui/studio-v2.js'),/this.previewMode='processed'/);
});
test('Preset CRUD, switching prompts, A/B and cancel actions are connected',()=>{
  const s=read('src/ui/studio-v4.js'),h=read('index.html');
  for(const name of ['importMmsse','exportMmsse','saveCurrentPreset','confirmSaveAs','renamePreset','deleteCurrentPreset','confirmSwitch','switchComparison','restoreComparisonA','cancelOperation','encodeWavAsync'])assert.ok(s.includes(name),name);
  for(const name of ['.mmsseを追加','.mmsse書き出し','A（変更前）を試聴','B（現在）を試聴','変更あり・未保存','処理をキャンセル','work.percent'])assert.ok(h.includes(name),name);
});
test('Preset storage has schema upgrade preserving original project tables',()=>{
  const s=read('src/storage/projects.js');
  assert.match(s,/db\.version\(1\)\.stores\(\{drafts:'key',assets:'key'\}\)/);
  assert.match(s,/db\.version\(2\)\.stores\(\{drafts:'key',assets:'key',customPresets:'id'\}\)/);
});
test('Visual design retains zero-radius and no gradients',()=>{
  const css=read('src/style.css');
  assert.match(css,/border-radius:0!important/);
  assert.doesNotMatch(css,/(?:linear|radial|conic)-gradient\(/);
});
