import test from 'node:test';
import assert from 'node:assert/strict';
import {ModelCalculator} from '../src/engine/model-calculator.js';
import {CGSpreadsheet,CG_SHEET_CAPACITY,cgRange,shiftCGReferences,generateRecursion,graphTable,dynamicFrames,conicRelations,conicSamples} from '../src/engine/cg-workspace.js';
const calc=()=>new ModelCalculator('cg50');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8*Math.max(1,Math.abs(b)),`${a} ≠ ${b}`);

test('CG spreadsheet reaches Z999 and keeps dependent formulas live after reload',()=>{
  const c=calc(),sheet=new CGSpreadsheet(c);sheet.set('Z999','7').set('A1','3').set('B1','=A1+Z999');assert.equal(sheet.value('B1'),10);sheet.set('A1','8');assert.equal(sheet.value('B1'),15);
  sheet.selected='Z999';const restored=new CGSpreadsheet(c,sheet.serialize());assert.equal(restored.selected,'Z999');assert.equal(restored.source('B1'),'=A1+Z999');assert.equal(restored.value('B1'),15);
});
test('CG spreadsheet range aggregates, exponent notation and blank cells behave consistently',()=>{
  const sheet=new CGSpreadsheet(calc());sheet.set('A1','1').set('A2','3').set('A3','5');
  sheet.set('B1','=Sum(A1:A4)+Mean(A1:A3)+Count(A1:A4)');assert.equal(sheet.value('B1'),15);
  sheet.set('B2','=Median(A1:A3)+StdDev(A1:A3)');assert.equal(sheet.value('B2'),5);sheet.set('C1','1e3');assert.equal(sheet.value('C1'),1000);
});
test('CG spreadsheet range copy and fill preserve absolute/relative references',()=>{
  const sheet=new CGSpreadsheet(calc());sheet.set('A1','2').set('A2','3').set('B1','=$A$1+A1').copy('B1','C2');assert.equal(sheet.source('C2'),'=$A$1+B2');
  sheet.fill('B1:B2','=A1*2');assert.equal(sheet.value('B2'),6);sheet.copy('A1:A2','D1');assert.equal(sheet.value('D2'),3);sheet.copy('D1','E1',true);assert.equal(sheet.source('D1'),'');assert.equal(sheet.value('E1'),2);
  assert.equal(shiftCGReferences('=$A1+A$1+$A$1',1,2),'=$A3+B$1+$A$1');assert.equal(cgRange('Y998:Z999').length,4);
});
test('CG spreadsheet rejects circular, unsafe and out-of-range entries without changing cells',()=>{
  const sheet=new CGSpreadsheet(calc());sheet.set('A1','1').set('B1','=A1');assert.throws(()=>sheet.set('A1','=B1'),/循环/);assert.equal(sheet.value('A1'),1);
  for(const [a,s]of [['AA1','1'],['A1000','1'],['A1','=A1.constructor'],['A1','=import("x")']])assert.throws(()=>sheet.set(a,s));
});

test('CG spreadsheet preserves quoted and prefixed text, case, spaces and text references',()=>{
  const sheet=new CGSpreadsheet(calc());sheet.set('A1','"X A1"').set('A2',"'  Hello  ").set('A3','"Native text');
  assert.equal(sheet.value('A1'),'X A1');assert.equal(sheet.value('A2'),'  Hello  ');assert.equal(sheet.value('A3'),'Native text');
  sheet.set('B1','=A1');assert.equal(sheet.value('B1'),'X A1');sheet.set('A1','"Y B2"');assert.equal(sheet.value('B1'),'Y B2');
  const restored=new CGSpreadsheet(calc(),sheet.serialize());assert.equal(restored.value('A2'),'  Hello  ');assert.equal(restored.value('B1'),'Y B2');
});

test('CG spreadsheet text functions and native CellIf preserve strings without coercing arithmetic',()=>{
  const sheet=new CGSpreadsheet(calc());sheet.set('A1','"X A1"').set('A2','4');
  sheet.set('B1','=Concat(Left(A1,1),"-",Right(A1,2))');assert.equal(sheet.value('B1'),'X-A1');
  sheet.set('B2','=Len(A1)+A2');assert.equal(sheet.value('B2'),8);
  sheet.set('B3','=CellIf(A1="X A1",Upper("ok"),"no")');assert.equal(sheet.value('B3'),'OK');
  sheet.set('B4','=CellIf(A2>0,Mid("ABCDE",2,3),"no")');assert.equal(sheet.value('B4'),'BCD');
  assert.throws(()=>sheet.set('A2','=A1+1'),/文本/);assert.equal(sheet.value('A2'),4);
  assert.throws(()=>sheet.set('B1','=A1*2'),/文本/);assert.equal(sheet.value('B1'),'X-A1');
});

test('CG CellIf is lazy for unused errors, self references, ranges and missing final parenthesis',()=>{
  const sheet=new CGSpreadsheet(calc());sheet.set('A1','0').set('A2','=CellIf(A1=0,7,1/A1)');assert.equal(sheet.value('A2'),7);
  sheet.set('B1','=CellIf(1,"saved",B1)');assert.equal(sheet.value('B1'),'saved');
  sheet.set('C1','=1/2').set('C2','=1/4').set('D1','=CellSum(C1:C2)');assert.equal(sheet.value('D1'),.75);
  sheet.set('D2','=CellIf(A1=0,9,CellSum(Z998:Z999))');assert.equal(sheet.value('D2'),9);
  sheet.set('D3','=CellIf(A1=0,12,1/0');assert.equal(sheet.value('D3'),12);
  assert.throws(()=>sheet.set('D3','=CellIf(1,1,import("unsafe"))'),/函数|算式/);
});

test('native cell aggregates ignore text and text-like references are not shifted',()=>{
  const sheet=new CGSpreadsheet(calc());sheet.set('A1','1').set('A2','"text"').set('A3','3');
  sheet.set('B1','=CellSum(A1:A3)+CellMean(A1:A3)+Count(A1:A3)+CountA(A1:A3)');assert.equal(sheet.value('B1'),11);
  sheet.set('B2','=Concat("A1",Text(A1))');sheet.copy('B2','C3');assert.equal(sheet.source('C3'),'=Concat("A1",Text(B2))');
  assert.equal(shiftCGReferences('=Concat("A1",A1,"X")',1,1),'=Concat("A1",B2,"X")');
  sheet.fill('D1:D2','"A1"');assert.equal(sheet.value('D2'),'A1');
});

test('CG spreadsheet enforces bounded text storage transactionally for set/copy/fill',()=>{
  const sheet=new CGSpreadsheet(calc());sheet.set('Z999','7');const before=sheet.serialize();
  assert.throws(()=>sheet.fill('A1:A30','"'+'x'.repeat(1100)+'"'),/30KB/);assert.deepEqual(sheet.serialize(),before);
  sheet.fill('A1:A19','"'+'y'.repeat(1400)+'"');assert.ok(sheet.usedBytes()<CG_SHEET_CAPACITY);const cells=sheet.serialize();
  assert.throws(()=>sheet.copy('A1:A19','B1'),/30KB/);assert.deepEqual(sheet.serialize(),cells);
  assert.throws(()=>sheet.set('C1','"'+'z'.repeat(1501)+'"'),/过长/);
});
test('explicit and two coupled first-order recursions use simultaneous old values',()=>{
  assert.deepEqual(generateRecursion(calc(),{type:'explicit',expressions:['n^2','n+1'],start:1,end:3}),[{n:1,a:1,b:2},{n:2,a:4,b:3},{n:3,a:9,b:4}]);
  const rows=generateRecursion(calc(),{type:'first',expressions:['a+b','a-b'],initial:{a0:1,b0:2},end:2});assert.deepEqual(rows,[{n:0,a:1,b:2},{n:1,a:3,b:-1},{n:2,a:2,b:4}]);
});
test('second-order recursion generates Fibonacci and exposes unambiguous n/a0/a1 aliases',()=>{
  const rows=generateRecursion(calc(),{type:'second',expressions:['a1+a0'],initial:{a0:0,a1:1},end:8});assert.deepEqual(rows.map(r=>r.a),[0,1,1,2,3,5,8,13,21]);
  const nRows=generateRecursion(calc(),{type:'second',expressions:['n'],initial:{a0:9,a1:8},start:2,end:4});assert.deepEqual(nRows.map(r=>r.a),[0,1,2]);
});

test('three recursion sequences use independent outputs and simultaneous coupled updates',()=>{
  const explicit=generateRecursion(calc(),{type:'explicit',expressions:['n','2*n','3*n'],start:1,end:2});assert.deepEqual(explicit,[{n:1,a:1,b:2,c:3},{n:2,a:2,b:4,c:6}]);
  const coupled=generateRecursion(calc(),{type:'first',expressions:['b','c','a'],initial:{a0:1,b0:2,c0:3},end:2});assert.deepEqual(coupled,[{n:0,a:1,b:2,c:3},{n:1,a:2,b:3,c:1},{n:2,a:3,b:1,c:2}]);
  const second=generateRecursion(calc(),{type:'second',expressions:['a1+a0','','c1+c0+n'],initial:{a0:0,a1:1,c0:0,c1:1},end:4});assert.deepEqual(second.map(row=>row.c),[0,1,1,3,6]);
  assert.deepEqual(generateRecursion(calc(),{type:'explicit',expressions:['','','n^2'],start:1,end:2}),[{n:1,a:null,b:null,c:1},{n:2,a:null,b:null,c:4}]);
});
test('recursion rejects runaway ranges and reports undefined numerical results',()=>{
  assert.throws(()=>generateRecursion(calc(),{end:10000}),/超出/);assert.throws(()=>generateRecursion(calc(),{step:0}));assert.throws(()=>generateRecursion(calc(),{type:'first',expressions:['1/0']}),/n=0/);
});
test('graph tables preserve holes and model variables while sampling several functions',()=>{
  const c=calc();c.assign('x',99);const rows=graphTable(c,['x^2','1/x'],-1,1,1);assert.deepEqual(rows.map(r=>r.values[0]),[1,0,1]);assert.equal(rows[1].values[1],null);assert.ok(rows[1].errors[1]);assert.equal(c.vars.x,99);
});

test('graph table parameter aliases cover T/t/theta/θ without overwriting stored model values',()=>{
  const c=calc();c.assign('T',99);c.assign('y',88);
  const rows=graphTable(c,['T^2','t+theta+θ'],1,2,1);assert.deepEqual(rows.map(row=>row.values),[[1,3],[4,6]]);assert.equal(c.vars.T,99);
  const typed=graphTable(c,['T*x','T^2','theta+θ','y^2'],1,2,1,{variables:['x','T','theta','y']});assert.deepEqual(typed.map(row=>row.values),[[99,1,2,1],[198,4,4,4]]);assert.equal(c.vars.T,99);assert.equal(c.vars.y,88);
  assert.equal(graphTable(c,Array(40).fill('x'),0,0,1)[0].values.length,40);
});
test('dynamic parameter frames never mutate the calculator and retain sample errors',()=>{
  const c=calc();c.assign('A',9);c.assign('x',8);const frames=dynamicFrames(c,{expression:'A*x',parameter:'A',start:1,end:3,step:1,xmin:-1,xmax:1,samples:16});assert.equal(frames.length,3);near(frames[2].points.at(-1).y,3);assert.equal(c.vars.A,9);assert.equal(c.vars.x,8);
  assert.throws(()=>dynamicFrames(c,{expression:'x',parameter:'X'}));
});
test('circle and rotated-axis ellipse samples satisfy their equations and focal geometry',()=>{
  const circle=conicSamples({type:'circle',h:1,k:2,r:3},{samples:32});for(const p of circle.segments[0])near((p.x-1)**2+(p.y-2)**2,9);
  const ellipse=conicSamples({type:'ellipse',h:1,k:2,a:5,b:3,orientation:'vertical'},{samples:32});assert.deepEqual(ellipse.foci,[{x:1,y:6},{x:1,y:-2}]);for(const p of ellipse.segments[0])near((p.y-2)**2/25+(p.x-1)**2/9,1);
});
test('hyperbola and signed parabola samples preserve both branches and their conic equations',()=>{
  const h=conicSamples({type:'hyperbola',a:3,b:2},{samples:32});assert.equal(h.segments.length,2);for(const branch of h.segments)for(const p of branch)near(p.x**2/9-p.y**2/4,1);near(h.foci[0].x,Math.sqrt(13));
  const p=conicSamples({type:'parabola',h:2,k:3,p:-2,orientation:'vertical'},{samples:32});for(const q of p.segments[0])near((q.x-2)**2,-8*(q.y-3));assert.deepEqual(p.directrix,{axis:'y',value:5});assert.deepEqual(p.foci,[{x:2,y:1}]);
  assert.throws(()=>conicRelations({type:'circle',r:0}));assert.throws(()=>conicRelations({type:'ellipse',a:1,b:2}));
});
