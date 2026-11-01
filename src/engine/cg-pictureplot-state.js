import {assert} from './calculator.js';
import {calibratePicture} from './cg-geometry.js';
import {cgRegression,cgRegressionTypes} from './cg-statistics.js';

export const CG_PICTUREPLOT_MAX_FRAMES=30,CG_PICTUREPLOT_MAX_POINTS=50,CG_PICTUREPLOT_IMAGE_BUDGET=1200000,CG_PICTUREPLOT_NATIVE_IMAGE_BUDGET=12000000;
export const CG_PICTUREPLOT_COLORS=['#000000','#0000ff','#ff0000','#ff00ff','#008000','#00ffff','#ffff00'];
const finite=value=>typeof value==='number'&&Number.isFinite(value)&&Math.abs(value)<1e100;
const object=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
const text=(value,limit=200)=>typeof value==='string'?value.slice(0,limit):'';
const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
export const isCGPicturePlotImageUrl=value=>typeof value==='string'&&value.length<=CG_PICTUREPLOT_IMAGE_BUDGET&&/^data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/.test(value);
const pixel=value=>value&&finite(value.u)&&finite(value.v)?{u:value.u,v:value.v}:null;
export const isCGPicturePlotSequence=state=>state?.nativeInfo?.format==='g3b'||state.frames.length>1;
function nativeSourceInfo(source){
  const raw=object(source.nativeInfo);if(raw.format!=='g3b'||raw.variant!=='CP0001-RGB565')return null;
  const info={format:'g3b',variant:'CP0001-RGB565',metadataFields:['time','window']},chunks=raw.sourceChunks;
  if(Array.isArray(chunks)&&chunks.length>=1&&chunks.length<=400&&chunks.every(chunk=>typeof chunk==='string'&&chunk.length%4===0&&chunk.length<=65536&&/^[A-Za-z0-9+/]+={0,2}$/.test(chunk))){
    const size=chunks.reduce((sum,chunk)=>sum+chunk.length*3/4-(chunk.endsWith('==')?2:chunk.endsWith('=')?1:0),0);
    if(size<=16*1024*1024){info.sourceChunks=chunks.slice();let count=Number.isInteger(raw.frameCount)&&raw.frameCount>=1&&raw.frameCount<=30?raw.frameCount:Math.max(1,Math.min(30,source.frames?.length||1));
      try{const prefix=Uint8Array.from(atob(chunks[0]),char=>char.charCodeAt(0)),view=new DataView(prefix.buffer);if(prefix.length<0xc8||prefix[0]!==0xaa||prefix[8]!==0x82||((view.getUint32(16)^0xffffffff)>>>0)!==size||view.getUint32(0x34)!==0x492)throw Error('Invalid native header');const actual=view.getUint16(0xc4);if(actual<1||actual>30)throw Error('Invalid native frame count');count=actual;}catch{info.invalidHeader=true;}
      info.frameCount=count;
    }
  }
  return info;
}

export function sanitizeCGPicturePlotState(source={}){
  const s=object(source),nativeInfo=nativeSourceInfo(s),sourceBacked=!!nativeInfo?.sourceChunks,imageBudget=nativeInfo?CG_PICTUREPLOT_NATIVE_IMAGE_BUDGET:CG_PICTUREPLOT_IMAGE_BUDGET,raw=Array.isArray(s.frames)&&s.frames.length?s.frames:s.imageUrl?[{imageUrl:s.imageUrl,imageName:s.imageName,width:s.width,height:s.height}]:[],frames=[];let imageBytes=0;
  if(sourceBacked){for(let index=0;index<nativeInfo.frameCount;index++)frames.push({imageUrl:'',imageName:text(raw[index]?.imageName)||text(s.imageName)+' #'+(index+1),width:384,height:192,bitDepth:16});}
  else for(const item of raw.slice(0,30)){const f=object(item);if(!isCGPicturePlotImageUrl(f.imageUrl))continue;assert(imageBytes+f.imageUrl.length<=imageBudget,'Picture image data exceeds storage budget');imageBytes+=f.imageUrl.length;frames.push({imageUrl:f.imageUrl,imageName:text(f.imageName),width:Number.isInteger(f.width)&&f.width>0&&f.width<=4096?f.width:384,height:Number.isInteger(f.height)&&f.height>0&&f.height<=4096?f.height:216,bitDepth:f.bitDepth===16?16:24});}
  const points=[],seen=new Set(),multiple=!!nativeInfo||frames.length>1;
  for(const item of (Array.isArray(s.points)?s.points:[]).slice(0,1000)){const p=pixel(item);if(!p)continue;const frame=multiple?Number.isInteger(item.frame)?item.frame:points.length:0;if(frame<0||frame>=Math.max(1,frames.length)||multiple&&seen.has(frame))continue;seen.add(frame);points.push({...p,frame,color:CG_PICTUREPLOT_COLORS.includes(item.color)?item.color:'#ff00ff'});}
  const time=object(s.time),start=time.start??s.tStart,step=time.step??s.tStep,r=object(s.rightWindow);
  const state={frames,frameIndex:clamp(Number.isInteger(s.frameIndex)?s.frameIndex:0,0,Math.max(0,frames.length-1)),imageUrl:frames[0]?.imageUrl||'',imageName:text(s.imageName)||frames[0]?.imageName||'',points,
    xUnit:finite(s.xUnit)&&s.xUnit!==0?s.xUnit:1,yUnit:finite(s.yUnit)&&s.yUnit!==0?s.yUnit:1,
    time:{start:finite(start)&&Math.abs(start)<1e10?start:0,step:finite(step)&&step>0&&step<1e10?step:1},
    regression:[...cgRegressionTypes,'inverse'].includes(s.regression)?s.regression:'linear',axtrans:s.axtrans==='TX'?'TX':'TY',axtransWindow:s.axtransWindow==='manual'?'manual':'auto',leftDisplay:[0,1,2].includes(s.leftDisplay)?s.leftDisplay:0,crop:finite(s.crop)?clamp(s.crop,0,1):.5,
    fade:finite(s.fade)?clamp(s.fade,0,100):0,plotColor:CG_PICTUREPLOT_COLORS.includes(s.plotColor)?s.plotColor:'#ff00ff',plotType:['cross','dot','square'].includes(s.plotType)?s.plotType:'cross',
    rightWindow:[r.tmin,r.tmax,r.vmin,r.vmax].every(finite)&&r.tmin<r.tmax&&r.vmin<r.vmax?{tmin:r.tmin,tmax:r.tmax,vmin:r.vmin,vmax:r.vmax}:null,
    expressions:(Array.isArray(s.expressions)?s.expressions:[]).slice(0,20).map(value=>text(value,1500)),
  };
  if(nativeInfo)state.nativeInfo=nativeInfo;
  for(const key of ['origin','xRef','yRef'])if(pixel(s[key]))state[key]=pixel(s[key]);
  return state;
}
export function serializeCGPicturePlotState(state){
  // Native pixels are immutable derived data. Persist one binary source and
  // lightweight frame descriptors, never30 copies of decoded PNG/base64 data.
  return sanitizeCGPicturePlotState(state);
}

export function setCGPicturePlotTime(state,start,step){
  assert(finite(start)&&Math.abs(start)<1e10,'Time Start must satisfy −10^10 < Start < 10^10');
  assert(finite(step)&&step>0&&step<1e10,'Time Step must satisfy 0 < Step < 10^10');return {...state,time:{start,step}};
}
export function cgPicturePlotRows(state){
  const calibration=calibratePicture(state);return state.points.map((point,index)=>{const world=calibration.toWorld(point);return {...point,index,t:state.time.start+index*state.time.step,x:Object.is(world.x,-0)?0:world.x,y:Object.is(world.y,-0)?0:world.y};});
}
export function cgPicturePlotSeries(state,mode=state.axtrans){
  assert(['XY','TX','TY'].includes(mode),'Unknown Picture Plot axes');return cgPicturePlotRows(state).map(row=>({x:mode==='XY'?row.x:row.t,y:mode==='TX'?row.x:row.y,index:row.index,color:row.color,frame:row.frame}));
}
export function setCGPicturePlotCell(state,index,column,value){
  assert(Number.isInteger(index)&&index>=0&&index<state.points.length&&['x','y'].includes(column)&&finite(value),'Invalid Plot List cell');
  const rows=cgPicturePlotRows(state),points=state.points.map(point=>({...point}));Object.assign(points[index],calibratePicture(state).toPixel({...rows[index],[column]:value}));return {...state,points};
}
export function addCGPicturePlotPoint(state,point){
  assert(pixel(point),'Plot coordinates must be finite');const sequence=isCGPicturePlotSequence(state),points=state.points.map(value=>({...value})),frame=sequence?state.frameIndex:0;
  if(sequence){const existing=points.findIndex(value=>value.frame===frame);if(existing>=0)points[existing]={...points[existing],...pixel(point)};else {assert(points.length<state.frames.length,'One plot per frame');points.push({...pixel(point),frame,color:state.plotColor});points.sort((a,b)=>a.frame-b.frame);}}
  else {assert(points.length<CG_PICTUREPLOT_MAX_POINTS,'Picture Plot permits50 points per single image');points.push({...pixel(point),frame:0,color:state.plotColor});}
  return {...state,points,frameIndex:sequence?Math.min(state.frames.length-1,frame+1):0};
}
export function cgPicturePlotStoreList(state,lists,column,index){
  assert(['x','y'].includes(column)&&Number.isInteger(index)&&index>=1&&index<=26,'Choose X/Y and List1–26');const values=cgPicturePlotRows(state).map(row=>row[column]);
  const next=Array.from({length:26},(_,i)=>Array.isArray(lists?.[i])?lists[i].slice():[]);next[index-1]=values;return next;
}
export function cgPicturePlotRecallList(state,lists,column,index){
  assert(['x','y'].includes(column)&&Number.isInteger(index)&&index>=1&&index<=26,'Choose X/Y and List1–26');const values=lists?.[index-1],maximum=isCGPicturePlotSequence(state)?state.frames.length:50;
  assert(Array.isArray(values)&&values.length>0&&values.length<=maximum&&values.every(finite),'List is empty, non-real or exceeds the picture plot limit');
  const rows=cgPicturePlotRows(state),calibration=calibratePicture(state),points=values.map((value,i)=>({...calibration.toPixel({x:rows[i]?.x??0,y:rows[i]?.y??0,[column]:value}),frame:isCGPicturePlotSequence(state)?i:0,color:state.plotColor}));
  return {...state,points,frameIndex:0};
}
export function cgPicturePlotAXWindow(state){
  const values=cgPicturePlotSeries(state),times=values.map(p=>p.x),coordinates=values.map(p=>p.y);assert(values.length,'Plot at least one point');
  const extent=list=>{const low=Math.min(...list),high=Math.max(...list),pad=high===low?Math.max(1,Math.abs(low)*.05):(high-low)*.08;return [low-pad,high+pad];};
  const [tmin,tmax]=extent(times),automatic=extent(coordinates);let [vmin,vmax]=state.axtransWindow==='manual'&&state.rightWindow?[state.rightWindow.vmin,state.rightWindow.vmax]:automatic;
  if(state.axtransWindow==='auto'&&state.frames.length){const f=state.frames[0],c=calibratePicture(state),corners=[c.toWorld({u:0,v:0}),c.toWorld({u:f.width,v:0}),c.toWorld({u:0,v:f.height}),c.toWorld({u:f.width,v:f.height})],axis=state.axtrans==='TX'?'x':'y';vmin=Math.min(...corners.map(p=>p[axis]));vmax=Math.max(...corners.map(p=>p[axis]));if(vmin===vmax)[vmin,vmax]=automatic;}
  return {tmin,tmax,vmin,vmax};
}
export function cgPicturePlotRegression(state,mode='XY',type=state.regression){
  assert(cgRegressionTypes.includes(type),'Choose a manual regression type');return cgRegression(cgPicturePlotSeries(state,mode).map(point=>[point.x,point.y,1]),type);
}
export function cgPicturePlotPlaybackOrder(count,repeats=3){assert(Number.isInteger(count)&&count>=1&&count<=30&&Number.isInteger(repeats)&&repeats>=1&&repeats<=3,'Invalid image sequence');return Array.from({length:count*repeats},(_,i)=>i%count);}
export function parseCGPicturePlotSequence(source){
  assert(source?.format==='scientific-calculator-simulator/picture-sequence'&&source.version===1,'Choose a simulator picture-sequence file, not native G3B/renamed JSON');
  assert(Array.isArray(source.frames)&&source.frames.length>=1&&source.frames.length<=30,'Image sequence requires1–30 frames');
  const native=nativeSourceInfo({...object(source.state),frames:source.frames});if(native?.sourceChunks)return sanitizeCGPicturePlotState({...object(source.state),frames:source.frames});
  const budget=native?CG_PICTUREPLOT_NATIVE_IMAGE_BUDGET:CG_PICTUREPLOT_IMAGE_BUDGET;
  assert(source.frames.every(frame=>isCGPicturePlotImageUrl(frame?.imageUrl))&&source.frames.reduce((total,frame)=>total+frame.imageUrl.length,0)<=budget,'Invalid or oversized sequence images');
  return sanitizeCGPicturePlotState({...object(source.state),frames:source.frames});
}
export function exportCGPicturePlotSequence(state){const saved=serializeCGPicturePlotState(state);return {format:'scientific-calculator-simulator/picture-sequence',version:1,frames:saved.frames,state:{...saved,frames:undefined,imageUrl:undefined}};}
