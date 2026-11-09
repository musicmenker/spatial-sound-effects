import {studioV2} from './studio-v2.js';
import {calibrateStudioAudio,getStudioSourceBuffer,getStudioPlaybackEngine} from './studio.js';
import {AudioEngine} from '../audio/engine.js';
import {cloneSettings,DEFAULT_SETTINGS,enforceSettings} from '../data/effects.js';

const originalEngine=new AudioEngine();
const liveEngine=getStudioPlaybackEngine();
const drySettings=()=>({...cloneSettings(DEFAULT_SETTINGS),rawPlayback:true,masterDb:0,mix:100,autoGain:false,manualGainDb:0,effects:cloneSettings(DEFAULT_SETTINGS).effects.map(x=>({...x,enabled:false}))});
let recalibrationTask=null;
let requestNumber=0;
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const fmt=(n)=>(n>=0?'+':'')+Number(n).toFixed(1)+' dB';

export function studioV3(){
  const base=studioV2();
  return {...base,
    version:'v0.0.4.0',
    // Object spreading the previous UI layer evaluates getters only once;
    // restore them here as live computed properties for Alpine reactivity.
    get visiblePresets(){return this.presets.filter(p=>(this.category==='すべて'||this.category===p.category)&&
      (p.title.toLowerCase().includes(this.search.toLowerCase())||p.en.toLowerCase().includes(this.search.toLowerCase())));},
    get selectedData(){return this.effects.find(e=>e.id===this.selectedEffect)||this.effects[0];},
    get activeCount(){return this.effects.filter(e=>e.enabled).length;},
    get motionMode(){const fx=this.effects.find(e=>e.id==='surround');return fx?.enabled?fx.mode:'off';},
    get activePreset(){return this.presets.find(p=>p.id===this.presetId);},
    helpOpen:false,creditsOpen:false,
    splitReverb:true,protectHighs:true,splitDistance:true,highLossIntentional:false,
    dryLevel:100,wetLevel:40,distanceLevelDb:0,
    autoGain:true,autoGainDb:0,manualGainDb:0,
    autoStatus:'音源を読み込んでください',originalPlaying:false,originalPosition:0,
    calibrationSignature:'',calibrationReady:false,
    get totalGain(){return +(this.masterDb+this.manualGainDb+(this.autoGain?this.autoGainDb:0)).toFixed(1);},
    get formattedGain(){return fmt(this.totalGain);},
    get dryWetCaption(){return this.splitReverb?'直接音と反響音の音量を個別に調整':'標準のDry/Wet混合'},
    init(){
      base.init.call(this);
      // The legacy engine has its own playhead; this independent player is guaranteed dry.
      const animation=()=>{
        this.originalPosition=originalEngine.tick();
        this.originalPlaying=originalEngine.playing;
        requestAnimationFrame(animation);
      };
      requestAnimationFrame(animation);
    },
    makeSettings(){
      return enforceSettings({...base.makeSettings.call(this),normalize:false,
        splitReverb:this.splitReverb,protectHighs:this.protectHighs,
        splitDistance:this.splitDistance,highLossIntentional:this.highLossIntentional,
        dryLevel:this.dryLevel,wetLevel:this.wetLevel,distanceLevelDb:this.distanceLevelDb,
        autoGain:this.autoGain,autoGainDb:this.autoGainDb,manualGainDb:this.manualGainDb});
    },
    applySettings(raw){
      const settings=enforceSettings(raw);
      const result=base.applySettings.call(this,settings);
      this.splitReverb=settings.splitReverb;this.protectHighs=settings.protectHighs;
      this.splitDistance=settings.splitDistance;this.highLossIntentional=settings.highLossIntentional;
      this.dryLevel=settings.dryLevel;this.wetLevel=settings.wetLevel;
      this.distanceLevelDb=settings.distanceLevelDb;
      this.autoGain=settings.autoGain;this.manualGainDb=settings.manualGainDb;
      this.autoGainDb=settings.autoGainDb;
      this.normalize=false; // WAV and preview must use identical amplitudes.
      this.calibrationReady=false;this.calibrationSignature='';
      return result;
    },
    applyPreset(p){
      const global={splitReverb:this.splitReverb,protectHighs:this.protectHighs,splitDistance:this.splitDistance,
        dryLevel:this.dryLevel,wetLevel:this.wetLevel,distanceLevelDb:this.distanceLevelDb,
        autoGain:this.autoGain,manualGainDb:this.manualGainDb};
      base.applyPreset.call(this,p);
      Object.assign(this,global);
      this.highLossIntentional=Boolean(p.settings.highLossIntentional);
      this.calibrationReady=false;
      this.changed();
      this.presetId=p.id;this.selectedSpace=p.id;
    },
    changed(){
      this.calibrationReady=false;
      base.changed.call(this);
    },
    scheduleBuild(){
      clearTimeout(this._buildTimeout);
      this._buildTimeout=setTimeout(()=>{this._buildTimeout=null;this.updateEngine().catch(e=>this.notify(e.message,'error'));},500);
    },
    async updateEngine(){await this.ensureCalibration(true);},
    calibrationKey(){
      const s=this.makeSettings();
      delete s.autoGainDb;delete s.manualGainDb;delete s.masterDb;
      delete s.bitDepth;delete s.sampleRate;delete s.normalize;delete s.rawPlayback;
      return JSON.stringify(s)+'|'+this.audioName+'|'+this.irName;
    },
    async ensureCalibration(force=false){
      if(!this.hasAudio)return;
      const signature=this.calibrationKey();
      if(!force&&this.calibrationReady&&signature===this.calibrationSignature)return;
      if(recalibrationTask && !force)await recalibrationTask;
      if(!force&&this.calibrationReady&&signature===this.calibrationSignature)return;
      const number=++requestNumber;
      this.autoStatus=this.autoGain?'RMSから補正量を計算中…':'手動補正のみ';
      this.calibrationReady=false;
      const promise=(async()=>{
        // Base render engine must receive the same FX topology as the final export.
        await liveEngine.configure({...this.makeSettings(),autoGain:false,autoGainDb:0,manualGainDb:0,masterDb:0});
        let calibrated=0;
        if(this.autoGain)calibrated=await calibrateStudioAudio();
        if(number!==requestNumber)return;
        this.autoGainDb=calibrated;
        await liveEngine.configure(this.makeSettings());
        if(number!==requestNumber)return;
        this.calibrationSignature=signature;this.calibrationReady=true;
        this.autoStatus=this.autoGain?'RMS推定（冒頭最大12秒）':'自動補正OFF';
      })();
      recalibrationTask=promise;
      try{await promise;}
      catch(e){if(number===requestNumber){this.calibrationReady=false;this.autoStatus='補正エラー';}throw e;}
      finally{if(recalibrationTask===promise)recalibrationTask=null;}
    },
    async setManualGain(value){
      this.manualGainDb=clamp(Number(value),-12,12);
      this.invalidatePreview();this.scheduleAutosave();
      if(this.hasAudio && this.calibrationReady){
        try{await liveEngine.configure(this.makeSettings());}catch(e){this.notify(e.message,'error');}
      }
    },
    nudgeGain(delta){this.setManualGain(Math.round((this.manualGainDb+delta)*10)/10);},
    setDistanceLevel(value){
      this.distanceLevelDb=clamp(Number(value),-24,0);
      const distance=this.effects.find(x=>x.id==='distance');
      if(distance && this.distanceLevelDb<0)distance.enabled=true;
      this.changed();
    },
    async toggleAutoGain(){
      this.autoGain=!this.autoGain;
      this.changed();
      this.autoGainDb=0;
      await this.ensureCalibration(true).catch(e=>this.notify('補正計算: '+e.message,'error'));
    },
    async loadAudio(file){
      const loaded=await base.loadAudio.call(this,file);
      if(!loaded)return false;
      await this.setupOriginal();
      this.calibrationReady=false;
      await this.ensureCalibration(true).catch(e=>this.notify('音量補正: '+e.message,'error'));
      return true;
    },
    async loadDemo(){
      await base.loadDemo.call(this);
      if(!this.hasAudio)return;
      await this.setupOriginal();
      this.calibrationReady=false;
      await this.ensureCalibration(true).catch(e=>this.notify('音量補正: '+e.message,'error'));
    },
    async setupOriginal(){
      originalEngine.stop();
      await originalEngine.setAudioBuffer(getStudioSourceBuffer());
      await originalEngine.configure(drySettings());
      this.originalPosition=0;
    },
    async choosePreview(mode){
      if(mode==='processed'&&(!this.previewReady||this.previewDirty))await this.buildPreview();
      if(mode==='live'){originalEngine.pause();base.stop.call(this);this.previewMode='live';return;}
      if(mode==='original'){
        base.stop.call(this);
        this.previewMode='original';
      }else if(mode==='processed'){
        originalEngine.pause();
        base.stop.call(this);
        this.previewMode='processed';
      }
    },
    async playPause(){
      if(!this.hasAudio)return this.notify('音源を読み込んでください。','error');
      if(this.previewMode==='processed'){
        originalEngine.pause();
        return base.playPause.call(this);
      }
      if(this.previewMode==='live'){
        originalEngine.pause();
        try{await this.ensureCalibration();}catch(e){return this.notify(e.message,'error');}
        return base.playPause.call(this);
      }
      if(originalEngine.playing){originalEngine.pause();return;}
      base.stop.call(this);
      if(!originalEngine.buffer)await this.setupOriginal();
      try{await originalEngine.play();}catch(e){this.notify(e.message,'error');}
    },
    async playProcessed(){originalEngine.pause();await this.ensureCalibration();return base.playProcessed.call(this);},
    stop(){base.stop.call(this);originalEngine.stop();this.originalPosition=0;},
    seek(t){if(this.previewMode==='original'){originalEngine.seek(t);this.originalPosition=Number(t)||0;}else base.seek.call(this,t);},
    async buildPreview(){
      try{await this.ensureCalibration();}catch(e){this.notify('音量補正に失敗: '+e.message,'error');return;}
      return base.buildPreview.call(this);
    },
    async exportWav(){
      if(!this.hasAudio)return this.notify('音源を読み込んでください。','error');
      if(!this.calibrationReady){try{await this.ensureCalibration();}catch(e){return this.notify(e.message,'error');}}
      return base.exportWav.call(this);
    },
    async importImpulse(ev){await base.importImpulse.call(this,ev);this.changed();},
    async removeIR(){await base.removeIR.call(this);this.changed();},
    async fromProjectInput(ev){await base.fromProjectInput.call(this,ev);this.calibrationReady=false;await this.ensureCalibration(true).catch(e=>this.notify(e.message,'error'));},
    async restore(){await base.restore.call(this);this.calibrationReady=false;await this.ensureCalibration(true).catch(e=>this.notify(e.message,'error'));},
    async reset(){await base.reset.call(this);this.calibrationReady=false;await this.ensureCalibration(true).catch(e=>this.notify(e.message,'error'));},
    openHelp(){this.helpOpen=true;this.creditsOpen=false;this.$nextTick(()=>this.$refs.helpClose?.focus());},
    openCredits(){this.creditsOpen=true;this.helpOpen=false;this.$nextTick(()=>this.$refs.creditsClose?.focus());},
    setQuickNumber(key,ev){
      const v=Number(ev.target.value);
      if(ev.target.value.trim()===''||!Number.isFinite(v)||!ev.target.validity.valid){
        this.notify('0〜100の整数を入力してください。','error');ev.target.value=this.quick[key];return;
      }
      this.adjustQuick(key,v);
    },
    setValidatedGain(ev){
      const v=Number(ev.target.value);
      if(ev.target.value.trim()===''||!Number.isFinite(v)||!ev.target.validity.valid){
        this.notify('手動音量は-12〜+12 dB（0.5dB刻み）で入力してください。','error');ev.target.value=this.manualGainDb;return;
      }
      this.setManualGain(v);
    },
    setPrecision(key,value,min,max,step){
      const v=Number(value);
      if(!Number.isFinite(v))return;
      const rounded=+(Math.round((v-min)/step)*step+min).toFixed(6);
      this[key]=clamp(rounded,min,max);this.changed();
    },
    setPrecisionInput(key,ev,min,max,step){
      const raw=ev.target.value;
      if(raw.trim()===''||!Number.isFinite(Number(raw))||!ev.target.validity.valid){
        this.notify(`${min}〜${max}の範囲（${step}刻み）で入力してください。`,'error');
        ev.target.value=this[key];return;
      }
      this.setPrecision(key,Number(raw),min,max,step);
    },
    setDistanceInput(ev){
      if(ev.target.value.trim()===''||!ev.target.validity.valid){
        this.notify('距離減衰は-24〜0 dBで入力してください。','error');ev.target.value=this.distanceLevelDb;return;
      }
      this.setDistanceLevel(ev.target.value);
    },
    setEffectControl(control,value){
      const v=Number(value);
      if(!Number.isFinite(v))return;
      const rounded=+(Math.round((v-control.min)/control.step)*control.step+control.min).toFixed(6);
      this.selectedData[control.key]=clamp(rounded,control.min,control.max);
      this.changed();
    },
    setEffectInput(control,ev){
      const value=ev.target.value;
      if(value.trim()===''||!Number.isFinite(Number(value))||!ev.target.validity.valid){
        this.notify(`${control.label}は${control.min}〜${control.max} ${control.unit}で入力してください。`,'error');
        ev.target.value=this.selectedData[control.key];return;
      }
      this.setEffectControl(control,Number(value));
    },
    moveEffect(id,delta){
      const i=this.effects.findIndex(e=>e.id===id),next=i+delta;
      if(i<0||next<0||next>=this.effects.length)return;
      const reordered=[...this.effects];
      [reordered[i],reordered[next]]=[reordered[next],reordered[i]];
      this.effects=reordered;this.changed();
    },
    formatGain:fmt,
  };
}
