import test from 'node:test';
import assert from 'node:assert/strict';
import {ModelCalculator} from '../src/engine/model-calculator.js';
import {CGProgramRunner,runCGProgram} from '../src/engine/cg-program.js';
import {evaluateCGRunMatrix,commitCGRunMatrix} from '../src/engine/cg-run-matrix.js';
import {createCGRational,cgRationalJSON} from '../src/engine/cg-rational-display.js';
const exact=(n,d=1)=>cgRationalJSON(createCGRational(n,d));
const manual=()=>{const calculator=new ModelCalculator('cg50');calculator.cgSimplify='Manual';return calculator;};
const approximate=(snapshot,key)=>snapshot.approximateVariables.includes(key);
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-9*Math.max(1,Math.abs(expected)),String([actual,expected]));

test('Program numerical RHS and approximate variable reads propagate flags into scalar variables and Ans',()=>{
  const calculator=manual();calculator.assign('A',.25,true);const result=runCGProgram(calculator,'A→B:B+1→C:diff("x^2",3)→D:Print D');
  for(const key of ['A','B','C','D','Ans'])assert.equal(approximate(result,key),true,key);
  assert.equal(result.exactVariables.B,undefined);assert.equal(result.exactVariables.C,undefined);assert.equal(result.exactAnswer,null);assert.equal(calculator.approximateVariables.has('B'),false);
  const overwrite=runCGProgram(calculator,'A→B:1/4→B');assert.equal(approximate(overwrite,'B'),false);assert.equal(approximate(overwrite,'Ans'),false);assert.deepEqual(overwrite.exactAnswer,exact(1,4));
});
test('For caches the actual initial binding flag instead of an approximate bound or step calculation',()=>{
  const calculator=manual(),runner=new CGProgramRunner(calculator,'For 1→A To diff("x",3):Next');const initial=runner.run(undefined,{instructionBudget:1});
  assert.equal(initial.variables.A,1);assert.equal(approximate(initial,'A'),false);assert.deepEqual(initial.exactVariables.A,exact(1));
  const next=runner.run();assert.equal(next.variables.A,2);assert.equal(approximate(next,'A'),false);
  const approximateInitial=runCGProgram(calculator,'For diff("x",3)→A To 1:Next');assert.equal(approximate(approximateInitial,'A'),true);assert.equal(approximateInitial.exactVariables.A,undefined);
});
test('For step approximation is cached once and combines with each actual loop binding',()=>{
  const calculator=manual();let calls=0;const original=calculator.differentiate;calculator.differentiate=function(...args){calls++;return original.apply(this,args);};
  const runner=new CGProgramRunner(calculator,'For 1→A To 3.5 Step diff("x",3):Next'),initial=runner.run(undefined,{instructionBudget:1});assert.equal(approximate(initial,'A'),false);
  const result=runner.run();assert.equal(calls,1);near(result.variables.A,4);assert.equal(approximate(result,'A'),true);assert.equal(approximate(result,'Ans'),true);assert.equal(result.exactVariables.A,undefined);
});
test('array element RHS approximation is independent of a Getkey or numerical index expression',()=>{
  const calculator=manual();let keys=0;const numeric=runCGProgram(calculator,'2→Dim List1:diff("x^2",3)→List1[Getkey]',{keyProvider:()=>{keys++;return 1;}});
  assert.equal(keys,1);near(numeric.lists[0][0],6);assert.equal(approximate(numeric,'Ans'),true);assert.equal(numeric.exactAnswer,null);
  const fraction=runCGProgram(calculator,'2→Dim List1:1/3→List1[round(diff("x",3))]');assert.equal(fraction.lists[0][0],1/3);assert.equal(approximate(fraction,'Ans'),false);assert.deepEqual(fraction.exactAnswer,exact(1,3));
});
test('array results,conditions,Locate and drawing arguments preserve the independent scalar answer flag',()=>{
  const calculator=manual();
  const numeric=runCGProgram(calculator,'diff("x",3):{1,2}:[[3,4]]:Print {4,5}:Locate 1,1,0:PlotOn 1,2:If 1:Then:ClrGraph:IfEnd');near(numeric.variables.Ans,1);assert.equal(approximate(numeric,'Ans'),true);assert.equal(numeric.exactAnswer,null);
  const fraction=runCGProgram(calculator,'1/3:Locate 1,1,diff("x",3):PlotOn diff("x",3),2:If diff("x",3):Then:ClrGraph:IfEnd');assert.equal(fraction.variables.Ans,1/3);assert.equal(approximate(fraction,'Ans'),false);assert.deepEqual(fraction.exactAnswer,exact(1,3));
});
test('Input,Isz and Dsz preserve or clear the actual scalar approximation as appropriate',()=>{
  const calculator=manual(),runner=new CGProgramRunner(calculator,'Input A:Isz A:Dsz A');assert.equal(runner.run().status,'input');const result=runner.run('diff("x",3)');near(result.variables.A,1);assert.equal(approximate(result,'A'),true);assert.equal(approximate(result,'Ans'),true);
  const fresh=new CGProgramRunner(calculator,'Input A');fresh.run();const integer=fresh.run(2);assert.equal(approximate(integer,'A'),false);assert.deepEqual(integer.exactVariables.A,exact(2));
});
test('classification never rereads random,key or accessor-backed values and failed staged runs preserve flags',()=>{
  const calculator=manual();let randomCalls=0,keyCalls=0,getters=0;const random=Math.random;Math.random=()=>{randomCalls++;return .25;};try{runCGProgram(calculator,'Ran()→A:Getkey→B',{keyProvider:()=>{keyCalls++;return 2;}});assert.equal(randomCalls,1);assert.equal(keyCalls,1);}finally{Math.random=random;}
  const variables={};Object.defineProperty(variables,'A',{enumerable:true,get(){getters++;return .25;}});runCGProgram(calculator,'A→B',{variables});assert.equal(getters,1);
  calculator.assign('A',.25,true);const before=calculator.save();assert.throws(()=>evaluateCGRunMatrix(calculator,'diff("x",3)→B:1/0'));assert.deepEqual(calculator.save(),before);
});
test('Run-Matrix commits runner approximation flags and preserves them after an array result',()=>{
  const calculator=manual(),result=evaluateCGRunMatrix(calculator,'diff("x^2",3)→A:{1,2}');assert.equal(approximate(result.snapshot,'A'),true);assert.equal(approximate(result.snapshot,'Ans'),true);commitCGRunMatrix(calculator,result);
  assert.equal(calculator.approximateVariables.has('A'),true);assert.equal(calculator.approximateVariables.has('Ans'),true);assert.equal(calculator.exactAnswer,null);
});
test('the current approximate array result is independent of the scalar Ans approximation flag',()=>{
  const calculator=manual();calculator.assign('Ans',17,false,createCGRational(17));const result=evaluateCGRunMatrix(calculator,'List1[m]▶[cm]',{lists:[[1,2]]});
  assert.deepEqual(result.value,[100,200]);assert.equal(result.approximate,true);assert.equal(approximate(result.snapshot,'Ans'),false);assert.deepEqual(result.snapshot.exactAnswer,exact(17));commitCGRunMatrix(calculator,result);assert.equal(calculator.approximateVariables.has('Ans'),false);assert.equal(calculator.vars.Ans,17);
  const literal=evaluateCGRunMatrix(calculator,'{diff("x",3),2}');assert.equal(literal.approximate,true);assert.equal(approximate(literal.snapshot,'Ans'),false);
  calculator.assign('Ans',17,true);const exactArray=evaluateCGRunMatrix(calculator,'{1,2}');assert.equal(exactArray.approximate,false);assert.equal(approximate(exactArray.snapshot,'Ans'),true);
});
test('transient numerical notices cross Program snapshots and Run-Matrix commit without entering saved state',()=>{
  const calculator=manual();calculator.assign('Ans',17);calculator.cgNumericalNotice='old';const original=calculator.scope;let calls=0;
  calculator.scope=function(...args){return {...original.apply(this,args),Ran:()=>{calls++;this.cgNumericalNotice='More solutions may exist.';return [-1,1];}};};
  const result=runCGProgram(calculator,'Ran():Print "done":Locate 1,1,0');assert.equal(result.cgNumericalNotice,'More solutions may exist.');assert.equal(result.variables.Ans,17);assert.equal(calculator.cgNumericalNotice,'old');
  const staged=evaluateCGRunMatrix(calculator,'Ran()');assert.equal(staged.snapshot.cgNumericalNotice,'More solutions may exist.');assert.equal(calculator.cgNumericalNotice,'old');commitCGRunMatrix(calculator,staged);assert.equal(calculator.cgNumericalNotice,'More solutions may exist.');assert.equal(Object.hasOwn(calculator.save(),'cgNumericalNotice'),false);
  commitCGRunMatrix(calculator,evaluateCGRunMatrix(calculator,'1'));assert.equal(calculator.cgNumericalNotice,null);assert.equal(calls,2);
});
