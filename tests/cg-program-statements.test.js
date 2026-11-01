import test from 'node:test';
import assert from 'node:assert/strict';
import {ModelCalculator} from '../src/engine/model-calculator.js';
import {CGProgramRunner,runCGProgram} from '../src/engine/cg-program.js';
const near=(actual,expected,tolerance=1e-9)=>assert.ok(Math.abs(actual-expected)<=tolerance*Math.max(1,Math.abs(expected)),`${actual} != ${expected}`);
const calculator=()=>new ModelCalculator('cg50');
test('native TEST statements execute in a real Program and keep parent ordinary/statistical memory isolated',()=>{
 const calc=calculator();calc.vars.z=99;calc.vars.Ans=77;calc.statisticalMemory={p:.25};const result=runCGProgram(calc,'OneSampleZTest 0,0,1,1,4:Print CGStat_z,CGStat_p');assert.equal(result.status,'done');near(result.statisticalNative.registers.z,2);near(result.statisticalNative.registers.p,.0455002638963584);assert.match(result.outputs[0],/^2 0\.045500/);assert.equal(result.variables.z,99);assert.equal(calc.vars.z,99);assert.equal(calc.vars.Ans,77);assert.equal(calc.statisticalMemory.p,.25);near(result.nativeAnswers.list[0],2);assert.equal(result.nativeAnswers.list[3],4);
});
test('native chi-square Program destinations are actual List/Mat memories and may alias an input safely',()=>{
 const gof=runCGProgram(calculator(),'[20,30]→List1:[25,25]→List2:ChiGOFTest List1,List2,1,List3:Print CGStat_chi2');assert.deepEqual(gof.lists[2],[1,1]);assert.deepEqual(gof.lists[0],[20,30]);near(gof.statisticalNative.registers.chi2,2);assert.equal(gof.nativeAnswers.list.length,3);
 const alias=runCGProgram(calculator(),'[20,30]→List1:[25,25]→List2:ChiGOFTest List1,List2,1,List1');assert.deepEqual(alias.lists[0],[1,1]);assert.deepEqual(alias.lists[1],[25,25]);
 const twoWay=runCGProgram(calculator(),'[[10,20],[30,40]]→MatA:ChiTest MatA,MatB:Print CGStat_chi2');assert.deepEqual(twoWay.matrices.MatB,[[12,18],[28,42]]);assert.deepEqual(twoWay.matrices.MatA,[[10,20],[30,40]]);near(twoWay.statisticalNative.registers.chi2,50/63);assert.equal(twoWay.nativeAnswers.list[2],1);
});
test('Program executes the manual two-way ANOVA example into native registers and MatAns',()=>{
 const source='[1,1,1,1,2,2,2,2]→List1:[1,1,2,2,1,1,2,2]→List2:[113,116,139,132,133,131,126,122]→List3:TwoWayANOVA List1,List2,List3:Print CGStat_pa,CGStat_pb,CGStat_pab';const result=runCGProgram(calculator(),source);assert.equal(result.status,'done');near(result.statisticalNative.registers.pa,.2458019517,3e-10);near(result.statisticalNative.registers.pb,.04222398836,3e-10);near(result.statisticalNative.registers.pab,.00278169946,3e-10);assert.equal(result.nativeAnswers.matrix.length,4);assert.equal(result.nativeAnswers.matrix[0].length,5);assert.equal(result.nativeAnswers.matrix[3][3],0);assert.match(result.outputs[0],/0\.245801/);
});
test('Program native probability functions support list answers, central limits and same-expression getter reads',()=>{
 const source='[0,1,2]→List1:PoissonPD(List1,1):Print ListAns:Print NormPD(0)+CGStat_p:InvNormCD("C",.95):Print CGStat_x1InvN,CGStat_x2InvN';const result=runCGProgram(calculator(),source);assert.equal(result.status,'done');assert.equal(result.statisticalNative.registers.p.length,undefined);near(Number(result.outputs[1]),2/Math.sqrt(2*Math.PI),1e-10);near(result.statisticalNative.registers.x1InvN,-1.959963984540054);near(result.statisticalNative.registers.x2InvN,1.959963984540054);assert.match(result.outputs[0],/^\[0\.367879/);
});
test('failed TEST argument or destination validation rolls back arrays and all special memories including argument-side effects',()=>{
 const calc=calculator(),runner=new CGProgramRunner(calc,'[20,30]→List1:[25,25]→List2:[9]→List3:OneSampleZTest 0,0,1,1,4:ChiGOFTest List1,List2,NormPD(0),List3');assert.throws(()=>runner.run(),/第 5 行|第 1 行|df/);const result=runner.snapshot();assert.deepEqual(result.lists[2],[9]);assert.deepEqual(result.lists[0],[20,30]);near(result.statisticalNative.registers.p,.0455002638963584);near(result.statisticalNative.registers.z,2);assert.equal(result.nativeAnswers.list.length,4);
 const invalid=new CGProgramRunner(calculator(),'[[10,20],[30,40]]→MatA:[[7,8],[9,10]]→MatB:ChiTest MatA,MatZZ');assert.throws(()=>invalid.run(),/Mat|目标|destination/);assert.deepEqual(invalid.snapshot().matrices.MatB,[[7,8],[9,10]]);
});
test('native Program statistics reject complex datasets as a whole while preserving tagged List storage',()=>{
 const runner=new CGProgramRunner(calculator(),'[1,2+3i,4]→List1:OneSampleTTest 0,0,List1',{complex:true});assert.throws(()=>runner.run(),/Domain|real|实数/);assert.deepEqual(runner.snapshot().lists[0],[1,{re:2,im:3},4]);assert.deepEqual(runner.snapshot().statisticalNative.registers,{});
});
