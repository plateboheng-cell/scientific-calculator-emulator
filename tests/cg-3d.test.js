import test from 'node:test';
import assert from 'node:assert/strict';
import {ModelCalculator} from '../src/engine/model-calculator.js';
import {sampleCG3D} from '../src/engine/cg-3d.js';
const calc=new ModelCalculator('cg50'),near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
test('3D sphere mesh satisfies its implicit equation and includes both poles',()=>{const graph=sampleCG3D(calc,{type:'sphere',parameters:{h:1,k:2,l:3,r:4},range:{steps:12}});for(const p of graph.rows.flat())near((p.x-1)**2+(p.y-2)**2+(p.z-3)**2,16);near(graph.zmin,-1);near(graph.zmax,7);});
test('all three cylinder axes preserve radius and independent height',()=>{for(const axis of ['x','y','z']){const graph=sampleCG3D(calc,{type:'cylinder',parameters:{axis,r:2},range:{steps:8,ymin:-3,ymax:7}});for(const p of graph.rows.flat())near(axis==='x'?p.y*p.y+p.z*p.z:axis==='y'?p.x*p.x+p.z*p.z:p.x*p.x+p.y*p.y,4);}});
test('3D plane solves horizontal and vertical coordinate planes without singular division',()=>{for(const parameters of [{A:0,B:0,C:1,D:3},{A:2,B:0,C:0,D:4},{A:1,B:2,C:3,D:5}]){const graph=sampleCG3D(calc,{type:'plane',parameters,range:{steps:6}});for(const p of graph.rows.flat())near(parameters.A*p.x+parameters.B*p.y+parameters.C*p.z,parameters.D);}});
test('3D line samples a true spatial direction and rejects degeneracy',()=>{const graph=sampleCG3D(calc,{type:'line',parameters:{x0:1,y0:2,z0:3,dx:2,dy:3,dz:4},range:{xmin:0,xmax:2,steps:8}});assert.equal(graph.points.length,9);assert.deepEqual(graph.points.at(-1),{x:5,y:8,z:11});assert.throws(()=>sampleCG3D(calc,{type:'line',parameters:{dx:0,dy:0,dz:0}}));assert.throws(()=>sampleCG3D(calc,{type:'plane',parameters:{A:0,B:0,C:0}}));});
