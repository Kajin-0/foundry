import {LAYER_INFO,ML_NM,rateUmH,TOTAL,TOTAL_REAL} from './process.js';

export function createMBEUI(S){
 const $=id=>document.getElementById(id);
 const narrator={status:$('narrStatus'),detail:$('narrDetail'),time:$('narrTime')};
 const rheedPath=$('rheedPath'), rheedVal=$('rheedVal'), xsec=$('xsecContent');
 const histMax=220;
 function setIdle(){
  narrator.status.textContent=S.done?'GROWTH COMPLETE':'IDLE';
  narrator.status.style.color=S.done?'#7ee6a0':'#5f7d9e';
  narrator.detail.textContent=S.done?
    'GaAs/AlGaAs DH structure complete (2.10 µm). Geometry, RHEED and gauge values are educational approximations; this is not a fabrication recipe.':
    'Press Run to explore epitaxial growth, source calibration and RHEED monitoring.';
  narrator.time.textContent=S.done?'Cycle complete':'—';
 }
 function setPhase(p){narrator.status.textContent=p.narr;narrator.status.style.color=p.color;narrator.detail.textContent=p.detail;}
 function pressure(value){
   if(value>=1)return value.toFixed(0)+' Torr';
   if(value>=1e-3)return (value*1000).toFixed(1)+' mTorr';
   return value.toExponential(1)+' Torr';
 }
 function updateReadouts(){
   $('v1').textContent=pressure(S.press);$('v7b').textContent=pressure(S.pLock);
   $('v2').textContent=Math.round(S.subT)+' °C';
   for(const [id,key,shutter] of [['v3','gaT','gaOpen'],['v4','alT','alOpen'],['v5','asT','asOpen']]){
     $(id).textContent=Math.round(S[key])+' °C · '+(S[shutter]>0.5?'OPEN':'shut');
   }
   $('v6').textContent=S.rateMLps>0 ? rateUmH(S.rateMLps).toFixed(2)+' µm/hr ('+S.rateMLps.toFixed(2)+' ML/s)':'—';
   $('v7').textContent=S.mlTotal>0?Math.round(S.mlTotal).toLocaleString()+' ML':'—';
   rheedVal.textContent=S.rheedI>0?S.rheedI.toFixed(0)+'%':'—';
   $('progBar').style.width=(Math.min(1,S.t/TOTAL)*100).toFixed(1)+'%';
   if(S.on) narrator.time.textContent=Math.round(S.t)+'s / '+Math.round(TOTAL)+'s demo · ~'+Math.round(TOTAL_REAL)+' min real';
 }
 function clearRHEED(){S.rheedHistory=Array(histMax).fill(0);S.rheedI=0;drawRHEED();}
 function sampleRHEED(value){
   S.rheedI=Math.max(0,Math.min(100,value));
   S.rheedHistory.shift();S.rheedHistory.push(S.rheedI);
   let path='';
   const history=S.rheedHistory;
   for(let i=0;i<history.length;i++){
     const x=(i/(histMax-1))*300, y=60-history[i]*0.52-4;
     path+=(i?'L':'M')+x.toFixed(1)+','+y.toFixed(1)+' ';
   }
   rheedPath.setAttribute('d',path);
   rheedVal.textContent=S.rheedI.toFixed(0)+'%';
 }
 function drawRHEED(){
   const values=S.rheedHistory;
   rheedPath.setAttribute('d',values.map((v,i)=>(i?'L':'M')+(i/(histMax-1)*300).toFixed(1)+','+(60-v*.52-4).toFixed(1)).join(' '));
 }
 function updateXsec(){
   const bottom=76,pxPerUm=24;
   let atY=bottom, content='<rect x="10" y="76" width="280" height="10" fill="#3a5a7a"/>';
   content+='<text x="14" y="83" font-size="7" fill="#a0c0e0">GaAs substrate 350 µm</text>';
   for(let i=0;i<LAYER_INFO.length;i++){
     const info=LAYER_INFO[i], physical=S.layerUm[i];
     if(physical<=0)continue;
     const height=Math.max(0.5, physical*pxPerUm), y=atY-height, active=S.on&&S.activeLayer===i;
     const color='#'+info.color.toString(16).padStart(6,'0');
     content+='<rect x="10" y="'+y.toFixed(2)+'" width="280" height="'+height.toFixed(2)+'" fill="'+color+'" stroke="'+(active?'#7ee6a0':'#0a1020')+'" stroke-width="'+(active?1:0.3)+'"/>';
     if(height>=9)content+='<text x="14" y="'+(y+height/2+2.5).toFixed(2)+'" font-size="7" fill="#19212b">'+info.name+' '+physical.toFixed(2)+'µm</text>';
     atY=y;
   }
   const total=S.layerUm.reduce((sum,v)=>sum+v,0);
   if(total>0){
     content+='<text x="219" y="83" font-size="7" fill="#8cd1ff">'+total.toFixed(2)+' µm total</text>';
   }
   xsec.innerHTML=content;
 }
 clearRHEED(); updateReadouts();updateXsec();setIdle();
 return {setIdle,setPhase,updateReadouts,clearRHEED,sampleRHEED,updateXsec};
}
