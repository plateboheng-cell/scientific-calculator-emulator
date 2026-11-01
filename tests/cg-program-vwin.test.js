import test from 'node:test';
import assert from 'node:assert/strict';
import {ModelCalculator} from '../src/engine/model-calculator.js';
import {CGProgramRunner,runCGProgram} from '../src/engine/cg-program.js';
import {createCGGraphVariableScope} from '../src/engine/cg-graph-state.js';
const near=(value,expected)=>assert.ok(Math.abs(value-expected)<1e-10,`${value} != ${expected}`);
test('Program V-WIN getters read native defaults and scalar arrows modify only the independent runner state',()=>{
 const calculator=new ModelCalculator('cg50'),before=structuredClone(calculator.graphMemory),result=runCGProgram(calculator,'Xmin→A:Xdot→B:-4→Xmin:12→Xmax:0→Xscl:-8→Ymin:8→Ymax:2→Yscl:Print Xmin,Xmax,Xscl,Ymin,Ymax,Yscl');
 assert.equal(result.variables.A,-6.3);near(result.variables.B,1/30);assert.equal(result.outputs[0],'-4 12 0 -8 8 2');assert.deepEqual(result.graphMemory.window,{xmin:-4,xmax:12,ymin:-8,ymax:8});assert.equal(result.graphMemory.xscale,0);assert.deepEqual(calculator.graphMemory,before);assert.notEqual(result.graphMemory,calculator.graphMemory);
});
test('Right V-WIN variables and positive dot assignments share single/dual native point spacing',()=>{
 const calculator=new ModelCalculator('cg50');calculator.graphMemory.setup.dual='gg';const result=runCGProgram(calculator,'-5→RightXmin:.1→RightXdot:-10→RightYmin:.2→RightYdot:3→RightXscl:4→RightYscl:RightXmax→A:RightYmax→B:RightXscl+RightYscl→C');
 near(result.variables.A,13.6);near(result.variables.B,27.2);assert.equal(result.variables.C,7);assert.equal(result.graphMemory.right.xscale,3);assert.equal(result.graphMemory.right.yscale,4);assert.equal(calculator.graphMemory.right.xscale,1);
});
test('TTheta arrows preserve parameter direction while native ViewWindow6/9 updates one canonical window',()=>{
 const calculator=new ModelCalculator('cg50'),result=runCGProgram(calculator,'ViewWindow 10,20,2,30,50,5,2,-2,.25:TThetaptch→A:-3→TThetamax:1→RightTThetamin:4→RightTThetamax:.5→RightTThetaptch:Print Xmin,Xmax,Ymin,Ymax,TThetamin,TThetamax,TThetaptch:ViewWindow -1,1,0,-2,2,0');
 assert.equal(result.variables.A,-.25);assert.equal(result.outputs[0],'10 20 30 50 2 -3 -0.25');assert.deepEqual(result.graphMemory.parameter,{min:2,max:-3,step:-.25});assert.deepEqual(result.graphMemory.right.parameter,{min:1,max:4,step:.5});assert.deepEqual(result.graphMemory.window,{xmin:-1,xmax:1,ymin:-2,ymax:2});assert.equal(result.commands.length,2);
});
test('invalid scalar or whole ViewWindow assignments are atomic and never reach parent memory or callbacks',()=>{
 const calculator=new ModelCalculator('cg50'),original=structuredClone(calculator.graphMemory);for(const source of ['20→Xmin','0→Xdot','-1→Yscl','1+i→Xmax','ViewWindow 10,20,-1,30,50,5','ViewWindow 10,20,1,30,50,1,0,0,.1','ViewWindow 20,10,1,30,50,1']){const commands=[],runner=new CGProgramRunner(calculator,source,{complex:true,onCommand:command=>commands.push(command)}),before=structuredClone(runner.calculator.graphMemory);assert.throws(()=>runner.run());assert.deepEqual(runner.calculator.graphMemory,before);assert.deepEqual(calculator.graphMemory,original);assert.deepEqual(commands,[]);}
});
test('yielded and serialized V-WIN snapshots do not alias future changes and coexist with function/array memories',()=>{
 const calculator=new ModelCalculator('cg50'),runner=new CGProgramRunner(calculator,'-4→Xmin:"Xmin+Sum(List1)+x"→fn1:fn1(3)→A:ViewWindow -2,2,1,-3,3,1:fn1(3)→B',{lists:[[1,2,3]]}),first=runner.run(undefined,{instructionBudget:1});assert.equal(first.status,'yield');assert.equal(first.graphMemory.window.xmin,-4);first.graphMemory.right.window.xmin=-999;const result=runner.run();assert.equal(result.variables.A,5);assert.equal(result.variables.B,7);assert.equal(result.graphMemory.right.window.xmin,-6.3);assert.deepEqual(result.lists[0],[1,2,3]);const saved=JSON.parse(JSON.stringify(result)),restored=new ModelCalculator('cg50');restored.graphMemory=saved.graphMemory;restored.functionMemory=saved.functionMemory;const again=runCGProgram(restored,'fn1(3)→A:RightXmin→B',{lists:saved.lists});assert.equal(again.variables.A,7);assert.equal(again.variables.B,-6.3);
});
test('each drawing command captures its current V-Window and does not count scalar settings as drawing',()=>{
 const calculator=new ModelCalculator('cg50'),result=runCGProgram(calculator,'-4→Xmin:PlotOn 0,0:ViewWindow -2,2,1,-3,3,1,0,1,.01:-1→Xmin:PlotOn 1,1');assert.equal(result.commands.length,3);assert.equal(result.commands[0].view.window.xmin,-4);assert.equal(result.commands[2].view.window.xmin,-1);assert.deepEqual(result.commands[2].view.parameter,{min:0,max:1,step:.01});const scope=createCGGraphVariableScope(result.graphMemory);assert.equal(scope.Xmin,-1);assert.equal(scope.TThetaptch,.01);
});
