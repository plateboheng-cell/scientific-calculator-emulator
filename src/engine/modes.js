import { math, assert, Calculator, decimal } from './calculator.js';
export function polyValue(c,x){return c.reduce((s,a)=>s*x+a,0);}
function trim(c){while(c.length>1&&c[0]===0)c=c.slice(1);return c;}
export function realRoots(coeff){
  const c=trim(coeff);assert(c.every(Number.isFinite));const n=c.length-1;
  if(n<1)return [];if(n===1)return [-c[1]/c[0]];
  const scale=Math.max(...c.map(Math.abs)),a=c.map(x=>x/scale),bound=1+Math.max(...a.slice(1).map(x=>Math.abs(x/a[0])));
  const stationary=realRoots(a.slice(0,-1).map((x,i)=>x*(n-i))).filter(x=>x>-bound&&x<bound),cuts=[-bound,...stationary,bound],roots=[];
  const near=x=>Math.abs(polyValue(a,x))<=1e-11*Math.max(1,Math.abs(x)**n);
  for(const x of stationary)if(near(x))roots.push(x);
  for(let i=0;i<cuts.length-1;i++){let l=cuts[i],r=cuts[i+1],fl=polyValue(a,l),fr=polyValue(a,r);if(fl*fr>=0)continue;for(let k=0;k<150;k++){const m=(l+r)/2,fm=polyValue(a,m);if(fm===0){l=r=m;break;}if(fl*fm<0){r=m;fr=fm;}else{l=m;fl=fm;}}roots.push((l+r)/2);}
  return roots.sort((x,y)=>x-y).filter((x,i,s)=>i===0||Math.abs(x-s[i-1])>1e-7*Math.max(1,Math.abs(x)));
}
export function polynomialRoots(coeff){
  let c=trim(coeff);assert(c.length>=2&&c.length<=5,'次数须为 1 至 4');assert(c.every(Number.isFinite));const roots=[];
  for(const r of realRoots(c)){
    while(c.length>1){const n=c.length-1,rem=polyValue(c,r),scale=Math.max(1,...c.map(Math.abs))*Math.max(1,Math.abs(r)**n);if(Math.abs(rem)>1e-8*scale)break;roots.push(Math.abs(r)<1e-12?0:r);const q=[c[0]];for(let i=1;i<c.length-1;i++)q.push(c[i]+r*q[i-1]);c=q;}
  }
  if(c.length===2)roots.push(-c[1]/c[0]);
  else if(c.length===3){const [a,b,d]=c,disc=math.sqrt(math.complex(b*b-4*a*d));roots.push(math.divide(math.add(-b,disc),2*a),math.divide(math.subtract(-b,disc),2*a));}
  else if(c.length>3){
    const n=c.length-1,a=c.map(v=>v/c[0]),R=1+Math.max(...a.slice(1).map(Math.abs));let z=Array.from({length:n},(_,i)=>math.complex({r:R,phi:2*Math.PI*(i+0.17)/n}));
    for(let k=0;k<400;k++){let delta=0;const next=z.map((v,i)=>{let y=math.complex(a[0]);for(let j=1;j<a.length;j++)y=math.add(math.multiply(y,v),a[j]);let d=math.complex(1);for(let j=0;j<n;j++)if(i!==j)d=math.multiply(d,math.subtract(v,z[j]));const step=math.divide(y,d);delta=Math.max(delta,math.abs(step));return math.subtract(v,step);});z=next;if(delta<1e-12)break;}roots.push(...z);
  }
  return roots.map(r=>math.isComplex(r)&&Math.abs(r.im)<1e-9?r.re:r).sort((a,b)=>(a.re??a)-(b.re??b));
}
export function linearSystem(rows){
  const n=rows.length;assert(n>=2&&n<=4&&rows.every(r=>r.length===n+1&&r.every(Number.isFinite)),'系数格式错误');const a=rows.map(r=>[...r]);
  for(let k=0;k<n;k++){let p=k;for(let i=k+1;i<n;i++)if(Math.abs(a[i][k])>Math.abs(a[p][k]))p=i;assert(Math.abs(a[p][k])>1e-12,'无唯一解');[a[p],a[k]]=[a[k],a[p]];const d=a[k][k];for(let j=k;j<=n;j++)a[k][j]/=d;for(let i=0;i<n;i++)if(i!==k){const f=a[i][k];for(let j=k;j<=n;j++)a[i][j]-=f*a[k][j];}}
  return a.map(r=>r[n]);
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
export function statistics(rows,regression='single'){
  assert(rows.length>0&&rows.length<=1000,'请先输入数据');const paired=regression!=='single';let n=0,sx=0,sx2=0,sy=0,sy2=0,sxy=0,expanded=[];
  for(const row of rows){const [x,y=0,f=1]=row;assert(Number.isFinite(x)&&Number.isFinite(y)&&Number.isInteger(f)&&f>0&&n+f<=100000,'数据或频数错误');n+=f;sx+=x*f;sx2+=x*x*f;sy+=y*f;sy2+=y*y*f;sxy+=x*y*f;expanded.push({x,f});}
  const mean=sx/n,variance=rows.reduce((s,[x,,f=1])=>s+f*(x-mean)**2,0)/n;
  const sorted=expanded.sort((a,b)=>a.x-b.x),at=i=>{let k=0;for(const q of sorted){k+=q.f;if(i<k)return q.x;}};
  const median=(lo,hi)=>{const len=hi-lo;return len%2?at(lo+(len-1)/2):(at(lo+len/2-1)+at(lo+len/2))/2;};
  const out={n,'Σx':sx,'Σx²':sx2,'x̄':mean,'σx²':variance,'σx':Math.sqrt(variance),'sx':n>1?Math.sqrt(variance*n/(n-1)):NaN,min:at(0),Q1:n>1?median(0,Math.floor(n/2)):at(0),Med:median(0,n),Q3:n>1?median(Math.ceil(n/2),n):at(0),max:at(n-1)};
  if(!paired)return out;
  Object.assign(out,{'Σy':sy,'Σy²':sy2,'Σxy':sxy,'ȳ':sy/n,'σy':Math.sqrt(Math.max(0,sy2/n-(sy/n)**2)),'sy':n>1?Math.sqrt(Math.max(0,(sy2-sy*sy/n)/(n-1))):NaN});
  if(regression==='quadratic'){
    const sums=Array(5).fill(0),t=Array(3).fill(0);for(const [x,y,f=1]of rows){for(let k=0;k<5;k++)sums[k]+=f*x**k;for(let k=0;k<3;k++)t[k]+=f*y*x**k;}const [a,b,c]=linearSystem([0,1,2].map(i=>[...Array.from({length:3},(_,j)=>sums[i+j]),t[i]]));return {...out,a,b,c};
  }
  let xx=0,yy=0,xx2=0,yy2=0,xy=0;for(const [x,y,f=1]of rows){let u=x,v=y;if(['log','power'].includes(regression)){assert(x>0);u=Math.log(x);}if(['exp','abexp','power'].includes(regression)){assert(y>0);v=Math.log(y);}if(regression==='inverse'){assert(x!==0);u=1/x;}xx+=u*f;yy+=v*f;xx2+=u*u*f;yy2+=v*v*f;xy+=u*v*f;}
  const den=n*xx2-xx*xx;assert(Math.abs(den)>1e-14,'无法回归：x 数据无变化');const b=(n*xy-xx*yy)/den,a=(yy-b*xx)/n,rden=den*(n*yy2-yy*yy);
  return {...out,a:['exp','abexp','power'].includes(regression)?Math.exp(a):a,b:regression==='abexp'?Math.exp(b):b,r:rden>0?(n*xy-xx*yy)/Math.sqrt(rden):NaN};
}
export function table(calc,f,g,start,end,step){
  assert([start,end,step].every(Number.isFinite)&&step!==0&&(end-start)*step>=0,'范围错误');const count=Math.floor((end-start)/step+1e-10)+1;assert(count<=45&&count>0,'表格最多 45 行');return Array.from({length:count},(_,i)=>{const x=Number((start+i*step).toPrecision(14));return [x,calc.evaluate(f,{x}),...(g.trim()?[calc.evaluate(g,{x})]:[])];});
}
export function ratio(type,a,b,c){assert([a,b,c].every(x=>Number.isFinite(x)&&x!==0));return type==='left'?a*c/b:b*c/a;}
export function baseCalculate(expr,base=10){
  assert([2,8,10,16].includes(base));assert(expr.length<500&&expr.trim());
  const tokens=expr.toUpperCase().match(/\b(?:AND|OR|XOR|XNOR|NOT|NEG)\b|[0-9A-F]+|[()+*/%~-]/g)||[];
  assert(tokens.join('')===expr.toUpperCase().replace(/\s/g,''),'基数算式格式错误');let i=0;
  const mask=x=>BigInt.asIntN(32,x),ops={OR:1,XOR:2,XNOR:2,AND:3,'+':4,'-':4,'*':5,'/':5,'%':5};
  const atom=()=>{const t=tokens[i++];if(['-','NOT','NEG','~','+'].includes(t)){const v=atom();return mask(t==='+'?v:t==='-'||t==='NEG'?-v:~v);}if(t==='('){const v=parse(0);assert(tokens[i++]===')','括号不匹配');return v;}assert(t&&/^[0-9A-F]+$/.test(t),'数字格式错误');assert([...t].every(d=>parseInt(d,16)<base),'数字与进制不符');const v=BigInt((base===16?'0x':base===8?'0o':base===2?'0b':'')+t);assert(v<=0xffffffffn,'超出 32 位范围');return mask(v);};
  const parse=min=>{let a=atom();while(i<tokens.length&&ops[tokens[i]]>=min){const op=tokens[i++],b=parse(ops[op]+1);if(op==='/'||op==='%')assert(b!==0n);a=mask(op==='+'?a+b:op==='-'?a-b:op==='*'?a*b:op==='/'?a/b:op==='%'?a%b:op==='AND'?a&b:op==='OR'?a|b:op==='XOR'?a^b:~(a^b));}return a;};
  const v=parse(0);assert(i===tokens.length,'算式格式错误');return Number(v);
}
export function baseFormat(value,base){return base===10?String(value):BigInt.asUintN(32,BigInt(Math.trunc(value))).toString(base).toUpperCase();}
export function rref(data){const a=data.map(r=>[...r]);let lead=0;for(let r=0;r<a.length&&lead<a[0].length;r++){let i=r;while(Math.abs(a[i][lead])<1e-12){if(++i===a.length){i=r;if(++lead===a[0].length)return a;}}[a[i],a[r]]=[a[r],a[i]];const p=a[r][lead];a[r]=a[r].map(x=>x/p);for(i=0;i<a.length;i++)if(i!==r){const f=a[i][lead];a[i]=a[i].map((x,j)=>Math.abs(x-f*a[r][j])<1e-12?0:x-f*a[r][j]);}lead++;}return a;}
