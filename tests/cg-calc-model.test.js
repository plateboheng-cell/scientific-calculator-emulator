import test from 'node:test';
import assert from 'node:assert/strict';
import {ModelCalculator} from '../src/engine/model-calculator.js';
import {evaluateCGRunMatrix,commitCGRunMatrix} from '../src/engine/cg-run-matrix.js';
const close=(a,b,tolerance=1e-6)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
test('native CALC infix and logab bind to the actual Model with the documented argument order',()=>{
  const c=new ModelCalculator('cg50');assert.equal(c.evaluate('107 Int÷7'),15);assert.equal(c.evaluate('107 Rmdr7'),2);assert.equal(c.evaluate('2+107 Int÷7*3'),47);assert.equal(c.evaluate('107 Int÷7 Rmdr2'),1);assert.equal(c.evaluate('logab(2,8)'),3);
  const z=c.evaluate('logab(2,-8)',{},true);close(z.re,3);close(z.im,Math.PI/Math.log(2));assert.throws(()=>c.evaluate('107 Int÷0'));
});
test('native one/second derivative and integration bodies are parsed without evaluating them as arguments',()=>{
  const c=new ModelCalculator('cg50');c.vars.x=3;c.vars.Ans=41;close(c.evaluate('diff(x^3,2)'),12);close(c.evaluate('diff2(x^3+4*x^2+x-6,3)'),26);close(c.evaluate('diff2(x^3+4*x^2+x-6)'),26);
  c.graphMemory.expressions[0]='x^3+4*x^2+x-6';close(c.evaluate('diff2("Y1",3)'),26);
  c.angle='Deg';close(c.evaluate('integral(sin(x),0,pi,1e-5)'),2,1e-5);assert.equal(c.angle,'Deg');assert.equal(c.vars.x,3);assert.equal(c.vars.Ans,41);assert.equal(c.lastEvaluationApproximate,true);
});
test('native Sigma commits its documented loop-variable change while sampler functions preserve all other memory',()=>{
  const c=new ModelCalculator('cg50');c.vars.K=91;c.vars.A=7;c.vars.Ans=41;const finance=structuredClone(c.financialMemory),statistics=structuredClone(c.statisticalMemory);
  assert.equal(c.evaluate('Sigma(K^2-3*K+5,K,2,6)'),55);assert.equal(c.vars.K,6);assert.equal(c.vars.A,7);assert.equal(c.vars.Ans,41);assert.deepEqual(c.financialMemory,finance);assert.deepEqual(c.statisticalMemory,statistics);
  assert.equal(c.evaluate('Sigma(k,k,2,6,2)'),12);assert.equal(c.vars.K,6);assert.throws(()=>c.evaluate('Sigma(integral(x,0,1),K,1,3)'),/Syntax ERROR/);
});
test('FMin FMax and SolveN use the actual List answer and preserve independent scalar Ans',()=>{
  const c=new ModelCalculator('cg50');c.assign('Ans',17);c.vars.x=81;
  const minimum=c.evaluate('FMin(x^2-4*x+9,0,3,6)');close(minimum[0],2);close(minimum[1],5);assert.deepEqual(c.nativeAnswers.list,minimum);assert.equal(c.vars.Ans,17);assert.equal(c.vars.x,81);
  const maximum=c.evaluate('FMax(x^2,-1,2,7)');close(maximum[0],2);close(maximum[1],4);
  assert.deepEqual(c.evaluate('SolveN(x^2-5*x-6)'),[-1,6]);assert.match(c.cgNumericalNotice,/More solutions may exist/);assert.deepEqual(c.nativeAnswers.list,[-1,6]);assert.equal(c.vars.Ans,17);
  const before=c.save();assert.throws(()=>c.evaluate('SolveN(x^2+1,x,-3,3)'),/No Solution/);assert.deepEqual(c.save(),before);close(c.evaluate('Solve(x^2-4,1,0,3)'),2);assert.equal(c.cgNumericalNotice,null);
});
test('the native adapter stages numerical warnings, approximation and intentional Sigma writes until commit',()=>{
  const c=new ModelCalculator('cg50');c.assign('Ans',17);c.vars.K=91;const before=c.save();
  const roots=evaluateCGRunMatrix(c,'SolveN(x^2-5*x-6)');assert.deepEqual(c.save(),before);assert.equal(roots.approximate,true);assert.match(roots.snapshot.cgNumericalNotice,/More solutions may exist/);commitCGRunMatrix(c,roots);assert.deepEqual(c.nativeAnswers.list,[-1,6]);assert.equal(c.vars.Ans,17);assert.equal(c.approximateVariables.has('Ans'),false);
  const sigma=evaluateCGRunMatrix(c,'Sigma(K,K,1,3)');assert.equal(c.vars.K,91);commitCGRunMatrix(c,sigma);assert.equal(c.vars.K,3);assert.equal(c.vars.Ans,6);assert.equal(c.cgNumericalNotice,null);
  const preserved=c.save();assert.throws(()=>evaluateCGRunMatrix(c,'Sigma(K,K,1,3)+1e100'));assert.deepEqual(c.save(),preserved);
});
