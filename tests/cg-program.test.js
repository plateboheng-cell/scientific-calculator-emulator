import test from 'node:test';
import assert from 'node:assert/strict';
import {ModelCalculator} from '../src/engine/model-calculator.js';
import {CGProgramRunner,runCGProgram,compileCGProgram,sanitizePrograms} from '../src/engine/cg-program.js';
const calc=()=>new ModelCalculator('cg50',{angle:'Deg'});

test('BASIC input, assignment and For loop calculate an arithmetic sum',()=>{
  const result=runCGProgram(calc(),'"N"?→N\n0→S\nFor 1→A To N\nS+A→S\nNext\nPrint "SUM",S',{inputs:[10]});
  assert.equal(result.status,'done');assert.equal(result.variables.S,55);assert.deepEqual(result.outputs,['SUM 55']);
});
test('program input resumes without replaying prior instructions',()=>{
  const runner=new CGProgramRunner(calc(),'1→A\nPrint A\n?→B\nA+B→A\nPrint A');
  assert.equal(runner.run().status,'input');assert.deepEqual(runner.run('2+3').outputs,['1','6']);assert.equal(runner.variables.A,6);
});
test('nested conditionals choose the matching Else and support Casio comparisons',()=>{
  const source='If A=1:Then:If B≠0:Then:Print "inner":Else:Print "zero":IfEnd:Else:Print "outer":IfEnd';
  assert.deepEqual(runCGProgram(calc(),source,{variables:{A:1,B:2}}).outputs,['inner']);
  assert.deepEqual(runCGProgram(calc(),source,{variables:{A:0}}).outputs,['outer']);
});
test('descending For, While, Do and Break have independent loop frames',()=>{
  const source='0→S:For 3→A To 1 Step -1:S+A→S:Next:While S<9:S+1→S:WhileEnd:Do:S+1→S:LpWhile S<11:For 1→B To 10:If B=3:Then:Break:IfEnd:Next:Print S,B';
  assert.deepEqual(runCGProgram(calc(),source).outputs,['11 3']);
});
test('labels, conditional jumps and zero skipping work',()=>{
  const source='0→A:Lbl 1:A+1→A:A<3⇒Goto 1:0→B:Dsz A:Isz B:Print A,B';
  assert.deepEqual(runCGProgram(calc(),source).outputs,['2 1']);
  assert.deepEqual(runCGProgram(calc(),'-1→A:Isz A:Print "skip":Print "end"').outputs,['end']);
});
test('subprogram Return shares variables and restores the caller',()=>{
  const result=runCGProgram(calc(),'2→A:Prog "DOUBLE":Print A',{programs:[{name:'DOUBLE',source:'2*A→A:Return:999→A'}]});assert.deepEqual(result.outputs,['4']);
});
test('output pauses can resume and comments respect quoted colons',()=>{
  const runner=new CGProgramRunner(calc(),"' ignored\nPrint \"a:b\"\n2+2◢\nPrint 5",{pauseOnDisplay:true});
  assert.equal(runner.run().status,'display');assert.deepEqual(runner.outputs,['a:b','4']);assert.deepEqual(runner.run().outputs,['a:b','4','5']);
});
test('program evaluation respects calculator angle mode and keeps parent variables isolated',()=>{
  const c=calc();c.assign('A',99);const result=runCGProgram(c,'sin(30)→X:Print X:1→A');assert.ok(Math.abs(result.variables.x-.5)<1e-12);assert.equal(c.vars.A,99);
});
test('program interpreter rejects unsafe expressions, malformed blocks and unbounded work',()=>{
  for(const source of ['A.constructor','import("x")','1→AA','If A=1:Print 2','Next','For 1→A To 3 Step 0:Next'])assert.throws(()=>runCGProgram(calc(),source));
  assert.throws(()=>runCGProgram(calc(),'Lbl A:Goto A',{stepLimit:25}),/步数超限/);
  assert.throws(()=>compileCGProgram('Lbl A:Lbl A'),/标签重复/);
});
test('program persistence sanitizes malformed saved objects and clamps selection',()=>{
  assert.deepEqual(sanitizePrograms({programs:[null,{name:'ONE',source:'1+2'}],selected:100}),{programs:[{name:'ONE',source:'1+2'}],selected:0});
});
