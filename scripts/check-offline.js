import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {join,extname} from 'node:path';
const errors=[];
const root=process.cwd();
for(const file of ['index.html','src/main.js','src/platform/files.js']){
  const content=readFileSync(join(root,file),'utf8');
  if(/<script[^>]+src=["']https?:\/\//i.test(content)||/<link[^>]+(?:href)=["']https?:\/\//i.test(content)) errors.push(`${file}: remote runtime resource`);
}
// A packaged app must contain all runtime JS/CSS/audio assets; HTTP fetches are not allowed in distributed assets.
if(existsSync('dist')){
  const list=(dir)=>{for(const entry of readdirSync(dir,{withFileTypes:true})){
    const file=join(dir,entry.name);
    if(entry.isDirectory())list(file);
    else if(['.js','.html','.css'].includes(extname(file))){
      const content=readFileSync(file,'utf8');
      if(/(?:src|href)=["']https?:\/\//i.test(content))errors.push(`${file}: external runtime dependency`);
    }
  }};
  list('dist');
}
if(errors.length){errors.forEach(e=>console.error(e));process.exitCode=1;}
else console.log('PASS: no remote script/style links detected in application entry points'+(existsSync('dist')?' and built output':''));
