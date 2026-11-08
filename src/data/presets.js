import {cloneSettings} from './effects.js';
const make=(id,title,en,category,description,icon,update)=>{
  const s=cloneSettings();
  s.effects.forEach(e=>e.enabled=false);
  for(const [key,params] of Object.entries(update)){
    if(key==='masterDb' || key==='mix'){s[key]=params;continue;}
    Object.assign(s.effects.find(e=>e.id===key),{enabled:true,...params});
  }
  s.highLossIntentional=['nextroom','underwater','radio'].includes(id);
  return {id,title,en,category,description,icon,settings:s};
};
export const PRESETS=[
  make('basement','地下室','Basement','空間','低域の重さと閉塞感を伴う地下空間','▥',{
    filter:{lowpass:3300,highpass:42},eq:{low:4,mid:-3,high:-5},reverb:{decay:2.4,predelay:36,wet:40},distance:{muffle:25,far:10,attenuation:2}}),
  make('bathroom','浴室','Bathroom','空間','タイル張りの室内で明るく跳ね返る響き','◫',{
    filter:{lowpass:16000,highpass:100},eq:{low:-2,mid:2,high:3},reverb:{decay:2.1,predelay:16,wet:53},delay:{time:84,feedback:11,wet:13}}),
  make('tunnel','長いトンネル','Long Tunnel','空間','奥まで続く反射と長い残響','▱',{
    filter:{lowpass:9000,highpass:65},reverb:{decay:4.6,predelay:110,wet:49},delay:{time:310,feedback:34,wet:28}}),
  make('hall','大ホール','Concert Hall','空間','広い空間をゆっくり満たす残響','◯',{
    eq:{low:1,mid:0,high:1},reverb:{decay:5.4,predelay:82,wet:47},surround:{mode:'wide',width:63,depth:50}}),
  make('stairwell','コンクリート階段','Stairwell','空間','硬質な壁で跳ねる短めの反射','≡',{
    filter:{lowpass:11000,highpass:75},reverb:{decay:2.8,predelay:44,wet:43},delay:{time:135,feedback:21,wet:19}}),
  make('nextroom','隣の部屋','Next Room','距離','壁越しで高域が失われた音','▣',{
    filter:{lowpass:1450,highpass:70},eq:{low:1,mid:1,high:-10},distance:{muffle:55,far:22,attenuation:5},reverb:{decay:0.9,predelay:15,wet:18}}),
  make('faraway','遠くのスピーカー','Far Speaker','距離','屋内の向こう側で鳴るスピーカー','⋯',{
    filter:{lowpass:5200,highpass:140},distance:{muffle:31,far:70,attenuation:12},reverb:{decay:3.4,predelay:42,wet:32}}),
  make('underwater','水中風','Underwater','音質','高音を抑えた水中のような音','≈',{
    filter:{lowpass:950,highpass:30},eq:{low:5,mid:-2,high:-14},reverb:{decay:1.5,predelay:10,wet:12}}),
  make('radio','古いラジオ','Old Radio','音質','帯域制限と控えめな歪み','▤',{
    filter:{lowpass:4400,highpass:360},eq:{low:-5,mid:5,high:-7},distortion:{amount:28,wet:34}}),
  make('8d','8D Audio風','8D Motion','移動','頭の左右を周期的に行き来する音','∞',{
    surround:{mode:'orbit',width:75,speed:.2,depth:90},reverb:{decay:1.5,predelay:28,wet:17}}),
  make('wide','ワイドステレオ','Wide Stereo','移動','音源の左右の広がりを調整','⟷',{
    surround:{mode:'wide',width:85},eq:{low:0,mid:0,high:1}}),
  make('binaural','立体定位風','Binaural','移動','HRTFで斜め前方に位置する音を表現','◉',{
    surround:{mode:'hrtf',width:65,depth:65},reverb:{decay:1.3,predelay:18,wet:14}}),
  make('dry','原音・未加工','Original','基本','エフェクトをすべて無効化','—',{})
];
export const CATEGORIES=['すべて','空間','距離','音質','移動','基本'];
