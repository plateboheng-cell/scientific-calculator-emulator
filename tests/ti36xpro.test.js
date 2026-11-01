import test from 'node:test';
import assert from 'node:assert/strict';
import {ti36xpro} from '../src/models/ti36xpro.js';
import {ModelCalculator} from '../src/engine/model-calculator.js';
import {math} from '../src/engine/calculator.js';
import {shortcutAction} from '../src/keyboard/mapping.js';
import {physicalLayout,multiTapTokens} from '../src/keyboard/ti36xpro.js';

const near=(actual,expected,tolerance=1e-10)=>assert.ok(Math.abs(actual-expected)<=tolerance*Math.max(1,Math.abs(expected)),`${actual} != ${expected}`);

test('TI-36X Pro documents an independent experimental model with eight actual variables',()=>{
  assert.equal(ti36xpro.id,'ti36xpro');
  assert.equal(ti36xpro.family,'ti');
  assert.equal(ti36xpro.status,'experimental');
  assert.deepEqual(ti36xpro.variables,['x','y','z','t','a','b','c','d']);
  assert.deepEqual(ti36xpro.modes.map(mode=>mode[3]),['calc','stat','table','equation','matrix','vector','complex','base']);
  assert.ok(ti36xpro.references.every(reference=>new URL(reference).hostname==='education.ti.com'));
});

test('TI keyboard follows physical key rows and 2nd solver/data functions without invented keys',()=>{
  const keys=[...physicalLayout.topRows.flat(),...physicalLayout.rows.flat()];
  assert.ok(keys.some(([label,action])=>label==='2nd'&&action==='shift'));
  assert.ok(keys.some(([label,action])=>label==='mode'&&action==='ti-mode'));
  assert.deepEqual(physicalLayout.topRows.map(row=>row.map(key=>key[0])),[['2nd','mode','delete'],['ln\nlog','math','data']]);
  assert.deepEqual(physicalLayout.rows.map(row=>row.map(key=>key[0])),[
    ['eˣ\n10ˣ','EE','!\nnCr\nnPr','table','clear'],
    ['π\ne\ni','sin\nsin⁻¹','cos\ncos⁻¹','tan\ntan⁻¹','÷'],
    ['x^□','n/d','(',')','×'],
    ['x²','7','8','9','−'],
    ['x y z t\na b c d','4','5','6','+'],
    ['sto→','1','2','3','◀▶≈'],
    ['on','0','.','(−)','enter'],
  ]);
  assert.equal(keys.length,41,'the cursor pad supplies the other four physical keys');
  for(const action of ['ti-data','ti-stats','mode:table','mode:matrix','mode:vector','ti-polynomial','ti-system','solve','sd'])assert.ok(keys.some(key=>key[1]===action||key[3]===action),action);
  assert.ok(keys.every(key=>!['alpha','mplus','mminus'].includes(key[1])));
  assert.ok(keys.every(key=>!['Apps','MENU','HOME'].includes(key[0])));
  assert.deepEqual(multiTapTokens.pi,['pi','e','i']);
  assert.deepEqual(multiTapTokens.variables,ti36xpro.variables);
  assert.deepEqual(multiTapTokens.prob,['!','nCr(','nPr(']);
});

test('TI desktop shortcuts do not leak ALPHA or CN X constants',()=>{
  assert.equal(shortcutAction(ti36xpro,{key:'F3'}),'variables');
  assert.equal(shortcutAction(ti36xpro,{key:'F7'}),undefined);
  assert.equal(shortcutAction(ti36xpro,{key:'F9'}),'sd');
  assert.equal(shortcutAction(ti36xpro,{key:'F11'}),'ti-mode');
});

test('TI calculations use all eight variables and retain them through a save',()=>{
  const calculator=new ModelCalculator('ti36xpro');
  for(const [index,name]of ti36xpro.variables.entries())calculator.assign(name,index+1);
  assert.equal(calculator.evaluate('x+y+z+t+a+b+c+d'),36);
  const restored=new ModelCalculator('ti36xpro',calculator.save());
  assert.equal(restored.evaluate('a+b+c+d'),26);
  assert.throws(()=>calculator.assign('M',1));
  assert.throws(()=>calculator.assign('A',1));
});

test('TI registers and evaluates only its documented single f function',()=>{
  const calculator=new ModelCalculator('ti36xpro');
  calculator.define('f','x*(36-x)');
  assert.equal(calculator.evaluate('f(18)'),324);
  assert.equal(new ModelCalculator('ti36xpro',calculator.save()).evaluate('f(8)'),224);
  assert.throws(()=>calculator.define('g','x+1'));
  assert.throws(()=>calculator.evaluate('g(2)'));
});

test('TI single-function table follows the manual parabola and rejects a second function',()=>{
  const calculator=new ModelCalculator('ti36xpro');
  assert.deepEqual(calculator.makeTable('x*(36-x)','',15,21,3),[[15,315],[18,324],[21,315]]);
  assert.throws(()=>calculator.makeTable('x','x^2',0,2,1));
  assert.equal(calculator.makeTable('x','',0,44,1).length,45);
  assert.throws(()=>calculator.makeTable('x','',0,45,1));
});

test('TI Ask-x evaluates independent user-entered x values and validates bounded input',()=>{
  const calculator=new ModelCalculator('ti36xpro');
  calculator.define('f','3600-450*x');
  assert.deepEqual(calculator.makeAskTable('f(x)',[0,3,8]),[[0,3600],[3,2250],[8,0]]);
  assert.deepEqual(calculator.makeAskTable('f(x)',[-0.2]),[[-0.2,3690]]);
  for(const values of [[],[NaN],[Infinity],['3'],Array(46).fill(0)])assert.throws(()=>calculator.makeAskTable('f(x)',values));
});

test('TI matrix limits allow 3×3 but reject 4×4 and a fourth matrix variable',()=>{
  const calculator=new ModelCalculator('ti36xpro');
  assert.equal(calculator.evaluate('det(MatA)',{MatA:[[2,0,0],[0,3,0],[0,0,4]]}),24);
  assert.throws(()=>calculator.evaluate('det(MatA)',{MatA:math.identity(4).toArray()}));
  assert.throws(()=>calculator.evaluate('det([[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]])'));
  assert.throws(()=>calculator.evaluate('det(identity(4))'));
  assert.throws(()=>calculator.evaluate('det(MatD)',{MatD:[[1]]}));
  assert.equal(calculator.evaluate('norm(VctA)',{VctA:[3]}),3);
  assert.equal(calculator.evaluate('dot(VctA,VctB)',{VctA:[1,2,3],VctB:[4,5,6]}),32);
  assert.throws(()=>calculator.evaluate('norm(VctD)',{VctD:[3]}));
  assert.deepEqual(ti36xpro.vectorDimensions,[1,2,3]);
  assert.deepEqual(ti36xpro.vectorLabels,{VctA:'u',VctB:'v',VctC:'w'});
});

test('TI quadratic and cubic solvers return roots while quartic solving is unavailable',()=>{
  const calculator=new ModelCalculator('ti36xpro');
  assert.deepEqual(calculator.solvePolynomial([1,-3,2]),[1,2]);
  const cubic=calculator.solvePolynomial([1,-6,11,-6]);
  cubic.forEach((root,index)=>near(root,index+1));
  assert.throws(()=>calculator.solvePolynomial([1,0,-5,0,4]));
});

test('TI system solver supports two and three unknowns and rejects four',()=>{
  const calculator=new ModelCalculator('ti36xpro');
  calculator.solveLinearSystem([[1,1,1],[1,-2,3]]).forEach((value,index)=>near(value,[5/3,-2/3][index]));
  const three=calculator.solveLinearSystem([[5,-2,3,-9],[4,3,5,4],[2,4,-2,14]]);
  three.forEach((value,index)=>near(value,[0,3,-1][index]));
  const four=Array.from({length:4},(_,row)=>[...Array.from({length:4},(_,col)=>row===col?1:0),1]);
  assert.throws(()=>calculator.solveLinearSystem(four));
});
