import test from 'node:test';
import assert from 'node:assert/strict';
import {ModelCalculator} from '../src/engine/model-calculator.js';
import {sanitizeCGGeometryState} from '../src/engine/cg-geometry-state.js';
import {addGeometryPoint,addGeometryObject,updateGeometryConstructions} from '../src/engine/cg-geometry-tools.js';
import {geometryMeasure,geometryMeasurementTypes,geometryAreaIsAmbiguous,lockGeometryMeasurement,solveGeometryConstraints,clearGeometryConstraints,evaluateGeometryExpression} from '../src/engine/cg-geometry-measurements.js';
import {addGeometryAnimation,geometryAnimationConfig,validateGeometryAnimation,geometryAnimationFrame,geometryAnimationTable} from '../src/engine/cg-geometry-animation.js';
const near=(a,b,t=1e-6)=>assert.ok(Math.abs(a-b)<=t*Math.max(1,Math.abs(b)),`${a} != ${b}`),state=()=>sanitizeCGGeometryState({}),p=(s,x,y)=>addGeometryPoint(s,{x,y}),line=(s,a,b)=>addGeometryObject(s,{kind:'segment',a:a.id,b:b.id});
test('measurement palette covers coordinates/length/vector/radius/area/equation and geometric relations',()=>{
  const s=state(),a=p(s,0,0),b=p(s,3,4),l=line(s,a,b);assert.deepEqual(geometryMeasurementTypes(s,[a.id]),['coordinates','label']);near(geometryMeasure(s,{type:'length',selection:[l.id]}),5);assert.equal(geometryMeasure(s,{type:'slope',selection:[l.id]}),4/3);assert.match(geometryMeasure(s,{type:'equation',selection:[l.id]}),/^y=/);
  const circle=addGeometryObject(s,{kind:'circle',center:a.id,edge:b.id});near(geometryMeasure(s,{type:'area',selection:[circle.id]}),25*Math.PI);assert.ok(geometryMeasurementTypes(s,[a.id,l.id]).includes('incidence'));
});
test('editable coordinates and length locks solve together and persist, rather than displaying a fake requested value',()=>{
  const s=state(),a=p(s,0,0),b=p(s,3,4),l=line(s,a,b);lockGeometryMeasurement(s,{type:'coordinates',selection:[a.id]},{x:0,y:0});lockGeometryMeasurement(s,{type:'length',selection:[l.id]},10);near(a.x,0);near(a.y,0);near(Math.hypot(b.x,b.y),10);
  const restored=sanitizeCGGeometryState(JSON.parse(JSON.stringify(s)));assert.equal(restored.constraints.length,2);restored.points[1].x+=2;solveGeometryConstraints(restored);near(geometryMeasure(restored,{type:'length',selection:[l.id]}),10);near(restored.points[0].x,0);
});
test('source dragging preserves locked length while moving the unpinned endpoint; conflicting locked coordinates fail and restore',()=>{
  const s=state(),a=p(s,0,0),b=p(s,3,4),l=line(s,a,b);lockGeometryMeasurement(s,{type:'length',selection:[l.id]},5);a.x=2;solveGeometryConstraints(s,{pinned:[a.id]});near(a.x,2);near(geometryMeasure(s,{type:'length',selection:[l.id]}),5);
  lockGeometryMeasurement(s,{type:'coordinates',selection:[a.id]},{x:2,y:0});a.x=4;assert.throws(()=>solveGeometryConstraints(s,{pinned:[a.id]}),/cannot|prevent/);near(a.x,4);clearGeometryConstraints(s);assert.equal(s.constraints.length,0);
});
test('angle/slope, incidence, congruence and radius constraints have actual geometric residuals',()=>{
  const s=state(),a=p(s,0,0),b=p(s,4,1),c=p(s,0,0),d=p(s,1,4),first=line(s,a,b),second=line(s,c,d);
  lockGeometryMeasurement(s,{type:'slope',selection:[first.id]},0);near(geometryMeasure(s,{type:'slope',selection:[first.id]}),0);
  lockGeometryMeasurement(s,{type:'angle',selection:[first.id,second.id]},90);near(geometryMeasure(s,{type:'angle',selection:[first.id,second.id]}),90);
  lockGeometryMeasurement(s,{type:'congruence',selection:[first.id,second.id]},0);near(geometryMeasure(s,{type:'congruence',selection:[first.id,second.id]}),0);
  const q=p(s,2,2);lockGeometryMeasurement(s,{type:'incidence',selection:[q.id,first.id]},0);near(geometryMeasure(s,{type:'incidence',selection:[q.id,first.id]}),0);
  const circle=addGeometryObject(s,{kind:'circle',center:a.id,edge:b.id});lockGeometryMeasurement(s,{type:'radius',selection:[circle.id]},3);near(geometryMeasure(s,{type:'radius',selection:[circle.id]}),3);
});
test('pasted measurement expressions use @n and @nX/Y live values, reject missing/circular references and do not execute code',()=>{
  const s=state(),a=p(s,1,2),b=p(s,4,6),anchor=p(s,0,0),l=line(s,a,b),m=addGeometryObject(s,{kind:'measurement',anchor:anchor.id,descriptor:{type:'length',selection:[l.id]}}),coords=addGeometryObject(s,{kind:'measurement',anchor:anchor.id,descriptor:{type:'coordinates',selection:[a.id]}}),calc=new ModelCalculator('cg50');
  const expr={expression:'@1+@2X+@2Y',references:[m.id,coords.id]};near(evaluateGeometryExpression(s,expr,calc),8);a.x=2;near(evaluateGeometryExpression(s,expr,calc),Math.hypot(2,4)+4);assert.throws(()=>evaluateGeometryExpression(s,{...expr,expression:'@3'},calc));assert.throws(()=>evaluateGeometryExpression(s,{...expr,expression:'import("fs")'},calc));
});
test('multiple animation pairs run simultaneously with the manual Steps/Times and t0/t1 domains',()=>{
  const s=state(),a=p(s,0,0),b=p(s,10,0),l=line(s,a,b),q=p(s,0,2),center=p(s,2,2),edge=p(s,3,2),circle=addGeometryObject(s,{kind:'circle',center:center.id,edge:edge.id}),r=p(s,3,3);addGeometryAnimation(s,q.id,l.id);addGeometryAnimation(s,r.id,circle.id);geometryAnimationFrame(s,.25);near(q.x,2.5);near(q.y,0);near(r.x,2);near(r.y,3);assert.equal(s.animation.pairs.length,2);s.animation.pairs[0].t0=-1;s.animation.pairs[0].t1=2;geometryAnimationFrame(s,1);near(q.x,20);
  for(const steps of [1,101,2.5])assert.throws(()=>validateGeometryAnimation({...s.animation,steps}),/2–100/);for(const t0 of [-11,11])assert.throws(()=>validateGeometryAnimation({...s.animation,pairs:[{...s.animation.pairs[0],t0}]}),/10/);
});
test('animation tables evaluate every configured step and multiple columns without mutating the saved drawing',()=>{
  const s=state(),a=p(s,0,0),b=p(s,10,0),l=line(s,a,b),q=p(s,0,2);addGeometryAnimation(s,q.id,l.id);const config=geometryAnimationConfig(s);config.steps=4;config.columns=[{label:'X',descriptor:{type:'coordinates',selection:[q.id]},component:'x'},{label:'Y',descriptor:{type:'coordinates',selection:[q.id]},component:'y'}];const before=JSON.stringify(s),table=geometryAnimationTable(s);assert.deepEqual(table.rows,[[0,0],[2.5,0],[5,0],[7.5,0],[10,0]]);assert.equal(JSON.stringify(s),before);const restored=sanitizeCGGeometryState(s);assert.equal(restored.animation.columns.length,2);assert.equal(restored.animation.steps,4);
});
test('manual parabola locus keeps the directrix/focus fixed while angle and congruence locks solve the traced point',()=>{
  const s=state(),a=p(s,-5,0),b=p(s,5,0),focus=p(s,0,2),d=p(s,1,1.25),e=p(s,1,0),base=line(s,a,b),de=line(s,d,e),dc=line(s,d,focus);lockGeometryMeasurement(s,{type:'angle',selection:[base.id,de.id]},90);lockGeometryMeasurement(s,{type:'congruence',selection:[de.id,dc.id]},0);addGeometryAnimation(s,e.id,base.id);
  for(const fraction of [.2,.4,.6,.8]){geometryAnimationFrame(s,fraction);near(focus.x,0);near(focus.y,2);near(a.x,-5);near(b.x,5);near(d.x,e.x);near(d.y,(d.x*d.x+4)/4);}
});
test('incidence respects finite vector/arc domains and crossed polygons receive the manual area ambiguity warning',()=>{
  const s=state(),a=p(s,0,0),b=p(s,1,0),outside=p(s,2,0),vector=addGeometryObject(s,{kind:'vector',a:a.id,b:b.id});near(geometryMeasure(s,{type:'incidence',selection:[outside.id,vector.id]}),1);
  const end=p(s,0,1),arc=addGeometryObject(s,{kind:'arc',center:a.id,edge:b.id,end:end.id}),wrong=p(s,-1,0);assert.ok(geometryMeasure(s,{type:'incidence',selection:[wrong.id,arc.id]})>1);
  const vertices=[p(s,0,0),p(s,2,2),p(s,0,2),p(s,2,0)],crossed=addGeometryObject(s,{kind:'polygon',vertices:vertices.map(p=>p.id)});assert.equal(geometryAreaIsAmbiguous(s,{type:'area',selection:[crossed.id]}),true);
});
