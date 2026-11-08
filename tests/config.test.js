import test from 'node:test';
import assert from 'node:assert/strict';
import {enforceSettings,DEFAULT_SETTINGS,estimateTail,cloneSettings} from '../src/data/effects.js';
import {PRESETS} from '../src/data/presets.js';

test('Every preset contains all unique effects',()=>{
  const names=new Set();
  for(const preset of PRESETS){
    assert(!names.has(preset.id));names.add(preset.id);
    assert.equal(preset.settings.effects.length,7);
    assert.equal(new Set(preset.settings.effects.map(e=>e.id)).size,7);
  }
});
test('Imported settings are bounded and ordered safely',()=>{
  const s=enforceSettings({mix:-2,masterDb:200,effects:[
    {id:'reverb',enabled:true,wet:999,decay:-9,predelay:30},
    {id:'reverb',enabled:false,wet:0},
    {id:'unknown',enabled:true}
  ]});
  assert.equal(s.mix,0);assert.equal(s.masterDb,6);
  assert.equal(s.effects[0].id,'reverb');
  assert.equal(s.effects[0].wet,100);
  assert.equal(s.effects[0].decay,0.2);
  assert.equal(s.effects.length,7);
});
test('Tail time is bounded',()=>{
  const s=cloneSettings(DEFAULT_SETTINGS);
  const reverb=s.effects.find(e=>e.id==='reverb');
  reverb.decay=8;
  assert(estimateTail(s)>8);
  assert(estimateTail(s)<=13);
});
test('Invalid surround modes fallback to wide',()=>{
  const s=cloneSettings(DEFAULT_SETTINGS);
  s.effects.find(e=>e.id==='surround').mode='unknown';
  assert.equal(enforceSettings(s).effects.find(e=>e.id==='surround').mode,'wide');
});
