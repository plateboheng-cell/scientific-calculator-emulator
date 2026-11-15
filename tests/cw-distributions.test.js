import test from 'node:test';
import assert from 'node:assert/strict';
import {ModelCalculator} from '../src/engine/model-calculator.js';

const calculate=(type,parameters)=>new ModelCalculator('cn999cw').distribution(type,parameters);
const near=(actual,expected,relative=1e-11)=>assert.ok(Math.abs(actual-expected)<=relative*Math.abs(expected),`${actual} != ${expected}`);

test('999 normal intervals preserve mass when rounded tails would coincide',()=>{
  near(calculate('normalCDF',{下限:-1e-20,上限:1e-20,μ:0,σ:1}),7.978845608028654e-21);
  near(calculate('normalCDF',{下限:8,上限:8+1e-10,μ:0,σ:1}),5.05227149954273e-25);
  near(calculate('normalPDF',{x:4e-98,μ:0,σ:1e-99}),1.4632702508381963e-249);
  assert.equal(calculate('normalCDF',{下限:-Infinity,上限:Infinity,μ:0,σ:1}),1);
});

test('999 quantiles accept both endpoints and can use a tiny upper area directly',()=>{
  assert.equal(calculate('inverseNormal',{区域:0,μ:0,σ:1}),-Infinity);
  assert.equal(calculate('inverseNormal',{区域:1,μ:0,σ:1}),Infinity);
  assert.equal(calculate('inverseNormalUpper',{区域:0,μ:0,σ:1}),Infinity);
  assert.equal(calculate('inverseNormalUpper',{区域:1,μ:0,σ:1}),-Infinity);
  near(calculate('inverseNormalUpper',{区域:1e-90,μ:0,σ:1}),20.164689059718683);
  near(calculate('normalUpper',{下限:12,μ:0,σ:1}),1.776482112077653e-33);
});

test('999 rare discrete right tails do not subtract rounded left probabilities from one',()=>{
  assert.equal(calculate('binomialCDF',{x:9,N:1000,p:.0001}),1);
  near(calculate('binomialUpper',{x:10,N:1000,p:.0001}),2.4074537897983194e-17);
  assert.equal(calculate('poissonCDF',{x:9,λ:.1}),1);
  near(calculate('poissonUpper',{x:10,λ:.1}),2.5163478067703154e-17);
});

test('999 stable masses and cumulative probabilities cover a billion counts',()=>{
  const binomial={x:500000000,N:1000000000,p:.5};
  near(calculate('binomialPDF',binomial),2.5231325213893805e-5);
  near(calculate('binomialCDF',binomial),.5000126156626061);
  near(calculate('binomialCDF',{x:499999999,N:999999999,p:.5}),.5);
  near(calculate('poissonCDF',{x:1000000000,λ:1000000000}),.500008410441739);
  near(calculate('poissonUpper',{x:1000000000,λ:1000000000}),.5000042052208701);
});

test('999 preserves discrete errors and handles zero Poisson mean without affecting EX',()=>{
  assert.equal(calculate('poissonPDF',{x:0,λ:0}),1);
  assert.equal(calculate('poissonUpper',{x:1,λ:0}),0);
  assert.throws(()=>calculate('binomialCDF',{x:6,N:5,p:.5}),/试验次数/);
  assert.throws(()=>calculate('binomialPDF',{x:1,N:1000000001,p:.5}),/计数/);
  assert.throws(()=>calculate('poissonPDF',{x:1,λ:-1}),/泊松平均值/);
  const ex=new ModelCalculator('ex');
  assert.throws(()=>ex.distribution('binomialCDF',{x:1,N:1000001,p:.5}));
  assert.throws(()=>ex.distribution('poissonUpper',{x:1,λ:1}));
});
