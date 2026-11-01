import test from 'node:test';
import assert from 'node:assert/strict';
import {sanitizeCGPicturePlotState,serializeCGPicturePlotState,isCGPicturePlotImageUrl,setCGPicturePlotTime,cgPicturePlotRows,cgPicturePlotSeries,setCGPicturePlotCell,addCGPicturePlotPoint,cgPicturePlotStoreList,cgPicturePlotRecallList,cgPicturePlotAXWindow,cgPicturePlotRegression,cgPicturePlotPlaybackOrder,parseCGPicturePlotSequence,exportCGPicturePlotSequence} from '../src/engine/cg-pictureplot-state.js';
import {encodeCGPictureG3B,encodeCGPictureSourceChunks,decodeCGPictureSourceChunks} from '../src/engine/cg-pictureplot-files.js';
const image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a+j0AAAAASUVORK5CYII=';
const frame={imageUrl:image,imageName:'frame.png',width:384,height:216};
const base=(points=[])=>sanitizeCGPicturePlotState({frames:[frame],origin:{u:100,v:100},xRef:{u:110,v:100},yRef:{u:100,v:90},points});
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-9,`${actual} != ${expected}`);

test('Picture Plot state accepts bounded local raster data and rejects remote,file,SVG and malformed payloads',()=>{
  for(const url of ['https://example.com/a.png','file:///secret.png','data:image/svg+xml;base64,PHN2Zz4=','javascript:alert(1)']){assert.equal(isCGPicturePlotImageUrl(url),false);assert.equal(sanitizeCGPicturePlotState({imageUrl:url}).imageUrl,'');}
  assert.equal(isCGPicturePlotImageUrl(image),true);const state=sanitizeCGPicturePlotState({imageUrl:image,points:[{u:1,v:2},{u:NaN,v:2},{u:1,v:Infinity}],time:{start:Infinity,step:0}});assert.equal(state.frames.length,1);assert.equal(state.points.length,1);assert.deepEqual(state.time,{start:0,step:1});
});
test('time SET follows manual15-15 Start/Step bounds and computes readonly time column',()=>{
  const original=base([{u:100,v:100},{u:110,v:90},{u:120,v:80}]),state=setCGPicturePlotTime(original,1,1.5);assert.deepEqual(cgPicturePlotRows(state).map(row=>row.t),[1,2.5,4]);assert.deepEqual(original.time,{start:0,step:1});
  for(const [start,step]of [[-1e10,1],[1e10,1],[0,0],[0,-1],[0,1e10],[NaN,1]])assert.throws(()=>setCGPicturePlotTime(state,start,step));
});
test('rotated three-point calibration and Plot List editing retain pixels,frame and point color',()=>{
  const state=sanitizeCGPicturePlotState({...base([{u:110,v:110,color:'#ff0000'}]),origin:{u:100,v:100},xRef:{u:100,v:110},yRef:{u:90,v:100}}),row=cgPicturePlotRows(state)[0];near(row.x,1);near(row.y,-1);
  const next=setCGPicturePlotCell(state,0,'x',3);near(cgPicturePlotRows(next)[0].x,3);near(cgPicturePlotRows(next)[0].y,-1);assert.equal(next.points[0].color,'#ff0000');assert.equal(state.points[0].v,110);assert.throws(()=>setCGPicturePlotCell(state,0,'t',5));
});
test('single-image plotting enforces50 new points and leaves prior snapshots untouched',()=>{
  let state=base();for(let i=0;i<50;i++)state=addCGPicturePlotPoint(state,{u:i,v:i});const before=structuredClone(state);assert.throws(()=>addCGPicturePlotPoint(state,{u:51,v:51}));assert.deepEqual(state,before);
  const legacy=sanitizeCGPicturePlotState({...state,points:Array.from({length:70},(_,i)=>({u:i,v:i}))});assert.equal(legacy.points.length,70,'legacy desktop data is preserved rather than silently truncated');assert.throws(()=>addCGPicturePlotPoint(legacy,{u:1,v:2}));
});
test('image sequence plotting advances one frame per point and revisiting a frame updates its sole plot',()=>{
  let state=sanitizeCGPicturePlotState({...base(),frames:[frame,frame,frame]});state=addCGPicturePlotPoint(state,{u:100,v:100});assert.equal(state.frameIndex,1);state=addCGPicturePlotPoint(state,{u:110,v:90});assert.equal(state.frameIndex,2);state=addCGPicturePlotPoint(state,{u:120,v:80});assert.equal(state.points.length,3);state.frameIndex=1;state=addCGPicturePlotPoint(state,{u:130,v:70});assert.equal(state.points.length,3);assert.equal(state.points[1].u,130);assert.deepEqual(cgPicturePlotRows(state).map(row=>row.frame),[0,1,2]);
});
test('STORE copies X/Y numeric values to the selected List without sharing arrays or colors',()=>{
  const state=base([{u:110,v:80,color:'#ff0000'},{u:120,v:70}]),lists=Array.from({length:26},()=>[99]),next=cgPicturePlotStoreList(state,lists,'x',26);assert.deepEqual(next[25],[1,2]);assert.deepEqual(lists[25],[99]);next[0][0]=5;assert.equal(lists[0][0],99);assert.throws(()=>cgPicturePlotStoreList(state,lists,'t',1));
});
test('RECALL replaces one numeric column,keeps matching other coordinates and validates transactionally',()=>{
  const state=base([{u:110,v:80},{u:120,v:70}]),lists=Array.from({length:26},()=>[]);lists[2]=[5,6,7];const next=cgPicturePlotRecallList(state,lists,'x',3),rows=cgPicturePlotRows(next);assert.deepEqual(rows.map(row=>row.x),[5,6,7]);assert.deepEqual(rows.map(row=>row.y),[2,3,0]);assert.equal(state.points.length,2);
  lists[2]=Array(51).fill(1);assert.throws(()=>cgPicturePlotRecallList(state,lists,'x',3));lists[2]=[NaN];assert.throws(()=>cgPicturePlotRecallList(state,lists,'x',3));assert.equal(state.points.length,2);
});
test('AXTRANS produces true T-X/T-Y points and always recomputes T limits with optional manual value limits',()=>{
  let state=setCGPicturePlotTime(base([{u:110,v:80},{u:130,v:60}]),2,3);assert.deepEqual(cgPicturePlotSeries(state,'TX').map(({x,y})=>[x,y]),[[2,1],[5,3]]);assert.deepEqual(cgPicturePlotSeries(state,'TY').map(({x,y})=>[x,y]),[[2,2],[5,4]]);
  state={...state,axtransWindow:'manual',rightWindow:{tmin:100,tmax:200,vmin:-20,vmax:30}};const win=cgPicturePlotAXWindow(state);assert.ok(win.tmin<2&&win.tmax>5);assert.equal(win.vmin,-20);assert.equal(win.vmax,30);
});
test('AXTRANS automatic value range includes all corners under rotated calibration',()=>{
  const state=sanitizeCGPicturePlotState({...base([{u:100,v:100}]),origin:{u:0,v:0},xRef:{u:10,v:10},yRef:{u:-10,v:10},axtrans:'TY'}),win=cgPicturePlotAXWindow(state);assert.ok(win.vmin<0&&win.vmax>0);assert.ok(win.tmin<0&&win.tmax>0);
});
test('regression computes coordinate and time relations rather than treating time as a label',()=>{
  const state=base([{u:100,v:70},{u:110,v:50},{u:120,v:30}]);const xy=cgPicturePlotRegression(state,'XY','linear'),ty=cgPicturePlotRegression(state,'TY','linear');near(xy.predict(4),11);near(ty.predict(4),11);const tx=cgPicturePlotRegression(setCGPicturePlotTime(state,1,2),'TX','linear');near(tx.predict(7),3);
});
test('explicit simulator image sequence JSON roundtrips without pretending to be native G3B',()=>{
  const state=sanitizeCGPicturePlotState({...base([{u:100,v:100},{u:110,v:90,frame:1}]),frames:[frame,frame],time:{start:2,step:.5},leftDisplay:2}),encoded=JSON.parse(JSON.stringify(exportCGPicturePlotSequence(state))),restored=parseCGPicturePlotSequence(encoded);assert.deepEqual(restored.points,state.points);assert.deepEqual(restored.time,{start:2,step:.5});assert.equal(restored.frames.length,2);
  for(const record of [{format:'g3b',version:1,frames:[frame]},{format:'scientific-calculator-simulator/picture-sequence',version:1,frames:Array(31).fill(frame)}])assert.throws(()=>parseCGPicturePlotSequence(record));
});
test('manual playback order visits all frames exactly three times and rejects invalid counts',()=>{
  assert.deepEqual(cgPicturePlotPlaybackOrder(3),[0,1,2,0,1,2,0,1,2]);assert.equal(cgPicturePlotPlaybackOrder(30).length,90);assert.throws(()=>cgPicturePlotPlaybackOrder(31));assert.throws(()=>cgPicturePlotPlaybackOrder(2,4));
});
test('native source-only persistence keeps all30 frames while excluding a12MB derived PNG cache',async()=>{
  const source=await encodeCGPictureG3B({frames:Array.from({length:30},()=>({pixels:new Uint8Array(384*192*2)}))}),sourceChunks=encodeCGPictureSourceChunks(source),cached='data:image/png;base64,'+'A'.repeat(390000),input={...base(),frames:Array.from({length:30},()=>({...frame,imageUrl:cached})),frameIndex:29,points:Array.from({length:30},(_,frame)=>({u:frame,v:frame,frame})),nativeInfo:{format:'g3b',variant:'CP0001-RGB565',sourceChunks}},saved=serializeCGPicturePlotState(input),json=JSON.stringify(saved);
  assert.equal(saved.frames.length,30);assert.equal(saved.frameIndex,29);assert.equal(saved.points.length,30);assert.ok(saved.frames.every(frame=>frame.imageUrl===''));assert.equal(saved.imageUrl,'');assert.ok(!json.includes('data:image/'));assert.ok(json.length<sourceChunks.join('').length+15000);assert.deepEqual(decodeCGPictureSourceChunks(saved.nativeInfo.sourceChunks),source);
  const project=exportCGPicturePlotSequence(input),restored=parseCGPicturePlotSequence(JSON.parse(JSON.stringify(project)));assert.equal(restored.frames.length,30);assert.equal(restored.points.length,30);assert.deepEqual(restored.nativeInfo.sourceChunks,sourceChunks);
});
test('native frame count comes from source bytes and corrupt headers remain recoverable data',async()=>{
  const source=await encodeCGPictureG3B({frames:Array.from({length:3},()=>({pixels:new Uint8Array(384*192*2)}))}),chunks=encodeCGPictureSourceChunks(source),state=sanitizeCGPicturePlotState({nativeInfo:{format:'g3b',variant:'CP0001-RGB565',frameCount:1,sourceChunks:chunks}});assert.equal(state.frames.length,3);
  source[0]=0;const broken=sanitizeCGPicturePlotState({nativeInfo:{format:'g3b',variant:'CP0001-RGB565',frameCount:3,sourceChunks:encodeCGPictureSourceChunks(source)}});assert.equal(broken.frames.length,3);assert.equal(broken.nativeInfo.invalidHeader,true);assert.deepEqual(decodeCGPictureSourceChunks(broken.nativeInfo.sourceChunks),source);
});
