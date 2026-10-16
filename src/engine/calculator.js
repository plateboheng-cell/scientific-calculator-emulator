import { create, all } from 'mathjs';
export const math = create(all, { number: 'number', precision: 64, predictable: false });
export class CalcError extends Error { constructor(message) { super(message); this.name = 'CalcError'; } }
export const assert = (v, msg = '数学错误') => { if (!v) throw new CalcError(msg); };
const clean = x => Math.abs(x) < 1e-14 ? 0 : x;
export function normalize(s) {
  return s.replaceAll('×', '*').replaceAll('÷', '/').replace(/[−–]/g, '-').replaceAll('π', 'pi').replaceAll('√', 'sqrt').replaceAll('²', '^2').replaceAll('³', '^3').replaceAll('⁻¹', '^(-1)').replace(/\bAns\b/gi, 'Ans').replace(/\bX\b/g, 'x').replace(/\bY\b/g, 'y').replace(/\bZ\b/g, 'z').replaceAll('∠', ' angle ');
}
export function compileSafe(expression) {
  assert(typeof expression === 'string' && expression.length > 0 && expression.length <= 1500, '算式为空或过长');
  const node = math.parse(normalize(expression)); let count = 0;
  node.traverse(n => {
    assert(++count < 500, '算式过长');
    assert(!['AssignmentNode','FunctionAssignmentNode','AccessorNode','IndexNode','BlockNode','RangeNode','ObjectNode'].includes(n.type), '不支持的算式');
    if (n.isFunctionNode) assert(n.fn.isSymbolNode && ['sin','cos','tan','asin','acos','atan','sinh','cosh','tanh','asinh','acosh','atanh','log','ln','lg','exp','sqrt','cbrt','nthRoot','abs','sign','floor','ceil','round','trunc','factorial','nCr','nPr','Ran','RanInt','Int','Intg','Rnd','mod','gcd','lcm','Pol','Rec','angle','arg','dms','rad','deg','gra','integral','diff','sum','prod','conj','re','im','det','inv','transpose','rref','identity','dot','cross','norm','unitVector','angleBetween'].includes(n.fn.name), '不支持的函数');
    if (n.isOperatorNode && n.op === '^' && n.args[1]?.isConstantNode) assert(Math.abs(Number(n.args[1].value)) < 10001, '指数超出范围');
    if (n.isArrayNode) assert(n.items.length <= 16, '数据长度超出范围');
  }); return node.compile();
}
export class Calculator {
  constructor(saved = {}) {
    this.angle = ['Deg','Rad','Gra'].includes(saved.angle) ? saved.angle : 'Deg';
    this.vars = Object.fromEntries(['A','B','C','D','E','F','x','y','z','M','Ans'].map(k => [k, 0]));
    for (const [k,v] of Object.entries(saved.vars || {})) if (k in this.vars && typeof v === 'number' && Number.isFinite(v)) this.vars[k] = v;
  }
  factor() { return this.angle === 'Deg' ? Math.PI / 180 : this.angle === 'Gra' ? Math.PI / 200 : 1; }
  scope(extra = {}) {
    const t = this.factor(), c = this;
    const trig = (fn, inverse = false) => a => {
      const v = inverse ? math.divide(fn(a), t) : fn(math.multiply(a, t));
      return typeof v === 'number' && Math.abs(v)<1e-14 && Math.abs(a)>1 ? 0 : v;
    };
    return { ...this.vars,
      identity: n => {assert(Number.isInteger(n)&&n>=1&&n<=4,'矩阵维数须为 1–4');return math.identity(n);},
      sin: trig(math.sin), cos: trig(math.cos), tan: a => { if (typeof a === 'number') assert(Math.abs(Math.cos(a*t)) > 1e-14); return math.tan(math.multiply(a,t)); },
      asin: trig(math.asin,true), acos: trig(math.acos,true), atan: trig(math.atan,true),
      log: (a,b = 10) => math.log(a,b), ln: math.log, lg: math.log10,
      nCr: (n,r) => { assert(Number.isInteger(n)&&Number.isInteger(r)&&n>=0&&r>=0&&n>=r&&n<1e10); r=Math.min(r,n-r);assert(r<=10000,'超出数值范围');let v=1;for(let k=1;k<=r;k++){v=v*(n-r+k)/k;assert(v<1e100,'超出数值范围');}return Math.round(v); },
      nPr: (n,r) => { assert(Number.isInteger(n)&&Number.isInteger(r)&&n>=0&&r>=0&&n>=r&&n<1e10&&r<=10000);let v=1;for(let k=0;k<r;k++){v*=n-k;assert(v<1e100,'超出数值范围');}return v; },
      Ran: () => Math.random(), RanInt: (a,b) => {assert(Number.isInteger(a)&&Number.isInteger(b)&&a<=b); return a+Math.floor(Math.random()*(b-a+1));},
      Int: Math.trunc, Intg: Math.floor, Rnd: a => Number(a.toPrecision(10)), mod: (a,b) => {assert(b!==0);return a % b;},
      Pol: (x,y) => [Math.hypot(x,y),Math.atan2(y,x)/t], Rec: (r,a) => [r*Math.cos(a*t),r*Math.sin(a*t)],
      angle: (r,a) => math.complex({r,phi:a*t}), arg: a => math.arg(a)/t,
      dms: (d,m=0,s=0) => Math.sign(d||1)*(Math.abs(d)+m/60+s/3600),
      rad: a => a / t, deg: a => a*Math.PI/180/t, gra: a => a*Math.PI/200/t,
      integral: (expr,a,b) => c.integrate(expr,a,b,extra), diff: (expr,x) => c.differentiate(expr,x,extra),
      sum: (expr,a,b) => c.sequence(expr,a,b,false,extra), prod: (expr,a,b) => c.sequence(expr,a,b,true,extra),
      ...extra };
  }
  evaluate(expr, extra = {}, complex = false) {
    try {
      const v = compileSafe(expr).evaluate(this.scope(extra));
      validateValue(v,complex); return v;
    } catch (e) { throw new CalcError(e instanceof CalcError ? e.message : e.message?.includes('Undefined symbol') ? '变量或函数未定义' : e instanceof SyntaxError ? '语法错误' : '数学错误'); }
  }
  calculate(expr, complex = false) { const v=this.evaluate(expr,{},complex); this.vars.Ans=v; return v; }
  integrate(expr,a,b,extra={}) {
    assert(Number.isFinite(a)&&Number.isFinite(b));
    if (a===b) return 0; if (a>b) return -this.integrate(expr,b,a,extra);
    const code=compileSafe(expr), scope=this.scope(extra); let steps=0;
    const f=x=>{assert(++steps<60000,'积分未收敛'); const y=code.evaluate({...scope,x});assert(typeof y==='number'&&Number.isFinite(y),'积分区间存在奇点');return y;};
    const sim=(l,r,fl,fm,fr)=>(r-l)*(fl+4*fm+fr)/6;
    const rec=(l,r,fl,fm,fr,whole,eps,depth)=>{
      const m=(l+r)/2,lm=f((l+m)/2),rm=f((m+r)/2),left=sim(l,m,fl,lm,fm),right=sim(m,r,fm,rm,fr),delta=left+right-whole;
      if (Math.abs(delta)<=15*eps) return left+right+delta/15;
      assert(depth>0,'积分未收敛'); return rec(l,m,fl,lm,fm,left,eps/2,depth-1)+rec(m,r,fm,rm,fr,right,eps/2,depth-1);
    };
    const fl=f(a),fm=f((a+b)/2),fr=f(b);return rec(a,b,fl,fm,fr,sim(a,b,fl,fm,fr),1e-10,22);
  }
  differentiate(expr,x,extra={}) {
    assert(Number.isFinite(x)); const code=compileSafe(expr),scope=this.scope(extra),h=Math.pow(Number.EPSILON,1/5)*Math.max(1,Math.abs(x));
    const f=t=>{const v=code.evaluate({...scope,x:t});assert(typeof v==='number'&&Number.isFinite(v));return v;};
    return (f(x-2*h)-8*f(x-h)+8*f(x+h)-f(x+2*h))/(12*h);
  }
  sequence(expr,a,b,product=false,extra={}) {
    assert(Number.isInteger(a)&&Number.isInteger(b)&&b>=a&&b-a<10000,'范围错误');
    const code=compileSafe(expr),scope=this.scope(extra);let s=product?1:0;
    for(let x=a;x<=b;x++){const v=code.evaluate({...scope,x});assert(typeof v==='number'&&Number.isFinite(v));s=product?s*v:s+v;assert(Number.isFinite(s));} return s;
  }
  solve(expr,guess=0,extra={}) {
    const parts=expr.split('='); assert(parts.length<=2,'方程格式错误');const source=parts.length===2?`(${parts[0]})-(${parts[1]})`:expr;
    const code=compileSafe(source),scope=this.scope(extra),f=x=>{const v=code.evaluate({...scope,x});assert(typeof v==='number'&&Number.isFinite(v));return v;};
    let x=guess;
    for(let i=0;i<150;i++){
      const y=f(x); if(Math.abs(y)<1e-10) return x;
      const h=1e-5*Math.max(1,Math.abs(x)),d=(f(x+h)-f(x-h))/(2*h);
      if(Math.abs(d)<1e-14) break;
      const next=x-y/d;if(!Number.isFinite(next)||Math.abs(next)>1e12)break;
      if(Math.abs(next-x)<1e-12){if(Math.abs(f(next))<1e-8)return next;break;} x=next;
    }
    let left,right;
    for(let scale=1;scale<=1e8;scale*=10){
      for(let j=0;j<100;j++){const a=guess-scale+2*scale*j/100,b=guess-scale+2*scale*(j+1)/100;try{if(f(a)===0)return a;if(f(a)*f(b)<0){left=a;right=b;break;}}catch{}}if(left!==undefined)break;
    }
    assert(left!==undefined,'无法求解：请更换初始值');
    for(let i=0;i<150;i++){const m=(left+right)/2,y=f(m);if(Math.abs(y)<1e-10)return m;if(f(left)*y<=0)right=m;else left=m;}
    assert(Math.abs(f((left+right)/2))<1e-8,'无法求解');return (left+right)/2;
  }
  save(){return {angle:this.angle,vars:Object.fromEntries(Object.entries(this.vars).filter(([,v])=>typeof v==='number'&&Number.isFinite(v)))};}
}
export function validateValue(v,complex=true){
  if(typeof v==='number'){assert(Number.isFinite(v)&&Math.abs(v)<1e100,'超出数值范围');return;}
  if(math.isComplex(v)){assert(complex||Math.abs(v.im)<1e-12,'非实数结果：请使用复数模式');assert(Number.isFinite(v.re)&&Number.isFinite(v.im));return;}
  if(Array.isArray(v)||math.isMatrix(v)){const a=math.isMatrix(v)?v.toArray():v;assert(a.length<=16);a.forEach(t=>validateValue(t,complex));return;}
  assert(false,'结果类型不支持');
}
export function decimal(v, digits=10){
  if(math.isComplex(v))return `${decimal(v.re,digits)}${v.im<0?'−':'+'}${decimal(Math.abs(v.im),digits)}i`;
  if(Array.isArray(v)||math.isMatrix(v))return math.format(v,{precision:digits});
  if(typeof v!=='number')return String(v);
  return math.format(Object.is(v,-0)?0:v,{precision:digits,lowerExp:-9,upperExp:10});
}
function rational(x,max=100000){
  let a=x,h0=0,h1=1,k0=1,k1=0;
  for(let i=0;i<25;i++){const q=Math.floor(a),h=q*h1+h0,k=q*k1+k0;if(k>max||Math.abs(h)>1e10)break;h0=h1;h1=h;k0=k1;k1=k;if(x===h/k||Math.abs(x-h/k)<1e-12*Math.abs(x))return [h,k];a=1/(a-q);if(!Number.isFinite(a))break;} return null;
}
export function exactTex(v){
  if(math.isComplex(v))return `${exactTex(v.re)}${v.im<0?'-':'+'}${exactTex(Math.abs(v.im))}i`;
  if(Array.isArray(v)||math.isMatrix(v)){const a=math.isMatrix(v)?v.toArray():v;return `\\begin{bmatrix}${a.map(row=>(Array.isArray(row)?row:[row]).map(exactTex).join('&')).join('\\\\')}\\end{bmatrix}`;}
  if(typeof v!=='number'||!Number.isFinite(v))return String(v);
  if(Number.isInteger(v)&&Math.abs(v)<1e10)return String(v);
  const frac=rational(v,10000);if(frac)return frac[1]===1?String(frac[0]):`${frac[0]<0?'-':''}\\frac{${Math.abs(frac[0])}}{${frac[1]}}`;
  const p=rational(v/Math.PI,1000);if(p&&p[0]!==0&&Math.abs(v/Math.PI-p[0]/p[1])<1e-13){return p[1]===1?`${p[0]===1?'':p[0]===-1?'-':p[0]}\\pi`:`${p[0]<0?'-':''}\\frac{${Math.abs(p[0])===1?'':Math.abs(p[0])}\\pi}{${p[1]}}`;}
  for(let d=1;d<=100;d++){const n=Math.round(v*v*d*d);if(n>0&&n<1e8&&Math.abs(Math.sqrt(n)/d-Math.abs(v))<1e-12){let outside=1,inside=n;for(let q=2;q*q<=inside;q++)while(inside%(q*q)===0){outside*=q;inside/=q*q;}const g=math.gcd(outside,d),a=outside/g,b=d/g;return `${v<0?'-':''}${b===1?`${a===1?'':a}\\sqrt{${inside}}`:`\\frac{${a===1?'':a}\\sqrt{${inside}}}{${b}}`}`;}}
  return decimal(v).replace(/e([+-]?\d+)/,'\\times 10^{$1}');
}
export function factorize(n){assert(Number.isSafeInteger(n)&&n>0&&n<=1e12,'请输入 1 至 10¹² 的正整数');const out=[];for(let p=2;p*p<=n;p+=(p===2?1:2)){let k=0;while(n%p===0){n/=p;k++;}if(k)out.push([p,k]);}if(n>1)out.push([n,1]);return out;}
