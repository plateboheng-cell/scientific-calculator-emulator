import test from 'node:test';
import assert from 'node:assert/strict';
import {ModelCalculator} from '../src/engine/model-calculator.js';
import {geometryIntersections,geometryObject,pointDistance,pointMidpoint,polygonMeasure,geometryAngle,parallelEndpoint,calibratePicture,sampleSurface,projectSurfacePoint} from '../src/engine/cg-geometry.js';

const near=(a,b,t=1e-9)=>assert.ok(Math.abs(a-b)<t*Math.max(1,Math.abs(b)),`${a} differs from ${b}`);
const line=(a,b,kind='line')=>({kind,a,b}),circle=(x,y,radius)=>({kind:'circle',center:{x,y},radius});
test('line and segment intersections respect finite segment bounds',()=>{
  const a=line({x:0,y:0},{x:2,y:2}),b=line({x:0,y:2},{x:2,y:0});
  assert.deepEqual(geometryIntersections(a,b),[{x:1,y:1}]);
  assert.deepEqual(geometryIntersections(line({x:0,y:0},{x:.5,y:.5},'segment'),b),[]);
  assert.deepEqual(geometryIntersections(a,line({x:0,y:1},{x:2,y:3})),[]);
  assert.throws(()=>geometryIntersections(a,line({x:1,y:1},{x:3,y:3})),/无穷/);
});
test('line-circle intersections include tangencies once and reject misses',()=>{
  assert.deepEqual(geometryIntersections(line({x:-3,y:0},{x:3,y:0}),circle(0,0,2)),[{x:-2,y:0},{x:2,y:0}]);
  assert.deepEqual(geometryIntersections(line({x:-3,y:2},{x:3,y:2}),circle(0,0,2)),[{x:0,y:2}]);
  assert.deepEqual(geometryIntersections(line({x:-3,y:3},{x:3,y:3}),circle(0,0,2)),[]);
});
test('circle intersections resolve two crossings, tangent, disjoint and coincident cases',()=>{
  const points=geometryIntersections(circle(0,0,2),circle(2,0,2));assert.equal(points.length,2);
  for(const p of points){near(pointDistance(p,{x:0,y:0}),2);near(pointDistance(p,{x:2,y:0}),2);}
  assert.equal(geometryIntersections(circle(0,0,1),circle(2,0,1)).length,1);
  assert.deepEqual(geometryIntersections(circle(0,0,1),circle(4,0,1)),[]);
  assert.throws(()=>geometryIntersections(circle(0,0,1),circle(0,0,1)),/无穷/);
});
test('midpoint, parallel/perpendicular construction and angle measurement use Euclidean coordinates',()=>{
  assert.deepEqual(pointMidpoint({x:-3,y:7},{x:1,y:-1}),{x:-1,y:3});
  const l=line({x:0,y:0},{x:2,y:1}),p={x:3,y:3};
  assert.deepEqual(parallelEndpoint(p,l),{x:5,y:4});assert.deepEqual(parallelEndpoint(p,l,true),{x:2,y:5});
  near(geometryAngle({x:1,y:0},{x:0,y:0},{x:0,y:1}),Math.PI/2);
});
test('polygon measurement provides orientation-independent area and closed perimeter',()=>{
  const points=[{x:0,y:0},{x:3,y:0},{x:3,y:4}];
  assert.deepEqual(polygonMeasure(points),{area:6,perimeter:12});assert.deepEqual(polygonMeasure(points.toReversed()),{area:6,perimeter:12});
});
test('geometric objects resolve live point positions and reject missing references',()=>{
  const state={points:[{id:'A',x:0,y:0},{id:'B',x:1,y:0}]},object={kind:'circle',center:'A',edge:'B'};
  assert.equal(geometryObject(state,object).radius,1);state.points[1].x=3;assert.equal(geometryObject(state,object).radius,3);
  assert.throws(()=>geometryObject(state,{kind:'line',a:'A',b:'missing'}));
});
test('picture calibration supports rotated axes and independent numeric units',()=>{
  const calibration=calibratePicture({origin:{u:50,v:50},xRef:{u:150,v:100},yRef:{u:100,v:-50},xUnit:2,yUnit:5});
  for(const p of [{x:0,y:0},{x:2,y:5},{x:-3,y:1.4}]){const q=calibration.toWorld(calibration.toPixel(p));near(q.x,p.x);near(q.y,p.y);}
  assert.throws(()=>calibratePicture({origin:{u:0,v:0},xRef:{u:1,v:0},yRef:{u:2,v:0}}),/共线/);
});
test('surface mesh samples both variables without mutating x, y or Ans',()=>{
  const calc=new ModelCalculator('cg50',{vars:{x:88,y:77,Ans:12}}),before=calc.save(),surface=sampleSurface(calc,'x^2-y^2',{xmin:-2,xmax:2,ymin:-2,ymax:2,steps:8});
  assert.equal(surface.rows.length,9);assert.equal(surface.rows[0].length,9);assert.equal(surface.zmin,-4);assert.equal(surface.zmax,4);
  for(const row of surface.rows)for(const p of row)near(p.z,p.x*p.x-p.y*p.y);
  assert.deepEqual(calc.save(),before);
});
test('surface domain holes are preserved and sampling cost is explicitly bounded',()=>{
  const calc=new ModelCalculator('cg50'),surface=sampleSurface(calc,'sqrt(x-y)',{steps:8});assert.ok(surface.invalid>0);assert.ok(surface.rows.flat().some(p=>p===null));
  for(const expression of ['Ran()','integral("x",0,y)','sqrt(-1)','A=2'])assert.throws(()=>sampleSurface(calc,expression));
  for(const range of [{steps:61},{steps:2},{xmin:2,xmax:1},{xmin:NaN}])assert.throws(()=>sampleSurface(calc,'x+y',range));
});
test('3D projection responds to rotation and zoom in a finite screen plane',()=>{
  const p={x:1,y:2,z:3},a=projectSurfacePoint(p,{yaw:0,pitch:0,zoom:1}),b=projectSurfacePoint(p,{yaw:0,pitch:0,zoom:2});
  near(a.x,1);near(a.y,-3);near(b.x,2*a.x);near(b.y,2*a.y);
  const rotated=projectSurfacePoint(p,{yaw:Math.PI/2,pitch:0,zoom:1});near(rotated.x,-2);
});
