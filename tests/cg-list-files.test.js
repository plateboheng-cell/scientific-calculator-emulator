import test from 'node:test';
import assert from 'node:assert/strict';
import {CG_LIST_FILES,CG_STATISTICS_MEMORY_BYTES,sanitizeCGListFile,sanitizeCGStatistics,switchCGListFile,cgStatisticsMemoryBytes,assertCGStatisticsMemory,cgDataRows} from '../src/engine/cg-statistics.js';
const count=data=>data.lists.reduce((sum,list)=>sum+list.length,0)+data.listFiles.reduce((sum,file)=>sum+(file?file.lists.reduce((n,list)=>n+list.length,0):0),0);
test('legacy statistics become active File 1 without duplicated snapshots',()=>{
  const input={lists:[[1,2,3],[2,4,6]],names:['X','Y'],selectedList:1,selectedRow:2},data=sanitizeCGStatistics(input);assert.equal(CG_LIST_FILES,6);assert.equal(data.listFile,0);assert.equal(data.listFiles.length,6);assert.ok(data.listFiles.every(file=>file===null));assert.deepEqual(data.lists[0],[1,2,3]);assert.equal(data.names[1],'Y');assert.equal(data.selectedList,1);assert.equal(data.selectedRow,2);data.lists[0][0]=99;assert.equal(input.lists[0][0],1);
});
test('each of six files keeps its own numerical lists, names, colors and cursor',()=>{
  let data=sanitizeCGStatistics({});for(let file=0;file<6;file++){data=switchCGListFile(data,file);data.lists[0]=[file+1,(file+1)*10];data.names[0]='FILE'+(file+1);data.colors[0]=['#110000','#220000','#330000','#440000','#550000','#660000'][file];data.selectedList=file;data.selectedRow=file+3;}
  for(let repeat=0;repeat<3;repeat++)for(let file=0;file<6;file++){data=switchCGListFile(data,file);assert.deepEqual(data.lists[0],[file+1,(file+1)*10]);assert.equal(data.names[0],'FILE'+(file+1));assert.equal(data.colors[0],['#110000','#220000','#330000','#440000','#550000','#660000'][file]);assert.equal(data.selectedList,file);assert.equal(data.selectedRow,file+3);assert.equal(data.listFiles[file],null);assert.equal(count(data),12);}
});
test('file switching snapshots mutations immutably and restores the active API after JSON reload',()=>{
  const source=sanitizeCGStatistics({lists:[[1,2],[4,5]],names:['FIRST']});const next=switchCGListFile(source,5);assert.equal(next.listFile,5);assert.deepEqual(next.lists[0],[]);assert.deepEqual(source.lists[0],[1,2]);next.listFiles[0].lists[0][0]=8;assert.equal(source.lists[0][0],1);
  next.lists[0]=[9,10];next.lists[1]=[11,12];next.names[0]='SIXTH';const restored=sanitizeCGStatistics(JSON.parse(JSON.stringify(next)));assert.equal(restored.listFile,5);assert.equal(restored.listFiles[5],null);assert.deepEqual(cgDataRows(restored,true),[[9,11,1],[10,12,1]]);const first=switchCGListFile(restored,0);assert.deepEqual(first.lists[0],[8,2]);assert.equal(first.names[0],'FIRST');const sixth=switchCGListFile(first,5);assert.equal(sixth.names[0],'SIXTH');assert.deepEqual(sixth.lists[0],[9,10]);
});
test('materialized active snapshot imports recover while malformed file indices remain bounded',()=>{
  const snapshots=Array(6).fill(null);snapshots[3]={lists:[[3,4]],names:['THIRD']};let data=sanitizeCGStatistics({listFile:3,listFiles:snapshots});assert.deepEqual(data.lists[0],[3,4]);assert.equal(data.listFiles[3],null);data=sanitizeCGStatistics({listFile:99,listFiles:[null,{lists:[[1,NaN,Infinity,2]],names:['123456789']}]});assert.equal(data.listFile,0);assert.deepEqual(data.listFiles[1].lists[0],[1,2]);assert.equal(data.listFiles[1].names[0],'12345678');assert.throws(()=>switchCGListFile(data,-1));assert.throws(()=>switchCGListFile(data,6));assert.throws(()=>switchCGListFile(data,'2'));assert.doesNotThrow(()=>sanitizeCGStatistics(null));
});
test('storage estimate is invariant under neutral switching and gives explicit Memory Full',()=>{
  let data=sanitizeCGStatistics({lists:[[1,2,3],[4,5,6]],names:['ONE','TWO'],selectedList:1,selectedRow:2});const initial=cgStatisticsMemoryBytes(data);for(let file=0;file<6;file++){data=switchCGListFile(data,file);assert.equal(cgStatisticsMemoryBytes(data),initial);}
  assert.equal(assertCGStatisticsMemory(data,initial),initial);assert.throws(()=>assertCGStatisticsMemory(data,initial-1),error=>error.code==='MEMORY_FULL'&&error.requiredBytes===initial&&error.limitBytes===initial-1);assert.throws(()=>assertCGStatisticsMemory(data,0));
});
test('all 6×26×999 short entries fit the bounded schema without duplicating the active file',()=>{
  let data=sanitizeCGStatistics({});for(let file=0;file<6;file++){data=switchCGListFile(data,file);data.lists=Array.from({length:26},()=>Array.from({length:999},(_,i)=>i+1));data.names=Array.from({length:26},(_,i)=>'L'+(i+1));}
  data=sanitizeCGStatistics(data);assert.equal(count(data),6*26*999);assert.equal(data.listFiles.filter(Boolean).length,5);assert.ok(assertCGStatisticsMemory(data)<CG_STATISTICS_MEMORY_BYTES);const serialized=JSON.stringify(data);assert.equal(count(sanitizeCGStatistics(JSON.parse(serialized))),6*26*999);
});
test('oversized six-file numerical payloads fail the storage budget before a partial commit',()=>{
  let data=sanitizeCGStatistics({});for(let file=0;file<6;file++){data=switchCGListFile(data,file);data.lists=Array.from({length:26},()=>Array(999).fill(1.2345678901234567e99));}
  assert.throws(()=>assertCGStatisticsMemory(data),error=>error.code==='MEMORY_FULL');assert.equal(count(data),6*26*999);
});
