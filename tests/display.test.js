import test from 'node:test';
import assert from 'node:assert/strict';
import {Calculator, exactTex, mixedTex} from '../src/engine/calculator.js';

test('nearby floats are not relabeled as exact fractions or radicals',()=>{
  assert.doesNotMatch(exactTex(1/3+1e-13),/\\frac/);
  assert.doesNotMatch(exactTex(Math.sqrt(2)+1e-13),/\\sqrt/);
  assert.doesNotMatch(exactTex(Math.PI/3+1e-13),/\\pi/);
});

test('mixed fractions use numerator/remainder, avoiding subtractive float error',()=>{
  assert.equal(mixedTex(7/3),'2\\frac{1}{3}');
  assert.equal(mixedTex(-7/3),'-2\\frac{1}{3}');
  assert.equal(mixedTex(1/3),'\\frac{1}{3}');
  assert.equal(mixedTex(2),'2');assert.equal(mixedTex(0),'0');
});
test('tiny positive and negative values survive natural display',()=>{
  for(const value of [1e-20,-1e-20,1e-99,-1e-99])assert.notEqual(exactTex(value),'0');
});
test('real mode rejects even a tiny nonzero imaginary component',()=>{
  const calc=new Calculator();
  assert.throws(()=>calc.evaluate('1e-20*i'),/复数/);
  assert.equal(calc.evaluate('1e-20*i',{},true).im,1e-20);
});
test('complex results obey the same magnitude limit as real results',()=>{
  const calc=new Calculator();
  assert.throws(()=>calc.evaluate('1e100*i',{},true),/数值范围/);
});
test('direct numerical method entry points reject overflow',()=>{
  const calc=new Calculator();
  assert.throws(()=>calc.integrate('1e99',0,1e10),/数值范围/);
  assert.throws(()=>calc.sequence('1e99',1,1000),/数值范围/);
  assert.throws(()=>calc.sequence('1e50',1,3,true),/数值范围/);
});
