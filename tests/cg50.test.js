import test from 'node:test';
import assert from 'node:assert/strict';
import {cg50} from '../src/models/cg50.js';
import {ModelCalculator} from '../src/engine/model-calculator.js';
import {shortcutAction} from '../src/keyboard/mapping.js';
import {sanitizeProfile,AppStore} from '../src/state/store.js';
import {graphValue} from '../src/engine/graph.js';

test('CG50 has native function keys with SHIFT graph commands',()=>{
  const keys=cg50.keyboard.functionKeys;
  assert.deepEqual(keys.map(k=>k[0]),['F1','F2','F3','F4','F5','F6']);
  assert.deepEqual(keys.map(k=>k[2]),['Trace','Zoom','V-Window','Sketch','G-Solv','G↔T']);
  for(let i=1;i<=6;i++)assert.equal(shortcutAction(cg50,{key:'F'+i}),'cg-f'+i);
  assert.equal(shortcutAction(cg50,{key:'F3',shiftKey:true}),'graph-window');
  assert.equal(shortcutAction(cg50,{key:'F6',shiftKey:true}),'graph-toggle');
});
test('CG50 preserves the 4x2 left control block and native 6/5-column lower rows',()=>{
  assert.deepEqual(cg50.keyboard.controlRows.map(row=>row.map(key=>key[0])),[['SHIFT','OPTN','VARS','MENU'],['ALPHA','x²','^','EXIT']]);
  assert.equal(cg50.keyboard.science.length,12);assert.equal(cg50.keyboard.digits.length,20);
  assert.deepEqual(cg50.keyboard.digits.slice(-5).map(k=>k[0]),['0','.','×10ˣ','(−)','EXE']);
  assert.equal(cg50.keyboard.digits.find(k=>k[0]==='(−)')[3],'Ans');
});
test('CG50 native applications route to configured modes while parity stays experimental',()=>{
  assert.equal(cg50.status,'experimental');assert.equal(cg50.nativeMenu.length,19);
  assert.deepEqual(cg50.nativeMenu.slice(0,12).map(row=>row[1]),[...'123456789ABC']);
  assert.ok(cg50.nativeMenu.every(row=>row[3]&&cg50.modes.some(mode=>mode[3]===row[3])));
  for(const id of ['stat','spreadsheet','dynamic','recursion','conic','program','financial','geometry','pictureplot','graph3d'])assert.ok(cg50.nativeMenu.some(row=>row[3]===id));
});

test('CG50 equations support six unknowns and fifth/sixth degree without changing older policies',()=>{
  const calc=new ModelCalculator('cg50');
  for(const degree of [5,6]){const coefficients=[1,...Array(degree-1).fill(0),-1],roots=calc.solvePolynomial(coefficients);assert.equal(roots.length,degree);}
  const rows=Array.from({length:6},(_,i)=>[...Array.from({length:6},(_,j)=>i===j?1:0),i+1]);assert.deepEqual(calc.solveLinearSystem(rows),[1,2,3,4,5,6]);
  assert.throws(()=>new ModelCalculator('cnx').solvePolynomial([1,0,0,0,0,-1]));
});
test('CG50 has 28 variables and graphs use X without modifying the saved value',()=>{
  assert.equal(cg50.variables.length,28);
  const calc=new ModelCalculator('cg50');calc.assign('x',17);calc.assign('Ans',23);
  assert.equal(graphValue(calc,'x^2',3),9);assert.equal(calc.vars.x,17);assert.equal(calc.vars.Ans,23);
  assert.throws(()=>calc.define('f','x+1'));
});
test('CG50 profile restores all 20 slots, selection, disabled curves and axis scales',()=>{
  const saved=sanitizeProfile({mode:'graph',graph:{expressions:Array.from({length:20},(_,i)=>'x+'+i),enabled:Array(20).fill(false),selected:19,xscale:2,yscale:0}},'cg50');
  assert.equal(saved.mode,'graph');assert.equal(saved.graph.expressions[19],'x+19');assert.equal(saved.graph.selected,19);assert.equal(saved.graph.enabled[19],false);assert.equal(saved.graph.xscale,2);assert.equal(saved.graph.yscale,0);
});
test('switching graph and scientific profiles does not share graph definitions',()=>{
  const memory=new Map(),storage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)};
  const store=new AppStore(storage),cg=new ModelCalculator('cg50'),ti=new ModelCalculator('ti36xpro');
  store.saveProfile('cg50',cg,{graph:{expressions:['x^2']},mode:'graph'});store.select('ti36xpro');store.saveProfile('ti36xpro',ti,{mode:'calc'});
  const restored=new AppStore(storage);assert.equal(restored.profile('cg50').graph.expressions[0],'x^2');assert.equal(restored.profile('ti36xpro').graph.expressions[0],'');
});
