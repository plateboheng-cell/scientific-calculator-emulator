import test from 'node:test';
import assert from 'node:assert/strict';
import {Calculator} from '../src/engine/calculator.js';
import {ModelCalculator} from '../src/engine/model-calculator.js';
import {graphRelationPoint,sampleGraphRelations,validateGraphParameter,graphCoordinateWindow} from '../src/engine/graph.js';

const near=(a,b,tol=1e-9)=>assert.ok(Math.abs(a-b)<tol*Math.max(1,Math.abs(b)),`${a} differs from ${b}`);
const window={xmin:-3,xmax:3,ymin:-3,ymax:3,samples:64};

test('polar points use degree/radian/gradian theta while preserving all calculator variables',()=>{
  const calc=new ModelCalculator('cg50',{vars:{x:21,A:7,Ans:18}});
  for(const [angle,quarter] of [['Deg',90],['Rad',Math.PI/2],['Gra',100]]){
    calc.angle=angle;const before=calc.save();
    const p=graphRelationPoint(calc,{type:'polar',expression:'2*sin(theta)'},quarter);
    near(p.x,0);near(p.y,2);near(p.r,2);near(p.parameter,quarter);
    assert.deepEqual(calc.save(),before);
  }
});

test('parametric pair evaluates T independently of stored T and x variables',()=>{
  const calc=new ModelCalculator('cg50',{vars:{T:99,x:17,Ans:18}}),before=calc.save();
  assert.deepEqual(graphRelationPoint(calc,{type:'parametric',expression:'2*T',expression2:'T^2'},3),{x:6,y:9,parameter:3});
  assert.deepEqual(calc.save(),before);
});

test('X=f(Y) plots and traces the vertical relation instead of swapping the view window',()=>{
  const calc=new Calculator(),r={type:'x',expression:'y^2'};
  assert.deepEqual(graphRelationPoint(calc,r,-2),{x:4,y:-2,parameter:-2});
  const points=sampleGraphRelations(calc,[r],window).curves[0].segments.flat();
  assert.ok(points.some(p=>p.y<0));assert.ok(points.some(p=>p.y>0));
  for(const p of points)near(p.x,p.y**2);
});

test('mixed graph list retains original slot indices, relation type, and inequality boundaries',()=>{
  const curves=sampleGraphRelations(new Calculator(),[{type:'y',expression:'x'},{expression:''},{type:'x>=',expression:'y^2'}],window).curves;
  assert.deepEqual(curves.map(c=>[c.index,c.type]),[[0,'y'],[2,'x>=']]);
  for(const p of curves[1].segments.flat())near(p.x,p.y**2);
});

test('polar and parametric circle samples are closed and stay on the mathematical circle',()=>{
  const calc=new Calculator();calc.angle='Rad';
  for(const relation of [{type:'polar',expression:'2'},{type:'parametric',expression:'2*cos(T)',expression2:'2*sin(T)'}]){
    const curve=sampleGraphRelations(calc,[relation],window,{min:0,max:2*Math.PI,step:Math.PI/8}).curves[0];
    assert.equal(curve.segments.length,1);const points=curve.segments[0];
    for(const p of points)near(p.x**2+p.y**2,4);
    near(points[0].x,points.at(-1).x);near(points[0].y,points.at(-1).y);
  }
});

test('parameter range can run backwards and includes both requested endpoints',()=>{
  const curve=sampleGraphRelations(new Calculator(),[{type:'parametric',expression:'T',expression2:'T^2'}],window,{min:2,max:-2,step:.3}).curves[0];
  assert.equal(curve.segments[0][0].parameter,2);assert.equal(curve.segments.at(-1).at(-1).parameter,-2);
  assert.equal(validateGraphParameter({min:2,max:-2,step:.3}).step,-.3);
});

test('adaptive X graph sampling breaks at a horizontal-axis pole',()=>{
  const curve=sampleGraphRelations(new Calculator(),[{type:'x',expression:'1/(y-0.12345)'}],window).curves[0];
  assert.ok(curve.segments.length>=2);
  for(const segment of curve.segments)for(let i=1;i<segment.length;i++)assert.ok(!(segment[i-1].y<.12345&&segment[i].y>.12345));
});

test('invalid relation pairs/types and excessive parameter budgets fail explicitly',()=>{
  const calc=new Calculator();
  for(const relation of [{type:'parametric',expression:'T',expression2:''},{type:'wrong',expression:'x'},{type:'polar',expression:'Ran()'}])assert.throws(()=>sampleGraphRelations(calc,[relation],window));
  for(const parameter of [{min:0,max:1,step:0},{min:0,max:0,step:1},{min:0,max:1,step:1e-10},{min:NaN,max:1,step:1}])assert.throws(()=>validateGraphParameter(parameter));
});

test('integer zoom sets one mathematical unit per screen dot at integral coordinates',()=>{
  const v=graphCoordinateWindow(window,384,216,true);
  assert.equal(v.xmax-v.xmin,383);assert.equal(v.ymax-v.ymin,215);
  assert.equal(Number.isInteger(v.xmin),true);assert.equal(Number.isInteger(v.ymin),true);
});

test('coordinate rounding produces decimal dot spacing while retaining the center',()=>{
  const v=graphCoordinateWindow(window,384,216,false);
  near((v.xmax-v.xmin)/383,.02);near((v.ymax-v.ymin)/215,.05);
  assert.ok(v.xmin<0&&v.xmax>0&&v.ymin<0&&v.ymax>0);
});
