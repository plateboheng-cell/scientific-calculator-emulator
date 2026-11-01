import test from 'node:test';
import assert from 'node:assert/strict';
import {ModelCalculator} from '../src/engine/model-calculator.js';
import {evaluateCGIntegral,evaluateCGSigma} from '../src/engine/cg-native-calculus.js';
import {evaluateCGRunMatrix} from '../src/engine/cg-run-matrix.js';
test('native integral accepts the documented polynomial and explicit tolerance',()=>{
  const c=new ModelCalculator('cg50');assert.ok(Math.abs(evaluateCGIntegral(c,'2*x^2+3*x+4',1,5,1e-4)- (2*(125-1)/3+3*(25-1)/2+16))<1e-8);
  assert.ok(Math.abs(evaluateCGIntegral(c,'x^2',1,0)+1/3)<1e-8);assert.equal(evaluateCGIntegral(c,'x^2',2,2),0);
});
test('native integral trigonometry uses radians even with Degree selected and preserves the actual bank',()=>{
  const c=new ModelCalculator('cg50');c.angle='Deg';c.vars.x=17;c.assign('Ans',42);const before=c.save();
  assert.ok(Math.abs(evaluateCGIntegral(c,'sin(x)',0,Math.PI)-2)<1e-5);assert.deepEqual(c.save(),before);
});
test('native Sigma has lexical sampling and returns an explicit final-variable commit',()=>{
  const c=new ModelCalculator('cg50');c.vars.K=91;const before=c.save();
  assert.deepEqual(evaluateCGSigma(c,'K^2-3*K+5','K',2,6),{value:55,variable:'K',lastBinding:6,terms:5});
  assert.deepEqual(evaluateCGSigma(c,'K','K',2,6,2),{value:12,variable:'K',lastBinding:6,terms:3});assert.deepEqual(c.save(),before);
});
test('native calculus rejects documented nested calculations and bad domains without altering memory',()=>{
  const c=new ModelCalculator('cg50'),before=c.save();
  for(const body of ['integral("x",0,1)','diff("x^2",0)','diff2("x^2",0)','sum("x",1,3)','FMin(x^2,0,1)'])assert.throws(()=>evaluateCGIntegral(c,body,0,1),/Syntax ERROR/);
  assert.throws(()=>evaluateCGIntegral(c,'x',0,1,0),/Argument ERROR/);assert.throws(()=>evaluateCGIntegral(c,'1/x',-1,1));
  assert.throws(()=>evaluateCGSigma(c,'K','K',1,1),/Argument ERROR/);assert.throws(()=>evaluateCGSigma(c,'K','K',1,3,0),/Argument ERROR/);assert.throws(()=>evaluateCGSigma(c,'K','K',1,10001),/Time Out/);
  assert.deepEqual(c.save(),before);
});
test('native calculus accepts List Sum while still rejecting numerical Sigma callbacks',()=>{
  const c=new ModelCalculator('cg50'),lists=[[2,4]],before=c.save();
  assert.equal(evaluateCGRunMatrix(c,'integral(Sum(List1)*x,0,1)',{lists}).value,3);
  assert.equal(evaluateCGRunMatrix(c,'integral(Prod(List1)*x,0,1)',{lists}).value,4);
  assert.equal(evaluateCGRunMatrix(c,'Sigma(Sum(List1),K,1,3)',{lists}).value,18);
  assert.deepEqual(c.save(),before);assert.deepEqual(lists,[[2,4]]);
});
