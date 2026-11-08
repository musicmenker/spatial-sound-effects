export const APP_VERSION = 'v0.0.2.1';
export const PROJECT_FORMAT = 'sse-project-v1';
export const MODULES = [
  { id:'filter', title:'周波数フィルター', en:'Frequency filter', desc:'低域と高域を整理して、壁越しや水中の音を再現', accent:'#8bbdff', controls:[
    {key:'highpass',label:'ハイパス',en:'High-pass',min:20,max:1200,step:10,unit:'Hz'},
    {key:'lowpass',label:'ローパス',en:'Low-pass',min:500,max:20000,step:100,unit:'Hz'}
  ]},
  { id:'eq', title:'3バンドEQ', en:'3-band EQ', desc:'低音・中音・高音のバランスを調整', accent:'#82d6c0', controls:[
    {key:'low',label:'低域',en:'Low',min:-18,max:18,step:1,unit:'dB'},
    {key:'mid',label:'中域',en:'Mid',min:-18,max:18,step:1,unit:'dB'},
    {key:'high',label:'高域',en:'High',min:-18,max:18,step:1,unit:'dB'}
  ]},
  { id:'reverb', title:'空間リバーブ', en:'Reverb', desc:'浴室・地下室・ホールなどの残響を生成', accent:'#d4abff', controls:[
    {key:'decay',label:'残響時間',en:'Decay',min:0.2,max:8,step:0.1,unit:'s'},
    {key:'predelay',label:'初期遅延',en:'Pre-delay',min:0,max:180,step:5,unit:'ms'},
    {key:'wet',label:'反響音の割合',en:'Wet',min:0,max:100,step:1,unit:'%'}
  ]},
  { id:'delay', title:'エコー・反射', en:'Delay / echo', desc:'遠くの壁で跳ね返ってくる反射音を再現', accent:'#ffbe8b', controls:[
    {key:'time',label:'遅延時間',en:'Delay time',min:40,max:900,step:10,unit:'ms'},
    {key:'feedback',label:'繰り返し',en:'Feedback',min:0,max:75,step:1,unit:'%'},
    {key:'wet',label:'反射音の割合',en:'Wet',min:0,max:80,step:1,unit:'%'}
  ]},
  { id:'distortion', title:'質感・歪み', en:'Texture / distortion', desc:'ラジオや古いスピーカーのような音質', accent:'#ff8fa8', controls:[
    {key:'amount',label:'歪み量',en:'Drive',min:0,max:90,step:1,unit:'%'},
    {key:'wet',label:'混合率',en:'Wet',min:0,max:100,step:1,unit:'%'}
  ]},
  { id:'distance', title:'遠距離・壁越し', en:'Distance / occlusion', desc:'遠く・壁の向こうから聞こえるように加工', accent:'#e8bd8c', controls:[
    {key:'muffle',label:'こもり',en:'Muffle',min:0,max:100,step:1,unit:'%'},
    {key:'far',label:'距離感・初期反射',en:'Distance reflections',min:0,max:100,step:1,unit:'%'},
    {key:'attenuation',label:'減衰量',en:'Attenuation',min:0,max:30,step:1,unit:'dB'}
  ]},
  { id:'surround', title:'疑似サラウンド', en:'Spatial / 8D', desc:'任意のステレオ拡張、8D Audio風移動、HRTF', accent:'#9fa8ff', controls:[
    {key:'width',label:'広がり',en:'Width',min:0,max:100,step:1,unit:'%'},
    {key:'speed',label:'回転速度',en:'Rotation speed',min:0.02,max:1.8,step:0.02,unit:'Hz'},
    {key:'depth',label:'移動の深さ',en:'Motion depth',min:0,max:100,step:1,unit:'%'}
  ]}
];
export const DEFAULT_EFFECTS = [
  {id:'filter',enabled:false,highpass:40,lowpass:16000},
  {id:'eq',enabled:false,low:0,mid:0,high:0},
  {id:'reverb',enabled:true,decay:2.2,predelay:24,wet:32},
  {id:'delay',enabled:false,time:180,feedback:27,wet:18},
  {id:'distortion',enabled:false,amount:18,wet:25},
  {id:'distance',enabled:false,muffle:40,far:0,attenuation:6},
  {id:'surround',enabled:false,mode:'wide',width:65,speed:0.23,depth:75}
];
export const DEFAULT_SETTINGS = {
  masterDb:0, mix:100, normalize:false, bitDepth:'16', sampleRate:'source',
  splitReverb:true,protectHighs:true,splitDistance:true,highLossIntentional:false,rawPlayback:false,
  dryLevel:100,wetLevel:40,distanceLevelDb:0,autoGain:true,autoGainDb:0,manualGainDb:0,
  effects:DEFAULT_EFFECTS.map(x=>({...x}))
};
export const SURROUND_MODES = [
  {id:'wide',title:'Stereo Wide',desc:'左右の広がりを調整'},
  {id:'orbit',title:'8D Motion',desc:'ヘッドホンで左右に周期移動'},
  {id:'hrtf',title:'Binaural HRTF',desc:'方向と距離を固定配置'}
];
export function cloneSettings(settings=DEFAULT_SETTINGS){return structuredClone(settings);}
export function getModule(id){return MODULES.find(x=>x.id===id);}
export function enforceSettings(candidate){
  const out=cloneSettings();
  if (!candidate || typeof candidate!=='object') return out;
  const bounded=(v,min,max,def)=>Number.isFinite(Number(v)) ? Math.min(max,Math.max(min,Number(v))) : def;
  out.masterDb=bounded(candidate.masterDb,-24,6,out.masterDb);
  for(const key of ['splitReverb','protectHighs','splitDistance','highLossIntentional','autoGain','rawPlayback']){
    if(candidate[key]!==undefined) out[key]=Boolean(candidate[key]);
  }
  out.dryLevel=bounded(candidate.dryLevel,0,150,out.dryLevel);
  out.wetLevel=bounded(candidate.wetLevel,0,150,out.wetLevel);
  out.distanceLevelDb=bounded(candidate.distanceLevelDb,-24,0,out.distanceLevelDb);
  out.autoGainDb=bounded(candidate.autoGainDb,-12,12,out.autoGainDb);
  out.manualGainDb=bounded(candidate.manualGainDb,-12,12,out.manualGainDb);
  out.mix=bounded(candidate.mix,0,100,out.mix);
  out.normalize=Boolean(candidate.normalize);
  out.bitDepth=['16','24','32f'].includes(candidate.bitDepth)?candidate.bitDepth:out.bitDepth;
  out.sampleRate=['source','44100','48000'].includes(candidate.sampleRate)?candidate.sampleRate:'source';
  const seen=new Set();
  const arr=Array.isArray(candidate.effects)?candidate.effects:[];
  const ordered=[];
  for(const item of arr){
    if(!item || !getModule(item.id) || seen.has(item.id)) continue;
    seen.add(item.id);
    const entry={...DEFAULT_EFFECTS.find(x=>x.id===item.id),enabled:Boolean(item.enabled)};
    for(const p of getModule(item.id).controls){entry[p.key]=bounded(item[p.key],p.min,p.max,entry[p.key]);}
    if(item.id==='surround')entry.mode=SURROUND_MODES.some(m=>m.id===item.mode)?item.mode:'wide';
    if(item.id==='filter' && entry.lowpass<=entry.highpass) entry.lowpass=Math.min(20000,entry.highpass+200);
    ordered.push(entry);
  }
  for(const item of DEFAULT_EFFECTS){if(!seen.has(item.id))ordered.push({...item});}
  out.effects=ordered;
  return out;
}
export function estimateTail(settings){
  let tail=0.1;
  for (const effect of settings.effects){
    if(!effect.enabled) continue;
    if(effect.id==='reverb') tail=Math.max(tail,effect.decay+effect.predelay/1000+0.35);
    if(effect.id==='distance' && effect.far>0) tail=Math.max(tail,(65+effect.far*1.25)/1000*4+0.15);
    if(effect.id==='delay' && effect.wet>0){
      const f=Math.min(.75,effect.feedback/100);
      const repeats=f>0 ? Math.ceil(Math.log(.012)/Math.log(f)):1;
      tail=Math.max(tail,effect.time/1000*Math.min(30,Math.max(1,repeats))+.3);
    }
  }
  return Math.min(13,tail);
}
