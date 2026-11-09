import {studio,renderStudioAudio,getStudioSourceBuffer} from './studio.js';
import {AudioEngine} from '../audio/engine.js';
import {WaveformUI} from './waveform.js';
import {encodeWav,safeBaseName} from '../audio/wav.js';
import {saveOutput,isDesktop} from '../platform/files.js';
import {PRESETS} from '../data/presets.js';
import {DEFAULT_SETTINGS,cloneSettings} from '../data/effects.js';

const previewEngine=new AudioEngine();
let processedWave=null;
let originalWave=null;
let previewBuffer=null;
export function getRenderedPreviewBuffer(){return previewBuffer;}
let previewSignature='';
const format=(n)=>`${String(Math.floor(n/60)).padStart(2,'0')}:${String(Math.floor(n%60)).padStart(2,'0')}`;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const signatures=(s,ir)=>JSON.stringify(s)+'|'+ir;
const pick=(effects,id)=>effects.find(e=>e.id===id);
export function studioV2(){
  const base=studio();
  return {...base,
    version:'v0.0.4.0',
    quick:{muffle:0,space:40,echo:0,far:0,width:0},
    advanced:false,previewMode:'processed',previewStatus:'未生成',previewReady:false,
    previewBusy:false,previewDirty:true,previewPlaying:false,previewPosition:0,
    previewDuration:0,compare:false,selectedSpace:'basement',showSave:false,
    get activePreset(){return PRESETS.find(p=>p.id===this.presetId);},
    get spacePresets(){return PRESETS.filter(p=>['空間','距離','音質','基本'].includes(p.category));},
    get motionPresets(){return PRESETS.filter(p=>p.category==='移動');},
    get quickInfo(){return this.quick;},
    init(){
      base.init.call(this);
      this.$nextTick(()=>{
        originalWave=new WaveformUI(this.$refs.originalWave,this.$refs.originalTimeline,(t)=>this.seek(t));
        processedWave=new WaveformUI(this.$refs.processedWave,this.$refs.processedTimeline,(t)=>this.seekPreview(t));
        this.syncQuick();
      });
      const step=()=>{
        if(this.previewPlaying){
          this.previewPosition=previewEngine.tick();
          this.previewPlaying=previewEngine.playing;
          processedWave?.update(this.previewPosition);
        }
        requestAnimationFrame(step);
      };requestAnimationFrame(step);
    },
    syncQuick(){
      const e=this.effects;
      const r=pick(e,'reverb'),d=pick(e,'distance'),f=pick(e,'filter'),a=pick(e,'delay'),s=pick(e,'surround');
      this.quick={space:r?.enabled?Math.round(r.wet):0,muffle:d?.enabled?Math.round(d.muffle):f?.enabled?Math.round(clamp((18000-f.lowpass)/170,0,100)):0,echo:a?.enabled?Math.round(a.wet):0,far:d?.enabled?(this.splitDistance?Math.round(d.far||0):Math.round(d.attenuation/24*100)):0,width:s?.enabled?Math.round(s.width):0};
    },
    applyPreset(p){base.applyPreset.call(this,p);this.presetId=p.id;this.selectedSpace=p.id;this.syncQuick();this.invalidatePreview();},
    applySettings(s){const r=base.applySettings.call(this,s);this.$nextTick(()=>this.syncQuick());this.invalidatePreview();return r;},
    changed(){base.changed.call(this);this.invalidatePreview();},
    invalidatePreview(){
      previewSignature='';this.previewDirty=true;
      this.previewStatus=this.previewReady?'設定変更あり・再生成が必要':'未生成';
      if(this.previewPlaying){previewEngine.pause();this.previewPlaying=false;}
    },
    adjustQuick(key,val){
      const v=Number(val);this.quick[key]=v;
      const e=this.effects;
      if(key==='space'){
        const r=pick(e,'reverb');r.enabled=v>0;r.wet=v;r.decay=clamp(.4+v*.055,.4,7.8);
      } else if(key==='muffle'){
        const d=pick(e,'distance');d.enabled=v>0||this.quick.far>0;d.muffle=v;
      } else if(key==='echo'){
        const d=pick(e,'delay');d.enabled=v>0;d.wet=Math.round(v*.75);d.feedback=Math.round(v*.45);
      } else if(key==='far'){
        const d=pick(e,'distance');d.enabled=v>0||this.quick.muffle>0;d.far=v;if(!this.splitDistance)d.attenuation=+(v*.24).toFixed(1);
      } else if(key==='width'){
        const s=pick(e,'surround');s.enabled=v>0;s.width=v;if(s.mode==='hrtf')s.mode='wide';
      }
      this.changed();
    },
    async loadAudio(file){const loaded=await base.loadAudio.call(this,file);if(loaded&&this.hasAudio){originalWave?.load(getStudioSourceBuffer());this.invalidatePreview();this.previewReady=false;this.previewMode='processed';}return loaded;},
    async loadDemo(){await base.loadDemo.call(this);originalWave?.load(getStudioSourceBuffer());this.invalidatePreview();this.previewReady=false;this.previewMode='processed';},
    async playPause(){
      if(this.previewMode==='processed')return this.playProcessed();
      if(this.previewPlaying){previewEngine.pause();this.previewPlaying=false;}
      return base.playPause.call(this);
    },
    stop(){base.stop.call(this);previewEngine.stop();this.previewPlaying=false;this.previewPosition=0;},
    async buildPreview(){
      if(!this.hasAudio)return this.notify('音源を読み込んでください。','error');
      if(this.previewBusy)return;
      this.stop();this.previewBusy=true;this.busy=true;this.busyMessage='加工済み音声を生成しています…';
      this.reportWork?.('加工済み音声をレンダリング中',null);
      try{
        const settings=this.makeSettings();
        const signature=signatures(settings,this.irName);
        // Use the same rendering pipeline as WAV export.
                const rendered=await this.renderCurrent();
        if(this.isWorkCancelled?.()){this.previewStatus='生成をキャンセルしました';return;}
        previewBuffer=rendered;
        previewSignature=signature;
        await previewEngine.setAudioBuffer(rendered);
        // Dry graph: no additional processing of already-rendered audio.
        await previewEngine.configure({...cloneSettings(DEFAULT_SETTINGS),effects:cloneSettings(DEFAULT_SETTINGS).effects.map(e=>({...e,enabled:false})),masterDb:0,mix:100,rawPlayback:true});
        this.previewMode='processed';
        await this.$nextTick();
        processedWave?.load(rendered);
        this.previewDuration=rendered.duration;this.previewPosition=0;
        this.previewReady=true;this.previewDirty=false;this.previewStatus='加工済み・試聴可能';this.previewMode='processed';
        this.notify('加工後の波形を生成しました。','success');
      }catch(err){if(!this.isWorkCancelled?.())this.notify('加工プレビュー失敗: '+err.message,'error');}
      finally{this.previewBusy=false;this.busy=false;this.busyMessage='';}
    },
    async renderCurrent(){return renderStudioAudio();},
    async playProcessed(){
      if(!this.previewReady||this.previewDirty){await this.buildPreview();if(!this.previewReady)return;}
      if(this.previewPlaying){previewEngine.pause();this.previewPlaying=false;return;}
      base.stop.call(this);
      try{await previewEngine.play();this.previewPlaying=true;}
      catch(err){this.notify(err.message,'error');}
    },
    seekPreview(t){if(this.previewReady){previewEngine.seek(t);this.previewPosition=t;}},
    async exportWav(){
      if(!this.hasAudio)return this.notify('音源を読み込んでください。','error');
      if(!this.previewReady||this.previewDirty){await this.buildPreview();if(!this.previewReady)return;}
      const blob=encodeWav(previewBuffer,this.bitDepth,this.normalize);
      try{const saved=await saveOutput(blob,`${safeBaseName(this.audioName)}_${safeBaseName(this.projectName)}.wav`);
        if(saved)this.notify(isDesktop()?'試聴した加工済み音声をWAVで保存しました。':'WAVのダウンロードを開始しました。','success');
      }catch(err){this.notify('WAV保存失敗: '+err.message,'error');}
    },
    async useMotion(id){
      const s=pick(this.effects,'surround');
      if(id==='off'){s.enabled=false;}
      else if(id==='wide'){s.enabled=true;s.mode='wide';s.width=75;}
      else if(id==='orbit'){s.enabled=true;s.mode='orbit';s.speed=.2;s.depth=85;}
      else if(id==='hrtf'){s.enabled=true;s.mode='hrtf';s.width=65;s.depth=65;}
      this.changed();
    },
    get motionMode(){const s=pick(this.effects,'surround');return s?.enabled?s.mode:'off';},
    format
  };
}
