import test from 'node:test';
import assert from 'node:assert/strict';
import {ModelCalculator} from '../src/engine/model-calculator.js';
import {geometryObject,geometryIntersections,pointDistance,polygonMeasure} from '../src/engine/cg-geometry.js';
import {sanitizeCGGeometryState} from '../src/engine/cg-geometry-state.js';
import {addGeometryPoint,addGeometryObject,addGeometryShape,constructGeometry,transformGeometry,updateGeometryConstructions,deleteGeometrySelection,geometryTransformPoint,geometryShapeVertices} from '../src/engine/cg-geometry-tools.js';

const near=(a,b,t=1e-8)=>assert.ok(Math.abs(a-b)<=t*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const state=()=>sanitizeCGGeometryState({});
const p=(s,x,y)=>addGeometryPoint(s,{x,y});
const line=(s,a,b,kind='segment')=>addGeometryObject(s,{kind,a:a.id,b:b.id});
test('ray and vector intersections respect their directed/finite domains',()=>{
  const horizontal={a:{x:0,y:0},b:{x:1,y:0}},vertical=x=>({kind:'line',a:{x,y:-1},b:{x,y:1}});
  assert.deepEqual(geometryIntersections({...horizontal,kind:'ray'},vertical(-1)),[]);
  assert.deepEqual(geometryIntersections({...horizontal,kind:'ray'},vertical(3)),[{x:3,y:0}]);
  assert.deepEqual(geometryIntersections({...horizontal,kind:'vector'},vertical(3)),[]);
});
test('arcs and diameter semicircles use counterclockwise sweeps and filter intersections',()=>{
  const s=state(),c=p(s,0,0),start=p(s,1,0),end=p(s,0,4),arc=geometryObject(s,addGeometryObject(s,{kind:'arc',center:c.id,edge:start.id,end:end.id}));
  near(arc.radius,1);near(arc.sweep,Math.PI/2);
  const crossing={kind:'line',a:{x:-2,y:.5},b:{x:2,y:.5}};const intersections=geometryIntersections(arc,crossing);assert.equal(intersections.length,1);near(intersections[0].x,Math.sqrt(.75));
  const semi=geometryObject(s,addGeometryObject(s,{kind:'semicircle',a:start.id,b:p(s,-1,0).id}));near(semi.sweep,Math.PI);assert.equal(geometryIntersections(semi,crossing).length,2);assert.equal(geometryIntersections(semi,{...crossing,a:{x:-2,y:-.5},b:{x:2,y:-.5}}).length,0);
});
test('manual two-point square takes shorter boundary side; regular polygons have 3–12 equal sides',()=>{
  const square=geometryShapeVertices('square',{x:2,y:3},{x:8,y:5});near(polygonMeasure(square).area,4);
  const triangle=geometryShapeVertices('isosceles',{x:0,y:0},{x:6,y:4});near(pointDistance(triangle[0],triangle[2]),pointDistance(triangle[1],triangle[2]));
  for(const count of [3,5,12]){const points=geometryShapeVertices('regular',{x:-3,y:-2},{x:3,y:2},count),side=pointDistance(points[0],points[1]);for(let i=0;i<count;i++)near(pointDistance(points[i],points[(i+1)%count]),side);}
  for(const n of [2,13,4.5])assert.throws(()=>geometryShapeVertices('regular',{x:0,y:0},{x:2,y:2},n),/3–12/);
});
test('perpendicular and both angle bisectors stay dependent after source dragging',()=>{
  const s=state(),a=p(s,-2,0),b=p(s,2,0),c=p(s,0,-2),d=p(s,0,2),horizontal=line(s,a,b),vertical=line(s,c,d);
  constructGeometry(s,'perpBisector',[horizontal.id]);constructGeometry(s,'angleBisector',[horizontal.id,vertical.id]);
  const bisectors=s.objects.filter(o=>o.kind==='line');assert.equal(bisectors.length,3);
  let resolved=geometryObject(s,bisectors[0]);near(resolved.a.x,0);near(resolved.b.x,0);
  b.y=2;updateGeometryConstructions(s);resolved=geometryObject(s,bisectors[0]);near(resolved.a.x,0);near(resolved.a.y,1);near((resolved.b.x-resolved.a.x)*4+(resolved.b.y-resolved.a.y)*2,0);
  assert.equal(s.points.filter(p=>p.invalid).length,0);
});
test('circle/arc and radian function tangents follow their source data',()=>{
  const s=state(),c=p(s,0,0),edge=p(s,2,0),circle=addGeometryObject(s,{kind:'circle',center:c.id,edge:edge.id});constructGeometry(s,'tangent',[circle.id],{parameter:Math.PI/2});
  let tangent=geometryObject(s,s.objects.at(-1));near(tangent.a.x,0);near(tangent.a.y,2);near(tangent.b.y,2);
  edge.x=4;updateGeometryConstructions(s);tangent=geometryObject(s,s.objects.at(-1));near(tangent.a.y,4);
  const fn=addGeometryObject(s,{kind:'function',expression:'sin(x)'}),calc=new ModelCalculator('cg50');calc.angle='Deg';constructGeometry(s,'tangent',[fn.id],{parameter:0},{calculator:calc});tangent=geometryObject(s,s.objects.at(-1));near(tangent.a.y,0);near(tangent.b.y-tangent.a.y,1,1e-6);assert.equal(calc.angle,'Deg');
});
test('reflection, vector translation, CCW degree rotation, dilation and point symmetry are Euclidean',()=>{
  const s=state(),center=p(s,1,1),a=p(s,0,0),b=p(s,3,4),vector=line(s,a,b,'vector'),target={x:3,y:1};
  assert.deepEqual(geometryTransformPoint(s,target,{type:'reflection',axis:'y'}),{x:-3,y:1});
  assert.deepEqual(geometryTransformPoint(s,target,{type:'vector',vector:vector.id}),{x:6,y:5});
  const rotated=geometryTransformPoint(s,target,{type:'rotation',center:center.id,angle:90});near(rotated.x,1);near(rotated.y,3);
  assert.deepEqual(geometryTransformPoint(s,target,{type:'dilation',center:center.id,scale:-2}),{x:-3,y:1});
  const symmetric=geometryTransformPoint(s,target,{type:'symmetry',center:center.id});near(symmetric.x,-1);near(symmetric.y,1);
  for(const scale of [.1,-.1,10,-10,0])assert.throws(()=>geometryTransformPoint(s,target,{type:'dilation',center:center.id,scale}),/0.1/);
});
test('reflecting an arc preserves the reflected portion instead of drawing its complementary sweep',()=>{
  const s=state(),center=p(s,0,0),edge=p(s,2,0),end=p(s,0,3),arc=addGeometryObject(s,{kind:'arc',center:center.id,edge:edge.id,end:end.id});
  const result=transformGeometry(s,[arc.id],{type:'reflection',axis:'y'}),reflected=geometryObject(s,s.objects.find(o=>o.id===result.at(-1)));
  near(reflected.radius,2);near(reflected.start,Math.PI/2);near(reflected.sweep,Math.PI/2);const crossings=geometryIntersections(reflected,{kind:'line',a:{x:-3,y:1},b:{x:3,y:1}});assert.equal(crossings.length,1);assert.ok(crossings[0].x<0);
});
test('deep chained transformed shapes resolve live references after JSON persistence and source movement',()=>{
  const s=state(),a=p(s,0,0),b=p(s,4,3),rect=addGeometryShape(s,'rectangle',a.id,b.id);let selection=[rect.id];
  for(let i=0;i<8;i++){const result=transformGeometry(s,selection,{type:'translation',dx:1,dy:2});selection=[result.at(-1)];}
  const restored=sanitizeCGGeometryState(JSON.parse(JSON.stringify(s)));restored.points.find(p=>p.id===b.id).x=6;updateGeometryConstructions(restored);
  const final=geometryObject(restored,restored.objects.find(o=>o.id===selection[0]));near(final.points[2].x,14);near(final.points[2].y,19);assert.equal(restored.points.filter(p=>p.invalid).length,0);
  deleteGeometrySelection(restored,[a.id]);assert.ok(!restored.objects.some(o=>o.id===selection[0]));
});
test('dependency invalidity propagates and recovers rather than drawing stale coordinates',()=>{
  const s=state(),a=p(s,0,0),b=p(s,1,0),l=line(s,a,b);constructGeometry(s,'perpBisector',[l.id]);const dep=s.points.at(-1);b.x=0;updateGeometryConstructions(s);assert.equal(dep.invalid,true);assert.throws(()=>geometryObject(s,s.objects.at(-1)),/无效/);b.x=2;updateGeometryConstructions(s);assert.equal(dep.invalid,false);
});
test('geometry persistence retains new object kinds, bounded labels/text, styling and transformation references',()=>{
  const s=state(),a=p(s,0,0),b=p(s,2,0),end=p(s,0,2);for(const kind of ['ray','vector','semicircle'])line(s,a,b,kind);addGeometryObject(s,{kind:'arc',center:a.id,edge:b.id,end:end.id,label:'long label text beyond 14',color:'#123456',style:'thick'});addGeometryObject(s,{kind:'text',anchor:a.id,text:'x'.repeat(80)});
  const restored=sanitizeCGGeometryState(s);assert.deepEqual(restored.objects.map(o=>o.kind),['ray','vector','semicircle','arc','text']);assert.equal(restored.objects.at(-1).text.length,31);assert.equal(restored.objects[3].label.length,14);assert.equal(restored.objects[3].style,'thick');
});
