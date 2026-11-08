import Ajv from 'ajv';
import JSZip from 'jszip';
import Dexie from 'dexie';
import {PROJECT_FORMAT,APP_VERSION,enforceSettings} from '../data/effects.js';

const schema={
  type:'object',additionalProperties:true,required:['format','settings'],
  properties:{
    format:{const:PROJECT_FORMAT},
    version:{type:'string'},
    created:{type:'string'},
    name:{type:'string',maxLength:200},
    presetId:{type:'string'},
    sourceName:{type:'string'},
    irName:{type:'string'},
    settings:{type:'object',required:['effects'],properties:{effects:{type:'array',maxItems:20}},additionalProperties:true}
  }
};
const ajv=new Ajv({allErrors:true});
const validate=ajv.compile(schema);
export function makeProject({name,settings,presetId,sourceName,irName}){
  return {format:PROJECT_FORMAT,version:APP_VERSION,created:new Date().toISOString(),
    name:String(name||'Untitled').slice(0,200),presetId:String(presetId||'custom'),
    sourceName:String(sourceName||''),irName:String(irName||''),
    settings:enforceSettings(settings)};
}
export function readProject(data){
  if(!validate(data))throw new Error('プロジェクト形式が正しくありません: '+ajv.errorsText(validate.errors));
  return {...data,settings:enforceSettings(data.settings)};
}
export async function zipProject(project,sourceFile=null,irFile=null){
  const zip=new JSZip();
  const manifest=structuredClone(project);
  manifest.assets={};
  if(sourceFile){
    const ext=String(sourceFile.name||'audio.wav').split('.').pop().replace(/[^a-z0-9]/ig,'').slice(0,8)||'wav';
    const path=`assets/source.${ext}`;
    zip.file(path,sourceFile,{compression:'STORE'});
    manifest.assets.source=path;
  }
  if(irFile){
    const ext=String(irFile.name||'impulse.wav').split('.').pop().replace(/[^a-z0-9]/ig,'').slice(0,8)||'wav';
    const path=`assets/impulse.${ext}`;
    zip.file(path,irFile,{compression:'STORE'});
    manifest.assets.ir=path;
  }
  zip.file('project.json',JSON.stringify(manifest,null,2));
  return zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:2}});
}
export async function unzipProject(blob){
  const zip=await JSZip.loadAsync(blob,{checkCRC32:false});
  const manifest=zip.file('project.json');
  if(!manifest)throw new Error('project.jsonがありません。');
  const data=readProject(JSON.parse(await manifest.async('string')));
  const getAsset=async(path)=>{
    if(!path)return null;
    if(typeof path!=='string'||!/^assets\/[a-zA-Z0-9_.-]+$/.test(path))throw new Error('アセットパスが不正です。');
    const entry=zip.file(path);
    if(!entry)throw new Error('ZIP内の音声ファイルが見つかりません。');
    return new File([await entry.async('blob')],path.split('/').pop(),{type:'audio/wav'});
  };
  const source=await getAsset(data.assets?.source);
  const ir=await getAsset(data.assets?.ir);
  return {project:data,source,ir};
}
const db=new Dexie('SpatialSoundEffects-v1');
db.version(1).stores({drafts:'key',assets:'key'});
export async function saveDraft(project,source,ir,includeAssets=false){
  await db.drafts.put({key:'latest',project});
  if(includeAssets){
    if(source)await db.assets.put({key:'source',file:source});
    else await db.assets.delete('source');
    if(ir)await db.assets.put({key:'ir',file:ir});
    else await db.assets.delete('ir');
  }
}
export async function loadDraft(){
  const draft=await db.drafts.get('latest');
  if(!draft)return null;
  const source=await db.assets.get('source');
  const ir=await db.assets.get('ir');
  return {project:readProject(draft.project),source:source?.file||null,ir:ir?.file||null};
}
export async function deleteDraft(){await db.transaction('rw',db.drafts,db.assets,()=>Promise.all([db.drafts.clear(),db.assets.clear()]));}
