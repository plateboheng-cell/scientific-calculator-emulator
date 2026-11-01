import test from 'node:test';
import assert from 'node:assert/strict';
import {simpleInterest,solveTVM,npv,irr,investment,amortization,convertInterest,costSellMargin,dateDays,dateAdd,depreciation,bond,bondYield,breakEven} from '../src/engine/finance.js';
const near=(actual,expected,tolerance=1e-8)=>assert.ok(Math.abs(actual-expected)<=tolerance*Math.max(1,Math.abs(expected)),`${actual} ≠ ${expected}`);

test('simple interest uses cash-flow signs and both day conventions',()=>{
  assert.deepEqual(simpleInterest({n:365,rate:5,pv:-1000}),{SI:50,SFV:1050});
  near(simpleInterest({n:180,rate:10,pv:2000,days:360}).SFV,-2100);
});
test('TVM solves all five unknowns for a fully amortizing loan',()=>{
  const p={n:360,rate:6,pv:100000,pmt:-599.5505251527569,fv:0,py:12,cy:12};
  for(const target of ['n','rate','pv','pmt','fv'])near(solveTVM(target,p),p[target],target==='fv'?1e-6:1e-8);
});
test('TVM zero rate, beginning payments and different compounding frequencies',()=>{
  near(solveTVM('fv',{n:10,rate:0,pv:-100,pmt:-5}),150);
  near(solveTVM('n',{rate:0,pv:100,pmt:-10,fv:0}),10);
  const p={n:24,rate:12,pv:1000,pmt:0,fv:0,py:12,cy:4,begin:true};p.pmt=solveTVM('pmt',p);
  near(solveTVM('pv',p),1000);near(solveTVM('rate',p),12);
  near(solveTVM('pmt',{n:12,rate:12,pv:1000,pmt:0,fv:0,py:12,cy:12,begin:true})*1.01,solveTVM('pmt',{n:12,rate:12,pv:1000,pmt:0,fv:0,py:12,cy:12}));
});
test('cash flow has independently known NPV, two IRRs and missing payback',()=>{
  near(npv(10,[-100,110]),0);near(irr([-100,110]).IRR,10);
  const multiple=irr([-100,230,-132]);assert.equal(multiple.roots.length,2);near(multiple.roots[0],10);near(multiple.roots[1],20);
  const noRecovery=investment({rate:10,values:[-100,10,10]});assert.equal(noRecovery.PBP,null);near(noRecovery.NFV,-100*1.1**2+10*1.1+10);
});
test('amortization conserves principal and total payments',()=>{
  const p={n:12,rate:12,pv:1000,py:12,cy:12};p.pmt=solveTVM('pmt',{...p,fv:0});const a=amortization(p);
  near(a.BAL,0);near(a.PRN,-1000);near(a.INT+a.PRN,p.pmt*12);near(a.rows[0].INT,-10);
  const first=amortization({...p,first:2,last:3});assert.equal(first.rows.length,2);near(first.INT,a.rows[1].INT+a.rows[2].INT);
});
test('nominal/effective rate conversions invert and margins solve consistently',()=>{
  const eff=convertInterest({rate:12,n:12});near(eff,12.68250301319698);near(convertInterest({rate:eff,n:12,target:'nominal'}),12);
  for(const target of ['cost','sell','margin'])near(costSellMargin(target,{cost:80,sell:100,margin:20}),{cost:80,sell:100,margin:20}[target]);
});
test('date actual and US 30/360 rules include leap day and February month end',()=>{
  assert.equal(dateDays('2024-02-28','2024-03-01'),2);assert.equal(dateDays('2024-02-29','2024-03-31',360),30);
  assert.equal(dateDays('2024-03-31','2024-02-29',360),-30);assert.equal(dateAdd('2024-02-28',2),'2024-03-01');
  assert.throws(()=>dateDays('2024-02-30','2025-01-01'));assert.throws(()=>dateAdd('2099-12-31',1));
  assert.equal(dateAdd('1901-01-01',1),'1901-01-02');assert.equal(dateAdd('2097-12-31',1),'2098-01-01');
  assert.throws(()=>dateAdd('1901-01-01',-1));
});
test('SL and SYD depreciation conserve depreciable value with a partial first year',()=>{
  for(const method of ['SL','SYD'])for(const months of [3,6,12]){
    const rows=depreciation({method,n:5,pv:10000,fv:1000,months});near(rows.reduce((s,r)=>s+r.DEP,0),9000);near(rows.at(-1).BOOK,1000);assert.equal(rows.length,months===12?5:6);
  }
  near(depreciation({method:'SL',n:5,pv:10000,fv:1000})[0].DEP,1800);
  near(depreciation({method:'DB',n:5,pv:10000,fv:1000,rate:200})[0].DEP,4000);
  near(depreciation({method:'FP',n:5,pv:10000,fv:1000,rate:20})[0].DEP,2000);
});
test('par bond, discounted bond and yield inversion use signed clean/dirty prices',()=>{
  const p={settlement:'2026-01-01',maturity:'2031-01-01',redemption:100,coupon:5,yieldRate:5,frequency:2};
  const par=bond(p);near(par.PRC,-100);near(par.INT,0);assert.equal(par.N,10);
  const discounted=bond({...p,yieldRate:6});near(discounted.PRC,-95.73489858161209);near(bondYield(p,discounted.PRC),6);
  const accrued=bond({...p,settlement:'2026-04-01'});assert.ok(accrued.INT<0);near(accrued.CST,accrued.PRC+accrued.INT);
  const lastCoupon=bond({...p,settlement:'2030-10-01'});assert.equal(lastCoupon.N,1);assert.ok(lastCoupon.PRC<0);
});
test('break-even solves a target profit and rejects invalid financial inputs',()=>{
  assert.deepEqual(breakEven({fixed:10000,price:50,variable:30}),{Q:500,SALES:25000});
  assert.throws(()=>npv(-100,[-10,20]));assert.throws(()=>irr([1,2,3]));assert.throws(()=>solveTVM('rate',{n:10,pv:0,pmt:0,fv:0}));assert.throws(()=>amortization({n:12,rate:6,pv:100,pmt:-10,first:10,last:3}));
});
