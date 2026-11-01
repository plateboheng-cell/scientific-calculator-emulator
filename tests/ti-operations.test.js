import test from 'node:test';
import assert from 'node:assert/strict';
import {ModelCalculator} from '../src/engine/model-calculator.js';
import {sanitizeTiExtensionSettings,validateStoredOperation,runStoredOperation,tiConversions,tiConversionGroups,convertTi,tiMixedNumberExpression} from '../src/engine/ti-operations.js';
import {physicalLayout} from '../src/keyboard/ti36xpro.js';
import {createTiExtensions} from '../src/ui/ti-extensions.js';

test('TI stored operation follows official ×2+3 and square examples and preserves Ans provenance',()=>{
  const calc=new ModelCalculator('ti36xpro'),op=validateStoredOperation(calc,'×2+3');
  const first=runStoredOperation(calc,op,'4');assert.equal(first.value,11);assert.equal(first.count,1);
  calc.assign('Ans',first.value);const second=runStoredOperation(calc,op,'Ans',{count:first.count});assert.equal(second.value,25);assert.equal(second.count,2);
  assert.equal(runStoredOperation(calc,op,'6').value,15);
  assert.equal(runStoredOperation(calc,'^2','5').value,25);assert.equal(runStoredOperation(calc,'^2','20').value,400);
  assert.equal(runStoredOperation(calc,'^2','-5').value,25);
  calc.assign('Ans',1/3,true);assert.equal(runStoredOperation(calc,'*3').approximate,true);
  calc.assign('a',4);assert.equal(runStoredOperation(calc,'+a','2').value,6);
});
test('TI stored operations reject missing/overlong operations and executable syntax',()=>{
  const calc=new ModelCalculator('ti36xpro');
  assert.equal(validateStoredOperation(calc,''),'');
  assert.throws(()=>runStoredOperation(calc,''),/OP NOT DEFINED/);
  for(const op of ['+'+'1'.repeat(44),'+import("x")','+a=3','+1;2','/'])assert.throws(()=>validateStoredOperation(calc,op),op);
  assert.throws(()=>runStoredOperation(calc,'/0','2'));
});
test('TI contrast and operation sanitize isolated persisted settings',()=>{
  assert.deepEqual(sanitizeTiExtensionSettings({operation:'*2+3',contrast:8}),{operation:'*2+3',contrast:8});
  assert.deepEqual(sanitizeTiExtensionSettings({operation:5,contrast:11}),{operation:'',contrast:5});
  assert.deepEqual(sanitizeTiExtensionSettings({operation:'1'.repeat(45),contrast:-1}),{operation:'',contrast:5});
});
test('TI exposes its five groups and all 40 documented conversion directions',()=>{
  assert.equal(tiConversionGroups.length,5);assert.equal(tiConversions.length,40);
  const conversion=label=>tiConversions.findIndex(c=>c.label===label);
  assert.equal(convertTi(1,conversion('ft → m')),.3048);
  assert.ok(Math.abs(convertTi(32,conversion('°F → °C')))<1e-12);
  assert.equal(convertTi(0,conversion('°C → K')),273.15);
  assert.ok(Math.abs(convertTi(60,conversion('km/h → m/s'))-50/3)<1e-12);
  assert.ok(Math.abs(convertTi(3600000,conversion('J → kWh'))-1)<1e-12);
  assert.equal(convertTi(1,conversion('Å → m')),1e-10);
  for(let i=0;i<40;i+=2){const x=convertTi(12.345,i),y=convertTi(x,i+1);assert.ok(Math.abs(y-12.345)<1e-10);}
  assert.throws(()=>convertTi(Infinity,0));assert.throws(()=>convertTi(1,40));
});
test('TI 2nd 7 is the mixed-number template, not bracket entry',()=>{
  const keys=physicalLayout.rows.flat();assert.equal(keys.find(key=>key[0]==='7')[3],'ti-mixed-entry');
  assert.ok(keys.every(key=>!key.includes('unimplemented:bracket entry')));
  const calc=new ModelCalculator('ti36xpro');assert.equal(calc.evaluate(tiMixedNumberExpression(-2,1,4)),-2.25);
  assert.equal(calc.evaluate(tiMixedNumberExpression('-0',1,4)),-.25);
  for(const values of [[1.5,1,2],[1,-1,2],[1,2,0],[1,2,-1],[1,2.5,4]])assert.throws(()=>tiMixedNumberExpression(...values));
});
test('TI workflows save an operation, execute it, convert a result, reset, and visibly adjust contrast',()=>{
  const calculator=new ModelCalculator('ti36xpro'),screen={style:{},dataset:{}},state={tiSettings:{},language:'en',mode:'calc',expr:'4',history:[]};
  let menu,editor,display,reset=false,saves=0,inserted='';
  const extension=createTiExtensions({state,calculator,host:()=>screen,
    item:(label,run)=>({label,run}),field:(name,label,value,extras)=>({name,label,value,...extras}),
    list:(title,items)=>{menu={title,items};},form:(title,fields,submit)=>{editor={title,fields,submit};},
    result:(title,rows)=>{display={title,rows};},showCalc:()=>{},persist:()=>{saves++;},insert:text=>{inserted+=text;},
    setAnswer:(value,approximate)=>{calculator.assign('Ans',value,approximate);state.answer=value;state.hasAnswer=true;},resetProfile:()=>{reset=true;},
  });
  assert.equal(extension.handleAction('ti-setop'),true);editor.submit({operation:'*2+3'});assert.equal(state.tiSettings.operation,'*2+3');
  extension.handleAction('ti-op');assert.equal(state.answer,11);extension.handleAction('shift');extension.handleAction('ti-op');assert.equal(state.answer,25);
  extension.handleAction('ti-conversions');assert.equal(menu.title,'CONVERSIONS');menu.items[1].run();menu.items[0].run();editor.submit({value:'32'});assert.ok(Math.abs(display.rows[0][1])<1e-12);
  extension.handleAction('ti-contrast-dark');assert.equal(screen.dataset.tiContrast,'6');assert.match(screen.style.filter,/contrast\(/);
  for(let i=0;i<20;i++)extension.handleAction('ti-contrast-light');assert.equal(state.tiSettings.contrast,0);
  extension.handleAction('ti-mixed-entry');assert.equal(inserted,'mixed-input');state.tiSettings.input='classic';extension.handleAction('ti-mixed-entry');editor.submit({whole:'-2',numerator:'1',denominator:'4'});assert.match(inserted,/-\(2\+1\/4\)/);
  extension.handleAction('ti-reset');assert.equal(reset,false);menu.items[1].run();assert.equal(reset,true);assert.ok(saves>=3);
  assert.equal(extension.handleAction('unknown-action'),false);
});
