import test from 'node:test';
import assert from 'node:assert/strict';
import {physicalLayout} from '../src/keyboard/cw.js';
import {getModel} from '../src/models/registry.js';
import {calculatorHTML} from '../src/ui/calculator.js';
import {cwHomeHTML} from '../src/ui/cw-home.js';

test('first-generation CN CW follows official two six-key science rows',()=>{
  assert.deepEqual(physicalLayout.scienceRows.map(row=>row.map(key=>key[0])),[['x','□/□','√','xⁿ','x²','logₐ'],['(−)','sin','cos','tan','(',')']]);
  assert.equal(Object.keys(physicalLayout.controlKeys).length,16);
  assert.deepEqual(physicalLayout.digitRows.at(-1).map(key=>key[0]),['0','.','×10ˣ','格式','EXE']);
  assert.equal(physicalLayout.digitRows.at(-1)[3][3],'Ans');
});
test('CW has native SHIFT placements and independent page keys',()=>{
  const keys=physicalLayout.scienceRows.flat().concat(physicalLayout.digitRows.flat());
  for(const [label,shift]of [['√','root'],['xⁿ','^(-1)'],['x²','cw-log'],['logₐ','ln('],['4','A'],['5','B'],['6','C'],['0','x']])assert.equal(keys.find(k=>k[0]===label)[3],shift);
  assert.equal(physicalLayout.controlKeys.pageUp[1],'page-up');assert.equal(physicalLayout.controlKeys.pageDown[1],'page-down');
});
test('CW renderer uses actual 48 keys without a separate Ans or added control row',()=>{
  const html=calculatorHTML(getModel('cncw'));
  assert.equal((html.match(/class="key"/g)||[]).length,48);
  assert.ok(html.includes('cw-page-keys'));assert.ok(!html.includes('class="nav"'));
  assert.ok(!html.includes('data-action="Ans"'));assert.ok(html.includes('data-shift="Ans"'));
  assert.match(html,/fraction-key-symbol/);assert.match(html,/data-shift="mixed-input"/);
  assert.equal(getModel('cncw').solveLocation,'equation');assert.equal(getModel('cnx').solveLocation,'calc');
});
test('CW HOME shows six original application positions per page',()=>{
  const html=cwHomeHTML(getModel('cncw').modes,0);
  assert.equal((html.match(/data-mode=/g)||[]).length,10);
  assert.equal((html.match(/ hidden/g)||[]).length,4);
  assert.ok(html.indexOf('函数表格')<html.indexOf('方程'));
  assert.ok(!html.includes('分布'));assert.ok(!html.includes('数据表格'));
});
