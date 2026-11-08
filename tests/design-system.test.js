import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/style.css',import.meta.url),'utf8');
const ui=readFileSync(new URL('../src/ui/studio-v3.js',import.meta.url),'utf8');
const wave=readFileSync(new URL('../src/ui/waveform.js',import.meta.url),'utf8');
test('Light theme and MusicMenker tokens, no prohibited decoration',()=>{
  assert.match(html,/data-mm-theme="light"/);
  assert.match(css,/--mm-bg:#fafafa/);
  assert.match(css,/border-radius:0!important/);
  assert.doesNotMatch(css,/linear-gradient|radial-gradient|backdrop-filter|neon|glow/i);
  for(const hex of ['#355d85','#35648f','#c7e2ff','#8caac5'])assert.ok(!css.includes(hex),`forbidden old color ${hex}`);
  assert.doesNotMatch(html,/<span class="app-logo">/);
});
test('Independent waveforms, playback, export and clear preview state retained',()=>{
  for(const target of ['originalWave','processedWave','originalTimeline','processedTimeline'])
    assert.match(html,new RegExp('x-ref="'+target+'"'));
  for(const method of ['openAudioDialog','loadDemo','choosePreview','playPause','stop','buildPreview','exportWav','exportJSON','exportZIP','restore','fromProjectInput','importImpulse','removeIR'])
    assert.ok(html.includes(method+'('),`UI missing ${method}`);
  assert.match(html,/previewDirty&&previewReady/);
});
test('Three processing switches and manual volume offset retained',()=>{
  for(const key of ['splitReverb','protectHighs','splitDistance','autoGain','manualGainDb','dryLevel','wetLevel','distanceLevelDb'])
    assert.ok(html.includes(key),`missing ${key}`);
  for(const name of ['setQuickNumber','setValidatedGain','setPrecisionInput','setDistanceInput','setEffectInput','moveEffect'])
    assert.match(ui,new RegExp(name+'\\('));
});
test('Precise input, help, credits, semantic status, waveform keyboard operation',()=>{
  assert.ok((html.match(/type="number"/g)||[]).length>=5);
  assert.match(html,/aria-labelledby="help-title"/);
  assert.match(html,/aria-labelledby="credits-title"/);
  assert.match(html,/role="status"/);
  assert.match(wave,/ArrowLeft/);
  assert.match(wave,/aria-valuenow/);
});
