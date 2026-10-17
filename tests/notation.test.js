import test from 'node:test';
import assert from 'node:assert/strict';
import {latexToExpression} from '../src/engine/notation.js';
import {Calculator,math} from '../src/engine/calculator.js';
const calc=new Calculator();
for(const [latex,expected]of [
 ['\\frac{1}{3}',1/3],['\\sqrt{2}',Math.sqrt(2)],['\\sqrt[3]{8}',2],['2^{3}',8],['\\log_2(8)',3],['\\log_3(9)',2],['\\ln(e)',1],
 ['\\sin(30)',.5],['\\cos(60)',.5],['\\arcsin(0.5)',30],['\\left| -3\\right|',3],['5!',120],['2\\pi',2*Math.PI],
 ['\\int_0^1 x^2\\,\\mathrm{d}x',1/3],['\\sum_{x=1}^5 x',15],['\\sum_{k=1}^5 k^2',55],['\\prod_{x=1}^5 x',120],
 ['\\left.\\frac{d}{dx}x^2\\right|_{x=2}',4]
])test(`二维算式 ${latex}`,()=>{const expr=latexToExpression(latex);assert.ok(Math.abs(calc.evaluate(expr)-expected)<1e-8,expr);});
test('矩阵和向量符号',()=>{const scope={MatA:[[1,0],[0,2]],VctA:[3,4]};assert.equal(calc.evaluate(latexToExpression('\\left|\\mathbf{A}\\right|',{mode:'matrix'}),scope),2);const inv=calc.evaluate(latexToExpression('\\mathbf{A}^{-1}',{mode:'matrix'}),scope);assert.deepEqual(math.isMatrix(inv)?inv.toArray():inv,[[1,0],[0,.5]]);assert.equal(latexToExpression('\\vec{A}'),'VctA');});
test('未填写模板不能被当作零',()=>{assert.throws(()=>latexToExpression('\\frac{\\placeholder{}}{3}'));assert.throws(()=>latexToExpression('\\int_{\\placeholder{}}^1x\\,dx'));});
test('向量数量积与向量积的数学符号',()=>{assert.equal(latexToExpression('\\vec{A}\\cdot\\vec{B}',{mode:'vector'}),'dot(VctA,VctB)');assert.equal(latexToExpression('\\vec{A}\\times\\vec{B}',{mode:'vector'}),'cross(VctA,VctB)');assert.equal(calc.evaluate(latexToExpression('\\left|\\vec{A}\\right|',{mode:'vector'}),{VctA:[3,4]}),5);});
test('带分数与负带分数',()=>{assert.ok(Math.abs(calc.evaluate(latexToExpression('1\\frac{1}{3}'))-4/3)<1e-12);assert.ok(Math.abs(calc.evaluate(latexToExpression('-1\\frac13'))+4/3)<1e-12);});
