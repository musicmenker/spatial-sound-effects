import WaveSurfer from 'wavesurfer.js';
import TimelinePlugin from 'wavesurfer.js/dist/plugins/timeline.esm.js';

function drawPeaks(buffer,length=2200){
  const results=[];
  for(let c=0;c<Math.min(2,buffer.numberOfChannels);c++){
    const data=buffer.getChannelData(c),a=new Float32Array(length);
    const step=data.length/length;
    for(let i=0;i<length;i++){
      const lo=Math.floor(i*step),hi=Math.max(lo+1,Math.floor((i+1)*step));
      let peak=0;
      for(let j=lo;j<hi;j+=Math.max(1,Math.floor((hi-lo)/16))){
        const val=Math.abs(data[j]);if(val>peak)peak=val;
      }
      a[i]=peak;
    }
    results.push(a);
  }
  return results;
}
export class WaveformUI{
  constructor(container,timeline,onSeek){
    this.container=container;this.timeline=timeline;this.onSeek=onSeek;
    this.ws=null;this.duration=0;this.currentTime=0;
    container.tabIndex=0;
    container.setAttribute('role','slider');
    container.setAttribute('aria-valuemin','0');
    container.setAttribute('aria-valuemax','0');
    container.setAttribute('aria-valuenow','0');
    container.addEventListener('keydown',event=>{
      if(!this.duration||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
      event.preventDefault();
      const time=event.key==='Home'?0:event.key==='End'?this.duration:
        Math.max(0,Math.min(this.duration,this.currentTime+(event.key==='ArrowLeft'?-5:5)));
      this.currentTime=time;this.update(time);this.onSeek(time);
    });
    container.addEventListener('pointerdown',event=>{
      if(!this.duration)return;
      const rect=container.getBoundingClientRect();
      const pct=Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width));
      this.onSeek(this.duration*pct);
    });
  }
  load(buffer){
    this.ws?.destroy();this.duration=buffer.duration;this.currentTime=0;
    this.container.setAttribute('aria-valuemax',String(Math.round(buffer.duration)));
    this.container.setAttribute('aria-valuenow','0');
    this.timeline.replaceChildren();
    this.ws=WaveSurfer.create({
      container:this.container,
      height:84,
      waveColor:'#656565',progressColor:'#252525',cursorColor:'#101010',
      cursorWidth:1,barWidth:2,barGap:2,barRadius:0,
      interact:false,normalize:false,
      peaks:drawPeaks(buffer),duration:buffer.duration,
      plugins:[TimelinePlugin.create({container:this.timeline,primaryLabelColor:'#222',secondaryLabelColor:'#555',primaryColor:'#555',secondaryColor:'#aaa'})]
    });
  }
  update(time){
    if(!this.ws || !this.duration)return;
    this.currentTime=time;this.container.setAttribute('aria-valuenow',String(Math.round(time)));
    this.container.style.setProperty('--playhead',`${Math.min(100,Math.max(0,time/this.duration*100))}%`);
  }
  destroy(){this.ws?.destroy();this.ws=null;}
}
