import Sortable from 'sortablejs';
import {spectralCentroidHz} from '../audio/spectral-centroid.js';
import {AudioEngine,makeDemoSound} from '../audio/engine.js';
import {encodeWav,safeBaseName} from '../audio/wav.js';
import {saveOutput,openNativeFile,isDesktop} from '../platform/files.js';
import {WaveformUI} from './waveform.js';
import {DEFAULT_SETTINGS,APP_VERSION,enforceSettings,getModule,cloneSettings,SURROUND_MODES} from '../data/effects.js';
import {PRESETS,CATEGORIES} from '../data/presets.js';
import {makeProject,readProject,zipProject,unzipProject,saveDraft,loadDraft,deleteDraft} from '../storage/projects.js';
import {t,setLanguage} from '../lib/translations.js';

const engine=new AudioEngine();
let waveform=null;
let sortable=null;
let tickHandle=0;
let autosaveHandle=null;
const delay=(ms)=>new Promise(r=>setTimeout(r,ms));
const format=(seconds)=>{
  seconds=Math.max(0,Math.floor(Number(seconds)||0));
  return `${Math.floor(seconds/60).toString().padStart(2,'0')}:${(seconds%60).toString().padStart(2,'0')}`;
};
function analyze(buffer){
  const length=buffer.length,channels=buffer.numberOfChannels;
  let peak=0,energy=0,count=0;
  const stride=Math.max(1,Math.floor(length/300000));
  for(let ch=0;ch<channels;ch++){
    const array=buffer.getChannelData(ch);
    for(let i=0;i<array.length;i+=stride){
      const a=array[i];peak=Math.max(peak,Math.abs(a));energy+=a*a;count++;
    }
  }
  // Keep the previous first-frame-only measurement as an informational metric.
  // It is not used by DSP, gain compensation or the UI's main controls.
  let centroid='—';
  try {
    const hz=spectralCentroidHz(buffer.getChannelData(0),buffer.sampleRate);
    if(hz!==null)centroid=`${Math.round(hz)} Hz`;
  } catch(err) {
    console.warn('Spectral centroid analysis skipped:',err);
  }
  return {peakDb:peak>0?(20*Math.log10(peak)).toFixed(1):'-∞',rmsDb:energy>0?(10*Math.log10(energy/count)).toFixed(1):'-∞',centroid};
}
export function studio(){return {
  version:APP_VERSION,
  language:'ja',
  presets:PRESETS,categories:CATEGORIES,search:'',category:'すべて',presetId:'basement',
  effects:cloneSettings(DEFAULT_SETTINGS).effects,
  masterDb:-1,mix:100,normalize:false,bitDepth:'24',sampleRate:'source',
  selectedTab:'effects',selectedEffect:'reverb',
  hasAudio:false,audioName:'',duration:0,position:0,playing:false,
  sourceFile:null,irFile:null,irName:'',
  busy:false,busyMessage:'',notification:'',toastKind:'info',
  projectName:'New soundscape',stats:{peakDb:'—',rmsDb:'—',centroid:'—'},
  autoSave:true,isDragOver:false,lastSaved:'',
  get visiblePresets(){return this.presets.filter(p=>(this.category==='すべて'||this.category===p.category)
    &&(p.title.toLowerCase().includes(this.search.toLowerCase())||p.en.toLowerCase().includes(this.search.toLowerCase())));},
  get activeCount(){return this.effects.filter(e=>e.enabled).length;},
  get selectedData(){return this.effects.find(e=>e.id===this.selectedEffect)||this.effects[0];},
  meta:getModule,
  t(key){this.language;return t(key);},
  format,
  init(){
    setLanguage(this.language);
    engine.onError=err=>this.notify(err?.message||String(err),'error');
    engine.onUpdate=()=>{this.playing=engine.playing;this.position=engine.position;};
    this.$nextTick(()=>{
      if(this.$refs.wave && this.$refs.timeline)waveform=new WaveformUI(this.$refs.wave,this.$refs.timeline,(t)=>this.seek(t));
      if(this.$refs.effectList)sortable=Sortable.create(this.$refs.effectList,{
        animation:170,handle:'.drag-handle',ghostClass:'sorting-ghost',
        onEnd:()=>{
          const ids=Array.from(this.$refs.effectList.children).map(el=>el.dataset.effectId);
          const lookup=new Map(this.effects.map(effect=>[effect.id,effect]));
          this.effects=ids.map(id=>lookup.get(id)).filter(Boolean);
          this.changed();
        }
      });
    });
    const loop=()=>{
      this.position=engine.tick();
      this.playing=engine.playing;
      if(this.hasAudio)waveform?.update(this.position);
      this.drawSpectrum();
      tickHandle=requestAnimationFrame(loop);
    };
    tickHandle=requestAnimationFrame(loop);
    window.addEventListener('beforeunload',()=>{clearTimeout(autosaveHandle);});
  },
  notify(message,kind='info'){
    this.notification=String(message);this.toastKind=kind;
    setTimeout(()=>{if(this.notification===String(message))this.notification='';},6000);
  },
  setLang(lang){this.language=lang;setLanguage(lang);this.$nextTick(()=>{});},
  makeSettings(){return enforceSettings({effects:this.effects,masterDb:this.masterDb,mix:this.mix,
      normalize:this.normalize,bitDepth:this.bitDepth,sampleRate:this.sampleRate});},
  applySettings(settings){
    const clean=enforceSettings(settings);
    this.effects=clean.effects;
    this.masterDb=clean.masterDb;
    this.mix=clean.mix;
    this.normalize=clean.normalize;
    this.bitDepth=clean.bitDepth;
    this.sampleRate=clean.sampleRate;
    return clean;
  },
  applyPreset(p){
    this.presetId=p.id;
    this.projectName=p.title;
    this.applySettings(p.settings);
    this.selectedTab='effects';
    this.selectedEffect=p.settings.effects.find(e=>e.enabled)?.id||'reverb';
    this.changed();
    this.notify(`「${p.title}」を適用しました。`);
  },
  selectCategory(c){this.category=c;},
  changeMode(mode){this.selectedData.mode=mode;this.changed();},
  changed(){
    this.presetId='custom';
    this.scheduleBuild();
    this.scheduleAutosave();
  },
  _buildTimeout:null,
  scheduleBuild(){
    clearTimeout(this._buildTimeout);
    this._buildTimeout=setTimeout(()=>{this._buildTimeout=null;this.updateEngine();},280);
  },
  async updateEngine(){
    if(!this.hasAudio)return;
    try{await engine.configure(this.makeSettings());}
    catch(err){this.notify(`音声処理: ${err.message}`,'error');}
  },
  toggleEffect(effect){effect.enabled=!effect.enabled;this.changed();},
  selectEffect(id){this.selectedEffect=id;this.selectedTab='effects';},
  async openAudioDialog(){
    if(!isDesktop()){this.$refs.audioInput.click();return;}
    try{const file=await openNativeFile('audio');if(file)await this.loadAudio(file);}
    catch(err){this.notify('音源を開けません: '+err.message,'error');}
  },
  async fromAudioInput(ev){await this.loadAudio(ev.target.files?.[0]);ev.target.value='';},
  async loadAudio(file){
    if(!file)return false;
    if(file.size>220*1024*1024){this.notify('音源が大きすぎます（上限220MB）。','error');return false;}
    this.busy=true;this.busyMessage='音声をデコードしています…';
    try{
      const buffer=await engine.decode(file);
      if(this.isWorkCancelled?.())return false;
      this.lockWork?.('読み込んだ音声を適用中');
      await engine.setAudioBuffer(buffer);
      this.sourceFile=file;
      this.audioName=file.name;
      this.duration=buffer.duration;
      this.hasAudio=true;
      this.position=0;
      this.stats=analyze(buffer);
      waveform?.load(buffer);
      this.busyMessage='エフェクトを設定しています…';
      await engine.configure(this.makeSettings());
      await this.persist(true);
      this.notify(`${file.name} を読み込みました。`,'success');
      return true;
    }catch(err){this.notify(`音声の読み込みに失敗: ${err.message}`,'error');return false;}
    finally{if(!this._workController){this.busy=false;this.busyMessage='';}}
  },
  async loadDemo(){
    this.busy=true;this.busyMessage='デモ音源を生成しています…';
    try{
      const buffer=makeDemoSound();
      const file=new File([encodeWav(buffer,'16')],'demo-melody.wav',{type:'audio/wav'});
      await engine.setAudioBuffer(buffer);
      this.sourceFile=file;
      this.audioName=file.name;
      this.duration=buffer.duration;this.hasAudio=true;this.position=0;
      this.stats=analyze(buffer);
      waveform?.load(buffer);
      await engine.configure(this.makeSettings());
      await this.persist(true);
      this.notify('デモ音源を読み込みました。','success');
    }catch(err){this.notify(err.message,'error');}
    finally{this.busy=false;this.busyMessage='';}
  },
  async playPause(){
    if(!this.hasAudio)return this.notify('先に音源を読み込んでください。','error');
    try{
      if(engine.playing)engine.pause();
      else{
        if(this._buildTimeout){clearTimeout(this._buildTimeout);this._buildTimeout=null;await this.updateEngine();}
        await engine.play();
      }
    }
    catch(err){this.notify(`再生できません: ${err.message}`,'error');}
  },
  stop(){engine.stop();},
  seek(t){if(this.hasAudio)engine.seek(t);},
  drawSpectrum(){
    const canvas=this.$refs.spectrum;
    if(!canvas)return;
    const c=canvas.getContext('2d');
    if(!c)return;
    const w=canvas.width,h=canvas.height;
    c.clearRect(0,0,w,h);
    const arr=engine.spectrum();
    for(let i=0;i<48;i++){
      const raw=arr[i]??-100;
      const norm=Number.isFinite(raw)?Math.max(.03,Math.min(1,(raw+110)/100)):.03;
      const bh=Math.max(2,norm*h*.9);
      c.fillStyle=`rgba(75,75,75,.8)`;
      c.fillRect(i*w/48+1,h-bh,Math.max(2,w/48-3),bh);
    }
  },
  async openIRDialog(){
    if(!isDesktop()){this.$refs.irInput.click();return;}
    try{const file=await openNativeFile('ir');if(file)await this.importImpulse(file);}
    catch(err){this.notify('IRを開けません: '+err.message,'error');}
  },
  async importImpulse(ev){
    const file=ev instanceof File ? ev : ev?.target?.files?.[0];
    if(ev?.target)ev.target.value='';if(!file)return;
    if(file.size>35*1024*1024)return this.notify('IRの上限は35MBです。','error');
    this.busy=true;this.busyMessage='IRをデコードしています…';
    try{
      const buffer=await engine.decode(file);
      if(buffer.duration>12)throw new Error('IRは12秒以内にしてください。');
      this.irFile=file;this.irName=file.name;
      await engine.setIRBuffer(buffer);
      await this.persist(true);
      this.notify('IRを読み込みました。リバーブで利用します。','success');
    }catch(err){this.notify(`IR読み込み失敗: ${err.message}`,'error');}
    finally{this.busy=false;this.busyMessage='';}
  },
  async removeIR(){this.irFile=null;this.irName='';engine.clearIR();await this.updateEngine();await this.persist(true);},
  project(){return makeProject({name:this.projectName,settings:this.makeSettings(),presetId:this.presetId,
      sourceName:this.audioName,irName:this.irName});},
  async exportJSON(){
    const project=this.project();
    try{const saved=await saveOutput(new Blob([JSON.stringify(project,null,2)],{type:'application/json'}),
      `${safeBaseName(this.projectName)}.sse.json`);
      if(saved)this.notify(isDesktop()?'設定JSONを保存しました。':'設定JSONのダウンロードを開始しました。','success');
    }catch(err){this.notify('設定保存失敗: '+err.message,'error');}
  },
  async exportZIP(){
    this.busy=true;this.busyMessage='音声を含むプロジェクトをZIPに保存しています…';
    try{
      const zip=await zipProject(this.project(),this.sourceFile,this.irFile);
      const saved=await saveOutput(zip,`${safeBaseName(this.projectName)}.sse.zip`);
      if(saved)this.notify(isDesktop()?'プロジェクトZIPを保存しました。':'プロジェクトZIPのダウンロードを開始しました。','success');
    }catch(err){this.notify(err.message,'error');}
    finally{this.busy=false;this.busyMessage='';}
  },
  async loadProjectDialog(){
    if(!isDesktop()){this.$refs.projectInput.click();return;}
    try{const file=await openNativeFile('project');if(file)await this.fromProjectInput(file);}
    catch(err){this.notify('プロジェクトを開けません: '+err.message,'error');}
  },
  async fromProjectInput(ev){
    const f=ev instanceof File ? ev : ev?.target?.files?.[0];
    if(ev?.target)ev.target.value='';if(!f)return;
    if(f.size>250*1024*1024)return this.notify('プロジェクトは250MBまでです。','error');
    this.busy=true;this.busyMessage='プロジェクトを読み込んでいます…';
    try{
      let project,source=null,ir=null;
      if(/\.zip$/i.test(f.name))({project,source,ir}=await unzipProject(f));
      else project=readProject(JSON.parse(await f.text()));
      this.projectName=project.name||'Imported';
      this.presetId=project.presetId||'custom';
      this.applySettings(project.settings);
      if(source)await this.loadAudio(source);
      if(ir){const buffer=await engine.decode(ir);this.irFile=ir;this.irName=ir.name;await engine.setIRBuffer(buffer);}
      if(this.hasAudio)await engine.configure(this.makeSettings());
      this.scheduleAutosave();
      this.notify('プロジェクトを読み込みました。','success');
    }catch(err){this.notify(`プロジェクト読み込み失敗: ${err.message}`,'error');}
    finally{this.busy=false;this.busyMessage='';}
  },
  async exportWav(){
    if(!this.hasAudio)return this.notify('先に音源を読み込んでください。','error');
    this.busy=true;
    try{
      engine.pause();
      clearTimeout(this._buildTimeout);this._buildTimeout=null;
      await engine.configure(this.makeSettings());
      this.busyMessage='音声をレンダリングしています…';
      await delay(40);
      const rendered=await engine.render(message=>this.busyMessage=message);
      this.busyMessage='WAVファイルを作成しています…';
      await delay(40);
      const blob=encodeWav(rendered,this.bitDepth,this.normalize);
      const saved=await saveOutput(blob,`${safeBaseName(this.audioName)}_${safeBaseName(this.projectName)}.wav`);
      if(saved)this.notify(isDesktop()?'WAVファイルを保存しました。':'WAVのダウンロードを開始しました。','success');
    }catch(err){this.notify(`WAV書き出し失敗: ${err.message}`,'error');}
    finally{this.busy=false;this.busyMessage='';}
  },
  scheduleAutosave(){
    if(!this.autoSave)return;
    clearTimeout(autosaveHandle);
    autosaveHandle=setTimeout(()=>this.persist(false),700);
  },
  async persist(includeAssets=false){
    if(!this.autoSave)return;
    try{await saveDraft(this.project(),this.sourceFile,this.irFile,includeAssets);this.lastSaved='自動保存済み';}
    catch{this.lastSaved='自動保存不可';}
  },
  async restore(){
    this.busy=true;this.busyMessage='自動保存を復元しています…';
    try{
      const recovered=await loadDraft();
      if(!recovered)throw new Error('保存済みプロジェクトがありません。');
      this.projectName=recovered.project.name;
      this.presetId=recovered.project.presetId||'custom';
      this.applySettings(recovered.project.settings);
      if(recovered.source)await this.loadAudio(recovered.source);
      if(recovered.ir){const ir=await engine.decode(recovered.ir);this.irFile=recovered.ir;this.irName=recovered.ir.name;await engine.setIRBuffer(ir);}
      if(this.hasAudio)await engine.configure(this.makeSettings());
      this.notify('自動保存から復元しました。','success');
    }catch(err){this.notify(err.message,'error');}
    finally{this.busy=false;this.busyMessage='';}
  },
  async reset(){
    engine.stop();
    this.applySettings(DEFAULT_SETTINGS);
    this.presetId='custom';this.projectName='New soundscape';
    this.irFile=null;this.irName='';engine.clearIR();
    await this.updateEngine();this.scheduleAutosave();
    this.notify('設定を初期化しました。');
  },
  async clearSaved(){
    try{await deleteDraft();this.lastSaved='';this.notify('ブラウザ内の自動保存を消去しました。','success');}
    catch(err){this.notify(err.message,'error');}
  },
  handleDrop(ev){
    this.isDragOver=false;
    const file=ev.dataTransfer?.files?.[0];
    if(file)this.loadAudio(file);
  },
  keydown(e){
    if(['INPUT','TEXTAREA','SELECT','BUTTON'].includes(document.activeElement?.tagName))return;
    if(e.code==='Space'){e.preventDefault();this.playPause();}
  }
};}

export async function renderStudioAudio(){return engine.render();}
export async function calibrateStudioAudio(){return engine.measureAutoGain(12);}
export function getStudioPlaybackEngine(){return engine;}
export function getStudioSourceBuffer(){return engine.buffer;}
