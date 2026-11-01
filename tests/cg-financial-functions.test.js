import test from 'node:test';
import assert from 'node:assert/strict';
import {ModelCalculator} from '../src/engine/model-calculator.js';
import {compileSafe,math} from '../src/engine/calculator.js';
import {runCGProgram} from '../src/engine/cg-program.js';
import {CG_FINANCIAL_FUNCTIONS,CG_FINANCIAL_FUNCTION_NAMES,CG_FINANCIAL_VARIABLES,createCGFinancialScope,normalizeCGFinancialExpression,applyCGFinancialCommand,sanitizeCGFinancialNative,snapshotCGFinancialNative} from '../src/engine/cg-financial-functions.js';

const near=(actual,expected,tolerance=1e-9)=>assert.ok(Math.abs(actual-expected)<=tolerance*Math.max(1,Math.abs(expected)),`${actual} != ${expected}`);
const fresh=()=>{const calculator=new ModelCalculator('cg50');return {calculator,f:createCGFinancialScope(calculator)};};

test('OS3.00 financial function inventory follows the24 manual signatures and text spellings',()=>{
  assert.equal(CG_FINANCIAL_FUNCTIONS.length,24);assert.equal(new Set(CG_FINANCIAL_FUNCTION_NAMES).size,24);
  assert.deepEqual(CG_FINANCIAL_FUNCTIONS.find(x=>x.name==='Cmpd_I%'),{name:'Cmpd_I%',parserName:'Cmpd_I',args:['n','PV','PMT','FV','P/Y','C/Y'],minArgs:4,maxArgs:6,defaults:{'P/Y':12,'C/Y':12}});
  assert.equal(CG_FINANCIAL_FUNCTIONS.find(x=>x.name==='Amt_ΣINT').parserName,'Amt_SigmaINT');
  assert.equal(CG_FINANCIAL_FUNCTIONS.find(x=>x.name==='Amt_BAL').minArgs,7);
  assert.ok(!CG_FINANCIAL_FUNCTION_NAMES.some(name=>name.startsWith('Dep_')||name.startsWith('Amrt_')||name==='Date'));
});

test('native percent and Sigma financial tokens normalize without changing quoted text',()=>{
  assert.equal(normalizeCGFinancialExpression('Cmpd_I%(12,1000,-100,0)+Amt_ΣINT(1,2,12,1000,-100,12,12)'), 'Cmpd_I(12,1000,-100,0)+Amt_SigmaINT(1,2,12,1000,-100,12,12)');
  const quoted='"Cmpd_I%(12) Amt_ΣINT(1)"';assert.equal(normalizeCGFinancialExpression(quoted),quoted);
  assert.equal(normalizeCGFinancialExpression('Amt_ ∑ PRN (1,2,12,1000,-100,12,12)'),'Amt_SigmaPRN (1,2,12,1000,-100,12,12)');
});

test('manual7-20 simple interest example and7-2 default setup return signed results',()=>{
  const {calculator,f}=fresh();assert.deepEqual(snapshotCGFinancialNative(calculator),{settings:{days:365,begin:false,frequency:1},memory:{}});
  // Manual:730 days,$300 loan,5% annual,365-day setting.
  near(f.Smpl_SI(730,5,300),-30);near(f.Smpl_SFV(730,5,300),-330);
  assert.equal(applyCGFinancialCommand(calculator,'DateMode360'),true);near(f.Smpl_SI(360,5,300),-15);
  assert.equal(applyCGFinancialCommand(calculator,'DateMode365'),true);near(f.Smpl_SI(365,5,-300),15);
  assert.deepEqual(snapshotCGFinancialNative(calculator).memory,{});assert.equal(applyCGFinancialCommand(calculator,'Unknown'),false);
});

test('all compound functions follow the manual equation and omitted12/12 defaults',()=>{
  const {calculator,f}=fresh(),payment=-1000*.01/(1-1.01**-12);
  near(f.Cmpd_PMT(12,12,1000,0),payment);for(const [key,value]of Object.entries({n:12,rate:12,pv:1000,pmt:payment,fv:0,py:12,cy:12}))near(calculator.financialMemory[key],value);
  near(f.Cmpd_n(12,1000,payment,0),12);near(f.Cmpd_I(12,1000,payment,0),12,1e-8);
  near(f.Cmpd_PV(12,12,payment,0),1000);near(f.Cmpd_FV(12,12,1000,payment),0,1e-7);
  near(f.Cmpd_FV(2,10,-100,0,1,1),121);assert.equal(calculator.financialMemory.py,1);assert.equal(calculator.financialMemory.cy,1);
  f.Cmpd_FV(2,12,-100,0,6);assert.equal(calculator.financialMemory.py,6);assert.equal(calculator.financialMemory.cy,12);
});

test('compound register writes are atomic and isolated from inherited caller state',()=>{
  const {calculator,f}=fresh();f.Cmpd_PMT(12,12,1000,0);const before=structuredClone(calculator.financialMemory);
  assert.throws(()=>f.Cmpd_PMT(0,12,1000,0));assert.deepEqual(calculator.financialMemory,before);
  assert.throws(()=>f.Cmpd_I(12,0,0,0));assert.deepEqual(calculator.financialMemory,before);
  assert.throws(()=>f.Cmpd_FV(12,12,1000,0,0,12));assert.deepEqual(calculator.financialMemory,before);
  const child=Object.create(calculator);createCGFinancialScope(child).Cmpd_FV(12,0,-10,-1);assert.deepEqual(calculator.financialMemory,before);assert.equal(child.financialMemory.fv,22);
  const saved=structuredClone(calculator.financialMemory);f.Smpl_SI(365,5,300);f.Cash_NPV(10,[-100,110]);assert.deepEqual(calculator.financialMemory,saved);
});

test('payment setup controls compound and first amortization payment without mutating scalar vars',()=>{
  const {calculator,f}=fresh(),end=f.Cmpd_PMT(12,12,1000,0),vars=calculator.save().vars;
  applyCGFinancialCommand(calculator,'PmtBgn');near(f.Cmpd_PMT(12,12,1000,0)*1.01,end);
  near(f.Amt_INT(1,2,12,1000,-100,12,12),0);near(f.Amt_PRN(1,2,12,1000,-100,12,12),-100);near(f.Amt_BAL(1,2,12,1000,-100,12,12),809);
  applyCGFinancialCommand(calculator,'PmtEnd');near(f.Amt_INT(1,2,12,1000,-100,12,12),-10);assert.deepEqual(calculator.save().vars,vars);
});

test('cash functions use CF0,discounted fractional payback and the manual255-value bound',()=>{
  const {f}=fresh();near(f.Cash_NPV(10,[-100,110]),0);near(f.Cash_IRR([-100,110]),10);
  near(f.Cash_NFV(10,[-100,121]),11);near(f.Cash_PBP(0,[-100,60,60]),5/3);near(f.Cash_PBP(0,[1,-2]),0);
  near(f.Cash_NPV(10,math.matrix([-100,110])),0);assert.equal(f.Cash_NPV(0,Array(255).fill(1)),255);
  for(const flows of [[],[1],Array(256).fill(1),[[1],[2]],[1,NaN],[1,'2']])assert.throws(()=>f.Cash_NPV(0,flows));
  assert.throws(()=>f.Cash_NPV(-100,[-100,110]));assert.throws(()=>f.Cash_IRR([1,2]));assert.throws(()=>f.Cash_PBP(0,[-100,1]));
});

test('Amt single-payment functions differ from range totals as manual7-9 requires',()=>{
  const {f}=fresh(),args=[2,3,12,1000,-100,12,12];
  near(f.Amt_BAL(...args),727.291);near(f.Amt_INT(...args),-9.1);near(f.Amt_PRN(...args),-90.9);
  near(f.Amt_SigmaINT(...args),-17.291);near(f.Amt_SigmaPRN(...args),-182.709);
  assert.throws(()=>f.Amt_BAL(3,2,12,1000,-100,12,12));assert.throws(()=>f.Amt_BAL(1.5,3,12,1000,-100,12,12));assert.throws(()=>f.Amt_BAL(1,2,12,1000,-100));
});

test('conversion and gross-margin native argument order matches chapter7 formulas',()=>{
  const {f}=fresh();near(f.Cnvt_EFF(2,10),10.25);near(f.Cnvt_APR(2,10.25),10);
  near(f.Cost(100,20),80);near(f.Sell(80,20),100);near(f.Margin(80,100),20);
  assert.throws(()=>f.Cnvt_EFF(0,10));assert.throws(()=>f.Cnvt_APR(12,-100));assert.throws(()=>f.Sell(80,100));assert.throws(()=>f.Margin(80,0));
});

test('Days_Prd applies month/day/year ordering,1901–2099 domain and manual30/360 rules',()=>{
  const {calculator,f}=fresh();assert.equal(f.Days_Prd(2,28,2024,3,1,2024),2);
  assert.equal(f.Days_Prd(1,1,1901,12,31,2099),(Date.UTC(2099,11,31)-Date.UTC(1901,0,1))/86400000);
  applyCGFinancialCommand(calculator,'DateMode360');assert.equal(f.Days_Prd(2,29,2024,3,31,2024),30);assert.equal(f.Days_Prd(3,31,2024,2,29,2024),-30);
  for(const args of [[2,30,2024,3,1,2024],[1,1,1900,1,1,2024],[1,1,2024,1,1,2100],[1.5,1,2024,1,1,2025]])assert.throws(()=>f.Days_Prd(...args));
});

test('Bond functions return native signed3-list and keep their narrower1902–2097 domain',()=>{
  const {calculator,f}=fresh(),par=[1,1,2026,1,1,2031,100,5];
  let prices=f.Bond_PRC(...par,5);near(prices[0],-100);near(prices[1],0);near(prices[2],-100);near(f.Bond_YLD(...par,-100),5,1e-8);
  const accrued=f.Bond_PRC(7,1,2026,1,1,2027,100,5,0);near(accrued[0],-105+5*181/365);near(accrued[1],-5*181/365);near(accrued[2],-105);
  applyCGFinancialCommand(calculator,'PeriodsSemi');prices=f.Bond_PRC(...par,5);near(prices[0],-100);near(f.Bond_YLD(...par,-100),5,1e-8);
  applyCGFinancialCommand(calculator,'PeriodsAnnual');assert.equal(calculator.financialSettings.frequency,1);
  assert.throws(()=>f.Bond_PRC(1,1,1901,1,1,1903,100,5,5));assert.throws(()=>f.Bond_PRC(1,1,2096,1,1,2098,100,5,5));assert.throws(()=>f.Bond_YLD(...par,100));
});

test('financial scope rejects wrong arity,non-real inputs and unsafe expressions',()=>{
  const {calculator,f}=fresh();for(const spec of CG_FINANCIAL_FUNCTIONS){assert.throws(()=>f[spec.parserName]());assert.throws(()=>f[spec.parserName](...Array(spec.maxArgs+1).fill(1)));}
  for(const value of [NaN,Infinity,math.complex(1,1),{},'5',true])assert.throws(()=>f.Smpl_SI(365,value,100));
  for(const source of ['Smpl_SI(365,5,100).constructor','import("x")','Smpl_SI.constructor(1)'])assert.throws(()=>compileSafe(source,CG_FINANCIAL_FUNCTION_NAMES));
  const code=compileSafe(normalizeCGFinancialExpression('Cmpd_I%(12,1000,-100,0)'),CG_FINANCIAL_FUNCTION_NAMES);assert.equal(typeof code.evaluate({...calculator.scope(),...f}),'number');
});

test('saved financial native state is a bounded independent JSON object',()=>{
  const raw={settings:{days:360,begin:true,frequency:2,extra:'ignored'},memory:{n:12,rate:6,pv:1000,pmt:-100,fv:0,py:12,cy:0,bad:10}},safe=sanitizeCGFinancialNative(raw);
  assert.deepEqual(safe,{settings:{days:360,begin:true,frequency:2},memory:{n:12,rate:6,pv:1000,pmt:-100,fv:0,py:12}});raw.memory.pv=99;assert.equal(safe.memory.pv,1000);
  assert.deepEqual(sanitizeCGFinancialNative({settings:{days:'360',begin:'true',frequency:99},memory:{rate:Infinity,pv:1e100,py:-1}}),{settings:{days:365,begin:false,frequency:1},memory:{}});
});

test('native financial VARS read dedicated registers without overriding A–Z or division',()=>{
  const calculator=new ModelCalculator('cg50');calculator.assign('P',9);calculator.assign('y',3);assert.equal(CG_FINANCIAL_VARIABLES.length,7);
  assert.equal(calculator.evaluate('Finance_PY'),12);assert.equal(calculator.evaluate('Finance_CY'),12);assert.equal(calculator.evaluate('I%'),0);
  calculator.evaluate('Cmpd_FV(12,6,-100,-10,4,2)');const memory=calculator.financialMemory;
  for(const spec of CG_FINANCIAL_VARIABLES)near(calculator.evaluate(spec.parserName),memory[spec.key]);
  near(calculator.evaluate('I%'),6);near(calculator.evaluate('PV'),-100);assert.equal(normalizeCGFinancialExpression('P/Y'),'P/Y');assert.equal(calculator.evaluate('P/Y'),3);
  assert.equal(normalizeCGFinancialExpression('"I%"'), '"I%"');assert.equal(calculator.vars.P,9);assert.equal(calculator.vars.y,3);
});

test('CG Run-Matrix and Program invoke actual native financial functions and commands',()=>{
  const calculator=new ModelCalculator('cg50');near(calculator.evaluate('Smpl_SFV(730,5,300)'),-330);near(calculator.evaluate('Cmpd_I%(12,1000,-100,0)'),35.074248773,1e-7);
  const result=runCGProgram(calculator,'DateMode360:Smpl_SI(360,5,300)→A:PmtBgn:Cmpd_FV(12,0,-100,-10)→B:PeriodsSemi:Bond_PRC(1,1,2026,1,1,2031,100,5,5)→List 1:Print A,B');
  assert.deepEqual(result.outputs,['-15 220']);near(result.lists[0][0],-100);assert.deepEqual(result.financialNative.settings,{days:360,begin:true,frequency:2});assert.equal(result.financialNative.memory.fv,220);
});
