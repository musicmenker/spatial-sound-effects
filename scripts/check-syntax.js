import {readdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
const paths=[];
async function collect(dir){
  for(const f of await readdir(dir,{withFileTypes:true})){
    if(f.isDirectory())await collect(`${dir}/${f.name}`);
    else if(f.name.endsWith('.js'))paths.push(`${dir}/${f.name}`);
  }
}
await collect('src');await collect('tests');await collect('scripts');
let failure=0;
for(const p of paths){
  const r=spawnSync(process.execPath,['--check',p],{encoding:'utf8'});
  if(r.status){console.error(`${p}: ${r.stderr}`);failure++;}
}
console.log(`${paths.length-failure}/${paths.length} JavaScript files passed syntax validation.`);
if(failure)process.exitCode=1;
