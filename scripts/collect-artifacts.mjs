#!/usr/bin/env node
// Normalize native Tauri bundle names into public four-part version assets.
// Intentionally rejects missing/multiple candidates instead of publishing stale artifacts.
import fs from 'node:fs/promises';
import path from 'node:path';
import { APP_VERSION } from '../src/data/effects.js';

const opts={platform:'',arch:'',formats:'',mode:'',target:'',output:'release'};
const args=process.argv.slice(2);
for(let i=0;i<args.length;i++) {
  const key=args[i].replace(/^--/,'');
  if(!args[i].startsWith('--')||!(key in opts)||!args[i+1]) throw new Error('Invalid option: '+args[i]);
  opts[key]=args[++i];
}
const known={
  linux:{deb:{dir:'deb',ext:'.deb'},rpm:{dir:'rpm',ext:'.rpm'},appimage:{dir:'appimage',ext:'.AppImage'}},
  windows:{nsis:{dir:'nsis',ext:'.exe'}},
  macos:{dmg:{dir:'dmg',ext:'.dmg'}}
};
if(!(opts.platform in known)||!['x64','arm64','universal'].includes(opts.arch)) throw new Error('Missing or invalid --platform/--arch');
if(opts.platform==='windows' && opts.arch!=='x64') throw new Error('Windows output currently supports only x64');
const formats=opts.formats.split(',').filter(Boolean);
if(!formats.length) throw new Error('--formats is required');
const base=opts.target?path.join('src-tauri','target',opts.target,'release','bundle'):path.join('src-tauri','target','release','bundle');
await fs.mkdir(opts.output,{recursive:true});
for(const format of formats) {
  const spec=known[opts.platform][format];
  if(!spec) throw new Error(`Invalid format ${format} on ${opts.platform}`);
  const folder=path.join(base,spec.dir);
  const candidates=(await fs.readdir(folder,{withFileTypes:true})).filter(x=>x.isFile() && x.name.endsWith(spec.ext));
  if(candidates.length!==1) throw new Error(`Expected exactly 1 ${format} in ${folder}, found ${candidates.length}`);
  const file=candidates[0].name;
  const mode=opts.mode ? `-${opts.mode}` : '';
  let suffix;
  switch(format) {
    case 'nsis':suffix=`windows-${opts.arch}${mode}-setup.exe`;break;
    case 'appimage':suffix=`linux-${opts.arch}.AppImage`;break;
    case 'deb':suffix=`linux-${opts.arch}.deb`;break;
    case 'rpm':suffix=`linux-${opts.arch}.rpm`;break;
    case 'dmg':suffix=`macos-${opts.arch}.dmg`;break;
  }
  const name=`MusicMenker-SpatialSoundEffects-${APP_VERSION}-${suffix}`;
  const from=path.join(folder,file),to=path.join(opts.output,name);
  const stat=await fs.stat(from);
  if(!stat.size) throw new Error('Empty artifact: '+from);
  await fs.copyFile(from,to);
  if((await fs.stat(to)).size!==stat.size) throw new Error('Artifact copy mismatch: '+to);
  console.log(`[MusicMenker] Collected ${format}: ${to}`);
}
