/** MusicMenker platform file boundary. DSP and project serialization remain shared. */
export function isDesktop(){
  return typeof window !== 'undefined' && Boolean(window.__TAURI_INTERNALS__);
}

const formats={
  audio:{name:'Audio',extensions:['wav','mp3','ogg','flac','m4a','aac','aif','aiff','opus']},
  project:{name:'MusicMenker Project',extensions:['json','zip']},
  ir:{name:'Impulse response',extensions:['wav','flac','ogg','aif','aiff']}
};
export const MAX_NATIVE_INPUT={audio:220*1024*1024,project:250*1024*1024,ir:35*1024*1024};

/** Return File or null (user canceled). On desktop native dialog scopes the selected path. */
export async function openNativeFile(kind){
  if(!isDesktop())throw new Error('この操作はデスクトップ版専用です。');
  if(!formats[kind])throw new Error('未対応のファイル種別です。');
  const [{open},{readFile,stat}]=await Promise.all([
    import('@tauri-apps/plugin-dialog'), import('@tauri-apps/plugin-fs')
  ]);
  const selected=await open({multiple:false,directory:false,filters:[formats[kind]]});
  if(selected==null)return null;
  if(typeof selected!=='string')throw new Error('ファイル選択結果が不正です。');
  const info=await stat(selected);
  if(info.size>MAX_NATIVE_INPUT[kind])throw new Error(`ファイルが大きすぎます（${Math.floor(MAX_NATIVE_INPUT[kind]/1024/1024)}MiB以下）。`);
  const bytes=await readFile(selected);
  const name=selected.split(/[\\/]/).pop()||`audio.wav`;
  return new File([bytes],name,{type:kind==='project'&&name.toLowerCase().endsWith('.json')?'application/json':'application/octet-stream'});
}

/** Returns false only if user explicitly cancels desktop save. */
export async function saveOutput(blob,name){
  if(!isDesktop()){
    // Browser downloads can't confirm the user's final save location.
    const {downloadBlob}=await import('../audio/wav.js');
    downloadBlob(blob,name);
    return true;
  }
  const [{save},{writeFile}]=await Promise.all([
    import('@tauri-apps/plugin-dialog'), import('@tauri-apps/plugin-fs')
  ]);
  const extension=name.toLowerCase().endsWith('.sse.zip')?'zip':name.toLowerCase().endsWith('.sse.json')?'json':name.split('.').pop().toLowerCase();
  if(!['wav','zip','json'].includes(extension))throw new Error('保存形式が許可されていません。');
  const selected=await save({defaultPath:name,filters:[{name:extension.toUpperCase(),extensions:[extension]}]});
  if(selected==null)return false;
  // No arbitrary path is accepted here: dialog plugin grants access to chosen file only.
  await writeFile(selected,new Uint8Array(await blob.arrayBuffer()));
  return true;
}
