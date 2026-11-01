import test from 'node:test';
import assert from 'node:assert/strict';
import {math} from '../src/engine/calculator.js';
import {rewriteCGCalcExpression as rewrite} from '../src/engine/cg-calc-expression.js';
import {cgIntegerQuotient,cgIntegerRemainder,cgLogarithmBase} from '../src/engine/cg-calc-arithmetic.js';
const value=source=>math.evaluate(rewrite(source),{CGIntDiv:cgIntegerQuotient,CGRmdr:cgIntegerRemainder,CGLogab:cgLogarithmBase});

test('manual integer quotient and remainder examples return15 and2',()=>{assert.equal(value('107 Int÷ 7'),15);assert.equal(value('107 Rmdr 7'),2);assert.equal(value('logab(2,8)'),3);});
test('native integer operators share explicit multiplication priority and associate left to right',()=>{
  for(const [source,expected]of [['2*107 Int÷7',30],['2×107 Int÷7',30],['107 Int÷7*2',30],['107 Int÷7÷2',7.5],['107 Rmdr7*2',4],['107 Int÷7 Rmdr4',3],['100/2 Int÷3',16],['1+107 Int÷7*2-4',27],['2^3 Int÷3',2],['10 Int÷(1+2)',3]])assert.equal(value(source),expected,source);
});
test('unary signs and scientific exponent signs stay inside operands',()=>{for(const [source,expected]of [['-107 Int÷7',-15],['107 Rmdr -7',2],['107 Int÷-7',-15],['-107 Rmdr7',-2],['1e+3 Int÷7',142],['1e-3+107 Int÷7',15.001]])assert.equal(value(source),expected,source);});
test('ordinary strings,scientific notation and array indexing remain untouched',()=>{
  for(const source of ['"107 Int÷7 and Solve(x,1)"','List1[2]+MatA[1,2]','1e-8+2e+3','Sum(List1)','mySolve(x,1)','{1,2,3}','[[1,2],[3,4]]'])assert.equal(rewrite(source),source);
  assert.deepEqual(value('[107 Int÷7,107 Rmdr7]').toArray(),[15,2]);
});
test('integer arithmetic accepts only safe integral real scalars and documents the signed policy',()=>{
  assert.equal(cgIntegerQuotient(-107,7),-15);assert.equal(cgIntegerRemainder(-107,7),-2);assert.equal(Object.is(cgIntegerRemainder(-14,7),-0),false);
  for(const bad of [.5,Infinity,NaN,Number.MAX_SAFE_INTEGER+1,[1],{re:1,im:0},1n]){assert.throws(()=>cgIntegerQuotient(bad,2));assert.throws(()=>cgIntegerRemainder(2,bad));}
  assert.throws(()=>cgIntegerQuotient(1,0));assert.throws(()=>cgIntegerRemainder(1,0));assert.equal(cgIntegerRemainder(Number.MAX_SAFE_INTEGER,2),1);
});
test('real logarithm validates base,value and output domains without reversing arguments',()=>{
  assert.equal(cgLogarithmBase(2,8),3);assert.equal(cgLogarithmBase(10,100),2);assert.equal(cgLogarithmBase(.5,2),-1);
  for(const [base,number]of [[1,2],[0,2],[-2,2],[2,0],[2,-1],[Infinity,2],[2,NaN]])assert.throws(()=>cgLogarithmBase(base,number));
});
test('Solve and SolveN quote their expression bodies and preserve explicit ranges',()=>{
  assert.equal(rewrite('Solve(x^2-2,1)'),'CGSolve("x^2-2",1)');assert.equal(rewrite('Solve(x^2=2,1,0,2)'),'CGSolve("(x^2)-(2)",1,0,2)');
  assert.equal(rewrite('SolveN(x^2-5*x-6)'),'CGSolveN("x^2-5*x-6","x")');assert.equal(rewrite('SolveN(A^2=9,A,-4,4)'),'CGSolveN("(A^2)-(9)","A",-4,4)');
  assert.equal(rewrite('SolveN(theta=1,θ)'),'CGSolveN("(theta)-(1)","theta")');assert.equal(rewrite('SolveN(x^2=9,-4,4)'),'CGSolveN("(x^2)-(9)","x",-4,4)');
});
test('SolveN variable slots require one native scalar name and equality is unambiguous',()=>{
  for(const source of ['SolveN(x,Ans)','SolveN(x,"A")','SolveN(x,A+1)','SolveN(x,Finance_n)','SolveN(x==2)','SolveN(x=2=3)','SolveN(=2)','Solve(x,1,2)','Solve(x)'])assert.throws(()=>rewrite(source),undefined,source);
});
test('extrema and derivatives stringify bodies without evaluating nested ordinary functions',()=>{
  assert.equal(rewrite('FMin(sin(x)+logab(2,8),0,3,6)'),'CGFMin("sin(x)+CGLogab(2,8)",0,3,6)');
  assert.equal(rewrite('FMax(x^2,-1,1)'),'CGFMax("x^2",-1,1)');assert.equal(rewrite('diff(x^3,3)'),'diff("x^3",3)');assert.equal(rewrite('diff2(x^3)'),'diff2("x^3",x)');
  assert.equal(rewrite('CGFMin("x^2",0,3,6)'),'CGFMin("x^2",0,3,6)');
});
test('native Sigma keeps its variable and partition arguments while legacy sum and List Sum remain distinct',()=>{
  assert.equal(rewrite('Sigma(K^2-3*K+5,K,2,6)'),'CGSum("K^2-3*K+5","K",2,6)');assert.equal(rewrite('Sigma(K,K,1,9,2)'),'CGSum("K","K",1,9,2)');
  assert.equal(rewrite('sum("x^2",1,5)'),'sum("x^2",1,5)');assert.equal(rewrite('Sum(List1)'),'Sum(List1)');assert.throws(()=>rewrite('Sigma(K,"K",1,4)'));assert.throws(()=>rewrite('Sigma(K,1,4)'));assert.throws(()=>rewrite('sum(K,K,1,4)'));
});
test('native selected variables bind only matching whole symbols inside the body',()=>{
  assert.equal(rewrite('Sigma(k^2,k,1,k+3)'),'CGSum("K^2","K",1,k+3)');assert.equal(rewrite('SolveN(k^2=4,k,-3,3)'),'CGSolveN("(K^2)-(4)","K",-3,3)');
  assert.equal(rewrite('Sigma(k+StrLen("k")+knot,k,1,3)'),'CGSum("K+StrLen(\\"k\\")+knot","K",1,3)');assert.equal(rewrite('Sigma(k(x)+k,k,1,3)'),'CGSum("k(x)+K","K",1,3)');
});
test('native integral retains tolerance while quoted expression bodies remain single strings',()=>{
  assert.equal(rewrite('integral(sin(x),0,pi,1e-5)'),'CGIntegral("sin(x)",0,pi,1e-5)');assert.equal(rewrite('integral(x^2,0,1)'),'CGIntegral("x^2",0,1)');assert.equal(rewrite('integral("x^2",0,1)'),'CGIntegral("x^2",0,1)');
  assert.equal(rewrite('diff("x^3",2)'),'diff("x^3",2)');assert.throws(()=>rewrite('diff(x,1,1e-5)'));assert.throws(()=>rewrite('integral(x,0)'));
});
test('manual forbidden nested numerical calculations are rejected,including quoted bodies and SolveN bounds',()=>{
  for(const source of ['diff(diff2(x,2),1)','FMin(integral(x,0,1),0,1)','integral("diff(x,1)",0,2)','Sigma(FMax(x,0,1),K,1,3)','SolveN(x=2,x,FMin(x,0,1),2)','Solve(diff2(x,1),0)','RndFix(logab(2,8),2)'])assert.throws(()=>rewrite(source),/nested numerical/);
  assert.equal(rewrite('diff(Sum(List1)+sin(x),1)'),'diff("Sum(List1)+sin(x)",1)');
});
test('rewriting protects quoted program text and never invokes an expression function',()=>{
  let calls=0;const expression='FMin(Ran()+x,0,1)+Solve(x+Getkey(),0)';globalThis.Ran=()=>{calls++;};try{const rewritten=rewrite(expression);assert.match(rewritten,/Ran\(\)/);assert.match(rewritten,/Getkey\(\)/);assert.equal(calls,0);}finally{delete globalThis.Ran;}
  assert.equal(rewrite('StrJoin("Solve(x,1)","107 Int÷7")'),'StrJoin("Solve(x,1)","107 Int÷7")');
});
test('rewrites are idempotent and malformed delimiters or excessive depth fail within bounded work',()=>{
  for(const source of ['107 Int÷7+logab(2,8)','FMin(x^2,0,1)','SolveN(x^2=1,x,-2,2)','integral(x,0,1)','Sigma(K,K,1,3)']){const once=rewrite(source);assert.equal(rewrite(once),once);}
  for(const source of ['Solve(x,1','Solve("x,1)','Solve([x),1)','1 Int÷','Int÷7','('+ '('.repeat(40)+'1'+')'.repeat(41),'1'.repeat(1501)])assert.throws(()=>rewrite(source));
});
