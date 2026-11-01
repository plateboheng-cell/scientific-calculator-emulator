import test from 'node:test';
import assert from 'node:assert/strict';
import {CG_CALC_FUNCTIONS,CG_CALC_MACROS,cgCalcFunctionLatex,cgCalcInfixLatex,cgCalcTokenMeta,scanCGCalcInfixSource,resolveCGCalcLatex} from '../src/input/cg-calc-symbols.js';
import {CGLinearTokenModel} from '../src/input/cg-linear-editor.js';
import {latexToExpression,expressionToLatex} from '../src/engine/notation.js';
import {rewriteCGCalcExpression} from '../src/engine/cg-calc-expression.js';
import {math} from '../src/engine/calculator.js';
const infixValue=source=>math.evaluate(rewriteCGCalcExpression(source),{CGIntDiv:(a,b)=>Math.trunc(a/b),CGRmdr:(a,b)=>a-Math.trunc(a/b)*b});
test('all CALC names have stable non-expanding macros and independent native Line metadata',()=>{
  const macros=new Set();for(const spec of CG_CALC_FUNCTIONS){const macro=cgCalcFunctionLatex(spec.parserName);assert.ok(!macros.has(macro));macros.add(macro);assert.equal(CG_CALC_MACROS[macro.trim().slice(1)].expand,false);const token=cgCalcTokenMeta(spec.parserName);assert.equal(token.kind,'function');token.args[0]='mutated';assert.equal(spec.args[0],spec.parserName==='logab'?'base':spec.parserName==='SolveN'?'equation':'expression');}
  assert.equal(cgCalcFunctionLatex('unknown'),null);assert.equal(cgCalcInfixLatex('unknown'),null);assert.equal(cgCalcTokenMeta('unknown'),null);
});
test('explicit native function macros serialize bodies as unevaluated expressions rather than multiplication',()=>{
  for(const [name,body]of [['Solve','x^{2}-4,1'],['SolveN','x^{2}=4,x,-3,3'],['FMin','(x-2)^{2},-1,4,10'],['FMax','-(x-2)^{2},-1,4'],['diff','x^{3},2'],['diff2','x^{3},2'],['integral','x^{2},0,1,0.000001'],['Sigma','x^{2},x,1,4,1'],['logab','2,8']]){const read=latexToExpression(cgCalcFunctionLatex(name)+'\\left('+body+'\\right)');assert.ok(read.startsWith(name+'('),read);assert.ok(!read.includes('CGCalc'),read);assert.doesNotThrow(()=>rewriteCGCalcExpression(read));}
});
test('SolveN equations and its selected variable remain distinct from store arrows on reload',()=>{
  const source='SolveN(x^2=4,x,-3,3)',latex=expressionToLatex(source),read=latexToExpression(latex);assert.match(latex,/=4/);assert.ok(!latex.includes('\\to'));assert.ok(read.startsWith('SolveN('));assert.ok(read.includes('=4,x,'));assert.ok(!read.includes('→'));assert.match(rewriteCGCalcExpression(read),/^CGSolveN\(/);
});
test('all native CALC functions reload through opaque macros and retain every argument',()=>{
  for(const source of ['Solve(x^2-4,1,-3,3)','SolveN(x^2=4,x,-3,3)','FMin((x-2)^2,-1,4,10)','FMax(-(x-2)^2,-1,4)','diff(x^3,2)','diff2(x^3,2)','integral(x^2,0,1,.000001)','Sigma(x^2,x,1,4,1)','logab(2,8)']){const first=latexToExpression(expressionToLatex(source)),second=latexToExpression(expressionToLatex(first));assert.equal(rewriteCGCalcExpression(first),rewriteCGCalcExpression(second),source);assert.ok(expressionToLatex(source).includes('\\CGCalcF'));}
});
test('CALC input never evaluates a random expression while serializing or reloading its body',()=>{
  const previous=Math.random;let calls=0;Math.random=()=>{calls++;return .25;};try{const source=latexToExpression(expressionToLatex('Solve(Ran()+x,1)'));assert.ok(source.startsWith('Solve('));assert.ok(source.includes('Ran('));assert.equal(calls,0);}finally{Math.random=previous;}
});
test('CG natural Sigma preserves its explicit variable while shared legacy sums retain their API',()=>{
  const latex=String.raw`\sum_{A=1}^{4} A^{2}`,native=latexToExpression(latex,{family:'cg'}),legacy=latexToExpression(latex);assert.ok(native.startsWith('Sigma('),native);assert.match(native,/,A,1,4\)$/);assert.ok(native.includes('(A)^(2)'));assert.ok(legacy.startsWith('sum("'));assert.match(legacy,/x/);assert.match(rewriteCGCalcExpression(native),/^CGSum\(/);
  assert.match(latexToExpression(String.raw`\int_0^1 x^2\,\mathrm{d}x`,{family:'cg'}),/^integral\("/);
  assert.match(latexToExpression(String.raw`\left.\frac{d}{dx}x^2\right|_{x=2}`,{family:'cg'}),/^diff\("/);
  assert.match(latexToExpression(String.raw`\left.\frac{d^2}{dx^2}x^3\right|_{x=2}`,{family:'cg'}),/^diff2\("/);
});
test('a selected lowercase native variable is mapped only inside its own callback body',()=>{
  const source=latexToExpression(String.raw`\sum_{k=1}^{3}(k+e+r+R)`,{family:'cg'});assert.ok(source.startsWith('Sigma('));assert.match(source,/,K,1,3\)$/);assert.ok(source.includes('(K)'));assert.ok(!source.includes('(k)'));assert.ok(source.includes('(e)')&&source.includes('(r)')&&source.includes('(R)'),source);
  const sigma=latexToExpression(cgCalcFunctionLatex('Sigma')+String.raw`\left(k^{2}+e,k,1,3\right)`),solve=latexToExpression(cgCalcFunctionLatex('SolveN')+String.raw`\left(k^{2}=4,k,-3,3\right)`);assert.match(sigma,/,K,1,3\)$/);assert.ok(sigma.includes('(K)^(2)')&&sigma.includes('(e)'));assert.match(solve,/,K,-\(3\),3\)$/);assert.ok(solve.includes('(K)^(2)=4'));
});
test('opaque quotient/remainder follow native multiplication/division precedence and left associativity',()=>{
  const quotient=cgCalcInfixLatex('Int÷'),remainder=cgCalcInfixLatex('Rmdr');
  for(const [latex,expected]of [['20'+quotient+'6\\times2',6],['3\\times10'+quotient+'3',10],['20'+quotient+'6'+remainder+'2',1],['20'+remainder+'6+1',3],['20\\div5'+remainder+'3',1]]){const source=latexToExpression(latex);assert.equal(infixValue(source),expected,source);assert.equal(infixValue(latexToExpression(expressionToLatex(source))),expected);}
});
test('CALC infix scanner ignores strings and longer names but accepts native commands beside digits',()=>{
  assert.deepEqual(scanCGCalcInfixSource('"20 Rmdr 6"+SomeRmdrName+"Int÷"'),[]);assert.deepEqual(scanCGCalcInfixSource('20Int÷6+20Rmdr6').map(token=>token.parserName),['CGIntDiv','CGRmdr']);
  const macro=cgCalcFunctionLatex('Solve');assert.equal(resolveCGCalcLatex('\\text{'+macro+'}'),'\\text{'+macro+'}');
});
test('Line CALC function prefixes keep native labels and delete atomically without deleting the body',()=>{
  for(const name of ['Solve','SolveN','FMin','FMax','diff','diff2','integral','Sigma','logab']){const model=new CGLinearTokenModel('');model.insertToken(cgCalcTokenMeta(name));const prefix=model.getDisplay();assert.equal(model.source(),name+'(');model.replace(prefix.length,prefix.length,'x^2,2)');assert.equal(model.source(),name+'(x^2,2)');model.deleteBackward(1);assert.equal(model.source(),'x^2,2)');assert.equal(model.getTokens().length,0);}
});
test('Line infix insertion CLIP reload partial deletion and quote demotion retain command identities',()=>{
  const model=new CGLinearTokenModel('20');model.insertToken(cgCalcTokenMeta('Int÷'));model.replace(model.getDisplay().length,model.getDisplay().length,'6');assert.equal(model.getDisplay(),'20Int÷6');assert.equal(model.source(),'20 Int÷ 6');assert.equal(model.sourceSelection(3,4),' Int÷ ');const copy=new CGLinearTokenModel(model.source());assert.equal(copy.getDisplay(),model.getDisplay());assert.equal(copy.source(),model.source());copy.replace(3,4,'+');assert.equal(copy.source(),'20+6');
  const quoted=new CGLinearTokenModel('"20 Int÷ 6"');assert.equal(quoted.getTokens().length,0);assert.equal(quoted.source(),'"20 Int÷ 6"');
});
test('native Line CLIP paste serializes each visible integer operator exactly once through repeated pastes',()=>{
  const original=new CGLinearTokenModel('107 Int÷ 7+20 Rmdr 6'),copied=original.sourceSelection(0,original.getDisplay().length),pasted=new CGLinearTokenModel('');
  for(let count=0;count<3;count++){
    pasted.insertSource(copied,0,pasted.getDisplay().length);
    assert.equal(infixValue(pasted.source()),17);
    assert.equal(pasted.getTokens().length,2);
    assert.equal(pasted.source(),copied);
    const tokens=pasted.getTokens();assert.ok(tokens[0].end<=tokens[1].start);
  }
  const caret=pasted.getTokens()[0].start+1;pasted.deleteBackward(caret);
  assert.equal(pasted.getTokens().filter(token=>token.parserName==='CGIntDiv').length,0);
  assert.equal(pasted.getTokens().filter(token=>token.parserName==='CGRmdr').length,1);
});
test('Line source reload preserves CALC functions nested inside one another',()=>{
  const source='Solve(diff(x^3,x)-12,1)+Sigma(x^2,x,1,4,1)',model=new CGLinearTokenModel(source);assert.equal(model.source(),source);assert.deepEqual(model.getTokens().map(token=>token.parserName),['Solve','diff','Sigma']);assert.match(model.getDisplay(),/d\/dx\(/);assert.match(model.getDisplay(),/Σ\(/);
});
