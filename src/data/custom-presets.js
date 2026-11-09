import {cloneSettings,enforceSettings,getModule} from './effects.js';

export const MMSSE_FORMAT='mmsse-preset-v1';
export const MMSSE_MAX_BYTES=1024*1024;
export const CUSTOM_CATEGORY='追加';
const ID_PATTERN=/^[A-Za-z0-9_-]{1,100}$/;
const MAX_NAME=100;
export function newPresetId(){
  return 'custom-'+crypto.randomUUID();
}

/** Project-only fields and source-derived calibration are intentionally excluded. */
export function acousticSettings(settings){
  const s=cloneSettings(enforceSettings(settings));
  for(const key of ['bitDepth','sampleRate','normalize','autoGainDb','rawPlayback'])delete s[key];
  return s;
}
export function acousticSignature(settings){return JSON.stringify(acousticSettings(settings));}
function requireText(value,label,max){
  if(typeof value!=='string'||!value.trim()||value.length>max)throw new Error(`${label}が不正です。最大${max}文字です。`);
  return value.trim();
}
export function makeCustomPreset({id=newPresetId(),title,description='',author='MusicMenker user',settings,irName=''}){
  if(!ID_PATTERN.test(id))throw new Error('プリセットIDが不正です。');
  const name=requireText(title,'プリセット名',MAX_NAME);
  if(typeof description!=='string'||description.length>400)throw new Error('説明は400文字以内です。');
  if(typeof author!=='string'||author.length>100)throw new Error('作成者は100文字以内です。');
  if(typeof irName!=='string'||irName.length>200)throw new Error('IR名が不正です。');
  if(!settings||!Array.isArray(settings.effects))throw new Error('エフェクト設定がありません。');
  const seen=new Set();
  for(const fx of settings.effects){
    if(!fx||typeof fx.id!=='string'||!getModule(fx.id))throw new Error('未対応のエフェクトが含まれています。');
    if(seen.has(fx.id))throw new Error('エフェクトIDが重複しています。');
    seen.add(fx.id);
  }
  if(seen.size!==7)throw new Error('エフェクト設定が不足しています。');
  return {
    format:MMSSE_FORMAT, schemaVersion:1, id, title:name, en:name,
    description:description.trim(),author:author.trim(),category:CUSTOM_CATEGORY,
    irName:irName.trim(),settings:acousticSettings(settings)
  };
}
export function parseMmsse(json){
  let obj;
  if(typeof json==='string'){
    if(new TextEncoder().encode(json).length>MMSSE_MAX_BYTES)throw new Error('プリセットは1MiBまでです。');
    try{obj=JSON.parse(json);}catch{throw new Error('JSONの構文が不正です。');}
  }else obj=json;
  if(!obj||typeof obj!=='object'||Array.isArray(obj))throw new Error('プリセットデータが不正です。');
  if(obj.format!==MMSSE_FORMAT||obj.schemaVersion!==1)throw new Error('非対応の.mmsse形式です。');
  if(!ID_PATTERN.test(obj.id))throw new Error('プリセットIDが不正です。');
  return makeCustomPreset(obj);
}
export function isDirtyPreset(current,baseline){
  return baseline!=null&&acousticSignature(current)!==acousticSignature(baseline);
}
export function formatMmsse(preset){return JSON.stringify(parseMmsse(preset),null,2)+'\n';}
