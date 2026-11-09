import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {APP_VERSION} from '../src/data/effects.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const run=(command,args,options={})=>spawnSync(command,args,{cwd:root,encoding:'utf8',...options});
const createTemp=()=>fs.mkdtempSync(path.join(os.tmpdir(),'musicmenker-distribution-'));

test('public version and installer internals remain mapped consistently',()=>{
  const pkg=JSON.parse(read('package.json'));
  const conf=JSON.parse(read('src-tauri/tauri.conf.json'));
  const rust=read('src-tauri/Cargo.toml');
  assert.equal(APP_VERSION,'v0.0.4.0');
  assert.equal(pkg.version,'0.0.5');
  assert.equal(conf.version,'0.0.5');
  assert.match(rust,/version = "0\.0\.5"/);
  assert.equal(conf.bundle.windows.nsis.installMode,'currentUser');
  assert.ok(conf.bundle.icon.some(i=>i.endsWith('.ico')));
});

test('all target formats and CI jobs are present',()=>{
  const workflow=read('.github/workflows/build.yml');
  for(const key of ['linux-deb-appimage:','linux-rpm:','linux-arch:','windows:','windows-offline-installer:','macos:','release-draft:']) assert.ok(workflow.includes(key),key);
  for(const key of ['--bundles deb,appimage','--bundles rpm','--no-bundle','--bundles nsis','universal-apple-darwin','--bundles dmg']) assert.ok(workflow.includes(key),key);
  assert.ok(workflow.includes('node scripts/verify-release.mjs'));
  assert.ok(workflow.includes('if: startsWith(github.ref, \'refs/tags/v\')'));
});

test('Windows portable marker redirects WebView2 storage without changing installed defaults',()=>{
  const rust=read('src-tauri/src/lib.rs');
  assert.ok(rust.includes('#[cfg(windows)]'));
  assert.ok(rust.includes('MusicMenker.portable'));
  assert.ok(rust.includes('WEBVIEW2_USER_DATA_FOLDER'));
  assert.ok(rust.includes('current_exe()'));
  assert.ok(rust.includes('is_file()'));
  assert.ok(rust.includes('create_dir_all'));
  assert.ok(rust.includes('prepare_or_exit();'));
  const marker=read('packaging/windows/MusicMenker.portable');
  assert.ok(marker.includes('portable'));
});

test('release verifier rejects missing or mistagged assets',()=>{
  const dir=createTemp();
  try {
    const missing=run(process.execPath,['scripts/verify-release.mjs','--dir',dir,'--tag',APP_VERSION]);
    assert.notEqual(missing.status,0);
    assert.match(missing.stderr,/Missing release artifact/);
    const mismatch=run(process.execPath,['scripts/verify-release.mjs','--dir',dir,'--tag','v99.0.0.0']);
    assert.notEqual(mismatch.status,0);
    assert.match(mismatch.stderr,/does not match/);
  } finally {fs.rmSync(dir,{recursive:true,force:true});}
});

test('release verifier accepts only a complete asset set',()=>{
  const dir=createTemp();
  const stem=`MusicMenker-SpatialSoundEffects-${APP_VERSION}-`;
  const suffixes=['linux-x64.deb','linux-x64.rpm','linux-x64.AppImage','linux-x64-portable.tar.gz',
    'windows-x64-portable.zip','windows-x64-setup.exe','windows-x64-offline-setup.exe',
    'macos-x64.dmg','macos-arm64.dmg','macos-universal.dmg'];
  try {
    function fakeArtifact(name) {
      const buf=Buffer.alloc(1536);
      const magic=name.endsWith('.deb')?'213c617263683e0a'
        : name.endsWith('.rpm')?'edabeedb'
        : name.endsWith('.AppImage')?'7f454c46'
        : name.endsWith('.tar.gz')?'1f8b'
        : name.endsWith('.zip')?'504b0304'
        : name.endsWith('.pkg.tar.zst')?'28b52ffd'
        : name.endsWith('.exe')?'4d5a' : '';
      if(magic)Buffer.from(magic,'hex').copy(buf);
      if(name.endsWith('.AppImage'))buf.writeUInt16LE(62,18);
      if(name.endsWith('.dmg'))buf.write('koly',buf.length-512,'ascii');
      fs.writeFileSync(path.join(dir,name),buf);
    }
    for(const suffix of suffixes)fakeArtifact(stem+suffix);
    fakeArtifact('musicmenker-spatial-sound-effects-0.0.4.0-1-x86_64.pkg.tar.zst');
    const result=run(process.execPath,['scripts/verify-release.mjs','--dir',dir,'--tag',APP_VERSION]);
    assert.equal(result.status,0,result.stderr);
  } finally {fs.rmSync(dir,{recursive:true,force:true});}
});

test('Linux Portable packs a verified ELF, its launcher and notices', {skip:process.platform!=='linux'},()=>{
  const dir=createTemp();
  try {
    const result=run('bash',['scripts/package-linux-portable.sh','/bin/true',dir]);
    assert.equal(result.status,0,result.stderr);
    const files=fs.readdirSync(dir);
    assert.equal(files.length,1);
    assert.match(files[0],/v0\.0\.4\.0-linux-x64-portable\.tar\.gz$/);
    const archive=path.join(dir,files[0]);
    const check=run('tar',['-tzf',archive]);
    assert.equal(check.status,0,check.stderr);
    for(const entry of ['/run.sh','/bin/musicmenker-spatial-sound-effects','/README-PORTABLE.txt']) assert.ok(check.stdout.includes(entry),entry);
  } finally {fs.rmSync(dir,{recursive:true,force:true});}
});

test('Linux Portable refuses non-ELF input', {skip:process.platform!=='linux'},()=>{
  const dir=createTemp();
  try {
    const fake=path.join(dir,'fake');
    fs.writeFileSync(fake,'#!/usr/bin/env bash\necho fake\n',{mode:0o755});
    const result=run('bash',['scripts/package-linux-portable.sh',fake,path.join(dir,'out')]);
    assert.notEqual(result.status,0);
    assert.match(result.stderr,/Not an ELF executable/);
  } finally {fs.rmSync(dir,{recursive:true,force:true});}
});

test('Windows portable ZIP contains executable, marker and readme', {skip:!fs.existsSync(path.join(root,'node_modules/jszip/package.json'))},async()=>{
  const dir=createTemp();
  try {
    const binary=path.join(dir,'test.exe');
    const pe=Buffer.alloc(512);
    pe.write('MZ',0,'ascii');
    pe.writeUInt32LE(0x80,0x3c);
    pe.write('PE\0\0',0x80,'ascii');
    pe.writeUInt16LE(0x8664,0x84);
    fs.writeFileSync(binary,pe);
    const result=run(process.execPath,['scripts/package-windows-portable.mjs','--binary',binary,'--output',dir]);
    assert.equal(result.status,0,result.stderr);
    const zipfile=path.join(dir,`MusicMenker-SpatialSoundEffects-${APP_VERSION}-windows-x64-portable.zip`);
    const JSZip=(await import('jszip')).default;
    const zip=await JSZip.loadAsync(fs.readFileSync(zipfile));
    for(const name of ['MusicMenker-SpatialSoundEffects.exe','MusicMenker.portable','README-PORTABLE.txt','THIRD_PARTY.md'])assert.ok(zip.file(name),name);
  } finally {fs.rmSync(dir,{recursive:true,force:true});}
});
