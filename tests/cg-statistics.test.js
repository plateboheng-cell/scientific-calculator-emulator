import test from 'node:test';
import assert from 'node:assert/strict';
import {sanitizeCGStatistics,cgDataRows,cgSummary,cgStudentCDF,cgStudentTail,cgChiSquareTail,cgFTail,cgDistribution,cgRegression,cgHypothesisTest,cgConfidenceInterval} from '../src/engine/cg-statistics.js';
const near=(actual,expected,tolerance=1e-9)=>assert.ok(Number.isFinite(actual)&&Math.abs(actual-expected)<=tolerance*Math.max(1,Math.abs(expected)),`${actual} ≠ ${expected}`);
const rows=values=>values.map((value,index)=>Array.isArray(value)?value:[value,0,1]);

test('per-element native colors stay aligned through six-file switching and JSON file export/restore',async()=>{
  const {switchCGListFile,sanitizeCGListFile,cgStatisticsMemoryBytes}=await import('../src/engine/cg-statistics.js');
  let data=sanitizeCGStatistics({lists:[[1,NaN,3,4]],elementColors:[['#ff0000','#0000ff','#ffffff','#badbad']]});assert.deepEqual(data.elementColors[0],['#ff0000','#ffffff','#000000']);
  data=switchCGListFile(data,5);data.lists[2]=[7,8];data.elementColors[2]=['#00aa00','#00aabb'];const exported=JSON.parse(JSON.stringify({data:sanitizeCGListFile(data)}));data=switchCGListFile(data,0);assert.deepEqual(data.lists[0],[1,3,4]);assert.deepEqual(data.elementColors[0],['#ff0000','#ffffff','#000000']);
  data=switchCGListFile(data,5);assert.deepEqual(data.elementColors[2],['#00aa00','#00aabb']);assert.deepEqual(sanitizeCGListFile(exported.data).elementColors[2],data.elementColors[2]);assert.ok(cgStatisticsMemoryBytes(data)>cgStatisticsMemoryBytes({...data,elementColors:[]}));
});

test('CG statistics restores 26 finite lists with 999 rows and independent copies',()=>{
  const input={lists:[Array.from({length:1200},(_,i)=>i),[1,NaN,Infinity,4]],freqList:null,forms:{oneZ:{mu0:'2',n:10}}};
  const saved=sanitizeCGStatistics(input);assert.equal(saved.lists.length,26);assert.equal(saved.lists[0].length,999);assert.deepEqual(saved.lists[1],[1,4]);assert.equal(saved.freqList,null);assert.equal(saved.forms.oneZ.mu0,'2');saved.lists[0][0]=99;assert.equal(input.lists[0][0],0);
});
test('complex list elements and their colors survive six-file/JSON persistence; real statistics reject the whole dataset',async()=>{
  const {switchCGListFile}=await import('../src/engine/cg-statistics.js');let data=sanitizeCGStatistics({lists:[[1,{re:2,im:3},4]],elementColors:[['#0000ff','#ff0000','#ffffff']]});assert.equal(data.lists[0].length,3);assert.deepEqual(data.lists[0][1],{re:2,im:3});assert.deepEqual(data.elementColors[0],['#0000ff','#ff0000','#ffffff']);
  data=switchCGListFile(data,5);data=switchCGListFile(sanitizeCGStatistics(JSON.parse(JSON.stringify(data))),0);assert.deepEqual(data.lists[0],[1,{re:2,im:3},4]);const before=JSON.stringify(data);assert.throws(()=>cgDataRows(data),/Domain ERROR/);assert.throws(()=>cgSummary(data.lists[0].map(x=>[x,0,1])),/Domain ERROR/);assert.equal(JSON.stringify(data),before);
});
test('list source validates paired lengths and frequency configuration',()=>{
  const data=sanitizeCGStatistics({lists:[[1,2],[3,4],[2,1]],freqList:2});assert.deepEqual(cgDataRows(data,true),[[1,3,2],[2,4,1]]);data.lists[1].pop();assert.throws(()=>cgDataRows(data,true));
});
test('weighted summaries match explicit samples and median-of-halves quartiles',()=>{
  const summary=cgSummary(rows([1,2,3,4,5]));near(summary.mean,3);near(summary.sd,Math.sqrt(2.5));near(summary.populationSD,Math.sqrt(2));near(summary.Q1,1.5);near(summary.median,3);near(summary.Q3,4.5);near(summary.sumSquares,55);
  const weighted=cgSummary([[1,0,2],[3,0,1]]);near(weighted.n,3);near(weighted.mean,5/3);near(weighted.median,1);near(weighted.Q1,1);near(weighted.Q3,3);
});
test('paired summary uses stable centered sums and rejects invalid frequencies',()=>{
  const result=cgSummary([[1,3,1],[2,5,1],[3,7,1]],true);near(result.meanY,5);near(result.sxx,2);near(result.sxy,4);near(result.sumXY,34);assert.throws(()=>cgSummary([[1,2,-1]],true));
});
test('Student t agrees with the Cauchy distribution and known t quantile',()=>{
  near(cgStudentCDF(0,8),.5);near(cgStudentCDF(1,1),.75);near(cgStudentTail(1,1),.25);near(cgDistribution('t','pdf',{x:0,df:1}),1/Math.PI);near(cgDistribution('t','inverse',{p:.975,df:10}),2.2281388519649385,2e-9);
  near(cgStudentTail(9,10),cgStudentCDF(-9,10));
});
test('chi-square with two degrees of freedom follows the exponential CDF',()=>{
  near(cgChiSquareTail(2,2),Math.exp(-1));near(cgDistribution('chi2','cdf',{lower:1,upper:4,df:2}),Math.exp(-.5)-Math.exp(-2));near(cgDistribution('chi2','inverse',{p:.95,df:2}),-2*Math.log(.05));near(cgDistribution('chi2','pdf',{x:0,df:2}),.5);
});
test('F distribution matches exact small-degree identities and inversion',()=>{
  near(cgDistribution('F','cdf',{upper:3,df1:1,df2:1}),2/Math.PI*Math.atan(Math.sqrt(3)));near(cgFTail(1,9,9),.5);near(cgDistribution('F','inverse',{p:.5,df1:9,df2:9}),1);near(cgDistribution('F','pdf',{x:0,df1:2,df2:2}),1);
  const quantile=cgDistribution('F','inverse',{p:.99,df1:5,df2:12});near(cgDistribution('F','cdf',{upper:quantile,df1:5,df2:12}),.99);
});
test('normal density, interval and inverse use known standard normal values',()=>{
  near(cgDistribution('normal','pdf',{x:0}),1/Math.sqrt(2*Math.PI));near(cgDistribution('normal','cdf',{lower:-1,upper:1}),.6826894921370859);near(cgDistribution('normal','inverse',{p:.975}),1.959963984540054,2e-9);
});
test('all discrete distributions support mass, interval and minimal inverse quantiles',()=>{
  near(cgDistribution('binomial','pdf',{x:2,n:4,probability:.5}),.375);near(cgDistribution('binomial','cdf',{lower:1,upper:3,n:4,probability:.5}),.875);
  near(cgDistribution('poisson','pdf',{x:0,lambda:2}),Math.exp(-2));near(cgDistribution('geometric','cdf',{x:3,probability:.2}),1-.8**3);near(cgDistribution('geometric','inverse',{p:.9,probability:.2}),11);
  near(cgDistribution('hypergeometric','pdf',{x:2,population:10,successes:4,draws:3}),.3);
  near(cgDistribution('binomial','inverse',{p:1,n:10,probability:0}),0);near(cgDistribution('binomial','inverse',{p:1,n:0,probability:.5}),0);
  for(const [kind,parameters]of [['binomial',{n:20,probability:.3}],['poisson',{lambda:5}],['geometric',{probability:.4}],['hypergeometric',{population:100,successes:20,draws:10}]]){const q=cgDistribution(kind,'inverse',{...parameters,p:.8});assert.ok(cgDistribution(kind,'cdf',{...parameters,x:q})>=.8);assert.ok(cgDistribution(kind,'cdf',{...parameters,x:q-1})<.8);}
});
test('invalid distribution parameters reject before inverse evaluation',()=>{
  for(const [kind,parameters]of [['t',{df:0}],['chi2',{df:NaN}],['F',{df1:2,df2:-1}],['normal',{sigma:0}],['binomial',{n:1.2,probability:.5}],['hypergeometric',{population:10,successes:12,draws:3}]])assert.throws(()=>cgDistribution(kind,'inverse',{...parameters,p:.2}));
  assert.throws(()=>cgDistribution('normal','cdf',{lower:3,upper:2}));
  assert.throws(()=>cgStudentTail(NaN,3));
});
test('linear and polynomial fits recover independently constructed coefficients',()=>{
  const linear=cgRegression([1,2,3,4].map(x=>[x,1+2*x,1]),'linear');near(linear.coefficients[0],1);near(linear.coefficients[1],2);near(linear.r2,1);near(linear.predict(5),11);
  const quartic=cgRegression([-3,-2,-1,0,1,2,3].map(x=>[x,3-2*x*x+x**4,1]),'quartic');quartic.coefficients.forEach((x,i)=>near(x,[3,0,-2,0,1][i],1e-8));near(quartic.predict(1.5),3-2*1.5**2+1.5**4);
});
test('large-offset quadratic predictions retain centered numerical accuracy',()=>{
  const fit=cgRegression([-2,-1,0,1,2].map(t=>[1e9+t,5+3*t+2*t*t,1]),'quadratic');near(fit.predict(1e9+.5),7);near(fit.SSE,0,1e-7);
});
test('transformed logarithmic, exponential and power fits retain their meanings',()=>{
  const logarithmic=cgRegression([1,Math.E,Math.E**2,Math.E**3].map(x=>[x,2+3*Math.log(x),1]),'log');near(logarithmic.coefficients[0],2);near(logarithmic.coefficients[1],3);
  const exponential=cgRegression([0,1,2,3].map(x=>[x,2*Math.exp(.5*x),1]),'exp');near(exponential.coefficients[0],2);near(exponential.coefficients[1],.5);
  const power=cgRegression([1,2,3,4].map(x=>[x,3*x**1.5,1]),'power');near(power.coefficients[0],3);near(power.coefficients[1],1.5);assert.throws(()=>cgRegression([[0,1,1],[1,2,1]],'power'));
});
test('nonlinear sine and logistic fits recover noiseless generated curves',()=>{
  const sine=cgRegression(Array.from({length:32},(_,i)=>{const x=i*.25;return [x,4*Math.sin(1.3*x+.7)+2,1];}),'sin');for(const x of [.1,2.3,6.8])near(sine.predict(x),4*Math.sin(1.3*x+.7)+2,1e-6);
  const logistic=cgRegression(Array.from({length:15},(_,i)=>{const x=i*.5;return [x,10/(1+3*Math.exp(-.6*x)),1];}),'logistic');for(const x of [0,2,6])near(logistic.predict(x),10/(1+3*Math.exp(-.6*x)),1e-5);
});
test('one-sample tests and proportions give known Z statistics and p values',()=>{
  const z=cgHypothesisTest('oneZ',{mean:5,n:16,sigma:2,mu0:4});near(z.statistic,2);near(z.p,.04550026389635842);
  const t=cgHypothesisTest('oneT',{sample:[2,4,6,8,10],mu0:4});near(t.statistic,Math.sqrt(2));near(t.df,4);
  near(cgHypothesisTest('oneProp',{x:60,n:100,p0:.5}).statistic,2);
  const two=cgHypothesisTest('twoProp',{x1:60,n1:100,x2:40,n2:100});near(two.statistic,Math.sqrt(8));near(two.p,.0046777349810473);
});
test('two-sample t tests are symmetric and implement pooled versus Welch degrees',()=>{
  const p={sample1:[2,3,5,8],sample2:[1,2,3,4,5],tail:'!='};const a=cgHypothesisTest('twoT',p),b=cgHypothesisTest('twoT',{...p,sample1:p.sample2,sample2:p.sample1});near(a.statistic,-b.statistic);near(a.p,b.p);assert.ok(a.df>0);near(cgHypothesisTest('twoT',{...p,pooled:true}).df,7);
});
test('chi-square GOF, contingency and one-way ANOVA match hand-computed examples',()=>{
  const gof=cgHypothesisTest('chiGOF',{observed:[20,30,50],expected:[25,25,50]});near(gof.statistic,2);near(gof.p,Math.exp(-1));
  const contingency=cgHypothesisTest('chi2way',{table:[[10,20],[20,10]]});near(contingency.statistic,20/3);near(contingency.df,1);assert.deepEqual(contingency.expected,[[15,15],[15,15]]);
  const anova=cgHypothesisTest('anova1',{groups:[[1,2,3],[4,5,6],[7,8,9]]});near(anova.statistic,27);near(anova.p,.001);near(anova.SSbetween,54);near(anova.SSerror,6);
});
test('two-way balanced ANOVA separates both factors and interaction',()=>{
  const result=cgHypothesisTest('anova2',{cells:[[[1,2],[2,3]],[[4,5],[7,8]]]});near(result.dfA,1);near(result.dfB,1);near(result.dfAB,1);near(result.dfE,4);assert.ok(result.FA>0&&result.FB>0&&result.FAB>0);assert.ok(result.pA>=0&&result.pA<=1);
  assert.throws(()=>cgHypothesisTest('anova2',{cells:[[[1],[2,3]],[[4],[5]]]}));
});
test('confidence intervals use known normal and t critical values',()=>{
  const z=cgConfidenceInterval('oneZ',{mean:10,n:100,sigma:2,level:.95});near(z.lower,10-1.959963984540054*.2);near(z.upper,10+1.959963984540054*.2);
  const t=cgConfidenceInterval('oneT',{sample:[1,2,3,4,5],level:.95});near(t.critical,2.7764451051977987,2e-9);near(t.lower,3-t.critical*Math.sqrt(.5));
  const p=cgConfidenceInterval('oneProp',{x:60,n:100,level:.95});near(p.estimate,.6);near(p.se,Math.sqrt(.24/100));
});
test('known-sigma Z inference accepts one observation while t inference requires two',()=>{
  near(cgHypothesisTest('oneZ',{mean:1,n:1,sigma:1,mu0:0}).statistic,1);
  near(cgConfidenceInterval('oneZ',{mean:1,n:1,sigma:1}).upper,1+1.959963984540054);
  assert.throws(()=>cgHypothesisTest('oneT',{mean:1,sd:1,n:1,mu0:0}));
  assert.throws(()=>cgConfidenceInterval('twoT',{mean1:1,sd1:1,n1:1,mean2:2,sd2:1,n2:3}));
  const result=cgHypothesisTest('anova1',{groups:[[1],[2,3],[4,5]]});near(result.statistic,9);near(result.SSerror,1);
});
test('Std and OnData quartiles follow official cumulative-frequency boundary rules',()=>{
  const ordinary=rows([1,2,3,4]);const standard=cgSummary(ordinary,false,'Std'),onData=cgSummary(ordinary,false,'OnData');near(standard.Q1,1.5);near(standard.Q3,3.5);near(onData.Q1,1);near(onData.Q3,3);near(onData.median,2.5);
  const fractional=[[1,0,.25],[2,0,.25],[3,0,.25],[4,0,.25]];near(cgSummary(fractional,false,'Std').Q1,1.5);near(cgSummary(fractional,false,'Std').median,2.5);near(cgSummary(fractional,false,'OnData').Q1,1);near(cgSummary(fractional,false,'OnData').Q3,3);
  const source=cgSummary([[1,0,.1],[2,0,.1],[3,0,.2],[4,0,.3],[5,0,.1],[6,0,.1],[7,0,.1]],false,'Std');near(source.Q1,3);near(source.median,4);near(source.Q3,5);
  const modes=cgSummary([[1,0,2],[2,0,1],[3,0,2]]);assert.deepEqual(modes.modes,[1,3]);near(modes.modeFrequency,2);near(modes.modeCount,2);
});
