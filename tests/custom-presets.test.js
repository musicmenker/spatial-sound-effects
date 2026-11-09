import test from 'node:test';
import assert from 'node:assert/strict';
import {PRESETS} from '../src/data/presets.js';
import {DEFAULT_SETTINGS} from '../src/data/effects.js';
import {MMSSE_FORMAT,parseMmsse,makeCustomPreset,isDirtyPreset,acousticSignature,formatMmsse} from '../src/data/custom-presets.js';

test('A .mmsse preset round trips every audio effect and its order',()=>{
  const original=PRESETS.find(p=>p.id==='tunnel');
  const custom=makeCustomPreset({id:'custom-fixture',title:'トンネル A',author:'MusicMenker',description:'test',settings:original.settings});
  const restored=parseMmsse(formatMmsse(custom));
  assert.equal(restored.format,MMSSE_FORMAT);
  assert.equal(restored.title,'トンネル A');
  assert.deepEqual(restored.settings.effects,original.settings.effects);
});
test('A .mmsse preset excludes export options and source-calibrated gain',()=>{
  const custom=makeCustomPreset({id:'custom-test',title:'demo',settings:{...DEFAULT_SETTINGS,autoGainDb:8.3,bitDepth:'16',sampleRate:'44100'}});
  assert.equal('autoGainDb' in custom.settings,false);
  assert.equal('bitDepth' in custom.settings,false);
  assert.equal('sampleRate' in custom.settings,false);
});
test('Unchanged and reverted settings do not become dirty',()=>{
  const before=PRESETS[0].settings;
  const next=structuredClone(before);
  assert.equal(isDirtyPreset(next,before),false);
  next.effects[0].enabled=!next.effects[0].enabled;
  assert.equal(isDirtyPreset(next,before),true);
  next.effects[0].enabled=!next.effects[0].enabled;
  assert.equal(isDirtyPreset(next,before),false);
});
test('Export settings do not affect acoustic dirty state',()=>{
  const a=structuredClone(DEFAULT_SETTINGS);
  const b={...a,bitDepth:'24',sampleRate:'48000',autoGainDb:5};
  assert.equal(acousticSignature(a),acousticSignature(b));
});
test('Invalid, duplicated, and unknown effects are rejected instead of discarded',()=>{
  const original=makeCustomPreset({id:'custom-test',title:'test',settings:DEFAULT_SETTINGS});
  assert.throws(()=>parseMmsse({...original,format:'not-preset'}),/非対応/);
  assert.throws(()=>parseMmsse({...original,settings:{effects:[{id:'external-code',enabled:true}]}}),/未対応/);
  const duplicate=structuredClone(original);duplicate.settings.effects[1].id=duplicate.settings.effects[0].id;
  assert.throws(()=>parseMmsse(duplicate),/重複/);
});
test('Preset rejects an unsupported schema version and invalid metadata',()=>{
  const original=makeCustomPreset({id:'custom-test',title:'test',settings:DEFAULT_SETTINGS});
  assert.throws(()=>parseMmsse({...original,schemaVersion:2}),/非対応/);
  assert.throws(()=>makeCustomPreset({id:'??',title:'test',settings:DEFAULT_SETTINGS}),/ID/);
  assert.throws(()=>makeCustomPreset({id:'custom',title:'',settings:DEFAULT_SETTINGS}),/プリセット名/);
});

test('Shipped .mmsse example can be imported',async()=>{
  const {readFileSync}=await import('node:fs');
  const file=readFileSync(new URL('../examples/浴室-カスタム.mmsse',import.meta.url),'utf8');
  const p=parseMmsse(file);
  assert.equal(p.title,'浴室（配布サンプル）');
  assert.equal(p.category,'追加');
});
