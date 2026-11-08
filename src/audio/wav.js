import {WaveFile} from 'wavefile';

function clamp(v){return Math.min(1,Math.max(-1,Number.isFinite(v)?v:0));}
export function encodeWav(buffer,bitDepth='16',normalize=false){
  const channels=Math.min(2,buffer.numberOfChannels);
  const frames=buffer.length;
  const peak=normalize ? Array.from({length:channels},(_,ch)=>buffer.getChannelData(ch)).reduce((p,a)=>{
    for(let i=0;i<a.length;i++)p=Math.max(p,Math.abs(a[i]));
    return p;
  },0):0;
  const gain=normalize&&peak>0 ? .988/peak : 1;
  const result=[];
  for(let ch=0;ch<channels;ch++){
    const source=buffer.getChannelData(ch);
    let data;
    if(bitDepth==='24'){
      data=new Int32Array(frames);
      for(let i=0;i<frames;i++)data[i]=Math.round(clamp(source[i]*gain)*8388607);
    }else if(bitDepth==='32f'){
      data=new Float32Array(frames);
      for(let i=0;i<frames;i++)data[i]=Number.isFinite(source[i]) ? source[i]*gain : 0;
    }else{
      data=new Int16Array(frames);
      for(let i=0;i<frames;i++)data[i]=Math.round(clamp(source[i]*gain)*32767);
    }
    result.push(data);
  }
  const wav=new WaveFile();
  wav.fromScratch(channels,buffer.sampleRate,bitDepth,result);
  const raw=wav.toBuffer();
  return new Blob([raw],{type:'audio/wav'});
}
export function downloadBlob(blob,name){
  const a=document.createElement('a');
  const url=URL.createObjectURL(blob);
  a.href=url;a.download=name;a.style.display='none';
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),2000);
}
export function safeBaseName(name){
  return String(name||'audio').replace(/\.[^.]+$/,'').replace(/[\\/:*?"<>|\x00-\x1f]/g,'_').slice(0,100)||'audio';
}
