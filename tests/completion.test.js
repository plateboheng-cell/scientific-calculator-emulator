import test from 'node:test';
import assert from 'node:assert/strict';
import {completionMatches,completionCatalog,readMathPrefix} from '../src/input/completion-catalog.js';
import {getModel} from '../src/models/registry.js';
import {latexToExpression} from '../src/engine/notation.js';
import {ModelCalculator} from '../src/engine/model-calculator.js';

const context=(id='cncw',mode='calc',definitions={})=>({model:getModel(id),mode,definitions});
test('completion filters and orders mathematical function prefixes',()=>{
  assert.deepEqual(completionMatches('sq',context()).map(x=>x.name),['sqrt']);
  assert.deepEqual(completionMatches('si',context()).map(x=>x.name),['sin','sinh']);
  assert.equal(completionMatches('s',context()).length,0);
  assert.ok(completionMatches('',context(),{explicit:true}).length>20);
  assert.deepEqual(completionMatches('NOT_A_FUNCTION',context()),[]);
});
test('completion is constrained by model variables and registered functions',()=>{
  assert.ok(completionCatalog(context('cnx')).some(x=>x.name==='M'));
  assert.ok(!completionCatalog(context()).some(x=>x.name==='M'));
  assert.ok(!completionCatalog(context('ti36xpro','calc',{f:'x',g:'x'})).some(x=>x.name==='g'));
  assert.ok(completionCatalog(context('cncw','calc',{f:'x'})).some(x=>x.name==='f'));
  assert.ok(!completionCatalog(context('cncw')).some(x=>x.name==='f'));
});
test('completion omits unsupported modes and graph function aliases',()=>{
  assert.deepEqual(completionCatalog(context('cncw','base')),[]);
  assert.equal(completionMatches('de',context()).length,0);
  assert.equal(completionMatches('de',context('cncw','matrix'))[0].name,'det');
  assert.ok(!completionCatalog(context('cg50','graph',{f:'x'})).some(x=>['f','g','integral','diff','Ran','sum'].includes(x.name)));
  assert.equal(completionMatches('ma',context('ti36xpro','matrix')).length,3);
  assert.equal(completionMatches('ma',context('cncw','matrix')).length,4);
});
test('every suggested template is accepted by the actual notation parser',()=>{
  for(const [id,mode]of [['cncw','calc'],['cncw','complex'],['cncw','matrix'],['cncw','vector'],['ti36xpro','vector'],['cg50','graph']]){
    const model=getModel(id),aliases=Object.fromEntries(Object.entries(model.vectorLabels||{}).map(([name,label])=>[label,name]));
    const calculator=new ModelCalculator(id);
    for(const entry of completionCatalog(context(id,mode))){const latex=entry.latex.replaceAll('#?','2');assert.doesNotThrow(()=>calculator.compile(latexToExpression(latex,{mode,aliases})),id+' '+mode+' '+entry.name+' '+latex);}
  }
});
test('prefix detection uses atom offsets and stops at structural boundaries',()=>{
  const make=(atoms,position=atoms.length)=>({position,selection:{ranges:[[position,position]]},getValue:(start)=>atoms[start]});
  assert.deepEqual(readMathPrefix(make(['x','+','s','q'])),{text:'sq',start:2,end:4});
  assert.deepEqual(readMathPrefix(make(['','s','q','','2',''],3)),{text:'sq',start:1,end:3});
  assert.deepEqual(readMathPrefix(make(['\\sin','(','x',')'])),{text:'',start:4,end:4});
  assert.equal(readMathPrefix({...make(['s','q']),selection:{ranges:[[0,2]]}}),null);
});
test('scalar suggestions never turn into a matrix or vector with the same letter',()=>{
  for(const mode of ['matrix','vector'])for(const id of ['cnx','cncw','ti36xpro']){
    const candidates=completionCatalog(context(id,mode));
    assert.ok(!candidates.some(entry=>entry.name==='abs'));
    for(const entry of candidates.filter(entry=>entry.en==='Stored variable'))assert.equal(latexToExpression(entry.latex,{mode}),entry.name);
  }
});
