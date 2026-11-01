import test from 'node:test';
import assert from 'node:assert/strict';
import {math,compileSafe} from '../src/engine/calculator.js';
import {CG_STATISTICAL_FUNCTIONS,CG_STATISTICAL_FUNCTION_NAMES,CG_STATISTICAL_VARIABLES,CG_STATISTICAL_COMMANDS,normalizeCGStatisticalExpression,sanitizeCGStatisticalNative,snapshotCGStatisticalNative,evaluateCGStatisticalFunction,evaluateCGStatisticalCommand,createCGStatisticalScope,commitCGStatisticalRegisters,recordCGStatisticalSummary,recordCGStatisticalRegression,recordCGStatisticalInference} from '../src/engine/cg-statistical-functions.js';
import {cgSummary,cgRegression,cgConfidenceInterval,cgHypothesisTest} from '../src/engine/cg-statistics.js';
import {ModelCalculator} from '../src/engine/model-calculator.js';
const near=(actual,expected,tolerance=1e-9)=>assert.ok(Math.abs(actual-expected)<=tolerance*Math.max(1,Math.abs(expected)),`${actual} != ${expected}`);
const value=(name,...args)=>evaluateCGStatisticalFunction(name,args).value;
test('metadata uses the 24 documented function tokens and separate TEST statement names',()=>{
 assert.equal(CG_STATISTICAL_FUNCTIONS.filter(spec=>spec.family==='distribution').length,24);assert.equal(CG_STATISTICAL_FUNCTION_NAMES.length,30);assert.ok(CG_STATISTICAL_FUNCTION_NAMES.includes('InvNormCD'));assert.ok(!CG_STATISTICAL_FUNCTION_NAMES.includes('InvN'));assert.ok(CG_STATISTICAL_COMMANDS.some(spec=>spec.name==='OneSampleZTest'&&spec.syntax==='statement'));assert.ok(CG_STATISTICAL_VARIABLES.every(spec=>spec.parserName.startsWith('CGStat_')));
});
test('normal PD/CD defaults and nonstandard standardized limits match independent formulas',()=>{
 near(value('NormPD',0),1/Math.sqrt(2*Math.PI));near(value('NormPD',5,2,5),1/(2*Math.sqrt(2*Math.PI)));near(value('NormCD',-1,1),.6826894921370859);
 const result=evaluateCGStatisticalFunction('NormCD',[3,7,2,5]);near(result.value,.6826894921370859);assert.deepEqual(result.registers,{p:result.value,zLow:-1,zUp:1});
});
test('inverse normal supports default/left/right/central and numeric tail tokens with exact output registers',()=>{
 near(value('InvNormCD',.975),1.959963984540054);near(value('InvNormCD','R',.025),1.959963984540054);near(value('InvNormCD',1,.025),1.959963984540054);
 const central=evaluateCGStatisticalFunction('InvNormCD',['C',.95,2,5]);near(central.value,5-2*1.959963984540054);near(central.registers.x2InvN,5+2*1.959963984540054);assert.equal(central.registers.x1InvN,central.value);
 assert.throws(()=>value('InvNormCD','X',.95));assert.throws(()=>value('InvNormCD',.95,0));
});
test('native inverse t/chi-square/F use upper-tail probabilities, unlike the mathematical quantile helper',()=>{
 near(value('tPD',0,1),1/Math.PI);near(value('tCD',0,1,1),.25);near(value('InvTCD',.25,1),1);near(value('InvTCD',.05,10),1.812461122810733,3e-9);
 near(value('ChiPD',2,2),Math.exp(-1)/2);near(value('ChiCD',0,2,2),1-Math.exp(-1));near(value('InvChiCD',Math.exp(-1),2),2);near(value('InvChiCD',.05,2),-2*Math.log(.05));
 near(value('FPD',1,2,2),.25);near(value('FCD',0,3,2,2),.75);near(value('InvFCD',.25,2,2),3);
 near(value('InvChiCD',1e-30,2),-2*Math.log(1e-30));near(value('InvFCD',1e-20,2,2),1e20,1e-8);assert.ok(value('InvTCD',1e-20,10)>0);
});
test('binomial optional-x ALL, optional CDF bounds and inverse agree with four-coin probabilities',()=>{
 near(value('BinomialPD',2,4,.5),6/16);value('BinomialPD',4,.5).forEach((p,i)=>near(p,[1/16,4/16,6/16,4/16,1/16][i]));value('BinomialCD',4,.5).forEach((p,i)=>near(p,[1/16,5/16,11/16,15/16,1][i]));near(value('BinomialCD',2,4,.5),11/16);near(value('BinomialCD',1,2,4,.5),10/16);assert.equal(value('InvBinomialCD',.6,4,.5),2);
 assert.throws(()=>value('BinomialPD',999,.5),/999/);
});
test('Poisson, geometric and hypergeometric native argument orders match enumerated distributions',()=>{
 near(value('PoissonPD',0,1),Math.exp(-1));near(value('PoissonCD',1,1),2*Math.exp(-1));near(value('PoissonCD',1,1,1),Math.exp(-1));assert.equal(value('InvPoissonCD',2*Math.exp(-1),1),1);
 near(value('GeoPD',2,.5),.25);near(value('GeoCD',2,.5),.75);near(value('GeoCD',2,3,.5),.375);assert.equal(value('InvGeoCD',.75,.5),2);
 near(value('HypergeoPD',0,2,2,5),.3);near(value('HypergeoPD',1,2,2,5),.6);near(value('HypergeoCD',1,2,2,5),.9);near(value('HypergeoCD',1,1,2,2,5),.6);assert.equal(value('InvHypergeoCD',.5,2,2,5),1);
});
test('only documented data arguments vectorize; equal list lengths zip and scalar bounds broadcast',()=>{
 const result=evaluateCGStatisticalFunction('NormCD',[[-1,-2],1]);near(result.value[0],.6826894921370859);near(result.value[1],.8185946141203637);assert.deepEqual(result.registers.zLow,[-1,-2]);assert.deepEqual(result.registers.zUp,[1,1]);
 const p=value('PoissonPD',math.matrix([0,1,2]),1);near(p[0],Math.exp(-1));near(p[1],Math.exp(-1));near(p[2],Math.exp(-1)/2);
 assert.throws(()=>value('NormCD',[-1,-2],[1]));assert.throws(()=>value('NormPD',0,[1,2]));assert.throws(()=>value('tPD',0,[1,2]));assert.throws(()=>value('NormPD',[[1,2]]));assert.throws(()=>value('NormPD',[]));
});
test('scope commits special registers and Ans/ListAns atomically; getters see same-expression updates',()=>{
 const calculator={vars:{Ans:99,P:11,z:17},statisticalMemory:{p:.25},nativeAnswers:{list:[7]}},scope=createCGStatisticalScope(calculator),code=compileSafe('NormPD(0)+CGStat_p',CG_STATISTICAL_FUNCTION_NAMES);near(code.evaluate(scope),2/Math.sqrt(2*Math.PI));assert.equal(calculator.vars.P,11);assert.equal(calculator.vars.z,17);
 scope.InvNormCD('C',math.matrix([.9,.95]));assert.equal(calculator.nativeAnswers.list.length,2);near(calculator.statisticalMemory.x2InvN[1],1.959963984540054);
 const before=JSON.stringify(calculator);assert.throws(()=>scope.InvNormCD('C',[.95,2]));assert.equal(JSON.stringify(calculator),before);assert.throws(()=>scope.NormPD([{re:1,im:2}]));assert.equal(JSON.stringify(calculator),before);
 const child=Object.create(calculator);createCGStatisticalScope(child).NormPD(1);assert.equal(JSON.stringify(calculator),before);assert.notEqual(child.statisticalMemory.p,calculator.statisticalMemory.p);
});
test('special-register snapshots preserve bounded list results without writing ordinary letter variables',()=>{
 const calculator={vars:{n:77,r:88},statisticalMemory:{p:[.1,.2],Lower:1,Upper:3}};const restored=sanitizeCGStatisticalNative(JSON.parse(JSON.stringify(snapshotCGStatisticalNative(calculator))));assert.deepEqual(restored.registers,{p:[.1,.2],Lower:1,Upper:3});restored.registers.p[0]=99;assert.equal(calculator.statisticalMemory.p[0],.1);
 commitCGStatisticalRegisters(calculator,{Lower:2,Upper:4});assert.equal(calculator.vars.n,77);assert.equal(calculator.vars.r,88);assert.deepEqual(sanitizeCGStatisticalNative({registers:{p:[NaN],bad:2,xInv:Infinity}}),{registers:{}});
});
test('normalization supports documented Unicode/unambiguous variables and appendix alias without rewriting strings or ordinary letters',()=>{
 assert.equal(normalizeCGStatisticalExpression('InvHyperGeoCD(.5,2,2,5)+x1InvN+ZLow+Lower'), 'InvHypergeoCD(.5,2,2,5)+CGStat_x1InvN+CGStat_zLow+CGStat_Lower');assert.equal(normalizeCGStatisticalExpression('p̂1+x̄2+χ²+r²'), 'CGStat_pHat1+CGStat_mean2+CGStat_chi2+r²');assert.equal(normalizeCGStatisticalExpression('"xInv Lower"+F+z+r+n'), '"xInv Lower"+F+z+r+n');
});
test('native one/two sample Z and t statement forms return the documented ListAns ordering',()=>{
 const z=evaluateCGStatisticalCommand('OneSampleZTest',['!=',4,2,5,16]);assert.deepEqual(Object.keys(z.registers),['z','p','mean','n']);near(z.value[0],2);near(z.value[1],.0455002638963584);assert.equal(z.value[2],5);assert.equal(z.value[3],16);
 const zl=evaluateCGStatisticalCommand('OneSampleZTest',[0,2,1,[1,2,3],[1,2,1]]);assert.deepEqual(Object.keys(zl.registers),['z','p','mean','sx','n']);near(zl.registers.mean,2);near(zl.registers.sx,Math.sqrt(2/3));assert.equal(zl.registers.n,4);
 const twoZ=evaluateCGStatisticalCommand('TwoSampleZTest',['>',2,3,10,25,8,36]);near(twoZ.registers.z,2/Math.sqrt(4/25+9/36));assert.deepEqual(twoZ.value.slice(2),[10,8,25,36]);
 const t=evaluateCGStatisticalCommand('OneSampleTTest',['!=',0,1,2,16]);near(t.registers.t,2);assert.deepEqual(t.value.slice(2),[1,2,16]);
 const pooled=evaluateCGStatisticalCommand('TwoSampleTTest',['!=',10,2,5,8,4,7,1]);assert.equal(pooled.value.length,10);near(pooled.registers.sp,Math.sqrt((4*4+6*16)/10));assert.equal(pooled.value[7],pooled.registers.sp);
 const lists=evaluateCGStatisticalCommand('TwoSampleTTest',['!=',[1,2,3],[2,4,6],1,1,0]);assert.equal(lists.value.length,9);near(lists.registers.mean1,2);near(lists.registers.mean2,4);assert.ok(lists.registers.df>0);
});
test('native proportion and F tests write separate probability/estimate registers without mutating inputs',()=>{
 const one=evaluateCGStatisticalCommand('OnePropZTest',['>',.5,60,100]);near(one.registers.z,2);near(one.registers.pHat,.6);assert.equal(one.registers.n,100);
 const two=evaluateCGStatisticalCommand('TwoPropZTest',['!=',60,100,40,100]);near(two.registers.pHat1,.6);near(two.registers.pHat2,.4);near(two.registers.pHat,.5);
 const f=evaluateCGStatisticalCommand('TwoSampleFTest',['>',4,10,2,15]);near(f.registers.F,4);assert.deepEqual(f.value.slice(2),[4,2,10,15]);
 const lists=evaluateCGStatisticalCommand('TwoSampleFTest',[0,[1,2,3],[2,4,6]]);near(lists.registers.mean1,2);near(lists.registers.mean2,4);near(lists.registers.F,.25);assert.equal(lists.value.length,8);
});
test('native regression/chi-square commands return actual residual error and staged destination writes',()=>{
 const reg=evaluateCGStatisticalCommand('LinRegTTest',['!=',[1,2,3,4],[2,3,5,4]]);near(reg.registers.a,1.5);near(reg.registers.b,.8);near(reg.registers.s,Math.sqrt(.9));near(reg.registers.r2,.64);assert.equal(reg.value.length,8);
 const observed=[20,30],expected=[25,25],gof=evaluateCGStatisticalCommand('ChiGOFTest',[observed,expected,1,'List3']);assert.deepEqual(gof.writes,[{kind:'list',target:3,value:[1,1]}]);near(gof.registers.chi2,2);assert.deepEqual(observed,[20,30]);
 const contingency=evaluateCGStatisticalCommand('ChiTest',[[[10,20],[30,40]],'MatB']);near(contingency.registers.df,1);assert.deepEqual(contingency.writes[0],{kind:'matrix',target:'MatB',value:[[12,18],[28,42]]});
});
test('native ANOVA matches the manual 6-46 heat-treatment example and MatAns row layout',()=>{
 const result=evaluateCGStatisticalCommand('TwoWayANOVA',[[1,1,1,1,2,2,2,2],[1,1,2,2,1,1,2,2],[113,116,139,132,133,131,126,122]]);assert.equal(result.answerKind,'matrix');assert.equal(result.value.length,4);near(result.registers.pa,.2458019517,3e-10);near(result.registers.pb,.04222398836,3e-10);near(result.registers.pab,.00278169946,3e-10);assert.deepEqual(result.value[3],[result.registers.Edf,result.registers.SSe,result.registers.MSe,0,0]);
 const one=evaluateCGStatisticalCommand('OneWayANOVA',[[1,1,2,2],[1,3,5,7]]);assert.equal(one.value.length,2);near(one.registers.SSa,16);near(one.registers.SSe,4);near(one.registers.Fa,8);
 const noReplication=evaluateCGStatisticalCommand('TwoWayANOVA',[[1,1,2,2],[1,2,1,2],[1,3,4,8]]);assert.equal(noReplication.value.length,3);assert.equal(noReplication.registers.ABdf,undefined);
});
test('TEST statement validation rejects complex/frequency/destination errors before staging any writes',()=>{
 for(const [name,args]of [['OneSampleZTest',['=',0,1,0,10]],['OneSampleTTest',[0,0,[1,{re:2,im:3},4]]],['TwoSampleTTest',[0,[1,2,3],[2,3,4],2]],['ChiGOFTest',[[1,2],[1,2],1,'List27']],['ChiTest',[[[1,2],[3,4]],'foo']]])assert.throws(()=>evaluateCGStatisticalCommand(name,args),name);
});
test('X/Y/GRAPH summary registers retain both means, sums, deviations, quartiles and all modes',()=>{
 const calculator={vars:{Ans:77,r:88,n:99}},rows=[[1,2,1],[2,4,2],[3,6,1]],summary=cgSummary(rows,true);recordCGStatisticalSummary(calculator,summary,{histogramStart:0,histogramPitch:2});const registers=calculator.statisticalMemory;
 assert.equal(registers.sumX,8);assert.equal(registers.sumSquaresX,18);assert.equal(registers.sumY,16);assert.equal(registers.sumXY,36);assert.equal(registers.meanY,4);near(registers.populationSDX,Math.sqrt(.5));near(registers.sy,2*Math.sqrt(2/3));assert.equal(registers.Mod,2);assert.equal(registers.modeFrequency,2);assert.equal(registers.H_Start,0);assert.equal(registers.H_pitch,2);assert.equal(calculator.vars.Ans,77);assert.equal(calculator.vars.r,88);
 recordCGStatisticalSummary(calculator,cgSummary([[1,0,2],[2,0,2]]));assert.deepEqual(calculator.statisticalMemory.Mod,[1,2]);assert.equal(calculator.statisticalMemory.modeCount,2);
});
test('native regression a/b and polynomial a..e mapping follows each selected formula while helper coefficients stay unchanged',()=>{
 const rows=[0,1,2,3,4,5].map(x=>[x,3*x+2,1]),calculator={};const first=cgRegression(rows,'ax+b');recordCGStatisticalRegression(calculator,first,rows);near(calculator.statisticalMemory.a,3);near(calculator.statisticalMemory.b,2);near(first.coefficients[0],2);near(first.coefficients[1],3);
 const second=cgRegression(rows,'linear');recordCGStatisticalRegression(calculator,second,rows);near(calculator.statisticalMemory.a,2);near(calculator.statisticalMemory.b,3);
 const quadraticRows=[-2,-1,0,1,2].map(x=>[x,2*x*x+3*x+4,1]),quadratic=cgRegression(quadraticRows,'quadratic');recordCGStatisticalRegression(calculator,quadratic,quadraticRows);near(calculator.statisticalMemory.a,2);near(calculator.statisticalMemory.b,3);near(calculator.statisticalMemory.c,4);near(quadratic.coefficients[0],4);
 const med=cgRegression(rows,'medmed');recordCGStatisticalRegression(calculator,med,rows);near(calculator.statisticalMemory.a,3);near(calculator.statisticalMemory.b,2);assert.deepEqual([1,2,3].map(i=>calculator.statisticalMemory['x'+i]),[.5,2.5,4.5]);assert.deepEqual([1,2,3].map(i=>calculator.statisticalMemory['y'+i]),[3.5,9.5,15.5]);
});
test('successful Test/Interval recording writes the statistical bucket and preserves ordinary/financial variables and Ans',()=>{
 const calculator={vars:{Ans:123,n:44,r:55},financialMemory:{n:66}},parameters={mean:5,n:16,sigma:2,mu0:4,level:.95};recordCGStatisticalInference(calculator,'oneZ',parameters,cgHypothesisTest('oneZ',parameters));near(calculator.statisticalMemory.z,2);near(calculator.statisticalMemory.p,.0455002638963584);recordCGStatisticalInference(calculator,'oneZ',parameters,cgConfidenceInterval('oneZ',parameters),{interval:true});near(calculator.statisticalMemory.Lower,4.020018007729973);near(calculator.statisticalMemory.Upper,5.979981992270027);assert.equal(calculator.statisticalMemory.mean,5);assert.equal(calculator.statisticalMemory.n,16);assert.equal(calculator.vars.Ans,123);assert.equal(calculator.vars.n,44);assert.equal(calculator.financialMemory.n,66);
 assert.equal(normalizeCGStatisticalExpression('Σx²+Σx^2+σy+ȳ+Q1+H_pitch'),'CGStat_sumSquaresX+CGStat_sumX^2+CGStat_populationSDY+CGStat_meanY+CGStat_Q1+CGStat_H_pitch');
});
test('ordinary r squared and the regression coefficient of determination are distinct actual calculator values',()=>{
 const calc=new ModelCalculator('cg50');calc.vars.r=4;calc.statisticalMemory={r2:.25};assert.equal(calc.evaluate('r²'),16);assert.equal(calc.evaluate('CGStat_r2'),.25);
});
test('native weighted sample/population dispersion functions match the manual 6-31 data and accept fractional frequencies',()=>{
 const data=[60,70,80,90],freq=[3,5,4,1],n=13,SSE=69000-940*940/n;near(value('StdDev',data,freq),Math.sqrt(SSE/12));near(value('StdDev_σ',data,freq),Math.sqrt(SSE/13));near(value('Variance',data,freq),SSE/12);near(value('Variance_σ²',data,freq),SSE/13);near(value('Variance_σ²',[1,4],[.5,.5]),2.25);assert.equal(value('Variance_σ²',[4]),0);assert.throws(()=>value('Variance',[4]),/Domain/);assert.throws(()=>value('StdDev',[1,2],1),/list/);assert.throws(()=>value('StdDev',[1,2],[1]),/Dimension/);
 assert.equal(normalizeCGStatisticalExpression('StdDev_σ([1,2])+Variance_sigma^2([1,2])'),'StdDev_sigma([1,2])+Variance_sigma2([1,2])');
});
test('postfix estimated-value operators use the latest supported regression and preserve stable regression metadata',()=>{
 const calc={vars:{Ans:77}},rows=[0,1,2,3,4].map(x=>[x,3*x+2,1]);recordCGStatisticalRegression(calc,cgRegression(rows,'ax+b'),rows);let scope=createCGStatisticalScope(calc);near(scope.CGStat_yhat(20),62);near(scope.CGStat_xhat(1001),333);
 assert.equal(normalizeCGStatisticalExpression('20ŷ+(1001)x-hat'),'CGStat_yhat(20)+CGStat_xhat((1001))');assert.equal(normalizeCGStatisticalExpression('InvNormCD("R",.05)ŷ'),'CGStat_yhat(InvNormCD("R",.05))');assert.equal(normalizeCGStatisticalExpression('3×-2ŷ'),'3×CGStat_yhat(-2)');assert.equal(normalizeCGStatisticalExpression('"20ŷ"'),'"20ŷ"');
 const source=normalizeCGStatisticalExpression('20ŷ+1001x-hat');near(compileSafe(source,CG_STATISTICAL_FUNCTION_NAMES).evaluate(scope),395);
 const native=sanitizeCGStatisticalNative(JSON.parse(JSON.stringify(snapshotCGStatisticalNative(calc)))),restored={statisticalMemory:native.registers,statisticalRegression:native.regression};near(createCGStatisticalScope(restored).CGStat_yhat(20),62);assert.notEqual(restored.statisticalRegression.rows,calc.statisticalRegression.rows);
 const offsetRows=[0,1,2,3,4].map(x=>[1e12+x,3*x+2,1]);recordCGStatisticalRegression(calc,cgRegression(offsetRows,'linear'),offsetRows);scope=createCGStatisticalScope(calc);near(scope.CGStat_yhat(1e12+2.5),9.5,1e-7);assert.equal(scope.CGStat_xhat(9.5),1e12+2.5);
});
test('estimated-value operators reject the manual-excluded regression families and invalid real domains',()=>{
 for(const type of ['medmed','quadratic','cubic','quartic','sin','logistic'])assert.throws(()=>evaluateCGStatisticalFunction('ŷ',[1],{regression:{type,coefficients:[1,2,3]}}),/Domain/);
 assert.throws(()=>createCGStatisticalScope({}).CGStat_yhat(1),/Domain/);const reg={type:'log',coefficients:[2,3]};near(evaluateCGStatisticalFunction('ŷ',[Math.E],{regression:reg}).value,5);near(evaluateCGStatisticalFunction('x̂',[5],{regression:reg}).value,Math.E);assert.throws(()=>evaluateCGStatisticalFunction('ŷ',[-1],{regression:reg}),/Domain/);
});
test('native regression MSe uses log residuals for exponential/power and n−2 for sinusoidal models',()=>{
 const rows=[1,2,3,4,5,6].map((x,i)=>[x,[2,4,7,10,18,30][i],1]),calculator={};for(const type of ['exp','abexp','power']){const fit=cgRegression(rows,type),expected=rows.reduce((sum,[x,y,w])=>sum+w*(Math.log(y)-Math.log(fit.predict(x)))**2,0)/(rows.length-2);recordCGStatisticalRegression(calculator,fit,rows);near(calculator.statisticalMemory.MSe,expected,1e-11);assert.ok(Math.abs(calculator.statisticalMemory.MSe-fit.MSE)>1e-4);}
 const sinusoid=Array.from({length:10},(_,i)=>[i,2*Math.sin(.7*i+.3)+1+(i%3-1)*.1,1]),fit=cgRegression(sinusoid,'sin');recordCGStatisticalRegression(calculator,fit,sinusoid);near(calculator.statisticalMemory.MSe,fit.SSE/(10-2),1e-11);assert.ok(Math.abs(calculator.statisticalMemory.MSe-fit.MSE)>1e-5);
});
