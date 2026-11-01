import test from 'node:test';
import assert from 'node:assert/strict';
import {CG_METRIC_UNITS,CG_METRIC_CATEGORIES,convertCGMetric} from '../src/engine/cg-metric-conversion.js';
import {CG_METRIC_MACROS,metricUnitLatex,metricArrowLatex,metricUnitToken,metricArrowToken,scanCGMetricSource,cgMetricLatexToExpression,metricExpressionToLatex} from '../src/input/cg-metric-symbols.js';
import {CGLinearTokenModel} from '../src/input/cg-linear-editor.js';
import {expressionToLatex,latexToExpression} from '../src/engine/notation.js';
import {ModelCalculator} from '../src/engine/model-calculator.js';
import {evaluateCGRunMatrix} from '../src/engine/cg-run-matrix.js';
const calc=new ModelCalculator('cg50');
const close=(value,expected)=>assert.ok(Math.abs(value-expected)<=1e-12*Math.max(1,Math.abs(expected)),`${value} != ${expected}`);

test('all 106 menu units use distinct opaque stable macros and survive notation round trips',()=>{
  assert.equal(CG_METRIC_UNITS.length,106);assert.equal(Object.keys(CG_METRIC_MACROS).length,107);
  const macros=new Set();for(const unit of CG_METRIC_UNITS){const latex=metricUnitLatex(unit.id);assert.ok(!macros.has(latex));macros.add(latex);assert.equal(CG_METRIC_MACROS[latex.trim().slice(1)].expand,false);const category=CG_METRIC_CATEGORIES.find(category=>category.units.some(item=>item.id===unit.id)),target=category.units.find(item=>item.id!==unit.id),source='12.5 ['+unit.id+'] ▶ ['+target.id+']',read=latexToExpression(expressionToLatex(source));assert.ok(read.includes('['+unit.id+']'));close(calc.evaluate(read),convertCGMetric(12.5,unit.id,target.id));}
});
test('nested conversion syntax preserves fractions, arithmetic precedence and function arguments',()=>{
  for(const [source,expected]of [['(1/2)[cm]▶[in]',convertCGMetric(.5,'cm','in')],['1+(50[cm]▶[in])',1+convertCGMetric(50,'cm','in')],['50[cm]▶[in]+1',convertCGMetric(50,'cm','in')+1],['2*(50[cm]▶[in])',2*convertCGMetric(50,'cm','in')],['sin((50[cm]▶[m]))',Math.sin(.5)]]){const latex=expressionToLatex(source),read=latexToExpression(latex);close(calc.evaluate(read),expected);}
});
test('Math I/O fraction operands stay whole while explicit division observes native Metric priority',()=>{
  const suffix=metricUnitLatex('m')+metricArrowLatex()+metricUnitLatex('cm');
  close(calc.evaluate(latexToExpression(String.raw`\frac{1}{2}`+suffix)),50);
  close(calc.evaluate(latexToExpression(String.raw`1\div2`+suffix)),.005);
});
test('native real List conversions are shown as a List and survive a Math I/O reload',()=>{
  for(const source of ['{1,2,3}[m]▶[cm]','[1,2,3][m]▶[cm]']){const latex=expressionToLatex(source);assert.ok(latex.includes('\\left\\{'),latex);const value=calc.evaluate(latexToExpression(latex));assert.deepEqual(value.toArray?.()??value,[100,200,300]);}
});
test('native List Mat and Vct prefixes form complete operands before Metric and preserve scalar indexes',()=>{
  const c=new ModelCalculator('cg50');c.arrayMemory={lists:[[1,2,3]],matrices:{MatA:[[1,2],[3,4]]},vectors:{VctA:[[5,6]]}};c.nativeAnswers.list=[7,8];
  const suffix=metricUnitLatex('m')+metricArrowLatex()+metricUnitLatex('cm');
  for(const [prefix,expected]of [[String.raw`\CGListPrefix 1`,[100,200,300]],[String.raw`\CGListPrefix 1[2]`,200],[String.raw`\CGMatPrefix A[1,2]`,200],[String.raw`\CGVctPrefix A[1,2]`,600],[String.raw`\CGListPrefix \mathrm{Ans}`,[700,800]]]){
    c.nativeAnswers.list=[7,8];const source=latexToExpression(prefix+suffix),evaluate=expression=>/\b(?:List\d+|Mat[A-Z]|Vct[A-Z])\[/.test(expression)?evaluateCGRunMatrix(c,expression,c.arrayMemory).value:c.evaluate(expression);assert.ok(!source.includes('CGList')&&!source.includes('CGMat')&&!source.includes('CGVct'),source);assert.deepEqual(evaluate(source),expected);c.nativeAnswers.list=[7,8];assert.deepEqual(evaluate(latexToExpression(expressionToLatex(source))),expected);
  }
});
test('Metric scanner and macro reader preserve ordinary indexes and literal text',()=>{
  for(const source of ['List1[2]','List1[N]','MatA[1,2]','VctA[2]','[N]','"50[cm]▶[in]"',"'50[cm]▶[in]'"]){assert.deepEqual(scanCGMetricSource(source),[]);assert.equal(metricExpressionToLatex(source,()=>{throw Error('must not render');}),null);}
  const latex=String.raw`\text{`+metricUnitLatex('cm')+metricArrowLatex()+String.raw`}`;
  assert.equal(cgMetricLatexToExpression(latex,()=>{throw Error('must not parse');}),null);
  assert.deepEqual(scanCGMetricSource('List1[N]+50 [cm] ▶ [in]').map(item=>item.kind),['metric-unit','metric-arrow','metric-unit']);
});
test('Line menu units and arrow have canonical boundaries and atomic selection/deletion',()=>{
  const model=new CGLinearTokenModel('50');model.insertToken(metricUnitToken('angstrom'));model.insertToken(metricArrowToken());model.insertToken(metricUnitToken('in'));
  assert.equal(model.getDisplay(),'50[Å]▶[in]');assert.equal(model.source(),'50 [angstrom] ▶ [in]');
  assert.equal(model.sourceSelection(3,4),'[angstrom]');model.replace(3,4,'X');assert.equal(model.source(),'50X ▶ [in]');model.deleteBackward(model.getDisplay().length);assert.equal(model.source(),'50X ▶');
  const restored=new CGLinearTokenModel('50 [angstrom] ▶ [in]');assert.equal(restored.getDisplay(),'50[Å]▶[in]');assert.equal(restored.getTokens().length,3);
});
test('typed/pasted complete native conversions bind Metric commands without rebinding ordinary native names',()=>{
  const model=new CGLinearTokenModel('');model.replace(0,0,'50[cm]▶[in]');assert.equal(model.source(),'50 [cm] ▶ [in]');assert.equal(model.getTokens().length,3);model.deleteBackward(6);assert.equal(model.getDisplay(),'50▶[in]');
  const literal=new CGLinearTokenModel('');literal.replace(0,0,'"50[cm]▶[in]"+Finance_n+List1[N]');assert.equal(literal.getTokens().length,0);assert.equal(literal.source(),'"50[cm]▶[in]"+Finance_n+List1[N]');
});
test('native Line CLIP paste does not duplicate automatically bound Metric commands',()=>{
  const original=new CGLinearTokenModel('50 [cm] ▶ [in]'),copied=original.sourceSelection(0,original.getDisplay().length),pasted=new CGLinearTokenModel('1+');
  pasted.insertSource(copied);
  assert.equal(pasted.getDisplay(),'1+50[cm]▶[in]');assert.equal(pasted.getTokens().length,3);
  close(calc.evaluate(pasted.source()),1+50/2.54);
  const selected=pasted.sourceSelection(2,pasted.getDisplay().length);pasted.insertSource(selected,2,pasted.getDisplay().length);
  assert.equal(pasted.getTokens().length,3);close(calc.evaluate(pasted.source()),1+50/2.54);
  const quoted=new CGLinearTokenModel('""');quoted.insertSource(copied,1,1);assert.equal(quoted.getTokens().length,0);assert.equal(quoted.source(),'"50[cm]▶[in]"');
});
test('Simp is read as an unevaluated postfix command with an optional numeric divisor',()=>{
  assert.equal(latexToExpression(String.raw`\mathrm{Ans}\CGSimp `),'Ans Simp');assert.equal(latexToExpression(String.raw`\mathrm{Ans}\CGSimp 9`),'Ans Simp 9');
  assert.equal(latexToExpression(expressionToLatex('Ans')),'Ans');assert.equal(latexToExpression(expressionToLatex('Ans Simp 9')),'Ans Simp 9');
  for(const source of ['Ans Simp','Ans Simp 9','15/60 Simp 3']){const latex=expressionToLatex(source);assert.ok(latex.includes('\\CGSimp'));assert.match(latexToExpression(latex),/ Simp(?: 9| 3)?$/);}
  assert.throws(()=>latexToExpression(String.raw`\mathrm{Ans}\CGSimp 3\CGSimp 5`),/Syntax ERROR/);
});
