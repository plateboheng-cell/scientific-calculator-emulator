import test from 'node:test';
import assert from 'node:assert/strict';
import {ModelCalculator} from '../src/engine/model-calculator.js';
import {SHEET_CAPACITY,SHEET_EXTENDED_CAPACITY} from '../src/engine/spreadsheet.js';
import {encodeCWWorkbook,readCWWorkbook} from '../src/engine/cw-workbook.js';

const calculator=()=>new ModelCalculator('cn999cw');

test('999 sheet distinguishes column E from lowercase scientific notation in entry and copies',()=>{
  const sheet=calculator().createSpreadsheet();
  sheet.set('E10','7');sheet.set('E11','11');sheet.set('A1','=2E10+1e2');
  assert.equal(sheet.value('A1'),114);
  sheet.copy('A1','A2');
  assert.equal(sheet.source('A2'),'=2E11+1e2');
  assert.equal(sheet.value('A2'),122);
  const ex=new ModelCalculator('ex').createSpreadsheet();
  ex.set('A1','=2E10');assert.equal(ex.value('A1'),2e10);
});

test('999 sheet formulas and aggregates preserve decimal low digits across references',()=>{
  const sheet=calculator().createSpreadsheet();
  sheet.set('A1','=1e20+1');sheet.set('A2','=A1-1e20');sheet.set('B1','=Sum(A1:A2)-1e20');
  assert.equal(sheet.values.A1.exact,'100000000000000000001');
  assert.equal(sheet.value('A2'),1);
  assert.equal(sheet.value('B1'),2);
  sheet.set('E45','1.2345678905');
  assert.equal(sheet.source('E45'),'1.234567891');
});

test('999 extended capacity fills every cell and rejects a lossy return to handheld capacity',()=>{
  const sheet=calculator().createSpreadsheet();
  assert.equal(sheet.capacity,SHEET_CAPACITY);
  assert.throws(()=>sheet.fill('A1:E45','1',false),/内存/);
  assert.deepEqual(sheet.cells,{});
  sheet.setExtended(true);sheet.fill('A1:E45','1',false);
  assert.equal(sheet.capacity,SHEET_EXTENDED_CAPACITY);
  assert.equal(Object.keys(sheet.cells).length,225);
  assert.equal(sheet.value('E45'),1);
  assert.throws(()=>sheet.setExtended(false),/原机容量/);
  assert.equal(sheet.extended,true);
  sheet.clear();sheet.set('A1','='+Array(40).fill('1').join('+'));
  assert.throws(()=>sheet.setExtended(false),/49 字节/);
  assert.equal(sheet.value('A1'),40);
  sheet.clear();sheet.setExtended(false);
  assert.equal(sheet.capacity,SHEET_CAPACITY);
});

test('999 file round trips sources, error cells, selection and capacity and does not modify its origin',()=>{
  const calc=calculator(),sheet=calc.createSpreadsheet({extended:true});
  sheet.fill('A1:E45','7',false);sheet.set('B1','=A1+1');sheet.copy('B1','A1');
  sheet.selected='E45';
  const snapshot=encodeCWWorkbook(sheet);
  const restored=readCWWorkbook(calc,snapshot);
  assert.equal(restored.selected,'E45');
  assert.equal(restored.capacity,SHEET_EXTENDED_CAPACITY);
  assert.equal(restored.value('E45'),7);
  assert.equal(restored.source('A1'),'=?1+1');
  assert.ok(restored.values.A1.error);
  assert.equal(encodeCWWorkbook(restored),snapshot);
  const invalid=JSON.parse(snapshot);
  delete invalid.cells.E45;
  invalid.cells.A46='1';
  assert.throws(()=>readCWWorkbook(calc,JSON.stringify(invalid)),/范围/);
  assert.equal(encodeCWWorkbook(sheet),snapshot);
  delete invalid.cells.A46;
  invalid.cells.E45='7';
  invalid.capacity='handheld';
  assert.throws(()=>readCWWorkbook(calc,JSON.stringify(invalid)),/内存/);
  assert.equal(encodeCWWorkbook(sheet),snapshot);
});
