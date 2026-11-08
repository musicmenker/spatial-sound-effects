import * as Tone from 'tone';
import {enforceSettings, estimateTail} from '../data/effects.js';

async function waitReady(promises,ms=30000){
  let timer;
  try{return await Promise.race([Promise.all(promises),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('エフェクトの準備がタイムアウトしました')),ms);})]);}
  finally{clearTimeout(timer);}
}
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

// The exact same graph builder is used by realtime playback and Tone.Offline.
async function createGraph(buffer, config, importedIR=null, attachMonitor=false){
  const settings=enforceSettings(config);
  const player=new Tone.Player(buffer);
  const nodes=[];
  const ready=[];
  if(settings.rawPlayback){
    player.toDestination();
    return {player,nodes:[],analyser:null,dispose(){
      try{player.stop();}catch{}
      try{player.dispose();}catch{}
    }};
  }
  let previous=player;

  function add(node){
    previous.connect(node);
    nodes.push(node);
    previous=node;
  }
  const crossfade=new Tone.CrossFade(settings.mix/100);
  nodes.push(crossfade);
  player.connect(crossfade.a);

  for(const f of settings.effects){
    if(!f.enabled)continue;
    switch(f.id){
      case 'filter': {
        add(new Tone.Filter({type:'highpass',frequency:f.highpass,rolloff:-12}));
        add(new Tone.Filter({type:'lowpass',frequency:settings.protectHighs&&!settings.highLossIntentional?Math.max(11000,f.lowpass):f.lowpass,rolloff:-12}));
        break;
      }
      case 'eq': add(new Tone.EQ3({low:f.low,mid:f.mid,high:settings.protectHighs&&!settings.highLossIntentional?Math.max(-2,f.high):f.high,lowFrequency:400,highFrequency:2500}));break;
      case 'reverb': {
        // A parallel wet-only branch avoids fading down the direct source when reverb grows.
        const reverb=importedIR?new Tone.Convolver(importedIR):new Tone.Reverb({decay:f.decay,preDelay:f.predelay/1000,wet:1});
        if(!importedIR)ready.push(reverb.ready);
        if(settings.splitReverb){
          const sum=new Tone.Gain(1);
          const dry=new Tone.Gain(settings.dryLevel/100);
          const wet=new Tone.Gain((f.wet/100)*(settings.wetLevel/40));
          // Reverb output is fully wet even when configured with an imported IR.
          previous.connect(dry);dry.connect(sum);
          previous.connect(reverb);
          let wetInput=reverb;
          if(settings.protectHighs&&!settings.highLossIntentional){
            const damp=new Tone.Filter({type:'lowpass',frequency:10000,rolloff:-12});
            reverb.connect(damp);nodes.push(damp);wetInput=damp;
          }
          wetInput.connect(wet);wet.connect(sum);
          nodes.push(reverb,dry,wet,sum);previous=sum;
        }else{
          // Traditional crossfade (which can lower the direct sound when wet rises).
          const fade=new Tone.CrossFade(f.wet/100);
          previous.connect(fade.a);
          previous.connect(reverb);reverb.connect(fade.b);
          nodes.push(reverb,fade);previous=fade;
        }
        break;
      }
      case 'delay':add(new Tone.FeedbackDelay({delayTime:f.time/1000,feedback:f.feedback/100,wet:f.wet/100}));break;
      case 'distortion':add(new Tone.Distortion({distortion:f.amount/100,oversample:'2x',wet:f.wet/100}));break;
      case 'distance':{
        let frequency=clamp(19000*Math.pow(.055,f.muffle/100),650,19000);
        if(settings.protectHighs&&!settings.highLossIntentional)frequency=Math.max(8500,frequency);
        add(new Tone.Filter({type:'lowpass',frequency,rolloff:-12}));
        // Early reflections provide a sense of distance without forced attenuation.
        if(f.far>0)add(new Tone.FeedbackDelay({
          delayTime:(65+f.far*1.25)/1000,
          feedback:.04+f.far*.0016,
          wet:f.far/400
        }));
        add(new Tone.Volume(settings.splitDistance?settings.distanceLevelDb:-f.attenuation));
        break;
      }
      case 'surround':{
        if(f.mode==='wide'){
          // Tone.StereoWidener at 0.5 leaves stereo width unchanged.
          add(new Tone.StereoWidener({width:0.5+(f.width/200)}));
        }else if(f.mode==='orbit'){
          const movement=new Tone.AutoPanner({frequency:f.speed,depth:f.depth/100,wet:1});
          add(movement);
          movement.start(0);
        }else if(f.mode==='hrtf'){
          add(new Tone.Panner3D({
            positionX:Math.max(.01,f.width/100*2),positionY:0,
            positionZ:-Math.max(.4,f.depth/100*2),
            panningModel:'HRTF',distanceModel:'inverse',
            refDistance:1,rolloffFactor:settings.splitDistance?0:.22,maxDistance:20
          }));
        }
        break;
      }
    }
  }

  previous.connect(crossfade.b);
  const auto=(settings.autoGain?settings.autoGainDb:0);
  const master=new Tone.Volume(settings.masterDb+auto+settings.manualGainDb);
  const limiter=new Tone.Limiter(-1);
  nodes.push(master,limiter);
  crossfade.connect(master);
  master.connect(limiter);
  limiter.toDestination();
  let analyser=null;
  if(attachMonitor){
    analyser=new Tone.Analyser({type:'fft',size:128});
    limiter.connect(analyser);
    nodes.push(analyser);
  }
  try{
    await waitReady(ready);
  }catch(err){
    try{player.dispose();for(const node of nodes)node.dispose();}catch{}
    throw err;
  }
  return {player,nodes,analyser,dispose(){
    try{player.stop();}catch{}
    try{player.dispose();}catch{}
    for(const n of nodes){try{n.dispose();}catch{}}
  }};
}

export class AudioEngine{
  constructor(){
    this.buffer=null;
    this.importedIR=null;
    this.graph=null;
    this.settings=null;
    this.offset=0;
    this.playing=false;
    this.startedAt=0;
    this.buildNumber=0;
    this.onUpdate=()=>{};
    this.onError=()=>{};
  }
  get duration(){return this.buffer?.duration ?? 0;}
  get position(){
    if(!this.playing)return this.offset;
    return clamp(Tone.now()-this.startedAt,0,this.duration);
  }
  async decode(blob){
    const array=await blob.arrayBuffer();
    const context=Tone.getContext().rawContext;
    return context.decodeAudioData(array.slice(0));
  }
  async setAudioBuffer(buffer){
    this.stop();
    this.buildNumber++;
    this.graph?.dispose();
    this.graph=null;
    this.buffer=buffer;
    this.offset=0;
  }
  async setIRBuffer(buffer){this.importedIR=buffer; if(this.buffer&&this.settings) await this.configure(this.settings);}
  clearIR(){this.importedIR=null;}
  async configure(input){
    const settings=enforceSettings(input);
    this.settings=settings;
    if(!this.buffer)return;
    const gen=++this.buildNumber;
    let newGraph=null;
    try{
      newGraph=await createGraph(this.buffer,settings,this.importedIR,true);
      if(gen!==this.buildNumber){newGraph.dispose();return;}
      const resume=this.playing;
      const oldPosition=this.position;
      this.playing=false;
      this.graph?.dispose();
      this.graph=newGraph;
      this.offset=oldPosition;
      if(resume)await this.play();
      this.onUpdate();
    }catch(err){
      newGraph?.dispose();
      if(gen===this.buildNumber) this.onError(err);
      throw err;
    }
  }
  async ensure(){
    await Tone.start();
    if(!this.buffer)throw new Error('音源を読み込んでください。');
    if(!this.graph)await this.configure(this.settings);
  }
  async play(){
    if(this.playing)return;
    await this.ensure();
    if(this.offset>=this.duration-.02)this.offset=0;
    const when=Tone.now()+.035;
    this.graph.player.start(when,this.offset);
    this.startedAt=when-this.offset;
    this.playing=true;
    this.onUpdate();
  }
  pause(){
    if(!this.playing)return;
    const where=this.position;
    this.playing=false;
    try{this.graph?.player.stop();}catch{}
    this.offset=where;
    this.onUpdate();
  }
  stop(){
    this.pause();
    this.offset=0;
    this.onUpdate();
  }
  seek(time){
    const pos=clamp(Number(time)||0,0,this.duration);
    const resume=this.playing;
    this.pause();
    this.offset=pos;
    if(resume) this.play().catch(this.onError);
    this.onUpdate();
  }
  tick(){
    if(this.playing && this.position>=this.duration-.02){
      this.pause();
      this.offset=this.duration;
    }
    return this.position;
  }
  spectrum(){
    try{const arr=this.graph?.analyser?.getValue(); return arr?Array.from(arr):[];}catch{return [];}
  }
  async render(progress=()=>{}, overrides=null, seconds=null){
    if(!this.buffer)throw new Error('音源がありません。');
    const settings=enforceSettings({...this.settings,...(overrides||{})});
    const duration=seconds==null ? this.duration+estimateTail(settings):Math.min(seconds,this.duration);
    const rate=settings.sampleRate==='source'?this.buffer.sampleRate:Number(settings.sampleRate);
    const source=this.buffer;
    const ir=this.importedIR;
    progress('音響エフェクトを準備しています…');
    // Tone.Offline temporarily switches to an offline Tone context.
    const toneBuffer=await Tone.Offline(async()=>{
      const graph=await createGraph(source,settings,ir,false);
      graph.player.start(0);
      // Graph is disposed with the offline context; do not dispose before rendering.
    },duration,2,rate);
    progress('PCMデータに変換しています…');
    const result=toneBuffer.get();
    if(!result)throw new Error('オフラインレンダリングに失敗しました。');
    return result;
  }
  // A bounded, source-relative RMS estimate. This is not LUFS measurement.
  // The exact calibrated number is then used by both realtime and offline graphs.
  async measureAutoGain(seconds=12){
    if(!this.buffer)throw new Error('音源がありません。');
    const settings=enforceSettings(this.settings);
    const neutralEffects=settings.effects.map(e=>e.id==='distance'?{...e,attenuation:0}:e);
    // Explicit distance-level attenuation is artistic intent, not an error to correct away.
    const baseline=await this.render(()=>{}, {
      effects:neutralEffects,distanceLevelDb:0,autoGain:false,autoGainDb:0,manualGainDb:0,masterDb:0
    },Math.min(seconds,this.duration));
    const sampleSeconds=Math.min(seconds,this.duration);
    const source=rmsLevel(this.buffer,Math.min(this.buffer.length,Math.round(this.buffer.sampleRate*sampleSeconds)));
    const destination=rmsLevel(baseline,Math.min(baseline.length,Math.round(baseline.sampleRate*sampleSeconds)));
    if(!Number.isFinite(source)||!Number.isFinite(destination)||source<1e-7||destination<1e-7)return 0;
    return Math.round(clamp(20*Math.log10(source/destination),-12,12)*10)/10;
  }
  dispose(){this.buildNumber++;this.stop();this.graph?.dispose();this.graph=null;}
}

function rmsLevel(buffer,frames){
  const chans=buffer.numberOfChannels;
  if(!frames||!chans)return 0;
  let sum=0,count=0;
  const stride=Math.max(1,Math.floor(frames/350000));
  for(let ch=0;ch<chans;ch++){
    const data=buffer.getChannelData(ch);
    for(let i=0;i<Math.min(frames,data.length);i+=stride){sum+=data[i]*data[i];count++;}
  }
  return Math.sqrt(sum/Math.max(1,count));
}
export function makeDemoSound(){
  const rate=44100,duration=8;
  const context=Tone.getContext().rawContext;
  const buffer=context.createBuffer(2,duration*rate,rate);
  const notes=[261.63,329.63,392,523.25,440,392,329.63,293.66];
  for(let ch=0;ch<2;ch++){
    const data=buffer.getChannelData(ch);
    for(let i=0;i<data.length;i++){
      const t=i/rate;
      const j=Math.min(7,Math.floor(t));
      const phase=t-j;
      const env=Math.min(1,phase*15)*Math.exp(-phase*2.3);
      const f=notes[j];
      const p=ch===0?0:.018;
      const s=Math.sin(2*Math.PI*f*(t+p))*.24+Math.sin(2*Math.PI*f*2*(t+p))*.045;
      data[i]=(s*env+Math.sin(t*2*Math.PI*110)*.018)*Math.min(1,t*4)*Math.min(1,(duration-t)*4);
    }
  }
  return buffer;
}
