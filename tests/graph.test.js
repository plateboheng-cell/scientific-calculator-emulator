import test from 'node:test';
import assert from 'node:assert/strict';
import {Calculator} from '../src/engine/calculator.js';
import {ModelCalculator} from '../src/engine/model-calculator.js';
import {sampleGraph,graphValue,graphRoot,graphIntersection,graphExtremum,validateGraphWindow} from '../src/engine/graph.js';

const near=(actual,expected,tolerance=1e-10)=>assert.ok(Math.abs(actual-expected)<=tolerance*Math.max(1,Math.abs(expected)),`${actual} ≠ ${expected}`);
const points=curve=>curve.segments.flat();

test('G-Solv extrema resolve parabola vertices at ordinary and tiny scales',()=>{
  const calc=new Calculator();
  for(const scale of [1,1e-24,1e24]){
    const min=graphExtremum(calc,`${scale}*((x-1.25)^2+3)`,-5,5,'min');
    near(min.x,1.25,1e-7);near(min.y/scale,3,1e-10);
    const max=graphExtremum(calc,`-${scale}*(x+2)^2+${scale}*4`,-5,5,'max');
    near(max.x,-2,1e-7);near(max.y/scale,4,1e-10);
  }
});

test('G-Solv rejects monotonic functions, constants and poles as extrema',()=>{
  const calc=new Calculator();
  for(const expr of ['x','7','1/(x-0.12345)','sqrt(x)'])for(const kind of ['min','max'])
    assert.throws(()=>graphExtremum(calc,expr,-2,2,kind),/极值/);
});

test('G-Solv official intersection example finds both crossings without state mutation',()=>{
  const calc=new ModelCalculator('cg50',{vars:{x:19,Ans:7}}),before=calc.save();
  const first=graphIntersection(calc,'x+1','x^2',-3,0),second=graphIntersection(calc,'x+1','x^2',0,3);
  near(first.x,(1-Math.sqrt(5))/2);near(first.y,first.x**2);
  near(second.x,(1+Math.sqrt(5))/2);near(second.y,second.x**2);
  assert.throws(()=>graphIntersection(calc,'1/(x-0.12345)','0',-1,1));
  assert.deepEqual(calc.save(),before);
});

test('graph root does not mistake exponential underflow for a real zero',()=>{
  assert.throws(()=>graphRoot(new Calculator(),'exp(-x)',0,1000),/实根/);
});

test('Cartesian samples preserve x/y coordinates and blank relation slots',()=>{
  const result=sampleGraph(new Calculator(),['x^2','','2*x+1'],{xmin:-2,xmax:2,ymin:-1,ymax:5,samples:64});
  assert.deepEqual(result.window,{xmin:-2,xmax:2,ymin:-1,ymax:5});
  assert.equal(result.samples,64);assert.deepEqual(result.curves.map(curve=>curve.index),[0,2]);
  assert.equal(result.curves[0].segments.length,1);
  for(const p of points(result.curves[0]))near(p.y,p.x*p.x);
  near(points(result.curves[0])[0].x,-2);near(points(result.curves[0]).at(-1).x,2);
  assert.doesNotThrow(()=>JSON.stringify(result));
});

test('graph values share degree, radian and gradian semantics',()=>{
  const calc=new Calculator();
  near(graphValue(calc,'sin(x)',30),.5);
  calc.angle='Rad';near(graphValue(calc,'sin(x)',Math.PI/6),.5);
  calc.angle='Gra';near(graphValue(calc,'sin(x)',100),1);
});

test('sampling and tracing do not mutate calculator x, variables or Ans',()=>{
  const calc=new Calculator({vars:{x:123,A:7,Ans:91}}),saved=calc.save();
  near(graphValue(calc,'A*x',2),14);
  sampleGraph(calc,['x^2']);graphRoot(calc,'x-1',0,2);
  assert.deepEqual(calc.save(),saved);
});

test('sqrt has no plotted negative-domain points',()=>{
  const curve=sampleGraph(new Calculator(),['sqrt(x)'],{xmin:-2,xmax:2,samples:64}).curves[0];
  assert.ok(curve.invalidPoints>0);assert.ok(points(curve).length>1);
  assert.ok(points(curve).every(p=>p.x>=0&&p.y>=0));
  assert.throws(()=>graphValue(new Calculator(),'sqrt(x)',-1));
});

for(const pole of [0,.12345])test(`pole at ${pole} creates separate paths, never a crossing chord`,()=>{
  const curve=sampleGraph(new Calculator(),[`1/(x-${pole})`],{xmin:-1,xmax:1,ymin:-10,ymax:10,samples:64}).curves[0];
  assert.ok(curve.segments.length>=2);
  assert.ok(curve.segments.some(segment=>segment.some(p=>p.x<pole)));
  assert.ok(curve.segments.some(segment=>segment.some(p=>p.x>pole)));
  for(const segment of curve.segments)for(let i=1;i<segment.length;i++)assert.ok(!(segment[i-1].x<pole&&segment[i].x>pole));
});

test('large slopes remain connected when the function is linear',()=>{
  const curve=sampleGraph(new Calculator(),['1000000*x'],{xmin:-1,xmax:1,ymin:-10,ymax:10,samples:32}).curves[0];
  assert.equal(curve.segments.length,1);
  assert.ok(points(curve).some(p=>p.x===0&&p.y===0));
});

test('empty editor stays empty rather than plotting placeholder zero results',()=>{
  const result=sampleGraph(new Calculator(),['','','']);
  assert.deepEqual(result.curves,[]);assert.ok(result.warnings.length);
});

test('invalid syntax, side effects and unbounded/random per-pixel operations are rejected',()=>{
  const calc=new Calculator();
  for(const expression of ['A=2','import("x")','x+','Ran()','RanInt(1,6)','integral("x",0,1)','sum("x",1,10)'])assert.throws(()=>sampleGraph(calc,[expression]),expression);
  assert.equal(calc.vars.A,0);
  assert.throws(()=>sampleGraph(calc,[42]));
  assert.throws(()=>sampleGraph(calc,Array(21).fill('x')));
});

test('all-invalid and complex-valued functions report no real curve',()=>{
  const result=sampleGraph(new Calculator(),['sqrt(-1)','1/0']);
  assert.ok(result.curves.every(curve=>curve.segments.length===0));
  assert.equal(result.warnings.length,2);
  assert.throws(()=>graphValue(new Calculator(),'i',1));
});

test('registered aliases cannot hide expensive per-pixel calculus',()=>{
  const calc=new ModelCalculator('cncw');
  calc.define('f','integral("x^2",0,x)');
  assert.throws(()=>sampleGraph(calc,['f(x)']),/图形不支持/);
});

test('invalid and unrepresentable windows/sample budgets fail explicitly',()=>{
  for(const options of [{xmin:1,xmax:1},{ymin:3,ymax:2},{xmin:NaN},{xmax:Infinity},{xmax:1e99},{samples:0},{samples:31},{samples:2049},{samples:32.5}])assert.throws(()=>validateGraphWindow(options));
  assert.throws(()=>validateGraphWindow({xmin:1e12-0.001,xmax:1e12,samples:2048}),/精度/);
  assert.deepEqual(validateGraphWindow(),{xmin:-10,xmax:10,ymin:-10,ymax:10,samples:480});
});

test('graph roots scan for a valid bracket and return numerical roots',()=>{
  const calc=new Calculator();
  near(graphRoot(calc,'x^2-2',0,2),Math.sqrt(2));
  near(graphRoot(calc,'x^2-2',-3,3),-Math.sqrt(2));
  near(graphRoot(calc,'-2*x+40',0,30),20);
  assert.equal(graphRoot(calc,'x',0,1),0);
  assert.equal(graphRoot(calc,'x-1',0,1),1);
});

test('scaled and very small roots are not accepted merely for small residuals',()=>{
  const calc=new Calculator();
  near(graphRoot(calc,'1e-20*(x-0.12345)',0,1),.12345,1e-12);
  const tiny=graphRoot(calc,'x-1e-20',0,1);
  assert.ok(Math.abs(tiny/1e-20-1)<1e-12);
});

test('sign changes at poles and functions without real roots are never reported as roots',()=>{
  const calc=new Calculator();calc.angle='Rad';
  for(const expression of ['1/x','1/(x-0.12345)','x^2+1','1e-30/(x-0.12345)'])assert.throws(()=>graphRoot(calc,expression,-1,1),expression);
  assert.throws(()=>graphRoot(calc,'tan(x)',1,2));
  assert.throws(()=>graphRoot(calc,'x',2,1));
});
