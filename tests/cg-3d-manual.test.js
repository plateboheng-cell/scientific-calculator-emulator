import test from 'node:test';
import assert from 'node:assert/strict';
import {ModelCalculator} from '../src/engine/model-calculator.js';
import {resolveCG3DTemplate,sampleCG3DGraph,clipCG3DPolygon,crossSectionCG3D} from '../src/engine/cg-3d.js';
import {sanitizeCG3DState,sanitizeCG3DGraph,sanitizeCG3DWindow,CG3D_WINDOW,storeCG3DMemory,recallCG3DMemory} from '../src/engine/cg-3d-state.js';
const calc=new ModelCalculator('cg50'),near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`),window={...CG3D_WINDOW,xgrid:12,ygrid:12};
test('Line EXPRESS, VECTOR, P&V and POINTS enforce the manual distinct conditions',()=>{
  const parameters={x0:1,y0:2,z0:3,dx:1,dy:2,dz:3};
  for(const form of ['express','vector','pv']){const line=resolveCG3DTemplate(calc,{type:'line',form,parameters});assert.deepEqual(line.origin,{x:1,y:2,z:3});assert.deepEqual(line.direction,{x:1,y:2,z:3});}
  assert.throws(()=>resolveCG3DTemplate(calc,{type:'line',form:'express',parameters:{...parameters,dx:0}}),/a, b and c/);
  assert.deepEqual(resolveCG3DTemplate(calc,{type:'line',form:'vector',parameters:{dy:1}}).direction,{x:0,y:1,z:0});
  const two=resolveCG3DTemplate(calc,{type:'line',form:'points',parameters:{p1x:1,p1y:2,p1z:3,p2x:4,p2y:6,p2z:8}});assert.deepEqual(two.direction,{x:3,y:4,z:5});
  for(const form of ['vector','pv','points'])assert.throws(()=>resolveCG3DTemplate(calc,{type:'line',form,parameters:{}}),/nonzero/);
});
test('Plane EXPRESS uses aX+bY+cZ+d=0 and VECTOR passes through the origin',()=>{
  const plane=sampleCG3DGraph(calc,{type:'plane',form:'express',parameters:{A:0,B:0,C:1,D:-2}},window);for(const p of plane.rows.flat())near(p.z,2);
  const vector=sampleCG3DGraph(calc,{type:'plane',form:'vector',parameters:{ux:1,uy:0,uz:0,vx:0,vy:1,vz:0}},window);for(const p of vector.rows.flat())near(p.z,0);
  const points=sampleCG3DGraph(calc,{type:'plane',form:'points',parameters:{p1z:1,p2x:1,p2z:1,p3y:1,p3z:1}},window);for(const p of points.rows.flat())near(p.z,1);
  assert.throws(()=>resolveCG3DTemplate(calc,{type:'plane',form:'vector',parameters:{ux:1,vx:2}}),/parallel/);
  assert.throws(()=>resolveCG3DTemplate(calc,{type:'plane',form:'points',parameters:{p2x:1,p3x:2}}),/parallel/);
  assert.throws(()=>resolveCG3DTemplate(calc,{type:'plane',form:'express',parameters:{}}),/nonzero/);
});
test('Sphere EXPAND derives center and radius and rejects the manual equality boundary',()=>{
  const sphere=resolveCG3DTemplate(calc,{type:'sphere',form:'expand',parameters:{a:-2,b:-4,c:-6,d:-2}});assert.deepEqual(sphere.center,{x:1,y:2,z:3});near(sphere.radius,4);
  assert.throws(()=>resolveCG3DTemplate(calc,{type:'sphere',form:'expand',parameters:{a:2,d:1}}),/radius/);
  assert.throws(()=>resolveCG3DTemplate(calc,{type:'sphere',form:'factor',parameters:{r:-1}}),/radius/);
});
test('Cylinder has its own minimum/maximum height independent of Ygrid and View Window',()=>{
  const graph=sampleCG3DGraph(calc,{type:'cylinder',parameters:{r:2,h:1,k:-1,zmin:2,zmax:-2}},{...window,xgrid:3,ygrid:7});assert.equal(graph.rows.length,8);assert.equal(graph.rows[0].length,4);
  for(const p of graph.rows.flat())near((p.x-1)**2+(p.y+1)**2,4);near(graph.rows[0][0].z,-2);near(graph.rows.at(-1)[0].z,2);
  assert.throws(()=>resolveCG3DTemplate(calc,{type:'cylinder',parameters:{r:2,zmin:1,zmax:1}}),/distinct heights/);
});
test('Native grids include 2 and 50 and spatial polygons clip against all Z/X/Y bounds',()=>{
  const definition={type:'sphere',form:'factor',parameters:{r:2}};assert.equal(sampleCG3DGraph(calc,definition,{...window,xgrid:2,ygrid:50}).rows.length,51);
  assert.throws(()=>sampleCG3DGraph(calc,definition,{...window,xgrid:51}),/2 to 50/);
  const polygon=clipCG3DPolygon([{x:-9,y:-1,z:1},{x:9,y:-1,z:1},{x:9,y:1,z:1},{x:-9,y:1,z:1}],window);assert.ok(polygon.length>=4);for(const p of polygon)for(const axis of ['x','y','z'])assert.ok(p[axis]>=window[axis+'min']&&p[axis]<=window[axis+'max']);
  assert.equal(clipCG3DPolygon([{x:0,y:0,z:4},{x:1,y:0,z:4},{x:0,y:1,z:4}],window).length,0);
});
test('A true infinite Line clips to the spatial window even when its origin is far outside',()=>{
  const line=sampleCG3DGraph(calc,{type:'line',form:'pv',parameters:{x0:100,dx:1,dy:0,dz:0}},window);assert.deepEqual(line.points,[{x:-3,y:0,z:0},{x:3,y:0,z:0}]);
  assert.deepEqual(sampleCG3DGraph(calc,{type:'line',form:'pv',parameters:{x0:100,y0:4,dx:1}},window).points,[]);
  const crossing=sampleCG3DGraph(calc,{type:'line',form:'pv',parameters:{dx:1,dy:1,dz:1}},window),section=crossSectionCG3D(crossing,'z',1,window);assert.deepEqual(section,[[{x:1,y:1,z:1},{x:1,y:1,z:1}]]);
});
test('Sphere cross sections match its equator and a coincident Plane highlights only the boundary',()=>{
  const sphere=sampleCG3DGraph(calc,{type:'sphere',form:'factor',parameters:{r:2}},window),segments=crossSectionCG3D(sphere,'z',0,window);assert.ok(segments.length>=12);for(const p of segments.flat()){near(p.z,0);near(p.x*p.x+p.y*p.y,4);}
  const plane=sampleCG3DGraph(calc,{type:'plane',form:'express',parameters:{C:1}},window),boundary=crossSectionCG3D(plane,'z',0,window);assert.equal(boundary.length,4*window.xgrid);for(const p of boundary.flat())assert.ok(Math.abs(p.x)===3||Math.abs(p.y)===3);
});
test('State migrates a legacy single graph without losing signs and guards hostile shapes',()=>{
  const legacy=sanitizeCG3DState({type:'plane',parameters:{A:1,B:2,C:3,D:4},range:{xmin:-9,xmax:9,ymin:-5,ymax:5,steps:12},camera:{yaw:.6,pitch:.55,zoom:2}});assert.equal(legacy.graphs.length,3);assert.equal(legacy.graphs[0].parameters.D,'-4');assert.equal(legacy.window.xgrid,12);assert.equal(legacy.zoom,2);
  assert.equal(sanitizeCG3DGraph({type:'constructor'}),null);assert.equal(sanitizeCG3DGraph({type:'__proto__'}),null);
  assert.equal(sanitizeCG3DState({}).graphs.filter(Boolean).length,0);
  const cleaned=sanitizeCG3DWindow({xmin:9,xmax:1,xgrid:1,ygrid:2,theta:-180,phi:360});assert.equal(cleaned.xmin,-3);assert.equal(cleaned.xgrid,25);assert.equal(cleaned.ygrid,2);assert.equal(cleaned.theta,180);assert.equal(cleaned.phi,0);
});
test('Six VMEM and twenty GMEM snapshots survive JSON reload and recall independently',()=>{
  const state=sanitizeCG3DState({graphs:[{type:'sphere',form:'factor',parameters:{r:2},areaColor:'#ff0000'},null,{type:'line',form:'pv',parameters:{dx:1},enabled:false}]});
  state.window.xmax=7;storeCG3DMemory(state,'view',5);storeCG3DMemory(state,'graph',19);state.window.xmax=9;state.graphs[0].parameters.r='5';state.setup.labels=false;
  recallCG3DMemory(state,'view',5);assert.equal(state.window.xmax,7);assert.equal(state.graphs[0].parameters.r,'5');
  const restored=sanitizeCG3DState(JSON.parse(JSON.stringify(state)));recallCG3DMemory(restored,'graph',19);assert.equal(restored.graphs[0].parameters.r,'2');assert.equal(restored.graphs[0].areaColor,'#ff0000');assert.equal(restored.graphs[2].enabled,false);assert.equal(restored.setup.labels,true);assert.equal(restored.viewMem.length,6);assert.equal(restored.graphMem.length,20);
  assert.throws(()=>storeCG3DMemory(state,'view',6),/1–6/);assert.throws(()=>storeCG3DMemory(state,'graph',20),/1–20/);assert.throws(()=>recallCG3DMemory(state,'view',0),/No Data/);
});
