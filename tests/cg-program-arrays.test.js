import test from 'node:test';
import assert from 'node:assert/strict';
import {ModelCalculator} from '../src/engine/model-calculator.js';
import {CGProgramRunner,runCGProgram} from '../src/engine/cg-program.js';
const calc=()=>new ModelCalculator('cg50'),near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-9,`${actual} != ${expected}`),z=(value,re,im=0)=>{near(typeof value==='number'?value:value.re,re);near(typeof value==='number'?0:value.im,im);};

test('Program complex Lists retain JSON scalars and compute Sum/Prod/Mean/Cuml/Delta',()=>{
  const r=runCGProgram(calc(),'{1+i,2-i}→List1:Sum List1→A:Prod List1→B:Mean List1→C:Cuml List1→List2:Delta List1→List3:3+4i→List1[2]',{complex:true});z(r.variables.A,3);z(r.variables.B,3,1);z(r.variables.C,1.5);z(r.lists[0][1],3,4);z(r.lists[1][0],1,1);z(r.lists[1][1],3);z(r.lists[2][0],1,-2);assert.equal(Object.getPrototypeOf(r.lists[0][0]),Object.prototype);
});
test('native List arithmetic is elementwise,including complex multiplication/division/powers',()=>{
  const r=runCGProgram(calc(),'{1+i,2-i}→List1:{1-i,3+i}→List2:List1*List2→List3:List1/List2→List4:List1^2→List5:2+List1→List6:-List1→List7',{complex:true});z(r.lists[2][0],2);z(r.lists[2][1],7,-1);z(r.lists[3][0],0,1);z(r.lists[3][1],.5,-.5);z(r.lists[4][0],0,2);z(r.lists[4][1],3,-4);z(r.lists[5][0],3,1);z(r.lists[6][1],-2,1);
  assert.throws(()=>runCGProgram(calc(),'{1,2}→List1:{1}→List2:List1+List2'));
});
test('Program complex matrix arithmetic and Conjg/ReP/ImP use genuine complex algebra',()=>{
  const r=runCGProgram(calc(),'[[1+i,2],[0,1-i]]→MatA:Conjg(MatA)→MatB:MatA*MatB→MatC:ReP(MatA)→MatD:ImP(MatA)→MatE:Det(MatA)→D:MatA*inv(MatA)→MatF',{complex:true});z(r.matrices.MatC[0][0],2);z(r.matrices.MatC[0][1],4,4);z(r.matrices.MatC[1][1],2);assert.deepEqual(r.matrices.MatD,[[1,2],[0,1]]);assert.deepEqual(r.matrices.MatE,[[1,0],[0,-1]]);z(r.variables.D,2);z(r.matrices.MatF[0][0],1);z(r.matrices.MatF[0][1],0);z(r.matrices.MatF[1][1],1);
});
test('Real mode retains stored complex memories and reports a domain error when they are used',()=>{
  const options={lists:[[{re:1,im:2}]],matrices:{MatA:[[{re:2,im:3},4]]},vectors:{VctZ:[[{re:3,im:-4}]]}},r=runCGProgram(calc(),'1→A',options);assert.deepEqual(r.lists[0],[{re:1,im:2}]);assert.deepEqual(r.matrices.MatA,[[{re:2,im:3},4]]);assert.deepEqual(r.vectors.VctZ,[[{re:3,im:-4}]]);
  for(const source of ['Print List1','Print MatA','Print VctZ'])assert.throws(()=>runCGProgram(calc(),source,options),/a\+bi/);
  assert.equal(runCGProgram(calc(),'MatA[1,2]→A',options).variables.A,4);
});
test('Sort/Med/Min/Max reject non-real values without dropping or partially mutating the list',()=>{
  for(const command of ['SortA(List1)','SortD(List1)','Med(List1)','Min(List1)','Max(List1)']){const runner=new CGProgramRunner(calc(),'{2,1+i}→List1:'+command,{complex:true});assert.throws(()=>runner.run(),/Domain|实数/);assert.deepEqual(runner.snapshot().lists[0],[2,{re:1,im:1}]);}
});
test('all26 vector memories preserve row/column direction and support matrix copies and explicit List conversion',()=>{
  const r=runCGProgram(calc(),'[[1,2,3]]→VctZ:Trn(VctZ)→VctA:9→VctA[2,1]:VctA→MatB:MatB→VctB:Dim VctB→List1:MatToList(Trn(VctZ),1)→List2:ListToMat(List2)→VctC');assert.deepEqual(r.vectors.VctZ,[[1,2,3]]);assert.deepEqual(r.vectors.VctA,[[1],[9],[3]]);assert.deepEqual(r.vectors.VctB,[[1],[9],[3]]);assert.deepEqual(r.matrices.MatB,r.vectors.VctB);assert.deepEqual(r.lists[0],[3,1]);assert.deepEqual(r.lists[1],[1,2,3]);assert.deepEqual(r.vectors.VctC,[[1],[2],[3]]);
});
test('new native vector input and Dim require explicit two-dimensional vector shapes',()=>{
  for(const source of ['{1,2}→VctA','[[1,2],[3,4]]→VctA','3→Dim VctA','{2,2}→Dim VctA','[[1,2]]→VctA:VctA→List1','{1,2}→List1:List1→MatA','[[1,2]]→VctA:[[1],[2]]→VctB:VctA+VctB','[[1,2]]→MatA:MatA+1'])assert.throws(()=>runCGProgram(calc(),source));
  const r=runCGProgram(calc(),'{3,1}→Dim VctZ:Fill(1+i,VctZ)',{complex:true});assert.equal(r.vectors.VctZ.length,3);for(const row of r.vectors.VctZ)z(row[0],1,1);
  assert.deepEqual(runCGProgram(calc(),'Print Dim VctA',{vectors:{VctA:[1,2]}}).vectors.VctA,[[1,2]],'only saved legacy flat vectors migrate');
});
test('DotP/CrossP/Angle/UnitV/Norm retain vector orientation and native2D cross result',()=>{
  const r=runCGProgram(calc(),'Rad:[[1,2]]→VctA:[[3,4]]→VctB:DotP(VctA,VctB)→A:CrossP(VctA,VctB)→VctC:UnitV(VctB)→VctD:[[1,0]]→VctE:[[0,1]]→VctF:Angle(VctE,VctF)→B:Norm(VctB)→C');near(r.variables.A,11);near(r.variables.B,Math.PI/2);near(r.variables.C,5);assert.deepEqual(r.vectors.VctC,[[0,0,-2]]);z(r.vectors.VctD[0][0],.6);z(r.vectors.VctD[0][1],.8);
  assert.throws(()=>runCGProgram(calc(),'[[1,2]]→VctA:[[1],[2]]→VctB:DotP(VctA,VctB)'));
});
test('complex vector Norm and UnitV use absolute magnitudes rather than coercion',()=>{
  const r=runCGProgram(calc(),'[[3+4i,0]]→VctZ:Norm(VctZ)→A:UnitV(VctZ)→VctA:ReP(VctA)→VctB:ImP(VctA)→VctC',{complex:true});near(r.variables.A,5);z(r.vectors.VctA[0][0],.6,.8);z(r.vectors.VctB[0][0],.6);z(r.vectors.VctC[0][0],.8);assert.throws(()=>runCGProgram(calc(),'[[i,1]]→VctA:Angle(VctA,VctA)',{complex:true}));
});
test('direct array input/copy preserves answers while row/column calculations update MatAns and VctAns',()=>{
  const calculator=calc();calculator.nativeAnswers={matrix:[[7,8]],vector:[[7,8]],list:[9]};const original=JSON.parse(JSON.stringify(calculator.save()));
  const literal=runCGProgram(calculator,'[[1,2]]→MatA:[[3,4]]→VctA');assert.deepEqual(literal.nativeAnswers,calculator.nativeAnswers);
  const r=runCGProgram(calculator,'[[1,2]]→MatA:MatA+MatA→MatB:[[9,9]]→VctC:VctAns→VctZ:MatAns→MatZ:Dim VctZ→List26');assert.deepEqual(r.nativeAnswers.matrix,[[2,4]]);assert.deepEqual(r.nativeAnswers.vector,[[2,4]]);assert.deepEqual(r.nativeAnswers.list,[1,2]);assert.deepEqual(r.vectors.VctZ,[[2,4]]);assert.deepEqual(r.matrices.MatZ,[[2,4]]);assert.deepEqual(calculator.save(),original);
});
test('complex arrays and native answers survive JSON reload and continue actual Program calculations',()=>{
  const calculator=calc(),first=JSON.parse(JSON.stringify(runCGProgram(calculator,'[[1+i,2-i]]→VctZ:[[1+i,2],[0,1-i]]→MatA:{1+i,2}→List1:VctZ*2→VctA',{complex:true}))),restored=new ModelCalculator('cg50',{...calculator.save(),nativeAnswers:first.nativeAnswers}),next=runCGProgram(restored,'VctZ*2→VctB:Conjg(MatA)→MatB:Sum List1→S:Print VctAns',{vectors:first.vectors,matrices:first.matrices,lists:first.lists,complex:true});z(next.vectors.VctB[0][0],2,2);z(next.vectors.VctB[0][1],4,-2);z(next.matrices.MatB[0][0],1,-1);z(next.variables.S,3,1);assert.deepEqual(next.nativeAnswers.vector,[[{re:2,im:2},{re:4,im:-2}]]);assert.match(next.outputs[0],/2\+2i/);
});
test('yielding programs retain latest vector/complex-array state for completion or a user stop snapshot',()=>{
  let key=0;const runner=new CGProgramRunner(calc(),'[[1+i,2]]→VctZ:{1+i,2}→List1:Do:Getkey→A:LpWhile A=0',{complex:true,keyProvider:()=>key});const waiting=runner.run(undefined,{instructionBudget:100});assert.equal(waiting.status,'yield');assert.deepEqual(waiting.vectors.VctZ,[[{re:1,im:1},2]]);key=38;const done=runner.run(undefined,{instructionBudget:100});assert.equal(done.status,'done');assert.deepEqual(done.vectors,waiting.vectors);assert.deepEqual(done.lists[0],[{re:1,im:1},2]);
});
test('array storage exposes the already-evaluated RHS for native Line display without repeating random calls',()=>{
  const calculator=calc(),scope=calculator.scope.bind(calculator);let calls=0;calculator.scope=extra=>({...scope(extra),Ran:()=>++calls});const runner=new CGProgramRunner(calculator,'{Ran(),Ran()}→List1');runner.run();assert.equal(calls,2);assert.deepEqual(runner.last,[1,2]);assert.deepEqual(runner.memory.lastAssignmentValue,[1,2]);
  const dimensions=new CGProgramRunner(calc(),'{1,3}→Dim VctZ');dimensions.run();assert.deepEqual(dimensions.last,[1,3]);assert.deepEqual(dimensions.memory.vectors.VctZ,[[0,0,0]]);
});
test('Program owns live array banks for function-memory and nested numerical evaluation after dictionary replacement',()=>{
 const parent=calc();parent.arrayMemory={lists:[[100]],names:['Rates'],matrices:{MatA:[[100]]},vectors:{},strings:[]};const runner=new CGProgramRunner(parent,'"Sum(List(\\"Rates\\"))"→fn1:{1,2}→List1:fn1→A:ClrList:{4,5}→List1:fn1→B:diff2("Sum(List1)*x^2",0)→D');const result=runner.run();assert.equal(result.variables.A,3);assert.equal(result.variables.B,9);near(result.variables.D,18);assert.deepEqual(parent.arrayMemory.lists,[[100]]);assert.equal(parent.functionMemory[0],'');assert.equal(result.functionMemory[0],'Sum(List("Rates"))');assert.deepEqual(runner.calculator.arrayMemory.lists[0],[4,5]);assert.doesNotThrow(()=>structuredClone(runner.calculator.arrayMemory));
});
test('Program reuses shared native paired-list,frequency,matrix and numeric ListToMat semantics',()=>{
 const result=runCGProgram(calc(),'{1,3}→List1:{2,2}→List2:Min(List1,List2)→List3:Max(List1,List2)→List4:Mean(List1,{1,3})→A:Med(List1,{1,3})→B:ListToMat(1,2)→MatA:Rref MatA→MatB:Ref(MatA)→MatC:Identity(2)→MatD');assert.deepEqual(result.lists[2],[1,2]);assert.deepEqual(result.lists[3],[2,3]);near(result.variables.A,2.5);near(result.variables.B,3);assert.deepEqual(result.matrices.MatA,[[1,2],[3,2]]);near(result.matrices.MatB[0][0],1);near(result.matrices.MatB[0][1],0);near(result.matrices.MatB[1][0],0);near(result.matrices.MatB[1][1],1);near(result.matrices.MatC[1][0],0);assert.deepEqual(result.matrices.MatD,[[1,0],[0,1]]);
});
