// Formulas follow fx-CG50 Software 3.00, chapter 7. Rates are percentages;
// money follows the calculator's cash-flow sign convention.
import {assert} from './calculator.js';
const finite=(...xs)=>assert(xs.every(x=>typeof x==='number'&&Number.isFinite(x)&&Math.abs(x)<1e100),'请输入有限实数且绝对值小于 10^100');
const checked=x=>{finite(x);return Object.is(x,-0)?0:x;};
const integer=(x,min,max=10000)=>assert(Number.isInteger(x)&&x>=min&&x<=max,'期数超出范围');

export function simpleInterest({n,rate,pv,days=365}){
  finite(n,rate,pv);assert(n>=0&&[360,365].includes(+days),'日期模式须为 360 或 365');
  const si=-pv*rate/100*n/days;return {SI:checked(si),SFV:checked(-pv+si)};
}
export function periodicRate(rate,py=1,cy=1){
  finite(rate,py,cy);assert(py>0&&cy>0&&rate>-100*cy,'利率或每年期数无效');
  return Math.expm1(Math.log1p(rate/(100*cy))*cy/py);
}
function annuity(i,n,begin){return Math.abs(i)<1e-12?n*(1+(begin?i:0)):Math.expm1(n*Math.log1p(i))/i*(begin?1+i:1);}
// Search in log(1+r) space, then bisect. A residual check rejects apparent roots
// caused by overflow or a nearly flat function. Multiple IRRs remain explicit.
function rootsLogRate(f,{lo=-14,hi=12,steps=600,scale=1}={}){
  const roots=[];let prev;
  for(let k=0;k<=steps;k++){
    const t=lo+(hi-lo)*k/steps;let y;try{y=f(Math.expm1(t));}catch{prev=undefined;continue;}
    if(!Number.isFinite(y)){prev=undefined;continue;}
    if(y===0){roots.push(Math.expm1(t));prev=undefined;continue;}
    if(prev&&Math.sign(y)!==Math.sign(prev.y)){
      let a=prev.t,b=t,fa=prev.y;
      for(let j=0;j<110;j++){const m=(a+b)/2;let v;try{v=f(Math.expm1(m));}catch{break;}if(!Number.isFinite(v))break;if(v===0){a=b=m;break;}if(Math.sign(v)===Math.sign(fa)){a=m;fa=v;}else b=m;}
      const r=Math.expm1((a+b)/2);let res;try{res=f(r);}catch{prev={t,y};continue;}
      if(Number.isFinite(res)&&Math.abs(res)<=1e-7*Math.max(1,scale)&&!roots.some(x=>Math.abs(x-r)<1e-7*Math.max(1,Math.abs(r))))roots.push(r);
    }
    prev={t,y};
  }
  return roots;
}
export function solveTVM(target,parameters){
  const p={n:1,rate:0,pv:0,pmt:0,fv:0,py:1,cy:1,begin:false,...parameters};
  assert(['n','rate','pv','pmt','fv'].includes(target),'未知求解项');
  for(const key of ['n','rate','pv','pmt','fv','py','cy'])if(key!==target)finite(p[key]);
  assert(p.py>0&&p.cy>0,'每年期数须为正数');
  if(target!=='n')assert(p.n>0&&p.n<=1e7,'期数须大于零');
  if(target==='rate'){
    assert(Math.max(Math.abs(p.pv),Math.abs(p.pmt),Math.abs(p.fv))>0,'现金流不能全为零');
    const f=i=>p.pv*Math.exp(p.n*Math.log1p(i))+p.pmt*annuity(i,p.n,p.begin)+p.fv;
    const roots=rootsLogRate(f,{scale:Math.abs(p.pv)+Math.abs(p.pmt)*p.n+Math.abs(p.fv)});
    assert(roots.length,'无法求得利率，请检查现金流正负号');
    const guess=Number.isFinite(p.rate)?periodicRate(Math.max(p.rate,-99*p.cy),p.py,p.cy):0;
    const i=roots.sort((a,b)=>Math.abs(a-guess)-Math.abs(b-guess))[0];
    return checked(100*p.cy*Math.expm1(Math.log1p(i)*p.py/p.cy));
  }
  const i=periodicRate(p.rate,p.py,p.cy),g=Math.exp(p.n*Math.log1p(i)),a=annuity(i,p.n,p.begin);
  if(target==='pv')return checked(-(p.pmt*a+p.fv)/g);
  if(target==='pmt'){assert(a!==0,'无法求解付款额');return checked(-(p.pv*g+p.fv)/a);}
  if(target==='fv')return checked(-(p.pv*g+p.pmt*a));
  if(Math.abs(i)<1e-12){assert(p.pmt!==0,'期数没有唯一解');const n=-(p.pv+p.fv)/p.pmt;assert(n>0,'期数没有正实数解');return checked(n);}
  const q=p.pmt*(p.begin?1+i:1)/i,ratio=(q-p.fv)/(p.pv+q);
  assert(Number.isFinite(ratio)&&ratio>0,'期数没有正实数解');
  const n=Math.log(ratio)/Math.log1p(i);assert(n>0,'期数没有正实数解');return checked(n);
}
export function cashFlows(values){
  assert(Array.isArray(values)&&values.length>=2&&values.length<=1000,'现金流须有 2–1000 项（首项为初始现金流）');values.forEach(x=>finite(x));return values;
}
export function npv(rate,values){
  finite(rate);assert(rate>-100,'利率须大于 −100%');cashFlows(values);
  let result=values.at(-1);for(let i=values.length-2;i>=0;i--)result=result/(1+rate/100)+values[i];return checked(result);
}
export function irr(values,guess=10){
  cashFlows(values);assert(values.some(x=>x>0)&&values.some(x=>x<0),'IRR 须同时有流入和流出');
  const scale=values.reduce((s,x)=>s+Math.abs(x),0),roots=rootsLogRate(r=>npvUnchecked(r,values),{scale});
  assert(roots.length,'未找到 IRR；可能没有实数解');
  roots.sort((a,b)=>Math.abs(a-guess/100)-Math.abs(b-guess/100));
  return {IRR:checked(roots[0]*100),roots:roots.map(x=>checked(x*100))};
}
function npvUnchecked(r,values){let sum=values.at(-1);for(let i=values.length-2;i>=0;i--)sum=sum/(1+r)+values[i];return sum;}
export function investment({rate,values}){
  const NPV=npv(rate,values);let IRR=null,roots=[];try{({IRR,roots}=irr(values,rate));}catch{/* NPV and payback are defined without an IRR. */}
  let cumulative=values[0],payback=cumulative>=0?0:null;
  for(let i=1;i<values.length;i++){const before=cumulative,discounted=values[i]/(1+rate/100)**i;cumulative+=discounted;if(payback===null&&before<0&&cumulative>=0)payback=i-1+(-before/discounted);}
  return {NPV,IRR,roots,PBP:payback,NFV:checked(NPV*(1+rate/100)**(values.length-1))};
}
export function amortization({n,rate,pv,pmt,py=12,cy=12,begin=false,first=1,last=n}){
  finite(n,rate,pv,pmt,first,last);integer(n,1);integer(first,1,n);integer(last,first,n);
  const i=periodicRate(rate,py,cy),rows=[];let bal=pv,totalInterest=0,totalPrincipal=0;
  for(let k=1;k<=last;k++){
    const interest=begin&&k===1?0:-bal*i,principal=pmt-interest;bal+=principal;
    rows.push({period:k,BAL:checked(bal),INT:checked(interest),PRN:checked(principal)});
    if(k>=first){totalInterest+=interest;totalPrincipal+=principal;}
  }
  return {BAL:checked(bal),INT:checked(totalInterest),PRN:checked(totalPrincipal),rows:rows.slice(first-1)};
}
export function convertInterest({rate,n=12,target='effective'}){
  finite(rate,n);assert(['effective','nominal'].includes(target),'未知换算方向');assert(n>0&&rate>(target==='effective'?-100*n:-100),'利率或复利次数无效');
  return checked(target==='effective'?100*Math.expm1(n*Math.log1p(rate/(100*n))):100*n*Math.expm1(Math.log1p(rate/100)/n));
}
export function costSellMargin(target,{cost,sell,margin}){
  assert(['cost','sell','margin'].includes(target),'未知求解项');
  if(target==='cost'){finite(sell,margin);return checked(sell*(1-margin/100));}
  if(target==='sell'){finite(cost,margin);assert(margin!==100,'毛利率不能为 100%');return checked(cost/(1-margin/100));}
  finite(cost,sell);assert(sell!==0,'售价不能为零');return checked(100*(sell-cost)/sell);
}
function date(value){
  assert(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value),'日期格式须为 YYYY-MM-DD');
  const [y,m,d]=value.split('-').map(Number),v=new Date(Date.UTC(y,m-1,d));
  assert(y>=1901&&y<=2099&&v.getUTCFullYear()===y&&v.getUTCMonth()===m-1&&v.getUTCDate()===d,'日期须为 1901–2099 年的有效日期');return v;
}
function dayDifference(a,b,days=365){
  if(+days===365)return (b-a)/86400000;
  assert(+days===360,'日期模式须为 360 或 365');
  let d1=a.getUTCDate(),d2=b.getUTCDate();const febLast=d=>d.getUTCMonth()===1&&new Date(d.getTime()+86400000).getUTCMonth()===2;
  if(febLast(a)&&febLast(b))d2=30;if(febLast(a))d1=30;if(d2===31&&d1>=30)d2=30;if(d1===31)d1=30;
  return (b.getUTCFullYear()-a.getUTCFullYear())*360+(b.getUTCMonth()-a.getUTCMonth())*30+d2-d1;
}
export function dateDays(d1,d2,days=365){const a=date(d1),b=date(d2);return a>b?-dayDifference(b,a,days):dayDifference(a,b,days);}
export function dateAdd(d1,n){finite(n);integer(Math.abs(n),0,100000);const d=date(d1);d.setUTCDate(d.getUTCDate()+n);const value=d.toISOString().slice(0,10);date(value);return value;}
export function depreciation({method='SL',n,pv,fv=0,rate=200,months=12}){
  finite(n,pv,fv,rate,months);integer(n,1,200);integer(months,1,12);assert(pv>=fv&&fv>=0,'原值须不小于非负残值');assert(['SL','FP','SYD','DB'].includes(method),'未知折旧方法');assert(rate>=0,'折旧率须非负');
  const rows=[],base=pv-fv,firstFraction=months/12,remainingLife=n-firstFraction,z=n*(n+1)/2;
  const firstSYD=base*n/z*firstFraction;const whole=Math.floor(remainingLife),fraction=remainingLife-whole,z2=(whole+1)*(whole+2*fraction)/2;
  let remaining=base;
  for(let j=1;j<=n+(months<12?1:0);j++){
    let amount;
    if(method==='SL')amount=base/n*(j===1?firstFraction:j===n+1?1-firstFraction:1);
    if(method==='FP'||method==='DB')amount=j===n+1?remaining:(remaining+fv)*rate/(100*(method==='DB'?n:1))*(j===1?firstFraction:1);
    if(method==='SYD')amount=j===1?firstSYD:j===n+1?remaining:(remainingLife-j+2)/z2*(base-firstSYD);
    amount=Math.min(remaining,Math.max(0,amount));remaining=Math.max(0,remaining-amount);rows.push({year:j,DEP:checked(amount),RDV:checked(remaining),BOOK:checked(remaining+fv)});
  }
  return rows;
}
function couponDate(maturity,offset,frequency){
  const month=maturity.getUTCMonth()-offset*12/frequency,y=maturity.getUTCFullYear()+Math.floor(month/12),m=((month%12)+12)%12;
  const max=new Date(Date.UTC(y,m+1,0)).getUTCDate(),isEnd=maturity.getUTCDate()===new Date(Date.UTC(maturity.getUTCFullYear(),maturity.getUTCMonth()+1,0)).getUTCDate();
  return new Date(Date.UTC(y,m,isEnd?max:Math.min(max,maturity.getUTCDate())));
}
export function bond({settlement,maturity,redemption=100,coupon=0,yieldRate=0,frequency=2,days=365}){
  finite(redemption,coupon,yieldRate,frequency);assert([1,2].includes(+frequency),'每年票息次数须为 1 或 2');assert(redemption>0&&coupon>=0&&yieldRate>-100*frequency,'债券参数无效');
  const a=date(settlement),b=date(maturity);assert(a.getUTCFullYear()>=1902&&b.getUTCFullYear()<=2097,'债券日期须为 1902–2097 年的有效日期');assert(a<b,'到期日须晚于交割日');let n=0,next=b;
  while(couponDate(b,n+1,frequency)>a){n++;assert(n<400,'债券期限过长');}next=couponDate(b,n,frequency);const previous=couponDate(b,n+1,frequency);n++;
  const D=dayDifference(previous,next,days),A=dayDifference(previous,a,days),B=D-A,c=coupon/frequency,r=yieldRate/(100*frequency);assert(D>0,'票息日期无效');
  let dirty=0;if(n===1)dirty=(redemption+c)/(1+r*B/D);else {for(let k=1;k<=n;k++)dirty+=c/(1+r)**(k-1+B/D);dirty+=redemption/(1+r)**(n-1+B/D);}
  const INT=-c*A/D,PRC=-(dirty+INT);return {PRC:checked(PRC),INT:checked(INT),CST:checked(PRC+INT),N:n,A,B,D,PRD:dayDifference(a,b,days)};
}
export function bondYield(parameters,price){
  finite(price);assert(price<0,'购债价格须输入负值');
  const frequency=parameters.frequency||2,roots=rootsLogRate(r=>bond({...parameters,yieldRate:r*100*frequency}).PRC-price,{scale:Math.abs(price)});
  assert(roots.length,'无法求得债券收益率');return checked(roots[0]*100*frequency);
}
export function breakEven({fixed,price,variable,profit=0}){
  finite(fixed,price,variable,profit);assert(price!==variable,'单价与单位变动成本不能相等');const quantity=(fixed+profit)/(price-variable);assert(quantity>=0,'没有非负销量解');return {Q:checked(quantity),SALES:checked(quantity*price)};
}
