// fx-CG50 OS 3.00 manual 7-20 and 8-48–8-50. These are native function
// signatures; depreciation and date offsets are Financial-screen operations,
// not functions listed by this manual. No executable source is generated.
import {assert,math} from './calculator.js';
import {simpleInterest,solveTVM,npv,irr,amortization,convertInterest,costSellMargin,dateDays,bond,bondYield} from './finance.js';

const real=value=>typeof value==='number'&&Number.isFinite(value)&&Math.abs(value)<1e100;
const record=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
export const CG_FINANCIAL_DEFAULT_SETTINGS=Object.freeze({days:365,begin:false,frequency:1});
const memoryKeys=['n','rate','pv','pmt','fv','py','cy'];
export const CG_FINANCIAL_VARIABLES=Object.freeze([
  ['n','n','Finance_n',0],['I%','rate','Finance_I',0],['PV','pv','Finance_PV',0],['PMT','pmt','Finance_PMT',0],['FV','fv','Finance_FV',0],['P/Y','py','Finance_PY',12],['C/Y','cy','Finance_CY',12],
].map(([name,key,parserName,defaultValue])=>Object.freeze({name,key,parserName,defaultValue})));

// Text spellings for the two Sigma functions are specified by manual 8-59.
// Cmpd_I is the parser spelling of the native Cmpd_I% token.
export const CG_FINANCIAL_FUNCTIONS=Object.freeze([
  ['Smpl_SI',['n','I%','PV']],['Smpl_SFV',['n','I%','PV']],
  ['Cmpd_n',['I%','PV','PMT','FV','P/Y','C/Y'],4],
  ['Cmpd_I%',['n','PV','PMT','FV','P/Y','C/Y'],4,'Cmpd_I'],
  ['Cmpd_PV',['n','I%','PMT','FV','P/Y','C/Y'],4],
  ['Cmpd_PMT',['n','I%','PV','FV','P/Y','C/Y'],4],
  ['Cmpd_FV',['n','I%','PV','PMT','P/Y','C/Y'],4],
  ['Cash_NPV',['I%','Csh']],['Cash_IRR',['Csh']],['Cash_PBP',['I%','Csh']],['Cash_NFV',['I%','Csh']],
  ['Amt_BAL',['PM1','PM2','I%','PV','PMT','P/Y','C/Y']],
  ['Amt_INT',['PM1','PM2','I%','PV','PMT','P/Y','C/Y']],
  ['Amt_PRN',['PM1','PM2','I%','PV','PMT','P/Y','C/Y']],
  ['Amt_ΣINT',['PM1','PM2','I%','PV','PMT','P/Y','C/Y'],7,'Amt_SigmaINT'],
  ['Amt_ΣPRN',['PM1','PM2','I%','PV','PMT','P/Y','C/Y'],7,'Amt_SigmaPRN'],
  ['Cnvt_EFF',['n','I%']],['Cnvt_APR',['n','I%']],
  ['Cost',['Sell','Margin']],['Sell',['Cost','Margin']],['Margin',['Cost','Sell']],
  ['Days_Prd',['MM1','DD1','YYYY1','MM2','DD2','YYYY2']],
  ['Bond_PRC',['MM1','DD1','YYYY1','MM2','DD2','YYYY2','RDV','CPN','YLD']],
  ['Bond_YLD',['MM1','DD1','YYYY1','MM2','DD2','YYYY2','RDV','CPN','PRC']],
].map(([name,args,minArgs=args.length,parserName=name])=>Object.freeze({name,parserName,args:Object.freeze(args),minArgs,maxArgs:args.length,...(minArgs===4?{defaults:Object.freeze({'P/Y':12,'C/Y':12})}:{})})));
export const CG_FINANCIAL_FUNCTION_NAMES=Object.freeze(CG_FINANCIAL_FUNCTIONS.map(item=>item.parserName));

export function normalizeCGFinancialExpression(source){
  assert(typeof source==='string','Financial expression must be text');
  return source.split(/("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/g).map((part,index)=>index%2?part:part
    .replace(/\bCmpd_I\s*%(?=\s*\()/g,'Cmpd_I')
    .replace(/\bAmt_\s*[Σ∑]\s*(INT|PRN)(?=\s*\()/g,'Amt_Sigma$1')
    .replace(/\bI%(?![A-Za-z0-9_])/g,'Finance_I')).join('');
}

export function sanitizeCGFinancialNative(value={}){
  const data=record(value),settings=record(data.settings),memory=record(data.memory);
  return {settings:{days:settings.days===360?360:365,begin:settings.begin===true,frequency:settings.frequency===2?2:1},
    memory:Object.fromEntries(memoryKeys.filter(key=>real(memory[key])&&(!['py','cy'].includes(key)||memory[key]>0)).map(key=>[key,memory[key]]))};
}
export function snapshotCGFinancialNative(calculator){
  return sanitizeCGFinancialNative({settings:calculator.financialSettings,memory:calculator.financialMemory});
}
export function applyCGFinancialCommand(calculator,source){
  const commands={DateMode365:{days:365},DateMode360:{days:360},PmtBgn:{begin:true},PmtEnd:{begin:false},PeriodsAnnual:{frequency:1},PeriodsSemi:{frequency:2}};
  if(!Object.hasOwn(commands,source))return false;
  calculator.financialSettings={...snapshotCGFinancialNative(calculator).settings,...commands[source]};return true;
}

function isoDate(month,day,year){
  assert([month,day,year].every(Number.isInteger),'Date components must be integers');
  assert(month>=1&&month<=12&&day>=1&&day<=31&&year>=1901&&year<=2099,'Date is outside 1901–2099');
  return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}
function cashList(value){
  const data=math.isMatrix(value)?value.toArray():value;
  // CF0 through CF254, manual 7-7 (not the larger desktop table budget).
  assert(Array.isArray(data)&&data.length>=2&&data.length<=255&&data.every(real),'Csh requires 2–255 finite real values');return data.slice();
}
function payback(rate,values){
  // NPV validates the interest domain and cash-flow values first.
  npv(rate,values);if(values[0]>=0)return 0;let balance=values[0];
  for(let period=1;period<values.length;period++){
    const amount=values[period]/(1+rate/100)**period,next=balance+amount;
    assert(real(amount)&&real(next),'Payback calculation exceeds numerical range');
    if(balance<0&&next>=0){const result=period-1-balance/amount;assert(real(result),'Invalid payback period');return result;}
    balance=next;
  }
  throw Error('No Solution: cash flow has no payback period');
}

export function createCGFinancialScope(calculator){
  assert(calculator&&typeof calculator==='object','Financial functions require a calculator');
  const settings=()=>snapshotCGFinancialNative(calculator).settings;
  const result=value=>{assert(real(value),'Financial result exceeds numerical range');return Object.is(value,-0)?0:value;};
  const compound=(target,keys,args)=>{
    const values=Object.fromEntries(keys.map((key,index)=>[key,args[index]]));
    const {begin}=settings(),parameters={...values,py:args[4]??12,cy:args[5]??12,begin};
    if(target==='rate')parameters.rate=snapshotCGFinancialNative(calculator).memory.rate??0;
    const answer=result(solveTVM(target,parameters));
    // Native compound functions alone commit all applicable financial variables.
    // Compute/validate first, then replace the memory object atomically. This also
    // keeps a Program runner inheriting a caller's state from mutating its parent.
    const memory={...snapshotCGFinancialNative(calculator).memory,...values,py:parameters.py,cy:parameters.cy,[target]:answer};
    assert(memoryKeys.every(key=>real(memory[key])),'Invalid compound financial variables');
    calculator.financialMemory=memory;return answer;
  };
  const amort=(kind,args)=>{
    const [first,last,rate,pv,pmt,py,cy]=args,{begin}=settings();
    const answer=amortization({n:last,first,last,rate,pv,pmt,py,cy,begin});
    return kind==='BAL'?answer.BAL:kind==='INT'?answer.rows[0].INT:kind==='PRN'?answer.rows[0].PRN:kind==='SigmaINT'?answer.INT:answer.PRN;
  };
  const bondParameters=args=>({settlement:isoDate(...args.slice(0,3)),maturity:isoDate(...args.slice(3,6)),redemption:args[6],coupon:args[7],...settings()});
  const functions={
    Smpl_SI:(n,rate,pv)=>simpleInterest({n,rate,pv,days:settings().days}).SI,
    Smpl_SFV:(n,rate,pv)=>simpleInterest({n,rate,pv,days:settings().days}).SFV,
    Cmpd_n:(...args)=>compound('n',['rate','pv','pmt','fv'],args),
    Cmpd_I:(...args)=>compound('rate',['n','pv','pmt','fv'],args),
    Cmpd_PV:(...args)=>compound('pv',['n','rate','pmt','fv'],args),
    Cmpd_PMT:(...args)=>compound('pmt',['n','rate','pv','fv'],args),
    Cmpd_FV:(...args)=>compound('fv',['n','rate','pv','pmt'],args),
    Cash_NPV:(rate,values)=>npv(rate,cashList(values)),Cash_IRR:values=>irr(cashList(values)).IRR,
    Cash_PBP:(rate,values)=>payback(rate,cashList(values)),
    Cash_NFV:(rate,values)=>{const flows=cashList(values);return result(npv(rate,flows)*(1+rate/100)**(flows.length-1));},
    Amt_BAL:(...args)=>amort('BAL',args),Amt_INT:(...args)=>amort('INT',args),Amt_PRN:(...args)=>amort('PRN',args),
    Amt_SigmaINT:(...args)=>amort('SigmaINT',args),Amt_SigmaPRN:(...args)=>amort('SigmaPRN',args),
    Cnvt_EFF:(n,rate)=>convertInterest({n,rate,target:'effective'}),Cnvt_APR:(n,rate)=>convertInterest({n,rate,target:'nominal'}),
    Cost:(sell,margin)=>costSellMargin('cost',{sell,margin}),Sell:(cost,margin)=>costSellMargin('sell',{cost,margin}),Margin:(cost,sell)=>costSellMargin('margin',{cost,sell}),
    Days_Prd:(...args)=>dateDays(isoDate(...args.slice(0,3)),isoDate(...args.slice(3,6)),settings().days),
    Bond_PRC:(...args)=>{const value=bond({...bondParameters(args),yieldRate:args[8]});return [value.PRC,value.INT,value.CST];},
    Bond_YLD:(...args)=>bondYield(bondParameters(args),args[8]),
  };
  const functionsScope=Object.fromEntries(CG_FINANCIAL_FUNCTIONS.map(spec=>[spec.parserName,(...args)=>{
    assert(args.length>=spec.minArgs&&args.length<=spec.maxArgs,`${spec.name}: ${spec.minArgs===spec.maxArgs?spec.minArgs:spec.minArgs+'–'+spec.maxArgs} arguments required`);
    const cashIndex=spec.parserName==='Cash_IRR'?0:spec.parserName.startsWith('Cash_')?1:-1;
    assert(args.every((value,index)=>index===cashIndex||real(value)),`${spec.name}: finite real arguments required`);
    const value=functions[spec.parserName](...args);return Array.isArray(value)?value.map(result):result(value);
  }]));
  const scope={...functionsScope};
  for(const spec of CG_FINANCIAL_VARIABLES){const descriptor={enumerable:true,configurable:true,get:()=>snapshotCGFinancialNative(calculator).memory[spec.key]??spec.defaultValue};Object.defineProperty(scope,spec.parserName,descriptor);if(['n','PV','PMT','FV'].includes(spec.name))Object.defineProperty(scope,spec.name,descriptor);}
  // Keep P/Y and C/Y as explicit parser aliases. Rewriting an ordinary P/Y
  // division expression would silently change the user's scalar calculation.
  return scope;
}
