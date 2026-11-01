import test from 'node:test';
import assert from 'node:assert/strict';
import {ModelCalculator} from '../src/engine/model-calculator.js';
import {CGProgramRunner,runCGProgram} from '../src/engine/cg-program.js';
import {createCGRational,cgRationalJSON} from '../src/engine/cg-rational-display.js';
const saved=(n,d=1)=>cgRationalJSON(createCGRational(n,d)),manual=()=>{const calc=new ModelCalculator('cg50');calc.cgSimplify='Manual';return calc;};

test('Program Manual carries unreduced RHS through scalar variables and Ans without mutating its caller',()=>{
 const calculator=manual(),before=calculator.save(),result=runCGProgram(calculator,'15/60→A:A*2→B:Print A:Print B');assert.deepEqual(result.exactVariables.A,saved(15,60));assert.deepEqual(result.exactVariables.B,saved(30,60));assert.deepEqual(result.exactAnswer,saved(30,60));assert.deepEqual(result.outputs,['15/60','30/60']);assert.deepEqual(calculator.save(),before);assert.equal(calculator.cgSimplify,'Manual');
});
test('SimplifyAuto/SimplifyMan change the shared preference without resetting numeric display format',()=>{
 const result=runCGProgram(new ModelCalculator('cg50'),'Fix 2:SimplifyMan:15/60→A:SimplifyAuto:A→B:Print B');assert.equal(result.simplify,'Auto');assert.deepEqual(result.format,{mode:'Fix',digits:2,norm:1});assert.deepEqual(result.exactVariables.A,saved(15,60));assert.deepEqual(result.exactVariables.B,saved(1,4));assert.deepEqual(result.outputs,['0.25']);const next=runCGProgram(new ModelCalculator('cg50'),'SimplifyMan:15/60→A');assert.equal(next.simplify,'Manual');assert.deepEqual(next.exactAnswer,saved(15,60));
});
test('Complex Program modes auto-reduce exact real fractions while retaining the Manual preference',()=>{
 for(const complexFormat of ['a+bi','polar']){const result=runCGProgram(manual(),'15/60→A:Print A',{complex:true,complexFormat});assert.equal(result.simplify,'Manual');assert.deepEqual(result.exactVariables.A,saved(1,4));assert.deepEqual(result.outputs,['1/4']);}
});
test('unsupported same-value expressions clear exact metadata instead of reviving an old unreduced fraction',()=>{
 const calculator=manual();calculator.assign('A',.25,false,createCGRational(15,60));const result=runCGProgram(calculator,'sqrt(1/16)→A');assert.equal(result.variables.A,.25);assert.equal(result.exactVariables.A,undefined);assert.equal(result.exactAnswer,null);assert.deepEqual(calculator.exactVariables.A,saved(15,60));
});
test('explicit own variable overrides block inherited exact bindings even when their float value is identical',()=>{
 const calculator=manual();calculator.assign('A',.25,false,createCGRational(15,60));const result=runCGProgram(calculator,'A→B',{variables:{A:.25}});assert.equal(result.exactVariables.A,undefined);assert.equal(result.exactVariables.B,undefined);assert.equal(result.exactAnswer,null);
});
test('list,matrix,vector and printed array results keep scalar Ans and its exact answer independent',()=>{
 const calculator=manual(),result=runCGProgram(calculator,'3→A:{1,2}:Ans→B:[[1,2]]:[[2,3]]→VctZ:VctZ*2:Print {4,5}:Ans');assert.equal(result.variables.Ans,3);assert.equal(result.variables.B,3);assert.deepEqual(result.exactAnswer,saved(3));assert.deepEqual(result.nativeAnswers.list,[4,5]);assert.deepEqual(result.nativeAnswers.matrix,[[4,6]]);assert.deepEqual(result.nativeAnswers.vector,[[4,6]]);assert.deepEqual(result.outputs,['[4, 5]']);
});
test('graph coordinates,conditions and TEST parameters do not overwrite the actual scalar exact answer',()=>{
 const result=runCGProgram(manual(),'15/60→A:PlotOn 1/3,2/3:Circle 0,0,1/7:Locate 1,1,1/9:ViewWindow -2,2,1,-3,3,1:If 1/2<1:Then:ClrGraph:IfEnd');assert.equal(result.variables.Ans,.25);assert.deepEqual(result.exactAnswer,saved(15,60));assert.equal(result.textScreen[0],'1/9');const runner=new CGProgramRunner(manual(),'15/60→A:ChiGOFTest NormPD(0),List1,2,List27',{lists:[[10,20],[12,18]]});assert.throws(()=>runner.run());assert.deepEqual(runner.snapshot().exactAnswer,saved(15,60));assert.deepEqual(runner.snapshot().exactVariables.A,saved(15,60));
});
test('array element store caches the actual RHS exact result while Getkey index is evaluated once',()=>{
 let keys=0;const result=runCGProgram(manual(),'3→Dim List1:1/3→List1[Getkey]',{keyProvider:()=>{keys++;return 1;}});assert.equal(keys,1);assert.deepEqual(result.exactAnswer,saved(1,3));assert.equal(result.lists[0][0],1/3);
});
test('random,key and explicit accessor values are each read once and are never reevaluated for an exact sidecar',()=>{
 let randomCalls=0,keyCalls=0,getters=0;const random=Math.random;Math.random=()=>{randomCalls++;return .25;};try{const result=runCGProgram(manual(),'Ran()→A:Getkey→B',{keyProvider:()=>{keyCalls++;return 7;}});assert.equal(randomCalls,1);assert.equal(keyCalls,1);assert.equal(result.exactVariables.A,undefined);assert.equal(result.exactVariables.B,undefined);assert.equal(result.exactAnswer,null);}finally{Math.random=random;}const variables={};Object.defineProperty(variables,'A',{enumerable:true,get(){getters++;return .25;}});const result=runCGProgram(manual(),'A→B',{variables});assert.equal(getters,1);assert.equal(result.exactVariables.B,undefined);
});
test('JSON and yielding snapshots preserve independent exact banks and resume with the restored Ans carrier',()=>{
 const calculator=manual(),runner=new CGProgramRunner(calculator,'15/60→A:27/63→B'),first=runner.run(undefined,{instructionBudget:1});assert.equal(first.status,'yield');assert.deepEqual(first.exactAnswer,saved(15,60));first.exactVariables.A.n='999';const result=runner.run();assert.deepEqual(result.exactVariables.A,saved(15,60));const json=JSON.parse(JSON.stringify(result)),restored=new ModelCalculator('cg50',{...calculator.save(),vars:json.variables,exactAnswer:json.exactAnswer,exactVariables:json.exactVariables});restored.cgSimplify=json.simplify;const next=runCGProgram(restored,'Ans→C:Print C');assert.deepEqual(next.exactVariables.C,saved(27,63));assert.deepEqual(next.outputs,['27/63']);assert.deepEqual(calculator.exactVariables,{});
});
test('Input and loop bindings keep exact initial/step values without reusing the bound or step argument result',()=>{
 const calculator=manual(),runner=new CGProgramRunner(calculator,'Input A:Print A');assert.equal(runner.run().status,'input');const result=runner.run('27/63');assert.deepEqual(result.exactVariables.A,saved(27,63));assert.deepEqual(result.outputs,['27/63']);const loop=runCGProgram(calculator,'For 1/3→A To 1 Step 1/3:Next');assert.deepEqual(loop.exactVariables.A,saved(4,3));assert.deepEqual(loop.exactAnswer,saved(4,3));
});
test('failed expressions and invalid array targets cannot commit partial exact state into the parent',()=>{
 const calculator=manual();calculator.assign('A',.25,false,createCGRational(15,60));calculator.assign('Ans',.25,false,createCGRational(15,60));calculator.assign('B',2,true);const before=calculator.save(),runner=new CGProgramRunner(calculator,'27/63→B:1/0→A');assert.throws(()=>runner.run());assert.deepEqual(calculator.save(),before);assert.deepEqual(runner.snapshot().exactVariables.A,saved(15,60));assert.deepEqual(runner.snapshot().exactVariables.B,saved(27,63));const invalid=new CGProgramRunner(calculator,'15/60→List1[1]');assert.throws(()=>invalid.run());assert.deepEqual(invalid.snapshot().exactAnswer,saved(15,60));assert.deepEqual(calculator.save(),before);
});
