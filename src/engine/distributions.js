import {assert} from './calculator.js';

// Independent double-precision implementation. All loops have a convergence bound.
// Regularized beta/gamma avoid factorial overflow and subtraction in small tails.
const EPS=3e-14, TINY=1e-300, LIMIT=10000;
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const probability=p=>assert(finite(p)&&p>=0&&p<=1,'概率须在 0 到 1 之间');
const integer=(x,max=1e6)=>assert(Number.isInteger(x)&&x>=0&&x<=max,'整数参数须在 0 到 1000000 之间');
const clamp=x=>Math.max(0,Math.min(1,x));
function logGamma(z){
  const c=[676.5203681218851,-1259.1392167224028,771.3234287776531,-176.6150291621406,12.507343278686905,-.13857109526572012,9.984369578019572e-6,1.5056327351493116e-7];
  if(z<.5)return Math.log(Math.PI)-Math.log(Math.sin(Math.PI*z))-logGamma(1-z);
  z--;let x=.99999999999980993;for(let i=0;i<c.length;i++)x+=c[i]/(z+i+1);
  const t=z+7.5;return .9189385332046727+(z+.5)*Math.log(t)-t+Math.log(x);
}
function gammaQ(a,x){
  if(x===0)return 1;
  if(x===Infinity)return 0;
  const scale=Math.exp(a*Math.log(x)-x-logGamma(a));
  if(x<a+1){let term=1/a,sum=term;for(let n=1;n<=LIMIT;n++){term*=x/(a+n);sum+=term;if(Math.abs(term)<Math.abs(sum)*EPS)return clamp(1-sum*scale);} }
  else {let b=x+1-a,c=1/TINY,d=1/b,h=d;for(let i=1;i<=LIMIT;i++){const an=-i*(i-a);b+=2;d=an*d+b;if(Math.abs(d)<TINY)d=TINY;c=b+an/c;if(Math.abs(c)<TINY)c=TINY;d=1/d;const delta=d*c;h*=delta;if(Math.abs(delta-1)<EPS)return clamp(scale*h);} }
  assert(false,'分布计算未收敛');
}
function betaFraction(a,b,x){
  const qab=a+b,qap=a+1,qam=a-1;let c=1,d=1-qab*x/qap;if(Math.abs(d)<TINY)d=TINY;d=1/d;let h=d;
  for(let m=1;m<=LIMIT;m++){
    const m2=2*m;
    const terms=[m*(b-m)*x/((qam+m2)*(a+m2)),-(a+m)*(qab+m)*x/((a+m2)*(qap+m2))];
    for(let j=0;j<2;j++){const aa=terms[j];
      d=1+aa*d;if(Math.abs(d)<TINY)d=TINY;c=1+aa/c;if(Math.abs(c)<TINY)c=TINY;d=1/d;const delta=d*c;h*=delta;
      if(j===1&&Math.abs(delta-1)<EPS)return h;
    }
  }
  assert(false,'分布计算未收敛');
}
function betaI(x,a,b){
  if(x===0||x===1)return x;
  const scale=Math.exp(logGamma(a+b)-logGamma(a)-logGamma(b)+a*Math.log(x)+b*Math.log1p(-x));
  return clamp(x<(a+1)/(a+b+2)?scale*betaFraction(a,b,x)/a:1-scale*betaFraction(b,a,1-x)/b);
}
function normalTail(z){return gammaQ(.5,z*z/2)/2;}
function normalParameters(mu,sigma){assert(finite(mu)&&finite(sigma)&&sigma>0,'标准差须大于 0，参数须为有限实数');}
export function normalPDF(x,mu=0,sigma=1){normalParameters(mu,sigma);assert(finite(x));const z=(x-mu)/sigma;const v=Math.exp(-z*z/2)/(Math.sqrt(2*Math.PI)*sigma);assert(finite(v),'结果超出数值范围');return v;}
export function normalCDF(lower,upper,mu=0,sigma=1){
  normalParameters(mu,sigma);assert(finite(lower)&&finite(upper)&&lower<=upper,'分布下限不得大于上限');
  const a=(lower-mu)/sigma,b=(upper-mu)/sigma;
  return clamp(a>=0?normalTail(a)-normalTail(b):b<=0?normalTail(-b)-normalTail(-a):1-normalTail(-a)-normalTail(b));
}
export function inverseNormal(p,mu=0,sigma=1){
  normalParameters(mu,sigma);probability(p);assert(p>0&&p<1,'区域须介于 0 和 1 之间（不含端点）');
  if(p===.5)return mu;
  const tail=Math.min(p,1-p);let lo=0,hi=40;
  for(let i=0;i<160;i++){const mid=(lo+hi)/2;if(normalTail(mid)>tail)lo=mid;else hi=mid;}
  const value=mu+(p<.5?-1:1)*sigma*(lo+hi)/2;assert(finite(value),'结果超出数值范围');return value;
}
export function binomialPDF(x,n,p){
  integer(n);integer(x);probability(p);assert(x<=n,'数据须小于等于试验次数');
  if(p===0)return x===0?1:0;if(p===1)return x===n?1:0;
  return clamp(Math.exp(logGamma(n+1)-logGamma(x+1)-logGamma(n-x+1)+x*Math.log(p)+(n-x)*Math.log1p(-p)));
}
export function binomialCDF(x,n,p){integer(n);integer(x);probability(p);assert(x<=n,'数据须小于等于试验次数');if(x===n||p===0)return 1;if(p===1)return 0;return betaI(1-p,n-x,x+1);}
export function poissonPDF(x,lambda){integer(x);assert(finite(lambda)&&lambda>0&&lambda<=1e6,'泊松平均值须大于 0 且不超过 1000000');return clamp(Math.exp(-lambda+x*Math.log(lambda)-logGamma(x+1)));}
export function poissonCDF(x,lambda){integer(x);assert(finite(lambda)&&lambda>0&&lambda<=1e6,'泊松平均值须大于 0 且不超过 1000000');return gammaQ(x+1,lambda);}

export const distributionTypes=[
  {id:'binomialPDF',label:'二项概率密度',list:true,parameters:['x','N','p']},
  {id:'binomialCDF',label:'二项累积分布',list:true,parameters:['x','N','p']},
  {id:'normalPDF',label:'正态概率密度',parameters:['x','μ','σ']},
  {id:'normalCDF',label:'正态累积分布',parameters:['下限','上限','μ','σ']},
  {id:'inverseNormal',label:'反正态累积分布',parameters:['区域','μ','σ']},
  {id:'poissonPDF',label:'泊松概率密度',list:true,parameters:['x','λ']},
  {id:'poissonCDF',label:'泊松累积分布',list:true,parameters:['x','λ']},
];
const functions={normalPDF,normalCDF,inverseNormal,binomialPDF,binomialCDF,poissonPDF,poissonCDF};
export function distribution(type,parameters){const spec=distributionTypes.find(t=>t.id===type);assert(spec,'不支持的分布');return functions[type](...spec.parameters.map(k=>parameters[k]));}
