#!/usr/bin/env node
// Self-contained packaging of an existing native Windows x64 Tauri binary.
// The marker activates WebView2 profile redirection in the Rust entry point.
import fs from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';
import { APP_VERSION } from '../src/data/effects.js';

const args=process.argv.slice(2);
let binary='src-tauri/target/release/musicmenker-spatial-sound-effects.exe';
let outDir='release';
for(let i=0;i<args.length;i++) {
  if(args[i]==='--binary' && args[i+1]) binary=args[++i];
  else if(args[i]==='--output' && args[i+1]) outDir=args[++i];
  else throw new Error(`Unknown or incomplete argument: ${args[i]}`);
}
const exe=await fs.readFile(binary);
if (exe.length<128||exe.toString('ascii',0,2)!=='MZ') throw new Error('Input is not a Windows PE executable');
const peOffset=exe.readUInt32LE(0x3c);
if(peOffset+6>exe.length||exe.toString('ascii',peOffset,peOffset+4)!=='PE\0\0') throw new Error('Invalid Windows PE header');
if(exe.readUInt16LE(peOffset+4)!==0x8664) throw new Error('Expected Windows x86_64 (AMD64) binary');
const zip=new JSZip();
zip.file('MusicMenker-SpatialSoundEffects.exe',exe,{binary:true,compression:'DEFLATE'});
for(const [dest,src] of [
  ['MusicMenker.portable','packaging/windows/MusicMenker.portable'],
  ['README-PORTABLE.txt','packaging/windows/README-PORTABLE.txt'],
  ['THIRD_PARTY.md','THIRD_PARTY.md']
]) zip.file(dest,await fs.readFile(src));
const file=`MusicMenker-SpatialSoundEffects-${APP_VERSION}-windows-x64-portable.zip`;
await fs.mkdir(outDir,{recursive:true});
const tmp=path.resolve(outDir,file+'.tmp');
await fs.writeFile(tmp,await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE',compressionOptions:{level:6}}));
const verify=await JSZip.loadAsync(await fs.readFile(tmp));
for(const filename of ['MusicMenker-SpatialSoundEffects.exe','MusicMenker.portable','README-PORTABLE.txt']) {
  if(!verify.file(filename)) throw new Error('Broken Portable ZIP: missing '+filename);
}
await fs.rename(tmp,path.resolve(outDir,file));
console.log(`[MusicMenker] Generated: ${path.resolve(outDir,file)}`);
