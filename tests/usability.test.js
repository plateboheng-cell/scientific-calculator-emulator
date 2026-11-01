import test from 'node:test';
import assert from 'node:assert/strict';
import {ModelCalculator} from '../src/engine/model-calculator.js';
import {getModel} from '../src/models/registry.js';
import {constantsFor,cwConstantGroups} from '../src/engine/model-constants.js';
import {tiNumber,tiDisplay} from '../src/engine/ti-display.js';
import {math} from '../src/engine/calculator.js';
import {sanitizeProfile,createSession} from '../src/state/store.js';

for(const id of ['cnx','cncw','cn999cw','ti36xpro','cg50'])test(`${id} shares the corrected SOLVE, arithmetic and angle engine`,()=>{
  const calc=new ModelCalculator(id);
  assert.equal(calc.evaluate('2+3*4'),14);
  calc.angle='Deg';assert.ok(Math.abs(calc.evaluate('sin(30)')-.5)<1e-12);
  assert.ok(Math.abs(calc.solve('1e-24*(x-1)=0',0)-1)<1e-12);
  assert.throws(()=>calc.solve('1e-24*(x^2+1)=0',0));
});
test('CW catalog has all 47 manual entries in the six prescribed categories',()=>{
  for(const id of ['cncw','cn999cw']){
    const entries=constantsFor(getModel(id));assert.equal(entries.length,47);
    const symbols=cwConstantGroups.flatMap(([,symbols])=>symbols);
    assert.equal(new Set(symbols).size,47);assert.deepEqual(new Set(symbols),new Set(entries.map(row=>row[0])));
    assert.ok(entries.every(row=>Number.isFinite(row[2])));
    assert.equal(entries.find(row=>row[0]==='h')[2],6.62607015e-34);
    assert.equal(entries.find(row=>row[0]==='G')[2],6.67430e-11);
  }
  assert.equal(constantsFor(getModel('cnx')).find(row=>row[0]==='h')[2],6.62606957e-34);
  assert.deepEqual(constantsFor(getModel('cg50')),[]);
});
test('TI catalog preserves its 20 constants and finite guidebook precision',()=>{
  const entries=constantsFor(getModel('ti36xpro'));assert.equal(entries.length,20);
  assert.equal(entries.find(row=>row[0]==='R')[2],8.314462618);
  assert.equal(entries.find(row=>row[0]==='Cc')[2],8.987551792261e9);
});
test('TI independent notation and decimals format engineering carry, zero and polar results',()=>{
  assert.equal(tiNumber(123456.78,{notation:'Eng',decimals:2}),'123.46e+3');
  assert.equal(tiNumber(999999.9,{notation:'Eng',decimals:2}),'1.00e+6');
  assert.equal(tiNumber(.0001234,{notation:'Eng',decimals:3}),'123.400e-6');
  assert.equal(tiNumber(-0,{notation:'Eng',decimals:2}),'0.00e+0');
  assert.equal(tiNumber(1234,{notation:'Sci',decimals:2}),'1.23e+3');
  assert.equal(tiDisplay(math.complex(0,2),{notation:'Norm',decimals:2,result:'polar'},Math.PI/180),'2.00∠90.00');
});
test('TI MODE and graph styles/zoom persist and reject corrupt settings',()=>{
  const ti=sanitizeProfile({tiSettings:{notation:'Eng',decimals:2,result:'polar',input:'classic',base:16}},'ti36xpro');
  assert.equal(createSession(ti,'en','ti36xpro').base,16);assert.equal(ti.tiSettings.input,'classic');
  const bad=sanitizeProfile({tiSettings:{notation:'NaN',decimals:11,base:3},graph:{styles:['Broken','bad'],zoomX:4,zoomY:-1}},'cg50');
  assert.equal(bad.tiSettings.notation,'Norm');assert.equal(bad.tiSettings.decimals,null);assert.equal(bad.tiSettings.base,10);
  assert.deepEqual(bad.graph.styles.slice(0,2),['Broken','Normal']);assert.equal(bad.graph.zoomX,4);assert.equal(bad.graph.zoomY,2);
});

test('TI profiles from 0.7 retain their complex mode and fixed/scientific preferences',()=>{
  const legacy=sanitizeProfile({mode:'complex',format:'Fix',digits:3},'ti36xpro');
  assert.equal(createSession(legacy,'zh','ti36xpro').mode,'complex');
  assert.equal(legacy.tiSettings.decimals,3);assert.equal(legacy.tiSettings.result,'rect');
  const scientific=sanitizeProfile({format:'Sci',digits:6},'ti36xpro');
  assert.equal(tiNumber(123.456,scientific.tiSettings),'1.23456e+2');
});
