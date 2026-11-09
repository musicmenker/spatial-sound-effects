#!/usr/bin/env node
// Structural verification of native distribution assets before draft publication.
// This is not equivalent to installation or functional testing on actual devices.
import fs from 'node:fs/promises';
import path from 'node:path';
import {APP_VERSION} from '../src/data/effects.js';

const argv=process.argv.slice(2);
const opts={dir:'release',tag:APP_VERSION};
for(let i=0;i<argv.length;i++) {
  if(!argv[i].startsWith('--')||!(argv[i].slice(2) in opts)||!argv[i+1])throw new Error('Invalid option '+argv[i]);
  opts[argv[i++].slice(2)]=argv[i];
}
if(opts.tag!==APP_VERSION)throw new Error(`Tag ${opts.tag} does not match application ${APP_VERSION}`);
const stem=`MusicMenker-SpatialSoundEffects-${APP_VERSION}-`;
const required=new Map([
  ['linux-x64.deb','deb'],['linux-x64.rpm','rpm'],['linux-x64.AppImage','elf'],
  ['linux-x64-portable.tar.gz','gzip'],['windows-x64-portable.zip','zip'],
  ['windows-x64-setup.exe','exe'],['windows-x64-offline-setup.exe','exe'],
  ['macos-x64.dmg','dmg'],['macos-arm64.dmg','dmg'],['macos-universal.dmg','dmg']
]);
const found=await fs.readdir(opts.dir);
const magic={deb:Buffer.from('213c617263683e0a','hex'),rpm:Buffer.from('edabeedb','hex'),
  elf:Buffer.from('7f454c46','hex'),gzip:Buffer.from('1f8b','hex'),
  zip:Buffer.from('504b0304','hex'),exe:Buffer.from('4d5a','hex'),
  zstd:Buffer.from('28b52ffd','hex')};
async function verify(file,kind){
  const handle=await fs.open(path.join(opts.dir,file),'r');
  try {
    const stat=await handle.stat();
    if(!stat.isFile()||stat.size<1024)throw new Error('Unexpectedly small artifact: '+file);
    const start=Buffer.alloc(64);
    await handle.read(start,0,64,0);
    if(kind==='dmg') {
      const tail=Buffer.alloc(512);
      await handle.read(tail,0,512,stat.size-512);
      if(tail.toString('ascii',0,4)!=='koly')throw new Error('Missing UDIF trailer: '+file);
    } else if(!start.subarray(0,magic[kind].length).equals(magic[kind])) {
      throw new Error(`Invalid ${kind} header: ${file}`);
    }
    if(kind==='elf' && start.readUInt16LE(18)!==62)throw new Error('ELF is not x86_64: '+file);
    console.log('VERIFIED',file,stat.size);
  } finally {await handle.close();}
}
for(const [suffix,kind] of required) {
  const name=stem+suffix;
  if(!found.includes(name))throw new Error('Missing release artifact: '+name);
  await verify(name,kind);
}
const pacman=found.filter(name=>name===`musicmenker-spatial-sound-effects-0.0.4.0-1-x86_64.pkg.tar.zst`);
if(pacman.length!==1)throw new Error('Missing or mismatched pacman package');
await verify(pacman[0],'zstd');
console.log('All 11 expected distribution files have plausible archive signatures');
