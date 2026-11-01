import test from 'node:test';
import assert from 'node:assert/strict';
import {ModelCalculator} from '../src/engine/model-calculator.js';
import {createCGNativeMenu} from '../src/ui/cg-native-menu.js';
import {cgNativeFunctionLatex} from '../src/input/cg-native-symbols.js';
import {latexToExpression,expressionToLatex} from '../src/engine/notation.js';
import {sanitizeProfile} from '../src/state/store.js';
test('manual1-35 initializes only new CG profiles in radians and preserves saved angle choices',()=>{const c=new ModelCalculator('cg50');assert.equal(c.angle,'Rad');assert.equal(sanitizeProfile({},'cg50').calculator.angle,'Rad');assert.equal(new ModelCalculator('cg50',{angle:'Deg'}).angle,'Deg');assert.equal(sanitizeProfile({calculator:{angle:'Gra'}},'cg50').calculator.angle,'Gra');assert.ok(Math.abs(c.evaluate('sin(pi/6)')-.5)<1e-12);assert.equal(new ModelCalculator('cnx').angle,'Deg');});
test('manual 3-10 two-list Min and Max compare corresponding elements',()=>{
  const c=new ModelCalculator('cg50');c.arrayMemory={lists:[[75,16,98,46,56],[35,59,58,72,67]]};
  assert.deepEqual(c.evaluate('Max(List1,List2)'),[75,59,98,72,67]);assert.deepEqual(c.evaluate('Min(List1,List2)'),[35,16,58,46,56]);assert.throws(()=>c.evaluate('Max([1,2],[1])'),/dimensions/);
});
test('native Mean and Med honor frequencies without expanding large lists',()=>{
  const c=new ModelCalculator('cg50');assert.equal(c.evaluate('Mean([1,9],[3,1])'),3);assert.equal(c.evaluate('Med([0,10],[1,1])'),5);assert.equal(c.evaluate('Med([1,4,8],[1,3,2])'),4);assert.equal(c.evaluate('Med([1,9],[1000000000,1])'),1);assert.throws(()=>c.evaluate('Med([1,2],[0,0])'),/positive/);assert.throws(()=>c.evaluate('Mean([1,2],[1,-1])'),/frequencies/);
});
test('manual 3-8 ListToMat accepts native slot numbers and retains list columns',()=>{
  const c=new ModelCalculator('cg50');c.arrayMemory={lists:[[2,3,6,5,4],[11,12,13,14,15]]};assert.deepEqual(c.evaluate('ListToMat(1,2)'),[[2,11],[3,12],[6,13],[5,14],[4,15]]);assert.throws(()=>c.evaluate('ListToMat(27)'),/1–26/);
});
test('manual 2-55 Ref uses the displayed pivot result and Rref reduces above the pivots',()=>{
  const c=new ModelCalculator('cg50');assert.deepEqual(c.evaluate('Ref([[1,2,3],[4,5,6]])'),[[1,1.25,1.5],[0,1,2]]);assert.deepEqual(c.evaluate('Rref([[1,2,3],[4,5,6]])'),[[1,0,-1],[0,1,2]]);assert.deepEqual(c.evaluate('Identity(2)'),[[1,0],[0,1]]);assert.deepEqual(c.evaluate('Augment([[1],[2]],[[3,4],[5,6]])'),[[1,3,4],[2,5,6]]);
});
test('OPTN LIST and MAT/VCT pages insert native commands through safe natural-input macros',()=>{
  const inserted=[],menu=createCGNativeMenu({onInsert:token=>inserted.push(token)});menu.start();menu.press(1);assert.deepEqual(menu.labels(),['List','Lst→Mat','Dim','Fill(','Seq','▶']);menu.press(6);assert.deepEqual(menu.labels(),['Min','Max','Mean','Med','Augment','▶']);menu.press(4);assert.equal(inserted.at(-1).parserName,'Med');menu.start();menu.press(2);menu.press(6);assert.deepEqual(menu.labels(),['Identity','Dim','Fill','Ref','Rref','▶']);menu.press(5);assert.equal(inserted.at(-1).parserName,'Rref');assert.match(latexToExpression(cgNativeFunctionLatex('Rref')+'\\left(\\begin{bmatrix}1&2\\end{bmatrix}\\right)'),/^Rref\(/);
});
test('function memory survives profile reload and supports native graph composites',()=>{
  const c=new ModelCalculator('cg50');c.functionMemory[0]='x^2+1';c.functionMemory[1]='fn1(x+2)';c.graphMemory={expressions:['x+3','y1(x)^2'],types:['y','y']};assert.equal(c.evaluate('fn2(2)'),17);assert.equal(c.evaluate('y2(2)'),25);c.vars.x=4;assert.equal(c.evaluate('fn1'),17);const p=sanitizeProfile({calculator:c.save()},'cg50'),restored=new ModelCalculator('cg50',JSON.parse(JSON.stringify(p.calculator)));assert.equal(restored.evaluate('fn1(3)'),10);c.functionMemory[0]='fn1';assert.throws(()=>c.evaluate('fn1'),/Circular/);
});
test('natural input preserves native function and graph reference calls instead of multiplying their names',()=>{const c=new ModelCalculator('cg50');c.functionMemory[0]='x^2';c.graphMemory.expressions[1]='x+1';c.vars.x=2;const canonical=latexToExpression(expressionToLatex('fn1(Y2(x))'));assert.equal(c.evaluate(canonical),9);assert.equal(c.evaluate(latexToExpression(expressionToLatex('fn1'))),4);assert.equal(latexToExpression(expressionToLatex('RightXmin')),'RightXmin');for(const source of ['X1(2)','r20(1)','Xt20(T)','Yt1(T)'])assert.match(latexToExpression(expressionToLatex(source)),/^[A-Za-z]+\d+\(/);});
