import test from 'node:test';
import assert from 'node:assert/strict';
import {ModelCalculator} from '../src/engine/model-calculator.js';
import {rangeAddresses,sheetInputBytes} from '../src/engine/spreadsheet.js';

const sheet=id=>new ModelCalculator(id).createSpreadsheet();
const allAddresses=rangeAddresses('A1:E45');

test('EX holds 170 constants and rejects the 171st transactionally',()=>{
  const s=sheet('ex');
  for(const address of allAddresses.slice(0,170))s.set(address,'1');
  assert.equal(s.usedBytes(),1700);
  const previous={...s.cells},values=structuredClone(s.values);
  assert.throws(()=>s.set(allAddresses[170],'1'),/内存/);
  assert.deepEqual(s.cells,previous);assert.deepEqual(s.values,values);
});

test('EX counts formula input plus 11 bytes and retains ten-byte constants',()=>{
  const s=sheet('ex');s.set('A1','1');s.set('A2','=A1+1');
  assert.equal(s.usedBytes(),10+11+sheetInputBytes('=A1+1'));
  s.set('A2','3');assert.equal(s.usedBytes(),20);
  s.set('A1','');assert.equal(s.usedBytes(),10);
});

test('EX checks constant input at 10 token bytes and formula input at 49',()=>{
  const s=sheet('ex'),constant='1+1+1+1+10',formula='=10'+'+0'.repeat(23);
  assert.equal(sheetInputBytes(constant),10);assert.equal(sheetInputBytes(formula),49);
  s.set('A1',constant);assert.equal(s.value('A1'),14);
  assert.throws(()=>s.set('A1',constant+'0'),/10 字节/);assert.equal(s.value('A1'),14);
  s.set('B1',formula);assert.equal(s.value('B1'),10);assert.equal(s.usedBytes(),70);
  assert.throws(()=>s.set('B1',formula+'0'),/49 字节/);assert.equal(s.source('B1'),formula);
  // This remains the documented approximation, rather than a firmware encoder.
  assert.equal(sheetInputBytes('sin(30)'),4);
  s.set('C1','sin(30)');assert.ok(Math.abs(s.value('C1')-.5)<1e-10);
});

test('EX copies rounded constants without treating their stored decimal text as fresh input',()=>{
  const s=sheet('ex');s.set('A1','1/3');assert.ok(s.source('A1').length>10);
  s.copy('A1','B1');assert.equal(s.value('B1'),.3333333333);
  s.copy('B1','C1',true);assert.equal(s.source('B1'),'');assert.equal(s.value('C1'),.3333333333);
  assert.equal(s.usedBytes(),20);
});

test('EX copy rejects an expanded formula before changing source or destination',()=>{
  const s=sheet('ex'),formula='=A9'+'+0'.repeat(23);
  s.set('B1',formula);s.set('B2','7');const previous={...s.cells},values=structuredClone(s.values);
  assert.throws(()=>s.copy('B1','B2'),/49 字节/);
  assert.deepEqual(s.cells,previous);assert.deepEqual(s.values,values);
  // A cut preserves references, so it does not introduce the extra digit.
  s.copy('B1','B2',true);assert.equal(s.source('B2'),formula);assert.equal(s.source('B1'),'');
});

test('EX copy and fill capacity failures preserve cells and cached values',()=>{
  const s=sheet('ex');
  for(const address of allAddresses.slice(0,170))s.set(address,'1');
  const previous={...s.cells},values=structuredClone(s.values);
  assert.throws(()=>s.copy('A1',allAddresses[170]),/内存/);
  assert.deepEqual(s.cells,previous);assert.deepEqual(s.values,values);
  assert.throws(()=>s.fill('A1:E45','1',false),/内存/);
  assert.deepEqual(s.cells,previous);assert.deepEqual(s.values,values);
});

test('EX fill validates every shifted formula and constant input transactionally',()=>{
  const s=sheet('ex');s.set('B1','7');s.set('B2','8');s.set('A10','1');
  const previous={...s.cells},values=structuredClone(s.values);
  assert.throws(()=>s.fill('B1:B2','=A9'+'+0'.repeat(23)),/49 字节/);
  assert.deepEqual(s.cells,previous);assert.deepEqual(s.values,values);
  assert.throws(()=>s.fill('B1:B2','A9+1+1+1+1',false),/10 字节/);
  assert.deepEqual(s.cells,previous);assert.deepEqual(s.values,values);
  assert.throws(()=>s.fill('B1:B2','1/(A9-1)',false));
  assert.deepEqual(s.cells,previous);assert.deepEqual(s.values,values);
});

test('999 retains its 14-byte constants, 15-byte formula overhead and 49-byte inputs',()=>{
  const s=sheet('cn999cw'),constant='1+1+1+1+10';
  s.set('A1',constant+'0');assert.equal(s.value('A1'),104);
  s.set('A2','=A1+1');assert.equal(s.usedBytes(),14+15+sheetInputBytes('=A1+1'));
  s.clear();for(const address of allAddresses.slice(0,121))s.set(address,'1');
  assert.equal(s.usedBytes(),1694);assert.throws(()=>s.set(allAddresses[121],'1'),/内存/);
  assert.equal(Object.keys(s.cells).length,121);
});
