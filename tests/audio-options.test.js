import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_SETTINGS,enforceSettings,cloneSettings} from '../src/data/effects.js';
import {PRESETS} from '../src/data/presets.js';

test('Acoustic control toggles are enabled by default',()=>{
  const settings=enforceSettings();
  assert.equal(settings.splitReverb,true);
  assert.equal(settings.protectHighs,true);
  assert.equal(settings.splitDistance,true);
  assert.equal(settings.autoGain,true);
  assert.equal(settings.distanceLevelDb,0);
  assert.equal(settings.manualGainDb,0);
});
test('Independent switches and manual levels persist when valid',()=>{
  const settings=enforceSettings({...cloneSettings(DEFAULT_SETTINGS),splitReverb:false,protectHighs:false,splitDistance:false,manualGainDb:-3.5,wetLevel:75,distanceLevelDb:-8});
  assert.equal(settings.splitReverb,false);
  assert.equal(settings.protectHighs,false);
  assert.equal(settings.splitDistance,false);
  assert.equal(settings.manualGainDb,-3.5);
  assert.equal(settings.wetLevel,75);
  assert.equal(settings.distanceLevelDb,-8);
});
test('Manual controls and estimated automatic adjustment are bounded',()=>{
  const s=enforceSettings({manualGainDb:1000,autoGainDb:-30,dryLevel:-5,wetLevel:200,distanceLevelDb:10});
  assert.equal(s.manualGainDb,12);
  assert.equal(s.autoGainDb,-12);
  assert.equal(s.dryLevel,0);
  assert.equal(s.wetLevel,150);
  assert.equal(s.distanceLevelDb,0);
});
test('Presets that deliberately muffle highs declare the exception',()=>{
  for(const id of ['nextroom','underwater','radio']){
    assert.equal(PRESETS.find(x=>x.id===id).settings.highLossIntentional,true);
  }
  for(const id of ['basement','bathroom','hall','tunnel']){
    assert.equal(PRESETS.find(x=>x.id===id).settings.highLossIntentional,false);
  }
});
