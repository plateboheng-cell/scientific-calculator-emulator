import test from 'node:test';
import assert from 'node:assert/strict';
import {AppStore,sanitizeProfile,sanitizeTiSettings} from '../src/state/store.js';
import {ModelCalculator} from '../src/engine/model-calculator.js';
const storage=()=>{const data=new Map();return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};};
test('TI operation and contrast persist without leaking to another model',()=>{
  const memory=storage(),store=new AppStore(memory);store.saveProfile('ti36xpro',new ModelCalculator('ti36xpro'),{tiSettings:{operation:'*2+1',contrast:8}});
  assert.equal(new AppStore(memory).profile('ti36xpro').tiSettings.operation,'*2+1');assert.equal(new AppStore(memory).profile('ti36xpro').tiSettings.contrast,8);assert.equal(store.profile('cnx').tiSettings.operation,'');assert.equal(sanitizeTiSettings({operation:'x'.repeat(200),contrast:99}).operation.length,44);assert.equal(sanitizeTiSettings({contrast:99}).contrast,5);
});
test('CG app memories survive save/reload and remain isolated across model profiles',()=>{
  const memory=storage(),store=new AppStore(memory),workspace={program:{programs:[{name:'P',source:'Print 2+3'}],selected:0},finance:{section:'tvm',values:{pv:'1000'}},statistics:{lists:[[1,2,3]]},activities:[{name:'Lesson',lines:[{type:'Formula',value:'2+3'}]}],spreadsheet:{cells:{Z999:'=2+3'},selected:'Z999'},strings:['hello']};
  store.saveProfile('cg50',new ModelCalculator('cg50'),{mode:'program',cgWorkspace:workspace});workspace.statistics.lists[0][0]=999;
  const saved=new AppStore(memory).profile('cg50');assert.equal(saved.mode,'program');assert.equal(saved.cgWorkspace.statistics.lists[0][0],1);assert.equal(saved.cgWorkspace.spreadsheet.cells.Z999,'=2+3');assert.equal(saved.cgWorkspace.program.programs[0].source,'Print 2+3');assert.equal(store.profile('ex').cgWorkspace,undefined);
});
test('mixed graph types, second expressions, memories and sketches survive profile sanitization',()=>{
  const graph={types:['polar','parametric','x','y>='],expressions:['2*cos(theta)','cos(T)','y^2','x'],expressions2:['','sin(T)'],parameter:{min:0,max:6.28,step:.1},memories:[{types:['x'],expressions:['y+1']}],sketches:[{kind:'line',x1:0,y1:0,x2:1,y2:1}]};
  const saved=sanitizeProfile({graph},'cg50');assert.deepEqual(saved.graph.types.slice(0,4),graph.types);assert.equal(saved.graph.expressions2[1],'sin(T)');assert.equal(saved.graph.memories[0].types[0],'x');assert.equal(saved.graph.sketches[0].x2,1);assert.equal(saved.graph.parameter.step,.1);
});
test('oversized workspace save is rejected rather than silently deleting a stored record',()=>{
  const store=new AppStore(storage()),calculator=new ModelCalculator('cg50');assert.equal(store.saveProfile('cg50',calculator,{mode:'calc',cgWorkspace:{strings:['safe']}}),true);
  assert.equal(store.saveProfile('cg50',calculator,{mode:'calc',cgWorkspace:{strings:['x'.repeat(1500001)]}}),false);assert.match(store.warning,/exceeds/);assert.equal(store.data.profiles.cg50.cgWorkspace.strings[0],'safe');
});
