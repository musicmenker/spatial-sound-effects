import test from 'node:test';
import assert from 'node:assert/strict';
import {spectralCentroidHz,CENTROID_FRAME_SIZE} from '../src/audio/spectral-centroid.js';

function sine(hz,sampleRate=48000){
  return Float32Array.from({length:CENTROID_FRAME_SIZE},(_,i)=>Math.sin(2*Math.PI*hz*i/sampleRate));
}

test('centroid returns null on silence',()=>{
  assert.equal(spectralCentroidHz(new Float32Array(CENTROID_FRAME_SIZE),48000),null);
});
test('centroid estimates a bin-centred 750Hz tone in Hz',()=>{
  // 750Hz is exactly an FFT bin at 48000/2048 Hz resolution.
  const hz=spectralCentroidHz(sine(750),48000);
  assert.ok(Number.isFinite(hz));
  assert.ok(Math.abs(hz-750)<30,`measured ${hz}Hz`);
});
test('centroid estimates a second known tone',()=>{
  const hz=spectralCentroidHz(sine(1500),48000);
  assert.ok(Number.isFinite(hz));
  assert.ok(Math.abs(hz-1500)<35,`measured ${hz}Hz`);
});
test('centroid rejects short or invalid data safely',()=>{
  assert.equal(spectralCentroidHz(new Float32Array(50),48000),null);
  assert.equal(spectralCentroidHz(sine(750),0),null);
  const invalid=sine(750);invalid[0]=NaN;
  assert.equal(spectralCentroidHz(invalid,48000),null);
});
