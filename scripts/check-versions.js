import {readFileSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
const pkg=JSON.parse(read('package.json'));
const conf=JSON.parse(read('src-tauri/tauri.conf.json'));
const cargo=read('src-tauri/Cargo.toml');
const html=read('index.html');
const effects=read('src/data/effects.js');
const expected='v0.0.2.1';
if(pkg.version!=='0.0.3'||conf.version!=='0.0.3'||!cargo.includes('version = "0.0.3"')||!html.includes(expected)||!effects.includes(expected)||conf.bundle.publisher!=='MusicMenker'){
  console.error('MusicMenker version/publisher mismatch');process.exitCode=1;
}else console.log('PASS: MusicMenker display / Tauri / Cargo / npm versions match release mapping');
