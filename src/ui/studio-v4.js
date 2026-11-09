import {studioV3} from './studio-v3.js';
import {getStudioSourceBuffer,getStudioPlaybackEngine} from './studio.js';
import {getRenderedPreviewBuffer} from './studio-v2.js';
import {AudioEngine} from '../audio/engine.js';
import {encodeWavAsync,safeBaseName} from '../audio/wav.js';
import {saveOutput,openNativeFile,isDesktop} from '../platform/files.js';
import {zipProject} from '../storage/projects.js';
import {PRESETS,CATEGORIES} from '../data/presets.js';
import {cloneSettings,DEFAULT_SETTINGS} from '../data/effects.js';
import {acousticSettings,isDirtyPreset,makeCustomPreset,parseMmsse,formatMmsse,newPresetId,MMSSE_MAX_BYTES} from '../data/custom-presets.js';
import {listCustomPresets,putCustomPreset,removeCustomPreset} from '../storage/projects.js';

const playerA=new AudioEngine();
const rendererA=new AudioEngine();
const dryPlayback=()=>({...cloneSettings(DEFAULT_SETTINGS),effects:cloneSettings(DEFAULT_SETTINGS).effects.map(f=>({...f,enabled:false})),rawPlayback:true,autoGain:false,autoGainDb:0,manualGainDb:0,masterDb:0});
let renderedA=null,renderedKey='';
const CANCELLED=()=>new DOMException('キャンセルされました。','AbortError');
const isAbort=error=>error?.name==='AbortError';

export function studioV4(){
  const base=studioV3();
  return {...base,
    get selectedData(){return this.effects.find(e=>e.id===this.selectedEffect)||this.effects[0];},
    get activeCount(){return this.effects.filter(e=>e.enabled).length;},
    get motionMode(){const e=this.effects.find(x=>x.id==='surround');return e?.enabled?e.mode:'off';},
    get totalGain(){return +(this.masterDb+this.manualGainDb+(this.autoGain?this.autoGainDb:0)).toFixed(1);},
    get formattedGain(){return (this.totalGain>=0?'+':'')+this.totalGain.toFixed(1)+' dB';},
    get dryWetCaption(){return this.splitReverb?'直接音・残響音を個別調整':'標準Dry/Wet';},
    version:'v0.0.4.0',
    presets:[...PRESETS],categories:[...CATEGORIES,'追加'],
    currentPresetId:'custom',presetBaseline:null,presetDirty:false,
    pendingPreset:null,pendingImport:null,importConflict:false,
    nameDialog:false,presetNameDraft:'',saveThenSwitch:false,renaming:false,
    compareMode:false,compareSide:'B',compareA:null,compareAName:'',compareAPlaying:false,compareAPosition:0,compareADuration:0,compareStatus:'比較用Aは未生成',
    work:{status:'idle',message:'未処理',percent:null,cancellable:false},
    _workController:null,_workSequence:0,_workingPreset:false,
    get visiblePresets(){return this.presets.filter(p=>(this.category==='すべて'||this.category===p.category)&&(p.title.toLowerCase().includes(this.search.toLowerCase())||p.en.toLowerCase().includes(this.search.toLowerCase())));},
    get activePreset(){return this.presets.find(p=>p.id===this.currentPresetId);},
    get presetType(){return PRESETS.some(p=>p.id===this.currentPresetId)?'標準プリセット':this.activePreset?'追加プリセット':'カスタム設定';},
    get canOverwritePreset(){return this.activePreset?.category==='追加';},
    get comparisonLabel(){return this.compareAName||'変更前';},
    init(){
      base.init.call(this);
      this.presetBaseline=acousticSettings(this.makeSettings());
      this.currentPresetId='custom';this.presetId='custom';
      listCustomPresets().then(items=>{
        const verified=[];
        for(const entry of items){try{verified.push(parseMmsse(entry));}catch(error){console.warn('Invalid saved preset:',error);}}
        this.presets=[...PRESETS,...verified];
      }).catch(e=>this.notify('追加プリセットを取得できません: '+e.message,'error'));
      const tick=()=>{
        this.compareAPosition=playerA.tick();this.compareAPlaying=playerA.playing;
        requestAnimationFrame(tick);
      };requestAnimationFrame(tick);
    },
    changed(){
      base.changed.call(this);
      if(!this._workingPreset){
        this.presetDirty=isDirtyPreset(this.makeSettings(),this.presetBaseline);
        this.presetId=this.currentPresetId;
      }
    },
    // Prompt only for actions which would discard an unsaved preset edit.
    applyPreset(p){
      if(this.presetDirty){this.pendingPreset=p.id;return;}
      this.commitPreset(p);
    },
    commitPreset(p){
      const oldSettings=this.hasAudio?this.makeSettings():null;
      const oldName=this.activePreset?.title||'変更前';
      this._workingPreset=true;
      try{base.applyPreset.call(this,p);}finally{this._workingPreset=false;}
      this.currentPresetId=p.id;this.presetId=p.id;
      this.presetBaseline=acousticSettings(this.makeSettings());this.presetDirty=false;
      if(p.irName&&p.irName!==this.irName)this.notify(`この空間設定には別途IR「${p.irName}」が必要です。`);
      this.compareA=oldSettings?acousticSettings(oldSettings):acousticSettings(this.makeSettings());
      this.compareAName=oldSettings?oldName:p.title+'（適用時）';
      this.releaseComparisonCache();
    },
    async confirmSwitch(action){
      const target=this.presets.find(p=>p.id===this.pendingPreset);
      if(!target){this.pendingPreset=null;return;}
      if(action==='cancel'){this.pendingPreset=null;return;}
      if(action==='save'){
        if(!this.canOverwritePreset){this.nameDialog=true;this.presetNameDraft=`${this.activePreset?.title||'カスタム'}（編集版）`;this.saveThenSwitch=true;return;}
        try{await this.saveCurrentPreset();}catch(e){this.notify(e.message,'error');return;}
      }
      this.pendingPreset=null;this.commitPreset(target);
    },
    openSaveAsPreset(){this.renaming=false;this.nameDialog=true;this.saveThenSwitch=false;this.presetNameDraft=`${this.activePreset?.title||this.projectName||'新しい空間'}（カスタム）`;},
    async confirmSaveAs(){
      try{
        const newPreset=makeCustomPreset({title:this.presetNameDraft,description:'ユーザー保存の空間設定',settings:this.makeSettings(),irName:this.irName});
        await putCustomPreset(newPreset);
        this.presets=[...this.presets,newPreset];
        this.currentPresetId=newPreset.id;this.presetId=newPreset.id;
        this.presetBaseline=acousticSettings(this.makeSettings());this.presetDirty=false;
        this.nameDialog=false;
        this.notify('追加プリセットを保存しました。','success');
        if(this.saveThenSwitch){this.saveThenSwitch=false;const target=this.presets.find(p=>p.id===this.pendingPreset);this.pendingPreset=null;if(target)this.commitPreset(target);}
      }catch(error){this.notify('プリセット保存失敗: '+error.message,'error');}
    },
    async setManualGain(value){
      await base.setManualGain.call(this,value);
      this.presetDirty=isDirtyPreset(this.makeSettings(),this.presetBaseline);
      this.presetId=this.currentPresetId;
    },
    async saveCurrentPreset(){
      if(!this.canOverwritePreset){this.openSaveAsPreset();return false;}
      const old=this.activePreset;
      const updated=makeCustomPreset({...old,settings:this.makeSettings(),irName:this.irName});
      await putCustomPreset(updated);
      this.presets=this.presets.map(p=>p.id===updated.id?updated:p);
      this.presetBaseline=acousticSettings(this.makeSettings());this.presetDirty=false;
      this.notify('プリセットを上書き保存しました。','success');return true;
    },
    async renamePreset(){
      if(!this.canOverwritePreset)return;
      this.presetNameDraft=this.activePreset.title;
      this.nameDialog=true;this.renaming=true;
    },
    async confirmPresetName(){
      if(!this.renaming)return this.confirmSaveAs();
      try{
        const updated=makeCustomPreset({...this.activePreset,title:this.presetNameDraft});
        await putCustomPreset(updated);
        this.presets=this.presets.map(p=>p.id===updated.id?updated:p);
        this.nameDialog=false;this.renaming=false;this.notify('プリセット名を変更しました。','success');
      }catch(e){this.notify(e.message,'error');}
    },
    cancelNameDialog(){this.nameDialog=false;this.renaming=false;this.saveThenSwitch=false;},
    async deleteCurrentPreset(){
      if(!this.canOverwritePreset)return;
      if(!window.confirm(`「${this.activePreset.title}」を一覧から削除しますか？`))return;
      const oldId=this.currentPresetId;
      try{
        await removeCustomPreset(oldId);
        this.presets=this.presets.filter(p=>p.id!==oldId);
        this.currentPresetId='custom';this.presetId='custom';this.presetBaseline=acousticSettings(this.makeSettings());this.presetDirty=false;
        this.notify('プリセットを一覧から削除しました。','success');
      }catch(error){this.notify('削除失敗: '+error.message,'error');}
    },
    async exportMmsse(){
      try{
        const title=this.activePreset?.title||this.projectName||'カスタム空間';
        const preset=makeCustomPreset({id:this.canOverwritePreset?this.currentPresetId:newPresetId(),title,
          description:this.activePreset?.description||'',author:'MusicMenker user',settings:this.makeSettings(),irName:this.irName});
        const saved=await saveOutput(new Blob([formatMmsse(preset)],{type:'application/json'}),`${safeBaseName(title)}.mmsse`);
        if(saved)this.notify('空間プリセット.mmsseの保存を開始しました。','success');
      }catch(error){this.notify('プリセット書き出し失敗: '+error.message,'error');}
    },
    async openPresetDialog(){
      if(!isDesktop()){this.$refs.presetInput?.click();return;}
      try{const file=await openNativeFile('preset');if(file)await this.importMmsse(file);}
      catch(error){this.notify('プリセット読み込み失敗: '+error.message,'error');}
    },
    async fromPresetInput(event){const file=event.target.files?.[0];event.target.value='';if(file)await this.importMmsse(file);},
    async importMmsse(file){
      try{
        if(!/\.mmsse$/i.test(file.name))throw new Error('.mmsse形式を選択してください。');
        if(file.size>MMSSE_MAX_BYTES)throw new Error('プリセットは1MiBまでです。');
        const preset=parseMmsse(await file.text());
        this.pendingImport=preset;
        this.importConflict=this.presets.some(p=>p.id===preset.id);
        if(!this.importConflict)await this.resolveImport('add');
      }catch(error){this.notify('プリセット追加失敗: '+error.message,'error');}
    },
    async resolveImport(choice){
      if(!this.pendingImport)return;
      const incoming=this.pendingImport;
      if(choice==='cancel'){this.pendingImport=null;this.importConflict=false;return;}
      try{
        const exists=this.presets.find(p=>p.id===incoming.id);
        if(choice==='overwrite'&&exists?.category!=='追加')throw new Error('標準プリセットは上書きできません。');
        const nextId=choice==='overwrite'?incoming.id:(exists?newPresetId():incoming.id);
        const entry=makeCustomPreset({...incoming,id:nextId});
        await putCustomPreset(entry);
        this.presets=choice==='overwrite'?[...this.presets.filter(p=>p.id!==entry.id),entry]:[...this.presets,entry];
        if(this.currentPresetId===entry.id){this.presetBaseline=acousticSettings(entry.settings);this.presetDirty=isDirtyPreset(this.makeSettings(),this.presetBaseline);}
        this.pendingImport=null;this.importConflict=false;
        this.category='追加';this.notify(`「${entry.title}」を追加しました。プリセット一覧から適用できます。`,'success');
        if(entry.irName)this.notify(`このプリセットには別途IR「${entry.irName}」が必要です。`);
      }catch(error){this.notify('追加失敗: '+error.message,'error');}
    },
    restorePresetIdentity(){
      const target=this.presets.find(p=>p.id===this.presetId);
      this.currentPresetId=target?.id||'custom';this.presetId=this.currentPresetId;
      this.presetBaseline=acousticSettings(target?.settings||this.makeSettings());
      this.presetDirty=isDirtyPreset(this.makeSettings(),this.presetBaseline);
      this.compareA=null;this.releaseComparisonCache();
    },
    async fromProjectInput(event){await base.fromProjectInput.call(this,event);this.restorePresetIdentity();},
    async restore(){await base.restore.call(this);this.restorePresetIdentity();},
    async reset(){if(this.presetDirty&& !window.confirm('未保存のプリセット変更を破棄して初期化しますか？'))return;await base.reset.call(this);this.currentPresetId='custom';this.presetId='custom';this.presetBaseline=acousticSettings(this.makeSettings());this.presetDirty=false;this.compareA=null;this.releaseComparisonCache();},
    releaseComparisonCache(){playerA.stop();renderedA=null;renderedKey='';this.compareADuration=0;this.compareMode=false;this.compareSide='B';this.compareAPlaying=false;this.compareStatus='比較用Aは未生成';},
    startWork(message,{cancellable=true}={}){
      if(this.busy)return null;
      const controller=new AbortController();
      this._workController=controller;this._workSequence++;
      this.busy=true;this.busyMessage=message;
      this.work={status:'running',message,percent:null,cancellable};
      return controller;
    },
    reportWork(message,percent=null){
      if(this.work.status==='cancelling')return;
      this.busyMessage=message;
      this.work={...this.work,message,percent:percent===null?null:Math.max(0,Math.min(100,Math.round(percent)))};
    },
    lockWork(message){this.work={...this.work,message,cancellable:false};this.busyMessage=message;},
    cancelOperation(){
      if(!this._workController||!this.work.cancellable||this.work.status!=='running')return;
      this._workController.abort();
      this.work={...this.work,status:'cancelling',message:'キャンセル要求済み。現在の処理が終了次第、結果を破棄します。',percent:null,cancellable:false};
    },
    isWorkCancelled(){return Boolean(this._workController?.signal.aborted);},
    finishWork(controller,success){
      if(this._workController!==controller)return;
      const cancelled=controller.signal.aborted;
      this.busy=false;this.busyMessage='';this._workController=null;
      this.work={status:cancelled?'cancelled':success?'complete':'failed',message:cancelled?'処理をキャンセルしました。':success?'処理が完了しました。':'処理が完了しませんでした。',percent:cancelled?null:success?100:null,cancellable:false};
    },
    async buildPreview(){
      if(this.busy)return;
      if(!this.hasAudio)return this.notify('音源を読み込んでください。','error');
      const controller=this.startWork('加工後プレビューを準備中');if(!controller)return;
      let success=false;
      try{
        this.reportWork('音量補正を確認中',null);
        await base.buildPreview.call(this);
        if(controller.signal.aborted){this.previewStatus='生成をキャンセルしました';return;}
        success=this.previewReady&&!this.previewDirty;
      }catch(error){if(!isAbort(error))this.notify(error.message,'error');}
      finally{this.finishWork(controller,success);}
    },
    async exportZIP(){
      if(this.busy)return;
      const controller=this.startWork('プロジェクトZIPを作成中');if(!controller)return;
      let success=false;
      try{
        const blob=await zipProject(this.project(),this.sourceFile,this.irFile,({percent})=>this.reportWork('プロジェクトZIPを作成中',Math.min(99,percent)));
        if(controller.signal.aborted)throw CANCELLED();
        this.lockWork('ZIP保存先を選択・書き込み中');
        const saved=await saveOutput(blob,`${safeBaseName(this.projectName)}.sse.zip`);
        success=Boolean(saved);
        if(saved)this.notify('プロジェクトZIPの保存を開始しました。','success');else controller.abort();
      }catch(e){if(!isAbort(e))this.notify('プロジェクト保存失敗: '+e.message,'error');}
      finally{this.finishWork(controller,success);}
    },
    async exportWav(){
      if(!this.hasAudio)return this.notify('音源を読み込んでください。','error');
      if(this.busy)return;
      if(!this.previewReady||this.previewDirty){await this.buildPreview();if(!this.previewReady||this.previewDirty)return;}
      const buffer=getRenderedPreviewBuffer();if(!buffer)return this.notify('加工済み音声がありません。','error');
      const controller=this.startWork('WAVエンコードを開始中');if(!controller)return;
      let success=false;
      try{
        const blob=await encodeWavAsync(buffer,this.bitDepth,this.normalize,{
          signal:controller.signal,onProgress:({percent})=>this.reportWork('WAVをエンコード中',Math.min(99,percent))
        });
        if(controller.signal.aborted)throw CANCELLED();
        this.work={...this.work,cancellable:false};this.reportWork('保存先を選択・書き込み中',null);
        const saved=await saveOutput(blob,`${safeBaseName(this.audioName)}_${safeBaseName(this.projectName)}.wav`);
        success=Boolean(saved);
        if(saved)this.notify(isDesktop()?'WAVを保存しました。':'WAVのダウンロードを開始しました。','success');else controller.abort();
      }catch(error){if(!isAbort(error))this.notify('WAV出力失敗: '+error.message,'error');}
      finally{this.finishWork(controller,success);}
    },
    async renderComparisonA(){
      if(!this.compareA||!this.hasAudio)throw new Error('比較対象Aがありません。');
      const currentSource=getStudioSourceBuffer();
      const key=JSON.stringify(this.compareA)+'|'+this.audioName+'|'+this.irName;
      if(renderedA&&renderedKey===key)return;
      const controller=this.startWork('比較対象Aを生成中');if(!controller)return;
      let success=false;
      try{
        rendererA.dispose();await rendererA.setAudioBuffer(currentSource);
        rendererA.importedIR=getStudioPlaybackEngine().importedIR||null;
        let settings={...this.compareA,bitDepth:this.bitDepth,sampleRate:this.sampleRate};
        await rendererA.configure({...settings,autoGain:false,autoGainDb:0});
        if(settings.autoGain){
          this.reportWork('Aの音量補正を計算中',null);
          settings={...settings,autoGainDb:await rendererA.measureAutoGain(12)};
        }
        if(controller.signal.aborted)throw CANCELLED();
        await rendererA.configure(settings);
        this.reportWork('Aの音声をレンダリング中',null);
        const buffer=await rendererA.render();
        if(controller.signal.aborted)throw CANCELLED();
        await playerA.setAudioBuffer(buffer);
        await playerA.configure(dryPlayback());
        renderedA=buffer;renderedKey=key;this.compareADuration=buffer.duration;this.compareStatus='Aの加工結果を生成済み';success=true;
      }catch(error){if(!isAbort(error))this.notify('Aの生成失敗: '+error.message,'error');}
      finally{this.finishWork(controller,success);}
    },
    restoreComparisonA(){
      if(!this.compareA)return;
      const old=this.makeSettings();
      this.applySettings({...old,...this.compareA,bitDepth:this.bitDepth,sampleRate:this.sampleRate});
      this.changed();
      this.notify('Aの音響設定をBに反映しました。保存はまだ行っていません。');
    },
    async switchComparison(side){
      if(!['A','B'].includes(side)||!this.hasAudio)return;
      const wasA=this.compareMode&&this.compareSide==='A';
      const position=wasA?playerA.position:(this.previewMode==='original'?this.originalPosition:this.previewMode==='live'?this.position:this.previewPosition);
      const wasPlaying=true; // Selecting A/B is a direct request to audition that side.
      this.stop();
      this.compareMode=true;this.compareSide=side;
      if(side==='A'){
        await this.renderComparisonA();if(!renderedA)return;
        playerA.seek(position);
        if(wasPlaying)await playerA.play().catch(e=>this.notify(e.message,'error'));
      }else{
        if(!this.previewReady||this.previewDirty)await this.buildPreview();
        if(!this.previewReady||this.previewDirty)return;
        this.previewMode='processed';this.seekPreview(position);
        if(wasPlaying)await base.playProcessed.call(this);
      }
    },
    async playPause(){
      if(this.compareMode&&this.compareSide==='A'){
        if(!renderedA)await this.renderComparisonA();
        if(!renderedA)return;
        if(playerA.playing)playerA.pause();else await playerA.play().catch(e=>this.notify(e.message,'error'));
        return;
      }
      return base.playPause.call(this);
    },
    async choosePreview(mode){
      playerA.pause();this.compareMode=false;this.compareSide='B';
      return base.choosePreview.call(this,mode);
    },
    stop(){playerA.stop();base.stop.call(this);},
    seek(t){if(this.compareMode&&this.compareSide==='A'){playerA.seek(t);this.compareAPosition=t;}else base.seek.call(this,t);},
    async loadAudio(file){
      if(!file)return;
      if(this.busy&&!this._workController)return base.loadAudio.call(this,file); // project ZIP/draft restoration
      if(this.busy)return;
      const controller=this.startWork('音源の読み込み・デコード中');if(!controller)return;
      let success=false;
      try{
        success=Boolean(await base.loadAudio.call(this,file));
        if(success){this.compareA=null;this.releaseComparisonCache();}
      }catch(e){this.notify('音源の読み込み失敗: '+e.message,'error');}
      finally{this.finishWork(controller,success);}
    },
    async loadDemo(){this.compareA=null;this.releaseComparisonCache();await base.loadDemo.call(this);},
    handleDrop(event){
      this.isDragOver=false;
      const file=event.dataTransfer?.files?.[0];
      if(file?.name.toLowerCase().endsWith('.mmsse'))this.importMmsse(file);
      else base.handleDrop.call(this,event);
    }
  };
}
