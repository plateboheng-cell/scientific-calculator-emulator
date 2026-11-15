import {assert} from './calculator.js';
import {distributionTypes, inverseNormal, normalTail} from './distributions.js';

const MAX_COUNT = 1_000_000_000;
const MAX_TAIL_TERMS = 400_000;
const LOG_SQRT_2PI = Math.log(2*Math.PI)/2;
const logFactorials = [0];
for (let i=1;i<16;i++) logFactorials.push(logFactorials.at(-1)+Math.log(i));

function count(value) {
  assert(Number.isInteger(value)&&value>=0&&value<=MAX_COUNT,'计数须为 0 至 1000000000 的整数');
}
function probability(value) {
  assert(Number.isFinite(value)&&value>=0&&value<=1,'概率须在 0 到 1 之间');
}
function poissonMean(value) {
  assert(Number.isFinite(value)&&value>=0&&value<=MAX_COUNT,'泊松平均值须在 0 到 1000000000 之间');
}

// Loader (2002), §§2–3. Separate the deviance and Stirling corrections so
// computing a mass close to its mode does not subtract large log-factorials.
function stirlingError(n) {
  if (n<16) return logFactorials[n]-(n+.5)*Math.log(n)+n-LOG_SQRT_2PI;
  const square=1/(n*n);
  return (1/12-square*(1/360-square*(1/1260-square*(1/1680-square/1188))))/n;
}

function deviance(x,mean) {
  const delta=x-mean;
  if (Math.abs(delta)>.1*(x+mean)) return x*(Math.log(x)-Math.log(mean))-delta;
  const v=delta/(x+mean), square=v*v;
  let total=delta*v, term=2*x*v;
  for (let i=3;i<43;i+=2) {
    term*=square;
    const next=total+term/i;
    if (next===total) break;
    total=next;
  }
  return total;
}

function logBinomial(x,n,p) {
  if (x===0) return n*Math.log1p(-p);
  if (x===n) return n*Math.log(p);
  const q=1-p;
  return stirlingError(n)-stirlingError(x)-stirlingError(n-x)
    -deviance(x,n*p)-deviance(n-x,n*q)
    -LOG_SQRT_2PI-(Math.log(x)+Math.log1p(-x/n))/2;
}

function logPoisson(x,lambda) {
  return x===0 ? -lambda : -stirlingError(x)-deviance(x,lambda)-LOG_SQRT_2PI-Math.log(x)/2;
}

// Work relative to the first mass and evaluate the sum in log space. The
// consecutive ratios decrease along the chosen tail, giving a bound on the
// omitted terms. The iteration cap covers the supported billion-count range.
function tailSum(first, direction, edge, logMass, ratioAt) {
  const start=logMass(first);
  // The mass and any remaining terms are below binary64 representability.
  if (start < -780) return 0;
  let index=first, term=1, sum=1, correction=0;
  for (let iteration=0;iteration<MAX_TAIL_TERMS;iteration++) {
    if (index===edge) return Math.min(1,Math.exp(start+Math.log(sum)));
    const ratio=ratioAt(index);
    if (ratio<1 && term*ratio <= 2e-15*sum*(1-ratio)) {
      return Math.min(1,Math.exp(start+Math.log(sum)));
    }
    term*=ratio;
    const adjusted=term-correction, next=sum+adjusted;
    correction=(next-sum)-adjusted;
    sum=next;
    index+=direction;
  }
  throw new Error('分布计算未收敛');
}

function binomial(x,n,p,kind) {
  count(x);count(n);probability(p);
  if (kind==='upper'&&x>n) return 0;
  assert(x<=n,'数据须小于等于试验次数');
  if (p===0||p===1||n===0) {
    const certain=p===1?n:0;
    return Number(kind==='mass'?x===certain:kind==='upper'?x<=certain:x>=certain);
  }
  const logMass=k=>logBinomial(k,n,p);
  if (kind==='mass') return Math.min(1,Math.exp(logMass(x)));
  if (kind==='upper'&&x===0 || kind==='lower'&&x===n) return 1;
  const split=kind==='upper'?x-1:x;
  const lower=split<Math.floor((n+1)*p);
  const q=1-p;
  const tail=lower
    ?tailSum(split,-1,0,logMass,k=>k*q/((n-k+1)*p))
    :tailSum(split+1,1,n,logMass,k=>(n-k)*p/((k+1)*q));
  return (kind==='lower')===lower?tail:1-tail;
}

function poisson(x,lambda,kind) {
  count(x);poissonMean(lambda);
  if (lambda===0) return Number(kind==='lower'||x===0);
  const logMass=k=>logPoisson(k,lambda);
  if (kind==='mass') return Math.min(1,Math.exp(logMass(x)));
  if (kind==='upper'&&x===0) return 1;
  const split=kind==='upper'?x-1:x;
  const lower=split<Math.floor(lambda);
  const tail=lower
    ?tailSum(split,-1,0,logMass,k=>k/lambda)
    :tailSum(split+1,1,Infinity,logMass,k=>lambda/(k+1));
  return (kind==='lower')===lower?tail:1-tail;
}

function normalParameters(mu,sigma) {
  assert(Number.isFinite(mu)&&Number.isFinite(sigma)&&sigma>0,'标准差须大于 0，参数须为有限实数');
}

function normalDensity(x,mu,sigma) {
  normalParameters(mu,sigma);
  assert(Number.isFinite(x),'请输入实数');
  const z=(x-mu)/sigma;
  const value=Math.exp(-z*z/2-LOG_SQRT_2PI-Math.log(sigma));
  assert(Number.isFinite(value)&&value<1e100,'结果超出数值范围');
  return value;
}

const nodes=[.1834346424956498,.525532409916329,.7966664774136267,.9602898564975363];
const weights=[.362683783378362,.3137066458778873,.2223810344533745,.1012285362903763];

function normalInterval(lower,upper,mu,sigma) {
  normalParameters(mu,sigma);
  assert(typeof lower==='number'&&typeof upper==='number'&&lower<=upper,'分布下限不得大于上限');
  if (lower===upper) return 0;
  const a=(lower-mu)/sigma, b=(upper-mu)/sigma;
  const width=(upper-lower)/sigma, mid=a+width/2;
  if (width*(1+Math.abs(mid))<=.5) {
    // Integrate the density across short intervals instead of subtracting
    // nearly equal tails. Factor out the density at the midpoint first.
    let integral=0;
    for (let i=0;i<nodes.length;i++) {
      const t=width*nodes[i]/2;
      integral+=weights[i]*Math.exp(-t*t/2)*Math.cosh(mid*t);
    }
    return Math.exp(Math.log(width)-mid*mid/2-LOG_SQRT_2PI+Math.log(integral));
  }
  return Math.max(0,a>=0?normalTail(a)-normalTail(b):b<=0?normalTail(-b)-normalTail(-a):1-normalTail(-a)-normalTail(b));
}

function normalQuantile(p,mu,sigma,upper) {
  normalParameters(mu,sigma);probability(p);
  if (p===0||p===1) return (p===1)!==upper?Infinity:-Infinity;
  const value=mu+(upper?-1:1)*sigma*inverseNormal(p);
  assert(Number.isFinite(value)&&Math.abs(value)<1e100,'结果超出数值范围');
  return value;
}

export const cwExtendedDistributions=[
  {id:'binomialUpper',label:'二项右尾 P(X≥x)',list:true,parameters:['x','N','p']},
  {id:'poissonUpper',label:'泊松右尾 P(X≥x)',list:true,parameters:['x','λ']},
  {id:'normalUpper',label:'正态右尾 P(X≥下限)',parameters:['下限','μ','σ']},
  {id:'inverseNormalUpper',label:'右尾反正态',parameters:['区域','μ','σ'],quantile:true},
];

const functions=new Map([
  ['binomialPDF',(x,n,p)=>binomial(x,n,p,'mass')], ['binomialCDF',(x,n,p)=>binomial(x,n,p,'lower')],
  ['binomialUpper',(x,n,p)=>binomial(x,n,p,'upper')],
  ['poissonPDF',(x,lambda)=>poisson(x,lambda,'mass')], ['poissonCDF',(x,lambda)=>poisson(x,lambda,'lower')],
  ['poissonUpper',(x,lambda)=>poisson(x,lambda,'upper')],
  ['normalPDF',normalDensity], ['normalCDF',normalInterval], ['normalUpper',(a,mu,sigma)=>normalInterval(a,Infinity,mu,sigma)],
  ['inverseNormal',(p,mu,sigma)=>normalQuantile(p,mu,sigma,false)],
  ['inverseNormalUpper',(p,mu,sigma)=>normalQuantile(p,mu,sigma,true)],
]);
const specs=new Map([...distributionTypes,...cwExtendedDistributions].map(spec=>[spec.id,spec]));

export function cwDistribution(type,parameters) {
  const spec=specs.get(type);
  assert(spec,'不支持的分布');
  return functions.get(type)(...spec.parameters.map(name=>parameters[name]));
}
