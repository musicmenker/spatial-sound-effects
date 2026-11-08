import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isDesktop,openNativeFile,MAX_NATIVE_INPUT} from '../src/platform/files.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const conf=JSON.parse(read('src-tauri/tauri.conf.json'));
const perms=JSON.parse(read('src-tauri/capabilities/default.json'));
const pkg=JSON.parse(read('package.json'));

test('Web and desktop metadata are MusicMenker, with four-part public version',()=>{
  assert.equal(pkg.version,'0.0.3');
  assert.equal(conf.version,'0.0.3');
  assert.equal(conf.bundle.publisher,'MusicMenker');
  assert.match(read('src/data/effects.js'),/APP_VERSION = 'v0\.0\.2\.1'/);
  assert.match(read('index.html'),/MusicMenker/);
  assert.match(read('index.html'),/v0\.0\.2\.1/);
});
test('Tauri distribution is locally bundled, using native permissions only',()=>{
  assert.equal(conf.build.frontendDist,'../dist');
  assert.equal(conf.app.security.assetProtocol?.enable,undefined);
  assert.equal(conf.bundle.linux.appimage.bundleMediaFramework,true);
  assert.equal(conf.bundle.windows.webviewInstallMode.type,'downloadBootstrapper');
  assert.equal(JSON.parse(read('src-tauri/tauri.offline-windows.conf.json')).bundle.windows.webviewInstallMode.type,'offlineInstaller');
  assert.equal(perms.windows[0],'main');
  for(const p of ['dialog:allow-open','dialog:allow-save','fs:allow-read-file','fs:allow-write-file','fs:allow-stat'])assert.ok(perms.permissions.includes(p),p);
  assert.equal(perms.permissions.includes('fs:read-all'),false);
  assert.equal(perms.permissions.includes('shell:allow-execute'),false);
});
test('Web platform does not import native plugins or attempt file selection',async()=>{
  assert.equal(isDesktop(),false);
  await assert.rejects(openNativeFile('audio'),/デスクトップ版専用/);
  assert.equal(MAX_NATIVE_INPUT.audio,220*1024*1024);
});
test('Processed preview uses raw playback to avoid extra limiter',()=>{
  assert.match(read('src/ui/studio-v2.js'),/masterDb:0,mix:100,rawPlayback:true/);
  assert.match(read('src/audio/engine.js'),/if\(settings\.rawPlayback\)/);
  assert.match(read('src/ui/studio-v2.js'),/encodeWav\(previewBuffer/);
  assert.match(read('src/ui/studio-v2.js'),/await saveOutput\(blob/);
});
test('All three acoustic switches and auto/manual gain remain',()=>{
  const html=read('index.html');
  for(const key of ['splitReverb','protectHighs','splitDistance','autoGain','manualGainDb'])assert.ok(html.includes(key),key);
  assert.match(read('src/audio/engine.js'),/masterDb\+auto\+settings\.manualGainDb/);
});
test('Desktop native read/write is bounded and user-selected',()=>{
  const bridge=read('src/platform/files.js');
  assert.match(bridge,/await open\(/);
  assert.match(bridge,/await stat\(selected\)/);
  assert.match(bridge,/await save\(/);
  assert.match(bridge,/await writeFile\(selected/);
});
