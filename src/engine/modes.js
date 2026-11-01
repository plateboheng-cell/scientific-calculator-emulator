import { math, assert, Calculator, decimal } from './calculator.js';
import {fitQuadratic} from './quadratic-regression.js';
export function polyValue(c,x){return c.reduce((s,a)=>s*x+a,0);}
function trim(c){while(c.length>1&&c[0]===0)c=c.slice(1);return c;}
function quadratic(c) {
  // Decimal discriminant avoids cancellation before taking the square root.
  const [a,b,d]=c.map(x=>math.bignumber(String(x)));
  const discriminant=math.subtract(math.multiply(b,b),math.multiply(4,math.multiply(a,d)));
  if (discriminant.isNegative()) return null;
  const root=math.sqrt(discriminant);
  if (root.isZero()) return [math.number(math.divide(math.unaryMinus(b),math.multiply(2,a)))];
  const q=math.multiply(-0.5,math.add(b,b.isNegative()?math.unaryMinus(root):root));
  return [math.number(math.divide(q,a)),math.number(math.divide(d,q))].sort((x,y)=>x-y);
}
// Horner evaluation in doubles can report an exact zero near multiple roots.
// Only pay for decimal evaluation when its error bound includes zero.
function polynomialEvaluation(c) {
  const exact=c.map(x=>math.bignumber(String(x)));
  const evaluate=x=>{
    const bx=math.bignumber(String(x));let p=exact[0];
    for(let i=1;i<exact.length;i++)p=math.add(math.multiply(p,bx),exact[i]);
    return p;
  };
  return {
    sign(x){
      const value=polyValue(c,x),bound=c.reduce((s,v)=>s*Math.abs(x)+Math.abs(v),0);
      if(Number.isFinite(value)&&Math.abs(value)>8*Number.EPSILON*bound)return Math.sign(value);
      const p=evaluate(x);return p.isZero()?0:p.isNegative()?-1:1;
    },
    repeated(x){
      const bx=math.bignumber(String(Math.abs(x)));let bound=math.bignumber(0);
      for(const value of exact)bound=math.add(math.multiply(bound,bx),math.abs(value));
      // A rounded stationary point perturbs a true repeated root to second order.
      // A first-order epsilon threshold would invent real roots of near misses.
      return math.abs(evaluate(x)).lte(math.multiply(bound,math.bignumber(String(64*Number.EPSILON**2))));
    }
  };
}
export function realRoots(coeff){
  const c=trim(coeff);assert(c.every(Number.isFinite));const n=c.length-1;
  if(n<1)return [];if(n===1)return [-c[1]/c[0]];if(n===2)return quadratic(c)||[];
  const scale=Math.max(...c.map(Math.abs)),a=c.map(x=>x/scale),bound=1+Math.max(...a.slice(1).map(x=>Math.abs(x/a[0])));
  assert(Number.isFinite(bound),'求根范围超出数值精度');
  const rawDerivative=c.slice(0,-1).map((x,i)=>x*(n-i));
  const derivative=rawDerivative.every(Number.isFinite)?rawDerivative:a.slice(0,-1).map((x,i)=>x*(n-i));
  const stationary=realRoots(derivative).filter(x=>x>-bound&&x<bound),cuts=[-bound,...stationary,bound],roots=[],probe=polynomialEvaluation(c),sign=probe.sign;
  const crosses=(l,r)=>sign(l)*sign(r)<0;
  for(let i=0;i<stationary.length;i++){const x=stationary[i];if(probe.repeated(x)&&!crosses(cuts[i],x)&&!crosses(x,cuts[i+2]))roots.push(x);}
  for(let i=0;i<cuts.length-1;i++){let l=cuts[i],r=cuts[i+1],sl=sign(l),sr=sign(r);if(sl*sr>=0)continue;
    // Up to 1,150 halvings also covers subnormal roots next to zero.
    for(let k=0;k<1150;k++){const m=l/2+r/2,sm=sign(m);if(sm===0||m===l||m===r){l=r=m;break;}if(sl*sm<0){r=m;sr=sm;}else{l=m;sl=sm;}}
    roots.push(l/2+r/2);
  }
  return roots.sort((x,y)=>x-y).filter((x,i,s)=>i===0||Math.abs(x-s[i-1])>8*Number.EPSILON*Math.max(Number.MIN_VALUE,Math.abs(x)));
}
export function polynomialRoots(coeff,maxDegree=4){
  let c=trim(coeff);assert(c.length>=2&&c.length<=maxDegree+1,'方程次数超出范围');assert(c.every(Number.isFinite));const roots=[];let exactCoefficients=c.map(x=>math.bignumber(String(x)));
  if(c.length===3){const real=quadratic(c);if(real)return real.length===1?[real[0],real[0]]:real;}
  const real=realRoots(c);
  // All distinct real roots are already isolated; deflation would add rounding.
  if(real.length===c.length-1){roots.push(...real);c=[1];}
  for(const r of real.length===roots.length?[]:real){
    while(c.length>1){const rem=polyValue(c,r),scale=c.reduce((s,v)=>s*Math.abs(r)+Math.abs(v),0);if(Math.abs(rem)>16*Number.EPSILON*scale)break;roots.push(r);const q=[exactCoefficients[0]],br=math.bignumber(String(r));for(let i=1;i<c.length-1;i++)q.push(math.add(exactCoefficients[i],math.multiply(br,q[i-1])));exactCoefficients=q;c=q.map(x=>math.number(x));}
  }
  if(c.length===2)roots.push(-c[1]/c[0]);
  else if(c.length===3){
    const real=quadratic(exactCoefficients);
    if(real)roots.push(...(real.length===1?[real[0],real[0]]:real));
    else{
      const [a,b,d]=exactCoefficients,disc=math.subtract(math.multiply(b,b),math.multiply(4,math.multiply(a,d)));
      const re=math.number(math.divide(math.unaryMinus(b),math.multiply(2,a))),im=math.number(math.divide(math.sqrt(math.unaryMinus(disc)),math.multiply(2,math.abs(a))));
      roots.push(math.complex(re,im),math.complex(re,-im));
    }
  }
  else if(c.length>3){
    const n=c.length-1,a=c.map(v=>v/c[0]),R=1+Math.max(...a.slice(1).map(Math.abs));let z=Array.from({length:n},(_,i)=>math.complex({r:R,phi:2*Math.PI*(i+0.17)/n}));
    for(let k=0;k<400;k++){let delta=0;const next=z.map((v,i)=>{let y=math.complex(a[0]);for(let j=1;j<a.length;j++)y=math.add(math.multiply(y,v),a[j]);let d=math.complex(1);for(let j=0;j<n;j++)if(i!==j)d=math.multiply(d,math.subtract(v,z[j]));const step=math.divide(y,d);delta=Math.max(delta,math.abs(step));return math.subtract(v,step);});z=next;if(delta<1e-12)break;}roots.push(...z);
  }
  assert(roots.length===trim(coeff).length-1,'求根未收敛');
  for(const r of roots){let residual=math.complex(0),scale=0;for(const value of trim(coeff)){residual=math.add(math.multiply(residual,r),value);scale=scale*math.abs(r)+Math.abs(value);}assert(Number.isFinite(math.abs(residual))&&math.abs(residual)<=1e-8*Math.max(Number.MIN_VALUE,scale),'求根未收敛');}
  return roots.map(r=>math.isComplex(r)&&r.im===0?r.re:r).sort((a,b)=>(a.re??a)-(b.re??b));
}
export function linearSystem(rows,maxSize=4){
  const n=rows.length;assert(n>=2&&n<=maxSize&&rows.every(r=>r.length===n+1&&r.every(Number.isFinite)),'系数格式错误');const a=rows.map(r=>{const scale=Math.max(...r.slice(0,n).map(Math.abs));assert(scale>0,'无唯一解');const scaled=r.map(x=>x/scale);assert(scaled.every(Number.isFinite),'结果超出数值范围');return scaled;});
  for(let k=0;k<n;k++){let p=k;for(let i=k+1;i<n;i++)if(Math.abs(a[i][k])>Math.abs(a[p][k]))p=i;assert(Math.abs(a[p][k])>1e-12,'无唯一解');[a[p],a[k]]=[a[k],a[p]];const d=a[k][k];for(let j=k;j<=n;j++)a[k][j]/=d;for(let i=0;i<n;i++)if(i!==k){const f=a[i][k];for(let j=k;j<=n;j++)a[i][j]-=f*a[k][j];}}
  const result=a.map(r=>r[n]);assert(result.every(Number.isFinite),'结果超出数值范围');return result;
}
export function inequality(c,op){
  assert(['>','<','>=','<='].includes(op));c=trim(c);if(c.every(x=>x===0))return op.includes('=')?'ℝ':'∅';
  const roots=realRoots(c),bounds=[-Infinity,...roots,Infinity],segments=[],include=op.includes('=');const check=y=>op.startsWith('>')?y>0:y<0;
  for(let i=0;i<bounds.length-1;i++){const l=bounds[i],r=bounds[i+1],x=l===-Infinity&&r===Infinity?0:!Number.isFinite(l)?r-Math.max(1,Math.abs(r)):!Number.isFinite(r)?l+Math.max(1,Math.abs(l)):(l+r)/2;if(check(polyValue(c,x)))segments.push({l,r,lc:include&&Number.isFinite(l),rc:include&&Number.isFinite(r)});}
  if(include)for(const r of roots)if(!segments.some(s=>s.l===r||s.r===r))segments.push({l:r,r,lc:true,rc:true});
  segments.sort((a,b)=>a.l-b.l);const merged=[];for(const s of segments){const prev=merged.at(-1);if(prev&&prev.r===s.l&&(prev.rc||s.lc)){prev.r=s.r;prev.rc=s.rc;}else merged.push({...s});}
  if(!merged.length)return '∅';if(merged.length===1&&merged[0].l===-Infinity&&merged[0].r===Infinity)return 'ℝ';
  return merged.map(s=>s.l===s.r?`{${decimal(s.l)}}`:`${s.lc?'[':'('}${s.l===-Infinity?'−∞':decimal(s.l)}, ${s.r===Infinity?'+∞':decimal(s.r)}${s.rc?']':')'}`).join(' ∪ ');
}
function stableSum(values){
  let sum=0,correction=0;
  for(const value of values){const next=sum+value;correction+=Math.abs(sum)>=Math.abs(value)?(sum-next)+value:(value-next)+sum;sum=next;}
  return sum+correction;
}
function centeredMoments(points,n){
  // Work relative to an observed point before computing the mean. This avoids
  // subtracting two large, nearly equal raw second moments (E[x²] - E[x]²).
  const [x0,y0]=points[0],mx=stableSum(points.map(([x,,f])=>(x-x0)*f))/n,my=stableSum(points.map(([,y,f])=>(y-y0)*f))/n;
  const xx=stableSum(points.map(([x,,f])=>f*((x-x0)-mx)**2));
  const yy=stableSum(points.map(([,y,f])=>f*((y-y0)-my)**2));
  const xy=stableSum(points.map(([x,y,f])=>f*((x-x0)-mx)*((y-y0)-my)));
  assert([mx,my,xx,yy,xy].every(Number.isFinite),'统计结果超出数值范围');
  return {x0,y0,mx,my,xx,yy,xy};
}
export function statistics(rows,regression='single'){
  assert(Array.isArray(rows)&&rows.length>0&&rows.length<=1000,'请先输入数据');
  assert(['single','linear','quadratic','log','exp','abexp','power','inverse'].includes(regression),'回归类型错误');
  const paired=regression!=='single';let n=0;const points=[];
  for(const row of rows){assert(Array.isArray(row)&&row.length>=1&&row.length<=3&&(!paired||row.length>=2),'数据格式错误');const [x,y=0,f=1]=row;assert(Number.isFinite(x)&&Number.isFinite(y)&&Number.isInteger(f)&&f>0&&n+f<=100000,'数据或频数错误');n+=f;points.push([x,y,f]);}
  const sx=stableSum(points.map(([x,,f])=>x*f)),sx2=stableSum(points.map(([x,,f])=>x*x*f)),sy=stableSum(points.map(([,y,f])=>y*f)),sy2=stableSum(points.map(([,y,f])=>y*y*f)),sxy=stableSum(points.map(([x,y,f])=>x*y*f));
  assert([sx,sx2,sy,sy2,sxy].every(Number.isFinite),'统计结果超出数值范围');
  const moments=centeredMoments(points,n),variance=moments.xx/n;
  const sorted=points.map(([x,,f])=>({x,f})).sort((a,b)=>a.x-b.x),at=i=>{let k=0;for(const q of sorted){k+=q.f;if(i<k)return q.x;}};
  const median=(lo,hi)=>{const len=hi-lo;return len%2?at(lo+(len-1)/2):at(lo+len/2-1)/2+at(lo+len/2)/2;};
  const out={n,'Σx':sx,'Σx²':sx2,'x̄':sx/n,'σx²':variance,'σx':Math.sqrt(variance),'sx':n>1?Math.sqrt(moments.xx/(n-1)):NaN,min:at(0),Q1:n>1?median(0,Math.floor(n/2)):at(0),Med:median(0,n),Q3:n>1?median(Math.ceil(n/2),n):at(0),max:at(n-1)};
  if(!paired)return out;
  Object.assign(out,{'Σy':sy,'Σy²':sy2,'Σxy':sxy,'ȳ':sy/n,'σy':Math.sqrt(moments.yy/n),'sy':n>1?Math.sqrt(moments.yy/(n-1)):NaN});
  if(regression==='quadratic'){
    const fit=fitQuadratic(points),result={...out,...fit};
    Object.defineProperty(result,'quadraticFit',{value:fit.quadraticFit});return result;
  }
  const transformed=points.map(([x,y,f])=>{let u=x,v=y;if(['log','power'].includes(regression)){assert(x>0);u=Math.log(x);}if(['exp','abexp','power'].includes(regression)){assert(y>0);v=Math.log(y);}if(regression==='inverse'){assert(x!==0);u=1/x;}assert(Number.isFinite(u)&&Number.isFinite(v),'统计结果超出数值范围');return [u,v,f];});
  const m=centeredMoments(transformed,n);assert(m.xx>0,'无法回归：x 数据无变化');
  const b=m.xy/m.xx,intercept=(m.y0-b*m.x0)+(m.my-b*m.mx),a=['exp','abexp','power'].includes(regression)?Math.exp(intercept):intercept,coefficient=regression==='abexp'?Math.exp(b):b;
  assert(Number.isFinite(a)&&Number.isFinite(coefficient),'统计结果超出数值范围');
  return {...out,a,b:coefficient,r:m.yy>0?Math.max(-1,Math.min(1,(m.xy/Math.sqrt(m.xx))/Math.sqrt(m.yy))):NaN};
}
export function regressionValue(fit,model,x){
  assert(Number.isFinite(x),'请输入实数');
  if(['log','power'].includes(model))assert(x>0);
  if(model==='inverse')assert(x!==0);
  const q=fit.quadraticFit;
  const y=model==='quadratic'?(q?((q.c*((x-q.origin)/q.scale)+q.b)*((x-q.origin)/q.scale)+q.a):((fit.c*x+fit.b)*x+fit.a))
    :model==='log'?fit.a+fit.b*Math.log(x):model==='exp'?fit.a*Math.exp(fit.b*x)
    :model==='abexp'?fit.a*fit.b**x:model==='power'?fit.a*x**fit.b
    :model==='inverse'?fit.a+fit.b/x:fit.a+fit.b*x;
  assert(Number.isFinite(y),'统计结果超出数值范围');return y;
}
export function table(calc,f,g,start,end,step,maxRows=45){
  assert([start,end,step].every(Number.isFinite)&&step!==0&&(end-start)*step>=0,'范围错误');const count=Math.floor((end-start)/step+1e-10)+1;assert(count<=maxRows&&count>0,`表格最多 ${maxRows} 行`);return Array.from({length:count},(_,i)=>{const x=Number((start+i*step).toPrecision(14));return [x,calc.evaluate(f,{x}),...(g.trim()?[calc.evaluate(g,{x})]:[])];});
}
export function ratio(type,a,b,c){assert([a,b,c].every(x=>Number.isFinite(x)&&x!==0));return type==='left'?a*c/b:b*c/a;}
export function baseCalculate(expr,base=10,answer=0){
  assert([2,8,10,16].includes(base));assert(expr.length<500&&expr.trim());
  const tokens=expr.toUpperCase().match(/\b(?:AND|OR|XOR|XNOR|NOT|NEG|ANS)\b|[0-9A-F]+|[()+*/%~-]/g)||[];
  assert(tokens.join('')===expr.toUpperCase().replace(/\s/g,''),'基数算式格式错误');let i=0;
  const mask=x=>BigInt.asIntN(32,x),ops={OR:1,XOR:2,XNOR:2,AND:3,'+':4,'-':4,'*':5,'/':5,'%':5};
  const atom=()=>{const t=tokens[i++];if(['-','NOT','NEG','~','+'].includes(t)){const v=atom();return mask(t==='+'?v:t==='-'||t==='NEG'?-v:~v);}if(t==='('){const v=parse(0);assert(tokens[i++]===')','括号不匹配');return v;}if(t==='ANS'){assert(Number.isInteger(answer)&&answer>=-0x80000000&&answer<=0xffffffff,'基数 Ans 须为 32 位整数');return mask(BigInt(answer));}assert(t&&/^[0-9A-F]+$/.test(t),'数字格式错误');assert([...t].every(d=>parseInt(d,16)<base),'数字与进制不符');const v=BigInt((base===16?'0x':base===8?'0o':base===2?'0b':'')+t);assert(v<=0xffffffffn,'超出 32 位范围');return mask(v);};
  const parse=min=>{let a=atom();while(i<tokens.length&&ops[tokens[i]]>=min){const op=tokens[i++],b=parse(ops[op]+1);if(op==='/'||op==='%')assert(b!==0n);a=mask(op==='+'?a+b:op==='-'?a-b:op==='*'?a*b:op==='/'?a/b:op==='%'?a%b:op==='AND'?a&b:op==='OR'?a|b:op==='XOR'?a^b:~(a^b));}return a;};
  const v=parse(0);assert(i===tokens.length,'算式格式错误');return Number(v);
}
export function baseFormat(value,base){return base===10?String(value):BigInt.asUintN(32,BigInt(Math.trunc(value))).toString(base).toUpperCase();}
export function rref(data){const a=data.map(r=>[...r]);let lead=0;for(let r=0;r<a.length&&lead<a[0].length;r++){let i=r;while(Math.abs(a[i][lead])<1e-12){if(++i===a.length){i=r;if(++lead===a[0].length)return a;}}[a[i],a[r]]=[a[r],a[i]];const p=a[r][lead];a[r]=a[r].map(x=>x/p);for(i=0;i<a.length;i++)if(i!==r){const f=a[i][lead];a[i]=a[i].map((x,j)=>Math.abs(x-f*a[r][j])<1e-12?0:x-f*a[r][j]);}lead++;}return a;}
