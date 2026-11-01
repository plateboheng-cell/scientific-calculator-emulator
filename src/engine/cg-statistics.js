import {assert,math} from './calculator.js';
import {normalPDF,normalCDF,inverseNormal,binomialPDF,binomialCDF,poissonPDF,poissonCDF} from './distributions.js';
import {isCGMemoryScalar,cgMemoryJSON} from './cg-array-memory.js';

const finite=x=>typeof x==='number'&&Number.isFinite(x),clamp=x=>Math.max(0,Math.min(1,x));
const positive=(x,label='参数')=>assert(finite(x)&&x>0,`${label}须大于 0`);
const probability=x=>assert(finite(x)&&x>=0&&x<=1,'概率须在 0–1 之间');
const integer=(x,min=0,max=1e6)=>assert(Number.isInteger(x)&&x>=min&&x<=max,'整数参数超出范围');
export const CG_LIST_COUNT=26,CG_LIST_ROWS=999,CG_LIST_FILES=6;
// A bounded desktop-storage allocation, not a claim about the firmware's byte encoding.
export const CG_STATISTICS_MEMORY_BYTES=2*1024*1024;
const listPalette=['#2563eb','#dc2626','#16a34a','#9333ea','#0891b2','#ca8a04'];
const elementPalette=new Set(['#000000','#0000ff','#ff0000','#ff00ff','#00aa00','#00aabb','#ffff00','#ffffff']);
const plain=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
export function sanitizeCGListFile(value={}){
  const source=plain(value),index=x=>Number.isInteger(x)&&x>=0&&x<26?x:0;
  const elementColors=Array.from({length:26},(_,i)=>Array.isArray(source.elementColors?.[i])&&Array.isArray(source.lists?.[i])?source.lists[i].slice(0,Math.min(999,source.elementColors[i].length)).flatMap((value,row)=>{if(!isCGMemoryScalar(value))return [];const color=typeof source.elementColors[i][row]==='string'?source.elementColors[i][row].toLowerCase():'';return [elementPalette.has(color)?color:'#000000'];}):[]);
  return {lists:Array.from({length:26},(_,i)=>Array.isArray(source.lists?.[i])?source.lists[i].slice(0,999).filter(isCGMemoryScalar).map(cgMemoryJSON):[]),elementColors,names:Array.from({length:26},(_,i)=>typeof source.names?.[i]==='string'?source.names[i].slice(0,8):''),colors:Array.from({length:26},(_,i)=>/^#[a-f\d]{6}$/i.test(source.colors?.[i])?source.colors[i]:listPalette[i%6]),selectedList:index(source.selectedList),selectedRow:Number.isInteger(source.selectedRow)&&source.selectedRow>=0&&source.selectedRow<999?source.selectedRow:0};
}
export function sanitizeCGStatistics(source={}){
  source=plain(source);
  const index=(x,fallback)=>Number.isInteger(x)&&x>=0&&x<26?x:fallback;
  const validTypes=['Scatter','xyLine','Hist','MedBox','Bar','N-Dist','Broken','NPPlot','Pie'];
  const listFile=Number.isInteger(source.listFile)&&source.listFile>=0&&source.listFile<6?source.listFile:0;
  const active=sanitizeCGListFile(Array.isArray(source.lists)?source:source.listFiles?.[listFile]);
  return {...active,listFile,listFiles:Array.from({length:6},(_,i)=>i===listFile?null:source.listFiles?.[i]&&typeof source.listFiles[i]==='object'?sanitizeCGListFile(source.listFiles[i]):null),
    xList:index(source.xList,0),yList:index(source.yList,1),freqList:source.freqList===null?null:index(source.freqList,null),
    graphType:validTypes.includes(source.graphType)?source.graphType:'Scatter',regression:typeof source.regression==='string'?source.regression:'linear',quartile:source.quartile==='OnData'?'OnData':'Std',graphSelection:Number.isInteger(source.graphSelection)&&source.graphSelection>=0&&source.graphSelection<3?source.graphSelection:0,
    autoWindow:source.autoWindow!==false,graphWindow:source.graphWindow&&[source.graphWindow.xmin,source.graphWindow.xmax,source.graphWindow.ymin,source.graphWindow.ymax].every(finite)&&source.graphWindow.xmin<source.graphWindow.xmax&&source.graphWindow.ymin<source.graphWindow.ymax?{xmin:source.graphWindow.xmin,xmax:source.graphWindow.xmax,ymin:source.graphWindow.ymin,ymax:source.graphWindow.ymax}:null,
    graphs:Array.from({length:3},(_,i)=>{const g=source.graphs?.[i]&&typeof source.graphs[i]==='object'?source.graphs[i]:i===0?source:{};return {enabled:g.enabled===true||g.enabled===undefined&&i===0,type:validTypes.includes(g.type||g.graphType)?g.type||g.graphType:'Scatter',xList:index(g.xList,i),yList:index(g.yList,Math.min(25,i+1)),freqList:g.freqList===null||g.freqList===undefined?null:index(g.freqList,null),color:/^#[a-f\d]{6}$/i.test(g.color)?g.color:['#2563eb','#dc2626','#16a34a'][i],marker:['square','cross','dot'].includes(g.marker)?g.marker:'dot',barLists:(Array.isArray(g.barLists)&&g.barLists.length?g.barLists:[index(g.xList,i)]).filter(value=>Number.isInteger(value)&&value>=0&&value<26).slice(0,3),barColors:Array.from({length:3},(_,j)=>/^#[a-f\d]{6}$/i.test(g.barColors?.[j])?g.barColors[j]:j===0&&/^#[a-f\d]{6}$/i.test(g.color)?g.color:['#2563eb','#dc2626','#16a34a'][(i+j)%3]),outliers:g.outliers===true,histogramStart:finite(g.histogramStart)?g.histogramStart:null,histogramWidth:finite(g.histogramWidth)&&g.histogramWidth>0?g.histogramWidth:null};}),
    histogramStart:finite(source.histogramStart)?source.histogramStart:null,histogramWidth:finite(source.histogramWidth)&&source.histogramWidth>0?source.histogramWidth:null,
    forms:Object.fromEntries(Object.entries(source.forms&&typeof source.forms==='object'&&!Array.isArray(source.forms)?source.forms:{}).filter(([key,value])=>key.length<80&&value&&typeof value==='object'&&!Array.isArray(value)).map(([key,value])=>[key,Object.fromEntries(Object.entries(value).filter(([name,entry])=>name.length<40&&(typeof entry==='string'||typeof entry==='number'||typeof entry==='boolean')).map(([name,entry])=>[name,typeof entry==='string'?entry.slice(0,12000):entry]))])),
    sketches:Array.isArray(source.sketches)?source.sketches.filter(s=>s&&['point','line','circle','text'].includes(s.kind)&&finite(s.x)&&finite(s.y)&&(s.kind!=='line'||finite(s.x2)&&finite(s.y2))&&(s.kind!=='circle'||finite(s.r)&&s.r>0)).slice(0,200).map(s=>({kind:s.kind,x:s.x,y:s.y,...(s.kind==='line'?{x2:s.x2,y2:s.y2}:{}),...(s.kind==='circle'?{r:s.r}:{}),...(s.kind==='text'?{text:String(s.text||'').slice(0,200)}:{})})):[]};
}
export function cgStatisticsMemoryBytes(source){
  const data=sanitizeCGStatistics(source),active=sanitizeCGListFile(data),files=Array.from({length:6},(_,i)=>i===data.listFile?active:sanitizeCGListFile(data.listFiles[i]));
  const {lists,names,colors,elementColors,selectedList,selectedRow,listFiles,listFile,...settings}=data;
  return JSON.stringify({files,settings}).length*2;
}
export function assertCGStatisticsMemory(source,limit=CG_STATISTICS_MEMORY_BYTES){
  assert(Number.isFinite(limit)&&limit>0,'统计存储限制无效');const bytes=cgStatisticsMemoryBytes(source);
  if(bytes>limit){const error=new Error('Memory Full — export or reduce list data before continuing');error.code='MEMORY_FULL';error.requiredBytes=bytes;error.limitBytes=limit;throw error;}return bytes;
}
export function switchCGListFile(source,target){
  integer(target,0,5);const data=sanitizeCGStatistics(source);if(target===data.listFile)return data;
  const active=sanitizeCGListFile(data),next=sanitizeCGListFile(data.listFiles[target]);
  data.listFiles[data.listFile]=active;data.listFiles[target]=null;Object.assign(data,next,{listFile:target});return data;
}
export function cgDataRows(data,paired=false){
  const xs=data.lists[data.xList],ys=data.lists[data.yList],fs=data.freqList===null?null:data.lists[data.freqList];
  assert(xs?.length&&(!paired||ys?.length===xs.length)&&(!fs||fs.length===xs.length),'数据列表为空或长度不一致');
  assert(xs.every(finite)&&(!paired||ys.every(finite))&&(!fs||fs.every(finite)),'Domain ERROR: statistics require real list elements');
  return xs.map((x,i)=>[x,paired?ys[i]:0,fs?fs[i]:1]);
}
function weightedRows(rows,paired=false){
  assert(Array.isArray(rows)&&rows.length>0&&rows.length<=999,'数据行数须为 1–999');
  assert(rows.every(r=>Array.isArray(r)&&finite(r[0])&&(!paired||finite(r[1]))&&finite(r[2]??1)&&(r[2]??1)>=0),'Domain ERROR: 数据须为有限实数，频数不得为负');
  const out=rows.map(r=>[r[0],paired?r[1]:0,r[2]??1]).filter(r=>r[2]>0);assert(out.length,'频数总和须大于 0');return out;
}
function weightedQuantile(rows,p,method='Std'){
  const sorted=rows.slice().sort((a,b)=>a[0]-b[0]),n=sorted.reduce((s,r)=>s+r[2],0);
  const at=position=>{let sum=0;for(const r of sorted){sum+=r[2];if(sum>position)return r[0];}return sorted.at(-1)[0];};
  const target=p*n,tolerance=Number.EPSILON*Math.abs(n)*8;
  if(method==='OnData'&&p!==.5){let sum=0;for(const [x,,weight]of sorted){sum+=weight;if(sum>=target-tolerance)return x;}return sorted.at(-1)[0];}
  // Match median-of-halves quartiles for integer frequencies; interpolate a
  // weighted quantile for noninteger frequencies rather than expanding the list.
  if(Number.isInteger(n)&&rows.every(r=>Number.isInteger(r[2]))){
    const median=(lo,count)=>count%2?at(lo+(count-1)/2):(at(lo+count/2-1)+at(lo+count/2))/2;
    if(p===.5)return median(0,n);const count=Math.floor(n/2);return count?median(p===.25?0:Math.ceil(n/2),count):at(0);
  }
  let sum=0;for(let i=0;i<sorted.length;i++){sum+=sorted[i][2];if(Math.abs(sum-target)<=tolerance)return (sorted[i][0]+(sorted[i+1]?.[0]??sorted[i][0]))/2;if(sum>target)return sorted[i][0];}return sorted.at(-1)[0];
}
export function cgSummary(rows,paired=false,quartile='Std'){
  rows=weightedRows(rows,paired);let n=0,mx=0,my=0,sxx=0,syy=0,sxy=0;
  for(const [x,y,w]of rows){const next=n+w,dx=x-mx,dy=y-my;mx+=dx*w/next;my+=dy*w/next;sxx+=w*dx*(x-mx);syy+=w*dy*(y-my);sxy+=w*dx*(y-my);n=next;}
  const frequencies=new Map();for(const [x,,weight]of rows)frequencies.set(x,(frequencies.get(x)||0)+weight);const modeFrequency=Math.max(...frequencies.values()),modes=[...frequencies].filter(([,weight])=>Math.abs(weight-modeFrequency)<=Number.EPSILON*Math.abs(modeFrequency)*8).map(([x])=>x).sort((a,b)=>a-b);
  const out={n,mean:mx,sd:Math.sqrt(Math.max(0,sxx/(n-1))),populationSD:Math.sqrt(Math.max(0,sxx/n)),variance:sxx/(n-1),sum:rows.reduce((s,r)=>s+r[0]*r[2],0),sumSquares:rows.reduce((s,r)=>s+r[0]**2*r[2],0),min:Math.min(...rows.map(r=>r[0])),Q1:weightedQuantile(rows,.25,quartile),median:weightedQuantile(rows,.5),Q3:weightedQuantile(rows,.75,quartile),max:Math.max(...rows.map(r=>r[0])),modes,modeCount:modes.length,modeFrequency,sxx,syy,sxy};
  if(n<=1){out.sd=NaN;out.variance=NaN;}
  if(paired)Object.assign(out,{meanY:my,sdY:n>1?Math.sqrt(Math.max(0,syy/(n-1))):NaN,populationSDY:Math.sqrt(Math.max(0,syy/n)),sumY:rows.reduce((s,r)=>s+r[1]*r[2],0),sumSquaresY:rows.reduce((s,r)=>s+r[1]**2*r[2],0),sumXY:rows.reduce((s,r)=>s+r[0]*r[1]*r[2],0),minY:Math.min(...rows.map(r=>r[1])),maxY:Math.max(...rows.map(r=>r[1]))});
  return out;
}

// Lanczos log-gamma and continued-fraction incomplete beta/gamma. Independent
// bounded iterations; distribution definitions: NIST/SEMATECH handbook 1.3.6.6.
export function cgLogGamma(z){
  const c=[676.5203681218851,-1259.1392167224028,771.3234287776531,-176.6150291621406,12.507343278686905,-.13857109526572012,9.984369578019572e-6,1.5056327351493116e-7];
  if(z<.5)return Math.log(Math.PI)-Math.log(Math.sin(Math.PI*z))-cgLogGamma(1-z);
  z--;let x=.99999999999980993;for(let i=0;i<c.length;i++)x+=c[i]/(z+i+1);const t=z+7.5;return .9189385332046727+(z+.5)*Math.log(t)-t+Math.log(x);
}
function betaFraction(a,b,x){let c=1,d=1-(a+b)*x/(a+1);if(Math.abs(d)<1e-300)d=1e-300;d=1/d;let h=d;for(let m=1;m<=10000;m++)for(let j=0;j<2;j++){const aa=j?-((a+m)*(a+b+m)*x)/((a+2*m)*(a+2*m+1)):m*(b-m)*x/((a+2*m-1)*(a+2*m));d=1+aa*d;if(Math.abs(d)<1e-300)d=1e-300;c=1+aa/c;if(Math.abs(c)<1e-300)c=1e-300;d=1/d;const delta=d*c;h*=delta;if(j&&Math.abs(delta-1)<3e-14)return h;}throw new Error('Beta 未收敛');}
export function cgBetaI(x,a,b){if(x<=0)return 0;if(x>=1)return 1;const scale=Math.exp(cgLogGamma(a+b)-cgLogGamma(a)-cgLogGamma(b)+a*Math.log(x)+b*Math.log1p(-x));return clamp(x<(a+1)/(a+b+2)?scale*betaFraction(a,b,x)/a:1-scale*betaFraction(b,a,1-x)/b);}
export function cgGammaQ(a,x){if(x<=0)return 1;if(x===Infinity)return 0;const scale=Math.exp(a*Math.log(x)-x-cgLogGamma(a));if(x<a+1){let term=1/a,sum=term;for(let n=1;n<=10000;n++){term*=x/(a+n);sum+=term;if(Math.abs(term)<Math.abs(sum)*3e-14)return clamp(1-sum*scale);}}else{let b=x+1-a,c=1e300,d=1/b,h=d;for(let i=1;i<=10000;i++){const an=-i*(i-a);b+=2;d=an*d+b;if(Math.abs(d)<1e-300)d=1e-300;c=b+an/c;if(Math.abs(c)<1e-300)c=1e-300;d=1/d;const delta=d*c;h*=delta;if(Math.abs(delta-1)<3e-14)return clamp(scale*h);}}throw new Error('Gamma 未收敛');}
export function cgGammaP(a,x){if(x<=0)return 0;if(x===Infinity)return 1;if(x>=a+1)return 1-cgGammaQ(a,x);let term=1/a,sum=term;for(let n=1;n<=10000;n++){term*=x/(a+n);sum+=term;if(Math.abs(term)<Math.abs(sum)*3e-14)return clamp(sum*Math.exp(a*Math.log(x)-x-cgLogGamma(a)));}throw new Error('Gamma 未收敛');}
export function cgStudentTail(x,df){positive(df,'自由度');assert(typeof x==='number'&&!Number.isNaN(x),'请输入实数');if(!finite(x))return x===Infinity?0:1;const p=.5*cgBetaI(df/(df+x*x),df/2,.5);return x>=0?p:1-p;}
export function cgStudentCDF(x,df){return cgStudentTail(-x,df);}
export function cgChiSquareTail(x,df){positive(df,'自由度');assert(typeof x==='number'&&!Number.isNaN(x),'请输入实数');return x<=0?1:cgGammaQ(df/2,x/2);}
export function cgFTail(x,df1,df2){positive(df1,'分子自由度');positive(df2,'分母自由度');assert(typeof x==='number'&&!Number.isNaN(x),'请输入实数');return x<=0?1:x===Infinity?0:cgBetaI(df2/(df2+df1*x),df2/2,df1/2);}
function continuousInverse(kind,p,parameters){
  probability(p);assert(p>0&&p<1,'反分布概率须介于 0 和 1 之间');
  if(kind==='normal')return inverseNormal(p,parameters.mu??0,parameters.sigma??1);
  const sf=x=>kind==='t'?cgStudentTail(x,parameters.df):kind==='chi2'?cgChiSquareTail(x,parameters.df):cgFTail(x,parameters.df1,parameters.df2);
  if(kind==='t'&&p===.5)return 0;
  const target=kind==='t'?Math.min(p,1-p):p;
  const cdf=x=>kind==='chi2'?cgGammaP(parameters.df/2,x/2):cgBetaI((parameters.df1*x)/(parameters.df1*x+parameters.df2),parameters.df1/2,parameters.df2/2);
  const below=x=>kind==='t'?sf(x)>target:p<=.5?cdf(x)<p:sf(x)>1-p;
  let lo=0,hi=1;for(let i=0;i<1024&&below(hi);i++){lo=hi;hi*=2;}assert(finite(hi),'反分布结果超出范围');
  for(let i=0;i<300;i++){const mid=(lo+hi)/2;if(below(mid))lo=mid;else hi=mid;}return (kind==='t'&&p<.5?-1:1)*(lo+hi)/2;
}
const logChoose=(n,k)=>k<0||k>n?-Infinity:cgLogGamma(n+1)-cgLogGamma(k+1)-cgLogGamma(n-k+1);
export const cgDistributionFamilies=['normal','t','chi2','F','binomial','poisson','geometric','hypergeometric'];
export function cgDistribution(kind,operation,p={}){
  assert(cgDistributionFamilies.includes(kind),'分布类型不存在');assert(['pdf','cdf','inverse'].includes(operation),'分布操作不存在');
  if(kind==='t'||kind==='chi2')positive(p.df,'自由度');
  if(kind==='F'){positive(p.df1,'分子自由度');positive(p.df2,'分母自由度');}
  if(kind==='normal'){assert(finite(p.mu??0),'均值须为有限实数');positive(p.sigma??1,'标准差');}
  if(kind==='binomial'){integer(p.n);probability(p.probability);}
  if(kind==='poisson')positive(p.lambda,'平均值');
  if(kind==='geometric'){positive(p.probability,'成功概率');probability(p.probability);}
  if(kind==='hypergeometric'){integer(p.population,1);integer(p.successes,0,p.population);integer(p.draws,0,p.population);}
  const discrete=['binomial','poisson','geometric','hypergeometric'].includes(kind);
  if(discrete&&operation==='cdf'&&p.lower!==undefined){
    assert(finite(p.lower),'请输入有限实数');const upper=p.upper??p.x;assert(finite(upper)&&p.lower<=upper,'下限不得大于上限');
    const base={...p,lower:undefined,upper:undefined};return clamp(cgDistribution(kind,'cdf',{...base,x:Math.floor(upper)})-cgDistribution(kind,'cdf',{...base,x:Math.ceil(p.lower)-1}));
  }
  if(operation==='inverse'){
    probability(p.p);if(!discrete)return continuousInverse(kind,p.p,p);
    if(kind==='binomial'&&(p.n===0||p.probability===0))return 0;
    let lo=kind==='geometric'?1:kind==='hypergeometric'?Math.max(0,p.draws-(p.population-p.successes)):0;
    let hi=kind==='binomial'?p.n:kind==='hypergeometric'?Math.min(p.draws,p.successes):Math.max(1,Math.ceil(p.lambda??1));
    if(p.p===0)return lo;
    if(p.p===1){assert(['binomial','hypergeometric'].includes(kind)||kind==='geometric'&&p.probability===1,'概率 1 的分位数无穷大');return kind==='geometric'?1:hi;}
    while(cgDistribution(kind,'cdf',{...p,x:hi})<p.p){hi*=2;assert(hi<=1e6,'离散反分布结果超出范围');}
    while(lo<hi){const mid=Math.floor((lo+hi)/2);if(cgDistribution(kind,'cdf',{...p,x:mid})>=p.p)hi=mid;else lo=mid+1;}return lo;
  }
  const x=p.x??p.upper;
  if(discrete){
    assert(finite(x),'请输入有限实数');
    if(kind==='binomial'){integer(p.n);probability(p.probability);if(x<0)return 0;if(x>p.n)return operation==='cdf'?1:0;if(operation==='pdf'&&!Number.isInteger(x))return 0;return operation==='pdf'?binomialPDF(x,p.n,p.probability):binomialCDF(Math.floor(x),p.n,p.probability);}
    if(kind==='poisson'){positive(p.lambda,'平均值');if(x<0)return 0;if(operation==='pdf'&&!Number.isInteger(x))return 0;return operation==='pdf'?poissonPDF(x,p.lambda):poissonCDF(Math.floor(x),p.lambda);}
    if(kind==='geometric'){positive(p.probability,'成功概率');probability(p.probability);if(x<1)return 0;if(operation==='pdf'&&!Number.isInteger(x))return 0;return operation==='pdf'?p.probability*Math.pow(1-p.probability,x-1):-Math.expm1(Math.floor(x)*Math.log1p(-p.probability));}
    integer(p.population,1);integer(p.successes,0,p.population);integer(p.draws,0,p.population);const min=Math.max(0,p.draws-(p.population-p.successes)),max=Math.min(p.draws,p.successes);
    const mass=k=>Math.exp(logChoose(p.successes,k)+logChoose(p.population-p.successes,p.draws-k)-logChoose(p.population,p.draws));
    if(operation==='pdf')return Number.isInteger(x)&&x>=min&&x<=max?clamp(mass(x)):0;
    if(x<min)return 0;if(x>=max)return 1;assert(Math.floor(x)-min<20000,'超出分布计算容量');let sum=0;for(let k=min;k<=Math.floor(x);k++)sum+=mass(k);return clamp(sum);
  }
  assert(typeof x==='number'&&!Number.isNaN(x),'请输入实数');
  if(operation==='cdf'){
    const lower=p.lower??(kind==='t'||kind==='normal'?-Infinity:0),upper=p.upper??x;assert(lower<=upper,'下限不得大于上限');
    if(kind==='normal')return normalCDF(Math.max(-1e99,lower),Math.min(1e99,upper),p.mu??0,p.sigma??1);
    const sf=z=>kind==='t'?cgStudentTail(z,p.df):kind==='chi2'?cgChiSquareTail(z,p.df):cgFTail(z,p.df1,p.df2);
    if(kind==='t'&&upper<=0)return clamp(sf(-upper)-sf(-lower));
    if(kind==='chi2'&&upper<=p.df)return clamp(cgGammaP(p.df/2,upper/2)-cgGammaP(p.df/2,Math.max(0,lower)/2));
    if(kind==='F'&&upper<=1){const cdf=z=>z<=0?0:cgBetaI(p.df1*z/(p.df1*z+p.df2),p.df1/2,p.df2/2);return clamp(cdf(upper)-cdf(lower));}
    return clamp(sf(lower)-sf(upper));
  }
  if(kind==='normal')return normalPDF(x,p.mu??0,p.sigma??1);
  if(kind==='t'){positive(p.df,'自由度');return Math.exp(cgLogGamma((p.df+1)/2)-cgLogGamma(p.df/2)-.5*Math.log(p.df*Math.PI)-(p.df+1)/2*Math.log1p(x*x/p.df));}
  if(kind==='chi2'){positive(p.df,'自由度');if(x<0)return 0;if(x===0)return p.df===2?.5:p.df>2?0:Infinity;return Math.exp((p.df/2-1)*Math.log(x)-x/2-p.df/2*Math.log(2)-cgLogGamma(p.df/2));}
  positive(p.df1,'分子自由度');positive(p.df2,'分母自由度');if(x<0)return 0;if(x===0)return p.df1===2?1:p.df1>2?0:Infinity;
  return Math.exp((p.df1/2)*Math.log(p.df1/p.df2)+(p.df1/2-1)*Math.log(x)-(p.df1+p.df2)/2*Math.log1p(p.df1*x/p.df2)+cgLogGamma((p.df1+p.df2)/2)-cgLogGamma(p.df1/2)-cgLogGamma(p.df2/2));
}

function sample(p,suffix=''){
  const raw=p['sample'+suffix];if(Array.isArray(raw)){const summary=cgSummary(raw.map(x=>[x,0,1]));return {mean:summary.mean,sd:summary.sd,n:summary.n};}
  const out={mean:p['mean'+suffix],sd:p['sd'+suffix],n:p['n'+suffix]};assert(finite(out.mean),'样本均值须为有限实数');integer(out.n,1);if(out.sd!==undefined)assert(finite(out.sd)&&out.sd>=0,'样本标准差不得为负');return out;
}
function testProbability(statistic,cdf,sf,tail='!='){assert(['!=','<','>'].includes(tail),'检验方向错误');return clamp(tail==='<'?cdf(statistic):tail==='>'?sf(statistic):2*Math.min(cdf(statistic),sf(statistic)));}
const normalLeft=x=>normalCDF(-1e99,x),normalRight=x=>normalCDF(x,1e99);
function twoSample(p,tDistribution){
  const a=sample(p,'1'),b=sample(p,'2');let se,df;
  if(!tDistribution){positive(p.sigma1,'σ1');positive(p.sigma2,'σ2');se=Math.sqrt(p.sigma1**2/a.n+p.sigma2**2/b.n);}
  else {integer(a.n,2);integer(b.n,2);positive(a.sd,'s1');positive(b.sd,'s2');const v1=a.sd**2/a.n,v2=b.sd**2/b.n;
    if(p.pooled){df=a.n+b.n-2;const pooled=((a.n-1)*a.sd**2+(b.n-1)*b.sd**2)/df;se=Math.sqrt(pooled*(1/a.n+1/b.n));}
    else {se=Math.sqrt(v1+v2);df=(v1+v2)**2/(v1*v1/(a.n-1)+v2*v2/(b.n-1));}
  }
  return {a,b,se,df,difference:a.mean-b.mean};
}
function proportion(x,n){integer(n,1);integer(x,0,n);return x/n;}
export const cgTestTypes=['oneZ','twoZ','oneT','twoT','oneProp','twoProp','linearT','chiGOF','chi2way','twoF','anova1','anova2'];
export function cgHypothesisTest(type,p={}){
  const tail=p.tail||'!=';assert(cgTestTypes.includes(type),'检验类型不存在');
  if(type==='oneZ'||type==='oneT'){
    const s=sample(p),t=type==='oneT',sigma=t?s.sd:p.sigma;if(t)integer(s.n,2);positive(sigma,t?'样本标准差':'总体标准差');assert(finite(p.mu0),'假设均值须为有限实数');
    const se=sigma/Math.sqrt(s.n),statistic=(s.mean-p.mu0)/se,df=t?s.n-1:undefined;
    return {statistic,p:testProbability(statistic,t?x=>cgStudentCDF(x,df):normalLeft,t?x=>cgStudentTail(x,df):normalRight,tail),...(t?{df}:{}),se,...s};
  }
  if(type==='twoZ'||type==='twoT'){
    const t=type==='twoT',r=twoSample(p,t),statistic=(r.difference-(p.difference0??0))/r.se;
    return {statistic,p:testProbability(statistic,t?x=>cgStudentCDF(x,r.df):normalLeft,t?x=>cgStudentTail(x,r.df):normalRight,tail),se:r.se,difference:r.difference,...(t?{df:r.df}:{})};
  }
  if(type==='oneProp'){
    const estimate=proportion(p.x,p.n);assert(finite(p.p0)&&p.p0>0&&p.p0<1,'假设比例须介于 0 和 1');const se=Math.sqrt(p.p0*(1-p.p0)/p.n),statistic=(estimate-p.p0)/se;
    return {statistic,p:testProbability(statistic,normalLeft,normalRight,tail),estimate,se,n:p.n};
  }
  if(type==='twoProp'){
    const a=proportion(p.x1,p.n1),b=proportion(p.x2,p.n2),pooled=(p.x1+p.x2)/(p.n1+p.n2),se=Math.sqrt(pooled*(1-pooled)*(1/p.n1+1/p.n2));positive(se,'标准误');const statistic=(a-b)/se;
    return {statistic,p:testProbability(statistic,normalLeft,normalRight,tail),estimate1:a,estimate2:b,pooled,se};
  }
  if(type==='linearT'){
    const rows=weightedRows(p.rows,true),s=cgSummary(rows,true),fit=cgRegression(rows,'linear');assert(s.n>2&&s.sxx>0&&fit.SSE>0,'线性回归 t 检验需要非退化数据且 n>2');
    const df=s.n-2,se=Math.sqrt(fit.SSE/df/s.sxx),statistic=fit.coefficients[1]/se;
    return {statistic,p:testProbability(statistic,x=>cgStudentCDF(x,df),x=>cgStudentTail(x,df),tail),df,se,slope:fit.coefficients[1],intercept:fit.coefficients[0],r:fit.r,residuals:fit.residuals};
  }
  if(type==='chiGOF'){
    const observed=p.observed,expected=p.expected;assert(Array.isArray(observed)&&observed.length>=2&&observed.length===expected?.length,'观测值与期望值数量不一致');
    assert(observed.every(x=>finite(x)&&x>=0)&&expected.every(x=>finite(x)&&x>0),'观测值须非负，期望值须为正数');const total=observed.reduce((a,b)=>a+b,0),exp=expected.reduce((a,b)=>a+b,0);assert(Math.abs(total-exp)<=1e-8*Math.max(1,total),'观测频数与期望频数总和须相等');
    const df=p.df??observed.length-1;positive(df,'自由度');const components=observed.map((x,i)=>(x-expected[i])**2/expected[i]),statistic=components.reduce((a,b)=>a+b,0);
    return {statistic,p:cgChiSquareTail(statistic,df),df,components};
  }
  if(type==='chi2way'){
    const table=p.table;assert(Array.isArray(table)&&table.length>=2&&table[0]?.length>=2&&table.every(r=>r.length===table[0].length&&r.every(x=>finite(x)&&x>=0)),'列联表至少为 2×2，频数须非负');
    const rows=table.map(r=>r.reduce((a,b)=>a+b,0)),cols=table[0].map((_,j)=>table.reduce((s,r)=>s+r[j],0)),total=rows.reduce((a,b)=>a+b,0);assert(rows.every(x=>x>0)&&cols.every(x=>x>0),'行列总频数须为正数');
    const expected=table.map((r,i)=>r.map((_,j)=>rows[i]*cols[j]/total)),statistic=table.reduce((sum,r,i)=>sum+r.reduce((s,x,j)=>s+(x-expected[i][j])**2/expected[i][j],0),0),df=(rows.length-1)*(cols.length-1);
    return {statistic,p:cgChiSquareTail(statistic,df),df,expected};
  }
  if(type==='twoF'){
    const a=sample(p,'1'),b=sample(p,'2');integer(a.n,2);integer(b.n,2);positive(a.sd,'s1');positive(b.sd,'s2');const statistic=a.sd**2/b.sd**2,df1=a.n-1,df2=b.n-1;
    return {statistic,p:testProbability(statistic,x=>cgDistribution('F','cdf',{upper:x,df1,df2}),x=>cgFTail(x,df1,df2),tail),df1,df2};
  }
  if(type==='anova1'){
    const groups=p.groups;assert(Array.isArray(groups)&&groups.length>=2,'ANOVA 至少需要两组样本');const summaries=groups.map(group=>sample({sample:group})),n=summaries.reduce((s,g)=>s+g.n,0),mean=summaries.reduce((s,g)=>s+g.mean*g.n,0)/n;
    const SSbetween=summaries.reduce((s,g)=>s+g.n*(g.mean-mean)**2,0),SSerror=summaries.reduce((s,g)=>s+(g.n>1?(g.n-1)*g.sd**2:0),0),df1=groups.length-1,df2=n-groups.length,MSbetween=SSbetween/df1,MSerror=SSerror/df2;positive(MSerror,'组内均方');const statistic=MSbetween/MSerror;
    return {statistic,p:cgFTail(statistic,df1,df2),df1,df2,SSbetween,SSerror,SStotal:SSbetween+SSerror,MSbetween,MSerror,means:summaries.map(g=>g.mean)};
  }
  return twoWayAnova(p.cells);
}
function twoWayAnova(cells){
  assert(Array.isArray(cells)&&cells.length>=2&&cells[0]?.length>=2&&cells.every(row=>row.length===cells[0].length),'双因素 ANOVA 需要至少 2×2 单元');
  const a=cells.length,b=cells[0].length,r=cells[0][0]?.length;integer(r,1,999);assert(cells.every(row=>row.every(cell=>Array.isArray(cell)&&cell.length===r&&cell.every(finite))),'双因素 ANOVA 须为平衡设计，每格重复次数相同');
  const means=cells.map(row=>row.map(cell=>cell.reduce((s,x)=>s+x,0)/r)),rowMeans=means.map(row=>row.reduce((s,x)=>s+x,0)/b),colMeans=means[0].map((_,j)=>means.reduce((s,row)=>s+row[j],0)/a),mean=rowMeans.reduce((s,x)=>s+x,0)/a;
  const SSA=b*r*rowMeans.reduce((s,x)=>s+(x-mean)**2,0),SSB=a*r*colMeans.reduce((s,x)=>s+(x-mean)**2,0),SSAB=r*means.reduce((s,row,i)=>s+row.reduce((q,x,j)=>q+(x-rowMeans[i]-colMeans[j]+mean)**2,0),0),SSE=cells.reduce((s,row,i)=>s+row.reduce((q,cell,j)=>q+cell.reduce((v,x)=>v+(x-means[i][j])**2,0),0),0);
  const dfA=a-1,dfB=b-1,dfAB=dfA*dfB,dfE=r>1?a*b*(r-1):dfAB,MSE=(r>1?SSE:SSAB)/dfE;positive(MSE,'误差均方');
  const FA=SSA/dfA/MSE,FB=SSB/dfB/MSE,out={FA,pA:cgFTail(FA,dfA,dfE),FB,pB:cgFTail(FB,dfB,dfE),SSA,SSB,SSE:r>1?SSE:SSAB,dfA,dfB,dfE,MSE};
  if(r>1){out.FAB=SSAB/dfAB/MSE;out.pAB=cgFTail(out.FAB,dfAB,dfE);out.SSAB=SSAB;out.dfAB=dfAB;}return out;
}
export const cgConfidenceTypes=['oneZ','twoZ','oneT','twoT','oneProp','twoProp','linearT'];
export function cgConfidenceInterval(type,p={}){
  assert(cgConfidenceTypes.includes(type),'区间类型不存在');const level=p.level??.95;assert(finite(level)&&level>0&&level<1,'置信水平须介于 0 和 1');const alpha=(1-level)/2;let estimate,se,df;
  if(type==='oneZ'||type==='oneT'){const s=sample(p);estimate=s.mean;if(type==='oneT')integer(s.n,2);positive(type==='oneT'?s.sd:p.sigma,'标准差');se=(type==='oneT'?s.sd:p.sigma)/Math.sqrt(s.n);if(type==='oneT')df=s.n-1;}
  else if(type==='twoZ'||type==='twoT'){const out=twoSample(p,type==='twoT');estimate=out.difference;se=out.se;df=out.df;}
  else if(type==='oneProp'){estimate=proportion(p.x,p.n);se=Math.sqrt(estimate*(1-estimate)/p.n);}
  else if(type==='twoProp'){const a=proportion(p.x1,p.n1),b=proportion(p.x2,p.n2);estimate=a-b;se=Math.sqrt(a*(1-a)/p.n1+b*(1-b)/p.n2);}
  else {const fit=cgRegression(p.rows,'linear'),s=cgSummary(p.rows,true);assert(s.n>2&&s.sxx>0,'回归区间需要 n>2');estimate=fit.coefficients[1];df=s.n-2;se=Math.sqrt(fit.SSE/df/s.sxx);}
  const critical=df===undefined?inverseNormal(1-alpha):continuousInverse('t',1-alpha,{df}),margin=critical*se;
  return {lower:estimate-margin,upper:estimate+margin,estimate,se,critical,level,...(df===undefined?{}:{df})};
}

function leastSquares(design,values,weights){
  const n=design.length,m=design[0].length;assert(n>=m,'回归数据不足');const a=design.map((row,i)=>[...row,values[i]].map(x=>x*Math.sqrt(weights[i])));
  for(let col=0;col<m;col++){
    let norm=Math.hypot(...a.slice(col).map(row=>row[col]));assert(norm>1e-13,'回归数据退化');
    const v=a.slice(col).map(row=>row[col]);v[0]+=Math.sign(v[0]||1)*norm;const length=Math.hypot(...v);for(let i=0;i<v.length;i++)v[i]/=length;
    for(let j=col;j<=m;j++){let dot=0;for(let i=col;i<n;i++)dot+=v[i-col]*a[i][j];for(let i=col;i<n;i++)a[i][j]-=2*v[i-col]*dot;}
  }
  const out=Array(m).fill(0);for(let i=m-1;i>=0;i--){let rhs=a[i][m];for(let j=i+1;j<m;j++)rhs-=a[i][j]*out[j];out[i]=rhs/a[i][i];}return out;
}
const polyValue=(c,x)=>c.reduceRight((sum,value)=>sum*x+value,0);
const choose=(n,k)=>{let v=1;for(let i=1;i<=k;i++)v=v*(n-i+1)/i;return v;};
export const cgRegressionTypes=['linear','ax+b','medmed','quadratic','cubic','quartic','log','exp','abexp','power','sin','logistic'];
export function cgRegression(input,type='linear'){
  const rows=weightedRows(input,true),s=cgSummary(rows,true),xs=rows.map(r=>r[0]),ys=rows.map(r=>r[1]),weights=rows.map(r=>r[2]);assert(cgRegressionTypes.includes(type),'回归类型不存在');assert(rows.length>=2&&s.sxx>0,'回归需要至少两个不同的 x 值');
  let coefficients,predict,formula,parameters=2,transformedR;
  if(['linear','ax+b','quadratic','cubic','quartic'].includes(type)){
    const degree={quadratic:2,cubic:3,quartic:4}[type]||1,origin=(Math.max(...xs)+Math.min(...xs))/2,scale=Math.max(...xs)-Math.min(...xs);
    const normalized=leastSquares(xs.map(x=>Array.from({length:degree+1},(_,j)=>((x-origin)/scale)**j)),ys,weights);
    coefficients=Array(degree+1).fill(0);for(let j=0;j<=degree;j++)for(let k=0;k<=j;k++)coefficients[k]+=normalized[j]*choose(j,k)*(-origin)**(j-k)/scale**j;
    predict=x=>polyValue(normalized,(x-origin)/scale);parameters=degree+1;formula=coefficients.map((c,i)=>`(${c})${i?`*x${i>1?'^'+i:''}`:''}`).join('+');
  }else if(['log','exp','abexp','power'].includes(type)){
    const transformX=type==='log'||type==='power',transformY=type!=='log';assert(rows.every(([x,y])=>(!transformX||x>0)&&(!transformY||y>0)),'此回归的对数参数须为正数');
    const tr=rows.map(([x,y,w])=>[transformX?Math.log(x):x,transformY?Math.log(y):y,w]),t=cgSummary(tr,true),slope=t.sxy/t.sxx,intercept=t.meanY-slope*t.mean;transformedR=t.sxy/Math.sqrt(t.sxx*t.syy);
    coefficients=type==='log'?[intercept,slope]:[Math.exp(intercept),type==='abexp'?Math.exp(slope):slope];
    predict=x=>type==='log'?intercept+slope*Math.log(x):type==='power'?coefficients[0]*x**slope:coefficients[0]*Math.exp(slope*x);
    formula=type==='log'?`(${intercept})+(${slope})*ln(x)`:type==='power'?`(${coefficients[0]})*x^(${slope})`:type==='abexp'?`(${coefficients[0]})*(${coefficients[1]})^x`:`(${coefficients[0]})*exp((${slope})*x)`;
  }else if(type==='medmed'){
    assert(s.n>=3,'Med-Med 至少需要三个数据');const sorted=rows.slice().sort((a,b)=>a[0]-b[0]),outer=Number.isInteger(s.n)?Math.floor(s.n/3)+(s.n%3===2?1:0):s.n/3,cut=[0,outer,s.n-outer,s.n];
    const medians=[];for(let g=0;g<3;g++){let pos=0,group=[];for(const [x,y,w]of sorted){const portion=Math.max(0,Math.min(pos+w,cut[g+1])-Math.max(pos,cut[g]));if(portion)group.push([x,y,portion]);pos+=w;}medians.push([weightedQuantile(group,.5),weightedQuantile(group.map(([x,y,w])=>[y,x,w]),.5)]);}
    const slope=(medians[2][1]-medians[0][1])/(medians[2][0]-medians[0][0]);assert(finite(slope),'Med-Med 数据退化');const intercept=medians.reduce((sum,[x,y])=>sum+y-slope*x,0)/3;coefficients=[intercept,slope];predict=x=>intercept+slope*x;formula=`(${intercept})+(${slope})*x`;
  }else if(type==='sin'){
    assert(rows.length>=4,'正弦回归至少需要四个数据');const span=Math.max(...xs)-Math.min(...xs),unique=[...new Set(xs)].sort((a,b)=>a-b),spacing=Math.min(...unique.slice(1).map((x,i)=>x-unique[i]));
    const minFrequency=.05*Math.PI/span,maxFrequency=Math.min(40*Math.PI/span,.999*Math.PI/spacing);
    const fitAt=frequency=>{try{const c=leastSquares(xs.map(x=>[1,Math.sin(frequency*x),Math.cos(frequency*x)]),ys,weights);return {frequency,c,error:rows.reduce((sum,[x,y,w])=>sum+w*(y-c[0]-c[1]*Math.sin(frequency*x)-c[2]*Math.cos(frequency*x))**2,0)};}catch{return {frequency,error:Infinity};}};
    let best;const steps=200,delta=(maxFrequency-minFrequency)/steps;
    for(let i=0;i<=steps;i++){const current=fitAt(minFrequency+i*delta);if(!best||current.error<best.error)best=current;}
    let lo=Math.max(minFrequency,best.frequency-delta),hi=Math.min(maxFrequency,best.frequency+delta);for(let i=0;i<80;i++){const a=lo+(hi-lo)/3,b=hi-(hi-lo)/3;if(fitAt(a).error<fitAt(b).error)hi=b;else lo=a;}
    best=fitAt((lo+hi)/2);assert(best.c,'正弦回归未收敛');const [d,u,v]=best.c,a=Math.hypot(u,v),b=best.frequency,c=Math.atan2(v,u);coefficients=[a,b,c,d];parameters=4;predict=x=>a*Math.sin(b*x+c)+d;formula=`(${a})*sin((${b})*x+(${c}))+(${d})`;
  }else {
    assert(rows.length>=4&&ys.every(y=>y>0),'Logistic 回归需要至少四个正 y 值');
    const maximum=Math.max(...ys),span=Math.max(...xs)-Math.min(...xs);let best;
    // For fixed positive C>max(y), log(C/y-1)=log(a)-b*x is linear.
    // Optimize C over a logarithmic grid then a bounded golden-section search.
    const fitAt=logExcess=>{const C=maximum+Math.exp(logExcess);try{const tr=rows.map(([x,y,w])=>[x,Math.log(C/y-1),w]),t=cgSummary(tr,true),b=-t.sxy/t.sxx,a=Math.exp(t.meanY+b*t.mean),predict=x=>C/(1+a*Math.exp(Math.max(-700,Math.min(700,-b*x))));return {C,a,b,error:rows.reduce((sum,[x,y,w])=>sum+w*(y-predict(x))**2,0)};}catch{return {error:Infinity};}};
    const loBound=Math.log(Math.max(1e-12,maximum*1e-9)),hiBound=Math.log(maximum*1e5);let bestLog=loBound;const step=(hiBound-loBound)/150;
    for(let i=0;i<=150;i++){const at=loBound+i*step,current=fitAt(at);if(!best||current.error<best.error){best=current;bestLog=at;}}
    let lo=Math.max(loBound,bestLog-step),hi=Math.min(hiBound,bestLog+step);for(let i=0;i<100;i++){const a=lo+(hi-lo)/3,b=hi-(hi-lo)/3;if(fitAt(a).error<fitAt(b).error)hi=b;else lo=a;}best=fitAt((lo+hi)/2);assert(finite(best.a)&&finite(best.b)&&finite(best.C),'Logistic 回归未收敛');
    coefficients=[best.a,best.b,best.C];parameters=3;predict=x=>best.C/(1+best.a*Math.exp(Math.max(-700,Math.min(700,-best.b*x))));formula=`(${best.C})/(1+(${best.a})*exp(-(${best.b})*x))`;
  }
  const residuals=rows.map(([x,y])=>y-predict(x)),SSE=rows.reduce((sum,r,i)=>sum+r[2]*residuals[i]**2,0),r=transformedR??(s.syy>0&&s.sxx>0?s.sxy/Math.sqrt(s.sxx*s.syy):NaN),r2=transformedR===undefined?(s.syy>0?1-SSE/s.syy:NaN):transformedR**2;
  return {type,coefficients,formula,predict,n:s.n,r,r2,SSE,MSE:s.n>parameters?SSE/(s.n-parameters):NaN,residuals};
}
