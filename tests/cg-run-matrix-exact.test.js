import test from 'node:test';
import assert from 'node:assert/strict';
import {ModelCalculator} from '../src/engine/model-calculator.js';
import {evaluateCGRunMatrix,commitCGRunMatrix} from '../src/engine/cg-run-matrix.js';
import {createCGRational,cgRationalJSON} from '../src/engine/cg-rational-display.js';

const exact=(n,d=1)=>cgRationalJSON(createCGRational(n,d));
const manual=()=>{const calculator=new ModelCalculator('cg50');calculator.cgSimplify='Manual';return calculator;};

test('Run-Matrix commits a newly selected Manual preference before exact scalar banks',()=>{
  const calculator=new ModelCalculator('cg50');calculator.assign('A',.25,true);const before=calculator.save();
  const result=evaluateCGRunMatrix(calculator,'SimplifyMan:15/60→A:A*2→B');
  assert.equal(result.snapshot.simplify,'Manual');assert.deepEqual(result.snapshot.exactVariables.A,exact(15,60));
  assert.deepEqual(calculator.save(),before);assert.equal(calculator.cgSimplify,'Auto');
  commitCGRunMatrix(calculator,result);
  assert.equal(calculator.cgSimplify,'Manual');assert.deepEqual(calculator.exactVariables.A,exact(15,60));
  assert.deepEqual(calculator.exactVariables.B,exact(30,60));assert.deepEqual(calculator.exactAnswer,exact(30,60));
  assert.equal(calculator.approximateVariables.has('A'),false);
});

test('Run-Matrix explicitly clears unsupported same-value sidecars while retaining untouched exact variables',()=>{
  const calculator=manual();calculator.assign('A',.25,false,createCGRational(15,60));calculator.assign('B',.5,false,createCGRational(2,4));
  const result=evaluateCGRunMatrix(calculator,'sqrt(1/16)→A');
  // A same-valued last-result cache must not accidentally recreate 15/60.
  calculator.lastExactResult=createCGRational(15,60);commitCGRunMatrix(calculator,result);
  assert.equal(calculator.vars.A,.25);assert.equal(calculator.exactVariables.A,undefined);assert.equal(calculator.exactAnswer,null);
  assert.deepEqual(calculator.exactVariables.B,exact(2,4));
});

test('Run-Matrix carries exact Ans into a subsequent staged evaluation',()=>{
  const calculator=manual();commitCGRunMatrix(calculator,evaluateCGRunMatrix(calculator,'15/60'));
  const result=evaluateCGRunMatrix(calculator,'Ans+1/4');assert.equal(result.value,.5);
  assert.deepEqual(result.snapshot.exactAnswer,exact(120,240));commitCGRunMatrix(calculator,result);
  assert.deepEqual(calculator.exactAnswer,exact(120,240));
});

test('Run-Matrix Auto and complex evaluation reduce real fractions without losing the selected preference',()=>{
  const calculator=manual();commitCGRunMatrix(calculator,evaluateCGRunMatrix(calculator,'SimplifyAuto:15/60→A'));
  assert.equal(calculator.cgSimplify,'Auto');assert.deepEqual(calculator.exactVariables.A,exact(1,4));
  for(const complexFormat of ['a+bi','polar']){
    const complexCalculator=manual();complexCalculator.cgComplexMode=complexFormat;
    const result=evaluateCGRunMatrix(complexCalculator,'15/60→A',{complex:true,complexFormat});commitCGRunMatrix(complexCalculator,result);
    assert.equal(complexCalculator.cgSimplify,'Manual');assert.deepEqual(complexCalculator.exactVariables.A,exact(1,4));
    assert.deepEqual(complexCalculator.exactAnswer,exact(1,4));
  }
});

test('Run-Matrix failures leave caller preferences and all exact banks unchanged',()=>{
  const calculator=manual();calculator.assign('A',.25,false,createCGRational(15,60));calculator.assign('Ans',.25,false,createCGRational(15,60));
  const before=calculator.save();
  for(const source of ['SimplifyAuto:27/63→A:1/0','15/60→List1[1]','SimplifyAuto:For 1→A To 2:Next'])assert.throws(()=>evaluateCGRunMatrix(calculator,source));
  assert.deepEqual(calculator.save(),before);assert.equal(calculator.cgSimplify,'Manual');
});

test('Run-Matrix array results preserve the independent scalar exact answer through commit',()=>{
  const calculator=manual();calculator.assign('Ans',.25,false,createCGRational(15,60));
  const result=evaluateCGRunMatrix(calculator,'{1,2}:Ans→A:[[2,3]]→VctZ:VctZ*2');assert.deepEqual(result.value,[[4,6]]);
  commitCGRunMatrix(calculator,result);assert.equal(calculator.vars.Ans,.25);assert.deepEqual(calculator.exactAnswer,exact(15,60));
  assert.deepEqual(calculator.exactVariables.A,exact(15,60));assert.deepEqual(calculator.nativeAnswers.list,[1,2]);assert.deepEqual(calculator.nativeAnswers.vector,[[4,6]]);
});

test('Simplify preference-only commands do not present a fake numerical result or change Ans',()=>{
  const calculator=manual();calculator.assign('Ans',.25,false,createCGRational(15,60));
  for(const source of ['SimplifyAuto','SimplifyMan']){
    const result=evaluateCGRunMatrix(calculator,source);assert.equal(result.noValue,true);assert.equal(result.snapshot.variables.Ans,.25);
    commitCGRunMatrix(calculator,result);assert.equal(calculator.vars.Ans,.25);
  }
});
