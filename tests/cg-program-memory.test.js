import test from 'node:test';
import assert from 'node:assert/strict';
import {ModelCalculator} from '../src/engine/model-calculator.js';
import {CGProgramRunner,runCGProgram} from '../src/engine/cg-program.js';
const calc=()=>new ModelCalculator('cg50');

test('program list assignments, one-based elements, dimensions and summaries are executable',()=>{
  const r=runCGProgram(calc(),'{3,1,2}→List 1:9→List 1[2]:5→Dim List 2:Sum List 1→A:Print A,Dim List 2,Mean(List 1)');
  assert.deepEqual(r.lists[0],[3,9,2]);assert.deepEqual(r.lists[1],[0,0,0,0,0]);assert.equal(r.variables.A,14);assert.match(r.outputs[0],/^14 5 /);
  assert.throws(()=>runCGProgram(calc(),'1→List1[1]'),/范围/);
  assert.throws(()=>runCGProgram(calc(),'{1,2}→List 27'));
});
test('paired list sorts, Fill, cumulative, percent and delta commands preserve pairings',()=>{
  const r=runCGProgram(calc(),'{3,1,2}→List1:{30,10,20}→List2:SortA(List1,List2):Cuml(List1)→List3:Percent(List1)→List4:Delta(List2)→List5:Fill(7,List2)');
  assert.deepEqual(r.lists[0],[1,2,3]);assert.deepEqual(r.lists[1],[7,7,7]);assert.deepEqual(r.lists[2],[1,3,6]);assert.deepEqual(r.lists[4],[10,10]);
  assert.ok(Math.abs(r.lists[3].reduce((a,b)=>a+b)-100)<1e-10);
});
test('matrix storage, dimensions, element editing and matrix operations work',()=>{
  const r=runCGProgram(calc(),'[[1,2],[3,4]]→Mat A:9→Mat A[1,2]:Trn(Mat A)→Mat B:{3,2}→Dim Mat C:Fill(5,Mat C):Det(Mat A)→D:Print D');
  assert.deepEqual(r.matrices.MatA,[[1,9],[3,4]]);assert.deepEqual(r.matrices.MatB,[[1,3],[9,4]]);assert.deepEqual(r.matrices.MatC,[[5,5],[5,5],[5,5]]);assert.equal(r.variables.D,-23);
  assert.throws(()=>runCGProgram(calc(),'{999,999}→Dim Mat A'),/内存/);
  assert.throws(()=>runCGProgram(calc(),'{65,64}→Dim Mat A'),/内存/);
  assert.equal(runCGProgram(calc(),'{64,64}→Dim Mat A').matrices.MatA.length,64);
});
test('sequence lists and list/matrix conversion share calculator variables without altering them',()=>{
  const r=runCGProgram(calc(),'7→A:Seq(A^2,A,1,5)→List1:ListToMat(List1,List1)→Mat A:MatToList(Mat A,2)→List2:Print A');
  assert.deepEqual(r.lists[0],[1,4,9,16,25]);assert.deepEqual(r.lists[1],r.lists[0]);assert.deepEqual(r.outputs,['7']);
});
test('string commands, concatenation, search, rotation, case and expression conversion work',()=>{
  const source='"abc"+"de"→Str1:StrRotate(Str1,2)→Str2:StrMid(Str1,2,3)→Str3:StrUpr(Str3)→Str4:ExpToStr(2+3,Str5):StrToExp(Str5)→A:Print Str2,Str4,StrSrc(Str1,"cd"),StrLen(Str1),A';
  const r=runCGProgram(calc(),source);assert.equal(r.strings[0],'abcde');assert.equal(r.strings[1],'cdeab');assert.equal(r.strings[3],'BCD');assert.deepEqual(r.outputs,['cdeab BCD 3 5 5']);
});
test('list memory accepts 999 cells but rejects domain errors, cycles and executable payloads',()=>{
  const r=runCGProgram(calc(),'999→Dim List1:Fill(2,List1):Sum(List1)→A');assert.equal(r.lists[0].length,999);assert.equal(r.variables.A,1998);
  for(const source of ['1000→Dim List1','"import(1)"→Str1:StrToExp(Str1)','"StrToExp(Str1)"→Str1:StrToExp(Str1)','List1.constructor','Seq(A,A,1,1000)'])assert.throws(()=>runCGProgram(calc(),source));
});
test('graph drawing statements emit structured numeric commands and un-evaluated graph expressions',()=>{
  const commands=[];const r=runCGProgram(calc(),'ClrGraph:ViewWindow -5,5,1,-3,3,1:Graph Y=1/x:PlotOn 1,2:F-Line 0,0,2,3:Text 10,20,"hello":DrawGraph',{onCommand:c=>commands.push(c)});
  assert.equal(commands[0].kind,'ClrGraph');assert.deepEqual(commands[1].args,[-5,5,1,-3,3,1]);assert.equal(commands[2].expression,'1/x');assert.equal(commands[2].type,'y');assert.deepEqual(commands[5].args,[10,20,'hello']);assert.equal(r.commands.length,commands.length);
  for(const source of ['PlotOn "text",2','Circle 0,0,-1','StoPict 21'])assert.throws(()=>runCGProgram(calc(),source));
});
test('cooperative Getkey loops yield to UI and resume with actual key codes',()=>{
  let key=0;const runner=new CGProgramRunner(calc(),'Do:Getkey→A:LpWhile A=0:Print A',{keyProvider:()=>key});
  assert.equal(runner.run(undefined,{instructionBudget:100}).status,'yield');key=72;let r;
  for(let i=0;i<10;i++){r=runner.run(undefined,{instructionBudget:100});if(r.status==='done')break;}
  assert.equal(r.status,'done');assert.deepEqual(r.outputs,['72']);
});
test('program addition evaluates random/key operands exactly once and concatenates nested strings',()=>{
  let calls=0;const calculator=calc(),scope=calculator.scope.bind(calculator);calculator.scope=extra=>({...scope(extra),Ran:()=>++calls});
  const result=runCGProgram(calculator,'Ran()+1→A:Print A');assert.equal(calls,1);assert.equal(result.variables.A,2);
  let keys=0;assert.equal(runCGProgram(calc(),'Getkey+1→A',{keyProvider:()=>{keys++;return 72;}}).variables.A,73);assert.equal(keys,1);
  assert.equal(runCGProgram(calc(),'("a"+"b")+"c"→Str1').strings[0],'abc');
  assert.throws(()=>runCGProgram(calc(),'"a"+1→Str1'),/字符串/);
});
test('program angle and display commands affect output without mutating the caller',()=>{
  const calculator=calc(),before=calculator.save();const r=runCGProgram(calculator,'Rad:Fix 3:Print sin(pi/2):Sci 4:Print 1234:Norm 1:Print .001');
  assert.deepEqual(r.outputs,['1.000','1.234e+3','1e-3']);assert.equal(r.angle,'Rad');assert.deepEqual(r.format,{mode:'Norm',digits:10,norm:1});assert.deepEqual(calculator.save(),before);
  assert.deepEqual(runCGProgram(calc(),'Deg:Graph Y=sin(x):Rad:Graph Y=sin(x)').commands.map(command=>command.angle),['Deg','Rad']);
  for(const source of ['Fix 10','Sci 11','Norm 0'])assert.throws(()=>runCGProgram(calc(),source));
});
test('dynamic program graph suspends for display and resumes after the user continues',()=>{
  const runner=new CGProgramRunner(calc(),'DrawDyna:Print "after"',{pauseOnDisplay:true});const shown=runner.run();assert.equal(shown.status,'display');assert.deepEqual(shown.outputs,[]);assert.equal(shown.commands[0].kind,'DrawDyna');assert.deepEqual(runner.run().outputs,['after']);
});
test('selected complex program mode computes scalar variables and tagged save/restore preserves use',()=>{
  const calculator=calc();assert.throws(()=>runCGProgram(calculator,'sqrt(-1)→A'),/a\+bi/);
  const r=runCGProgram(calculator,'1+2*i→A:A^2→B:Print B',{complex:true});assert.deepEqual(r.outputs,['-3+4i']);assert.ok(Math.abs(r.variables.B.re+3)<1e-12);assert.ok(Math.abs(r.variables.B.im-4)<1e-12);calculator.assign('B',r.variables.B);
  const restored=new ModelCalculator('cg50',JSON.parse(JSON.stringify(calculator.save())));const second=runCGProgram(restored,'B+1→C:Print C',{complex:true});assert.deepEqual(second.outputs,['-2+4i']);
  for(const source of ['For i→A To 3:Next','PlotOn i,2'])assert.throws(()=>runCGProgram(calc(),source,{complex:true}));
});
test('program comparisons assign native1/0 and quoted strings keep condition keywords intact',()=>{
  const r=runCGProgram(calc(),'1>0→A:2<0→B:(A=1)→C:Print A,B,C:"And"→Str1:If StrCmp(Str1,"And")=0:Then:Print "match":IfEnd');assert.deepEqual(r.outputs,['1 0 1','match']);
});
