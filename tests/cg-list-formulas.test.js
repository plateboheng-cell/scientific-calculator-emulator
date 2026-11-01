import test from 'node:test';
import assert from 'node:assert/strict';
import {ModelCalculator} from '../src/engine/model-calculator.js';
import {readOnlyCalculator} from '../src/engine/read-only-calculator.js';
import {sanitizeCGStatistics,switchCGListFile} from '../src/engine/cg-statistics.js';
import {evaluateCGListFormula,applyCGListFormula,CG_LIST_FORMULA_UNVERIFIED} from '../src/engine/cg-list-formulas.js';

const calculator=()=>new ModelCalculator('cg50',{angle:'Rad'});
const lists=(values,names=[])=>sanitizeCGStatistics({lists:values,names});

test('official 3-2/3-3 column-header List1+List2 produces 9,11,13 once and stores no formula or automatic dependency',()=>{
  const calc=calculator(),original=lists([[3,4,5],[6,7,8]]),before=structuredClone(original);
  const result=applyCGListFormula({calculator:calc,statistics:original,source:'List 1 + List 2',target:3});
  assert.deepEqual(result.values,[9,11,13]);assert.deepEqual(result.statistics.lists[2],[9,11,13]);assert.deepEqual(original,before);
  assert.deepEqual(result.references,[{list:1,subName:''},{list:2,subName:''}]);
  result.statistics.lists[0][0]=100;assert.deepEqual(result.statistics.lists[2],[9,11,13]);
  assert(!Object.keys(result.statistics).some(key=>/formula|depend|recalc/i.test(key)));
});

test('all26 native list numbers and 3-14 quoted subnames address the selected file including indexed elements',()=>{
  const calc=calculator(),data=lists([[1,2]],['QTY']);data.lists[25]=[41,65,22];data.names[25]='YEAR';
  assert.deepEqual(evaluateCGListFormula({calculator:calc,statistics:data,source:'List26+1'}).values,[42,66,23]);
  const named=evaluateCGListFormula({calculator:calc,statistics:data,source:'List "QTY" * List"YEAR"[3]'});
  assert.deepEqual(named.values,[22,44]);assert.deepEqual(named.references,[{list:1,subName:'QTY'},{list:26,subName:'YEAR'}]);
  assert.deepEqual(evaluateCGListFormula({calculator:calc,statistics:data,source:'List("QTY")+List(26,1)'}).values,[42,43]);
  assert.throws(()=>evaluateCGListFormula({calculator:calc,statistics:data,source:'List27+1'}),/1–26/);
  assert.throws(()=>evaluateCGListFormula({calculator:calc,statistics:data,source:'List"MISSING"+1'}),/not found/);
});

test('native arithmetic is corresponding-element multiplication/division/power and scalar broadcasting, never a dot product',()=>{
  const calc=calculator(),data=lists([[2,3],[5,7]]);
  assert.deepEqual(evaluateCGListFormula({calculator:calc,statistics:data,source:'List1*List2'}).values,[10,21]);
  assert.deepEqual(evaluateCGListFormula({calculator:calc,statistics:data,source:'10/List1'}).values,[5,10/3]);
  assert.deepEqual(evaluateCGListFormula({calculator:calc,statistics:data,source:'List1^2-1'}).values,[3,8]);
  assert.deepEqual(evaluateCGListFormula({calculator:calc,statistics:data,source:'-List1+2*List2'}).values,[8,11]);
});

test('a self target uses its previous snapshot and later source edits never recalculate its result',()=>{
  const calc=calculator(),data=lists([[1,2,3]]);
  const result=applyCGListFormula({calculator:calc,statistics:data,source:'List1*2+1',target:1});
  assert.deepEqual(result.statistics.lists[0],[3,5,7]);assert.deepEqual(data.lists[0],[1,2,3]);
  assert.deepEqual(result.values,[3,5,7]);result.values[0]=999;assert.equal(result.statistics.lists[0][0],3);
});

test('all six files evaluate and write independently without changing the caller active file or other banks',()=>{
  const calc=calculator();let data=lists([[1,2]]);
  for(let file=1;file<6;file++){data=switchCGListFile(data,file);data.lists[0]=[file*10,file*10+1];data.names[0]='QTY';}
  data=switchCGListFile(data,0);const original=structuredClone(data);
  for(let file=0;file<6;file++){
    const expected=file?[file*10+1,file*10+2]:[2,3];
    const result=applyCGListFormula({calculator:calc,statistics:data,source:'List1+1',target:26,listFile:file});
    assert.equal(result.statistics.listFile,0);assert.deepEqual(switchCGListFile(result.statistics,file).lists[25],expected);
    for(let other=0;other<6;other++)if(other!==file)assert.deepEqual(switchCGListFile(result.statistics,other).lists,switchCGListFile(data,other).lists);
  }
  assert.deepEqual(data,original);
});

test('3-13 and3-17 science functions and native ΔList use list values and the active angle setting',()=>{
  const calc=calculator(),data=lists([[41,65,22],[1,3,8,5,4]]);
  const sine=evaluateCGListFormula({calculator:calc,statistics:data,source:'sin(List1)'}).values;
  sine.forEach((value,index)=>assert.ok(Math.abs(value-Math.sin(data.lists[0][index]))<1e-13));
  assert.deepEqual(evaluateCGListFormula({calculator:calc,statistics:data,source:'ΔList 2'}).values,[2,5,-3,-1]);
  assert.deepEqual(evaluateCGListFormula({calculator:calc,statistics:data,source:'Cuml(List2)'}).values,[1,4,12,17,21]);
  assert.throws(()=>evaluateCGListFormula({calculator:calc,statistics:lists([[1]]),source:'Delta(List1)'}),/at least two/);
});

test('F-MEM and nested Seq/diff2 scopes bind the requested file own banks instead of the caller active bank',()=>{
  const calc=calculator();calc.arrayMemory={lists:[[999]],names:['PARENT']};calc.functionMemory[0]='List1[1]*X';
  let data=lists([[1,2],[7]]);data=switchCGListFile(data,4);data.lists[0]=[10,20];data.lists[1]=[3];data.names[0]='TARGET';data=switchCGListFile(data,0);
  const before=structuredClone(calc.save()),arrayBefore=structuredClone(calc.arrayMemory);
  assert.deepEqual(evaluateCGListFormula({calculator:calc,statistics:data,listFile:4,source:'Seq(fn1(X),X,1,2)'}).values,[10,20]);
  const sequence=evaluateCGListFormula({calculator:calc,statistics:data,listFile:4,source:'Augment(List2,Seq("Sum(List 1)*X","X",1,2))'});
  assert.deepEqual(sequence.values,[3,30,60]);assert.deepEqual(sequence.references,[{list:1,subName:'TARGET'},{list:2,subName:''}]);
  const derivative=evaluateCGListFormula({calculator:calc,statistics:data,listFile:4,source:'List2+diff2("Sum(List \\"TARGET\\")*X^2",1)'});
  assert.ok(Math.abs(derivative.values[0]-63)<1e-6);assert.deepEqual(derivative.references,[{list:1,subName:'TARGET'},{list:2,subName:''}]);
  assert.deepEqual(calc.save(),before);assert.deepEqual(calc.arrayMemory,arrayBefore);
});

test('top-level isolation also protects an already isolated input calculator and all native result banks',()=>{
  const base=calculator();base.vars.Ans=73;base.statisticalMemory.p=.125;base.financialMemory.n=9;base.financialSettings.days=360;base.nativeAnswers={list:[99]};
  const isolated=readOnlyCalculator(base),before=structuredClone(isolated.save()),parentBefore=structuredClone(base.save());
  const result=applyCGListFormula({calculator:isolated,statistics:lists([[1,2]]),source:'List1+NormPD(0)+Smpl_SI(360,5,-1000)',target:2});
  assert.ok(Math.abs(result.values[0]-(51+1/Math.sqrt(2*Math.PI)))<1e-12);
  assert.deepEqual(isolated.save(),before);assert.deepEqual(base.save(),parentBefore);
});

test('native ListAns can be read without updating the caller Ans or answer memories',()=>{
  const calc=calculator();calc.nativeAnswers={list:[1,2,3]};calc.vars.Ans=17;const before=structuredClone(calc.save());
  const result=evaluateCGListFormula({calculator:calc,statistics:lists([]),source:'ListAns*36'});
  assert.deepEqual(result.values,[36,72,108]);assert.equal(result.usesListAns,true);assert.deepEqual(result.references,[]);assert.deepEqual(calc.save(),before);
});

test('complex input is retained but actual use follows real/complex mode and complex results remain tagged JSON',()=>{
  const calc=calculator(),data=lists([[{re:1,im:2},3],[4,5]]),before=structuredClone(data);
  assert.deepEqual(evaluateCGListFormula({calculator:calc,statistics:data,source:'List2+1'}).values,[5,6]);
  assert.throws(()=>applyCGListFormula({calculator:calc,statistics:data,source:'List1+1',target:3}),/实数|a\+bi/);
  const result=applyCGListFormula({calculator:calc,statistics:data,source:'List1*(1+i)',target:3,complex:true});
  assert.deepEqual(result.values,[{re:-1,im:3},{re:3,im:3}]);assert.deepEqual(JSON.parse(JSON.stringify(result.statistics)).lists[2],result.values);assert.deepEqual(data,before);
});

test('dimension, numeric-domain, forbidden-result and storage failures roll back both data and calculator',()=>{
  const calc=calculator(),data=lists([[1,2],[0]]),before=structuredClone(data),calcBefore=structuredClone(calc.save());
  for(const source of ['List1+List2','List1/0','List1/(NormPD(0)-NormPD(0))','[[1,2],[3,4]]','"text"','2','List1→List3','import("fs")']){
    assert.throws(()=>applyCGListFormula({calculator:calc,statistics:data,source,target:3}),undefined,source);assert.deepEqual(data,before);assert.deepEqual(calc.save(),calcBefore);
  }
  assert.equal(evaluateCGListFormula({calculator:calc,statistics:data,source:'Seq(X,X,1,999)'}).values.length,999);
  assert.throws(()=>applyCGListFormula({calculator:calc,statistics:data,source:'Seq(X,X,1,1000)',target:3}),/999|范围/);
  assert.throws(()=>applyCGListFormula({calculator:calc,statistics:data,source:'List1+NormPD(0)+Smpl_SI(365,5,-1000)',target:3,memoryLimit:1}),error=>error.code==='MEMORY_FULL');
  assert.deepEqual(data,before);assert.deepEqual(calc.save(),calcBefore);
});

test('empty-source, duplicate-name and result-color choices are explicit bounded desktop policies, not invented native dependencies',()=>{
  const calc=calculator(),data=lists([[],[1,2]],['QTY','QTY']);
  assert.throws(()=>evaluateCGListFormula({calculator:calc,statistics:data,source:'Augment(List1,List2)'}),error=>error.code==='EMPTY_SOURCE');
  assert.throws(()=>evaluateCGListFormula({calculator:calc,statistics:data,source:'List"QTY"+1'}),error=>error.code==='AMBIGUOUS_LIST_NAME');
  assert.throws(()=>evaluateCGListFormula({calculator:calc,statistics:{lists:[[1,{bad:2}]]},source:'List1+1'}),error=>error.code==='LIST_DATA');
  data.elementColors[1]=['#ff0000','#0000ff'];const result=applyCGListFormula({calculator:calc,statistics:data,source:'List2*2',target:2});
  assert.deepEqual(result.statistics.elementColors[1],[]);assert.deepEqual(data.elementColors[1],['#ff0000','#0000ff']);assert(CG_LIST_FORMULA_UNVERIFIED.length>=3);
});

test('ordinary quoted strings are never mistaken for list references and random values are evaluated once',()=>{
  const calc=calculator(),data=lists([[1,2]]);let calls=0;const original=calc.scope;
  calc.scope=function(extra){const scope=original.call(this,extra);scope.Ran=()=>{calls++;return .25;};return scope;};
  const result=evaluateCGListFormula({calculator:calc,statistics:data,source:'List1+Ran()'});assert.deepEqual(result.values,[1.25,2.25]);assert.equal(calls,1);
  const text=evaluateCGListFormula({calculator:calc,statistics:data,source:'List1+StrLen("List26")'});assert.deepEqual(text.references,[{list:1,subName:''}]);assert.deepEqual(text.values,[7,8]);
});
