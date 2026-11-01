// fx-CG50 Software 3.00: 6-51–6-72, 8-41–8-48. Menu abbreviations
// (InvN, Invt, InvF, etc.) are not invented function spellings.
import {assert,math} from './calculator.js';
import {cgDistribution,cgChiSquareTail,cgFTail,cgHypothesisTest,cgSummary,cgRegression} from './cg-statistics.js';

const real=value=>typeof value==='number'&&Number.isFinite(value)&&Math.abs(value)<1e100;
const object=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
const clone=value=>Array.isArray(value)?value.map(clone):value;
const registerDefinitions=[
 ['p','p'],['z','z'],['t','t'],['χ²','chi2'],['F','F'],['p̂','pHat'],['p̂1','pHat1'],['p̂2','pHat2'],
 ['x̄','mean'],['x̄1','mean1'],['x̄2','mean2'],['sx','sx'],['sx1','sx1'],['sx2','sx2'],['sp','sp'],['n','n'],['n1','n1'],['n2','n2'],['df','df'],['a','a'],['b','b'],['s','s'],['r','r'],['r²','r2'],
 ['Lower','Lower'],['Upper','Upper'],['zLow','zLow'],['zUp','zUp'],['tLow','tLow'],['tUp','tUp'],['x1InvN','x1InvN'],['x2InvN','x2InvN'],['xInv','xInv'],
 ['Σx','sumX'],['Σx²','sumSquaresX'],['σx','populationSDX'],['minX','minX'],['maxX','maxX'],
 ['ȳ','meanY'],['Σy','sumY'],['Σy²','sumSquaresY'],['Σxy','sumXY'],['σy','populationSDY'],['sy','sy'],['minY','minY'],['maxY','maxY'],
 ['c','c'],['d','d'],['e','e'],['Q1','Q1'],['Q3','Q3'],['Med','Med'],['Mod','Mod'],['Mod:n','modeCount'],['Mod:F','modeFrequency'],['Start','H_Start'],['Pitch','H_pitch'],
 ['x1','x1'],['y1','y1'],['x2','x2'],['y2','y2'],['x3','x3'],['y3','y3'],['se','se'],
 ['Adf','Adf'],['SSa','SSa'],['MSa','MSa'],['Fa','Fa'],['pa','pa'],['Bdf','Bdf'],['SSb','SSb'],['MSb','MSb'],['Fb','Fb'],['pb','pb'],['ABdf','ABdf'],['SSab','SSab'],['MSab','MSab'],['Fab','Fab'],['pab','pab'],['Edf','Edf'],['SSe','SSe'],['MSe','MSe'],
];
export const CG_STATISTICAL_VARIABLES=Object.freeze(registerDefinitions.map(([name,key])=>Object.freeze({name,key,parserName:'CGStat_'+key,defaultValue:0})));
const registerKeys=new Set(CG_STATISTICAL_VARIABLES.map(spec=>spec.key));
const definitions=[
 ['NormPD',['x','σ','μ'],1,3,['x'],{σ:1,μ:0},['p']],
 ['NormCD',['Lower','Upper','σ','μ'],2,4,['Lower','Upper'],{σ:1,μ:0},['p','zLow','zUp']],
 ['InvNormCD',['tail','p','σ','μ'],1,4,['p'],{tail:'L',σ:1,μ:0},['x1InvN','x2InvN']],
 ['tPD',['x','df'],2,2,['x'],{},['p']],['tCD',['Lower','Upper','df'],3,3,['Lower','Upper'],{},['p','tLow','tUp']],['InvTCD',['p','df'],2,2,['p'],{},['xInv']],
 ['ChiPD',['x','df'],2,2,['x'],{},['p']],['ChiCD',['Lower','Upper','df'],3,3,['Lower','Upper'],{},['p']],['InvChiCD',['p','df'],2,2,['p'],{},['xInv']],
 ['FPD',['x','ndf','ddf'],3,3,['x'],{},['p']],['FCD',['Lower','Upper','ndf','ddf'],4,4,['Lower','Upper'],{},['p']],['InvFCD',['p','ndf','ddf'],3,3,['p'],{},['xInv']],
 ['BinomialPD',['x','n','P'],2,3,['x'],{},['p']],['BinomialCD',['Lower','Upper','n','P'],2,4,['Lower','Upper'],{},['p']],['InvBinomialCD',['p','n','P'],3,3,['p'],{},['xInv']],
 ['PoissonPD',['x','λ'],2,2,['x'],{},['p']],['PoissonCD',['Lower','Upper','λ'],2,3,['Lower','Upper'],{},['p']],['InvPoissonCD',['p','λ'],2,2,['p'],{},['xInv']],
 ['GeoPD',['x','P'],2,2,['x'],{},['p']],['GeoCD',['Lower','Upper','P'],2,3,['Lower','Upper'],{},['p']],['InvGeoCD',['p','P'],2,2,['p'],{},['xInv']],
 ['HypergeoPD',['x','n','M','N'],4,4,['x'],{},['p']],['HypergeoCD',['Lower','Upper','n','M','N'],4,5,['Lower','Upper'],{},['p']],['InvHypergeoCD',['p','n','M','N'],4,4,['p'],{},['xInv']],
];
const additionalDefinitions=[
 {name:'StdDev',parserName:'StdDev',args:['List','Freq'],minArgs:1,maxArgs:2,family:'dispersion'},
 {name:'StdDev_σ',parserName:'StdDev_sigma',args:['List','Freq'],minArgs:1,maxArgs:2,family:'dispersion'},
 {name:'Variance',parserName:'Variance',args:['List','Freq'],minArgs:1,maxArgs:2,family:'dispersion'},
 {name:'Variance_σ²',parserName:'Variance_sigma2',args:['List','Freq'],minArgs:1,maxArgs:2,family:'dispersion'},
 {name:'x̂',parserName:'CGStat_xhat',args:['y'],minArgs:1,maxArgs:1,family:'estimate',syntax:'postfix'},
 {name:'ŷ',parserName:'CGStat_yhat',args:['x'],minArgs:1,maxArgs:1,family:'estimate',syntax:'postfix'},
];
export const CG_STATISTICAL_FUNCTIONS=Object.freeze([...definitions.map(([name,args,minArgs,maxArgs,listArguments,defaults,registers])=>Object.freeze({name,parserName:name,family:'distribution',args:Object.freeze(args),minArgs,maxArgs,listArguments:Object.freeze(listArguments),defaults:Object.freeze(defaults),registers:Object.freeze(registers),...(name==='InvTCD'||name==='InvChiCD'||name==='InvFCD'?{tail:'right'}:{})})),...additionalDefinitions.map(spec=>Object.freeze({...spec,args:Object.freeze(spec.args),listArguments:Object.freeze([]),registers:Object.freeze([]),defaults:Object.freeze({})}))]);
export const CG_STATISTICAL_FUNCTION_NAMES=Object.freeze(CG_STATISTICAL_FUNCTIONS.map(spec=>spec.parserName));
export const CG_STATISTICAL_COMMANDS=Object.freeze([
 ['OneSampleZTest',['condition','μ0','σ','mean','n'],['z','p','mean','n']],['TwoSampleZTest',['condition','σ1','σ2','mean1','n1','mean2','n2'],['z','p','mean1','mean2','n1','n2']],
 ['OnePropZTest',['condition','p0','x','n'],['z','p','pHat','n']],['TwoPropZTest',['condition','x1','n1','x2','n2'],['z','p','pHat1','pHat2','pHat','n1','n2']],
 ['OneSampleTTest',['condition','μ0','mean','sx','n'],['t','p','mean','sx','n']],['TwoSampleTTest',['condition','mean1','sx1','n1','mean2','sx2','n2','pooled'],['t','p','df','mean1','mean2','sx1','sx2','n1','n2']],
 ['LinRegTTest',['condition','XList','YList','Freq'],['t','p','df','a','b','s','r','r2']],['ChiGOFTest',['Observed','Expected','df','CNTRB'],['chi2','p','df']],['ChiTest',['Observed','ExpectedTarget'],['chi2','p','df']],
 ['TwoSampleFTest',['condition','sx1','n1','sx2','n2'],['F','p','sx1','sx2','n1','n2']],['OneWayANOVA',['Factor','Dependent'],['Adf','SSa','MSa','Fa','pa','Edf','SSe','MSe']],
 ['TwoWayANOVA',['FactorA','FactorB','Dependent'],['Adf','SSa','MSa','Fa','pa','Bdf','SSb','MSb','Fb','pb','ABdf','SSab','MSab','Fab','pab','Edf','SSe','MSe']],
].map(([name,args,registers])=>Object.freeze({name,args:Object.freeze(args),registers:Object.freeze(registers),syntax:'statement'})));

export function normalizeCGStatisticalExpression(source){
 assert(typeof source==='string','Statistical expression must be text');
 const normalized=source.split(/("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/g).map((part,index)=>index%2?part:part
  .replace(/\bStdDev_σ(?=\s*\()/g,'StdDev_sigma').replace(/\bVariance_(?:σ[²2]|sigma\s*\^\s*2)(?=\s*\()/g,'Variance_sigma2')
  .replace(/\bInvHyperGeoCD(?=\s*\()/g,'InvHypergeoCD')
  .replace(/Σx²|Σy²|Σxy|Σx|Σy|σx|σy/g,name=>({Σx:'CGStat_sumX',Σy:'CGStat_sumY','Σx²':'CGStat_sumSquaresX','Σy²':'CGStat_sumSquaresY',Σxy:'CGStat_sumXY',σx:'CGStat_populationSDX',σy:'CGStat_populationSDY'})[name])
  .replace(/χ²|χ2/g,'CGStat_chi2').replace(/p̂([12])?/g,(_,n)=>'CGStat_pHat'+(n||'')).replace(/x̄([12])?/g,(_,n)=>'CGStat_mean'+(n||'')).replace(/ȳ/g,'CGStat_meanY')
  .replace(/\b(x1InvN|x2InvN|xInv|[zZ]Low|[zZ]Up|tLow|tUp|Lower|Upper|Adf|Bdf|ABdf|SSa|SSb|SSab|MSa|MSb|MSab|Fa|Fb|Fab|pa|pb|pab|Edf|SSe|MSe|minX|maxX|minY|maxY|Q1|Q3|Med|Mod|H_Start|H_pitch|x1|y1|x2|y2|x3|y3)\b(?!\s*\()/g,name=>'CGStat_'+(name[0]==='Z'?'z'+name.slice(1):name))).join('');
 return normalizeEstimates(normalized);
}
function quoteMask(text){const mask=new Uint8Array(text.length);let quote='';for(let i=0;i<text.length;i++){const c=text[i];if(quote){mask[i]=1;if(c==='\\'){if(i+1<text.length)mask[++i]=1;}else if(c===quote)quote='';}else if(c==='"'||c==="'"){quote=c;mask[i]=1;}}return mask;}
function normalizeEstimates(text){
 const pattern=/x-hat|y-hat|x̂|ŷ|ŷ/g;let match;
 while((match=pattern.exec(text))){const mask=quoteMask(text);if(mask[match.index])continue;let end=match.index;while(end>0&&/\s/.test(text[end-1]))end--;assert(end>0,'Estimated-value operator requires a left operand');let start=end-1;
  if(text[start]===')'||text[start]===']'){const close=text[start],open=close===')'?'(':'[';let depth=0;for(;start>=0;start--){if(mask[start])continue;if(text[start]===close)depth++;if(text[start]===open&&--depth===0)break;}assert(start>=0,'Unmatched estimated-value operand');if(open==='('){const functionName=/[A-Za-z_][A-Za-z0-9_]*$/.exec(text.slice(0,start));if(functionName)start-=functionName[0].length;}}
  else{const atom=/(?:[\p{L}_][\p{L}\p{N}\p{M}_]*|(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)$/u.exec(text.slice(0,end));assert(atom,'Estimated-value operator requires a scalar operand');start=end-atom[0].length;}
  let previous=start-1;while(previous>=0&&/\s/.test(text[previous]))previous--;if(previous>=0&&'+-−'.includes(text[previous])){let before=previous-1;while(before>=0&&/\s/.test(text[before]))before--;if(before<0||'([,+-−*/×÷^'.includes(text[before]))start=previous;}
  const fn=match[0].startsWith('x')?'CGStat_xhat':'CGStat_yhat',replacement=fn+'('+text.slice(start,end)+')';text=text.slice(0,start)+replacement+text.slice(match.index+match[0].length);pattern.lastIndex=start+replacement.length;
 }
 return text;
}
function checkedReal(value){if(value&&typeof value==='object'&&real(value.re)&&value.im===0)return value.re;assert(real(value),'Domain ERROR: statistical arguments must be finite real numbers');return value;}
function list(value){const data=math.isMatrix(value)?value.toArray():value;assert(Array.isArray(data)&&data.length>0&&data.length<=999&&!data.some(Array.isArray),'Dimension ERROR: list must contain 1–999 values');return data.map(checkedReal);}
function numeric(value){return Array.isArray(value)||math.isMatrix(value)?list(value):checkedReal(value);}
function validStored(value){return real(value)||Array.isArray(value)&&value.length<=999&&value.every(real);}
const regressionTypes=['linear','ax+b','medmed','quadratic','cubic','quartic','log','exp','abexp','power','sin','logistic'];
function sanitizeRegression(value){const r=object(value);if(!regressionTypes.includes(r.type)||!Array.isArray(r.coefficients)||!r.coefficients.length||r.coefficients.length>5||!r.coefficients.every(real))return undefined;const out={type:r.type,coefficients:r.coefficients.slice()};if(r.rows!==undefined){if(!Array.isArray(r.rows)||!r.rows.length||r.rows.length>999||!r.rows.every(row=>Array.isArray(row)&&row.length===3&&row.every(real)&&row[2]>=0))return undefined;out.rows=r.rows.map(row=>row.slice());}return out;}
export function sanitizeCGStatisticalNative(value={}){
 const source=object(object(value).registers),regression=sanitizeRegression(object(value).regression);return {registers:Object.fromEntries(Object.entries(source).filter(([key,value])=>registerKeys.has(key)&&validStored(value)).map(([key,value])=>[key,clone(value)])),...(regression?{regression}:{})};
}
export function snapshotCGStatisticalNative(calculator){return sanitizeCGStatisticalNative({registers:calculator?.statisticalMemory,regression:calculator?.statisticalRegression});}
export function commitCGStatisticalRegisters(calculator,updates,{answer,answerKind}={}){
 assert(calculator&&typeof calculator==='object','Statistical functions require a calculator');assert(Object.entries(updates).every(([key,value])=>registerKeys.has(key)&&validStored(value)),'Statistical result exceeds numerical range');
 const registers={...sanitizeCGStatisticalNative({registers:calculator.statisticalMemory}).registers,...Object.fromEntries(Object.entries(updates).map(([key,value])=>[key,clone(value)]))};
 if(answer!==undefined){const data=math.isMatrix(answer)?answer.toArray():answer;if(Array.isArray(data)){assert(data.length<=999&&data.flat().every(real),'Statistical answer exceeds numerical range');calculator.nativeAnswers={...(calculator.nativeAnswers||{}),[answerKind==='matrix'?'matrix':'list']:clone(data)};}else{assert(real(data),'Statistical answer exceeds numerical range');calculator.vars={...(calculator.vars||{}),Ans:data};}}
 calculator.statisticalMemory=registers;return updates;
}
function nativeRightInverse(kind,p,parameters){
 assert(real(p)&&p>0&&p<1,'Domain ERROR: inverse continuous probability must satisfy 0 < p < 1');
 if(kind==='t')return -cgDistribution('t','inverse',{...parameters,p});
 const tail=kind==='chi2'?x=>cgChiSquareTail(x,parameters.df):x=>cgFTail(x,parameters.df1,parameters.df2);let lo=0,hi=1;while(tail(hi)>p){lo=hi;hi*=2;assert(real(hi),'Inverse result exceeds numerical range');}for(let i=0;i<300;i++){const mid=lo/2+hi/2;if(tail(mid)>p)lo=mid;else hi=mid;}return lo/2+hi/2;
}
function parseFunction(name,input){
 const args=[...input];let kind,operation,parameters={},allowed=[],all=false;
 if(name.startsWith('Norm')||name==='InvNormCD'){
  kind='normal';operation=name==='NormPD'?'pdf':name==='NormCD'?'cdf':'inverse';
  if(operation==='pdf'){parameters={x:args[0],sigma:args[1]??1,mu:args[2]??0};allowed=['x'];}
  else if(operation==='cdf'){parameters={lower:args[0],upper:args[1],sigma:args[2]??1,mu:args[3]??0};allowed=['lower','upper'];}
  else {let tail='L';if(typeof args[0]==='string'||args.length>=2&&[-1,0,1].includes(args[0])){tail=args.shift();tail=({'-1':'L','0':'C','1':'R'}[String(tail)]||String(tail).toUpperCase());}assert(['L','R','C'].includes(tail)&&args.length>=1&&args.length<=3,'InvNormCD: invalid tail or argument count');parameters={p:args[0],sigma:args[1]??1,mu:args[2]??0,tail};allowed=['p'];}
 }else{
  const inverse=name.startsWith('Inv'),base=name.replace(/^Inv/,'').replace(/(?:PD|CD)$/,'');kind=({t:'t',T:'t',Chi:'chi2',F:'F',Binomial:'binomial',Poisson:'poisson',Geo:'geometric',Hypergeo:'hypergeometric'})[base];operation=inverse?'inverse':name.endsWith('PD')?'pdf':'cdf';assert(kind,'Statistical function is unavailable');
  const count={t:1,chi2:1,F:2,binomial:2,poisson:1,geometric:1,hypergeometric:3}[kind],specific=args.slice(-count),data=args.slice(0,args.length-count);
  parameters=kind==='t'||kind==='chi2'?{df:specific[0]}:kind==='F'?{df1:specific[0],df2:specific[1]}:kind==='binomial'?{n:specific[0],probability:specific[1]}:kind==='poisson'?{lambda:specific[0]}:kind==='geometric'?{probability:specific[0]}:{draws:specific[0],successes:specific[1],population:specific[2]};
  if(operation==='inverse'){assert(data.length===1,'Inverse function requires a probability');parameters.p=data[0];allowed=['p'];}
  else if(operation==='pdf'){if(!data.length&&kind==='binomial')all=true;else{assert(data.length===1,'Probability density requires x');parameters.x=data[0];allowed=['x'];}}
  else {const continuous=['t','chi2','F'].includes(kind);if(!data.length&&kind==='binomial')all=true;else{assert(data.length===(continuous?2:1)||!continuous&&data.length===2,'Cumulative function requires lower/upper limits');parameters.lower=data.length===2?data[0]:kind==='geometric'?1:0;parameters.upper=data.at(-1);allowed=['lower','upper'];}}
 }
 for(const [key,value]of Object.entries(parameters))if(key!=='tail')parameters[key]=allowed.includes(key)?numeric(value):checkedReal(value);
 if(kind==='F')assert(Number.isInteger(parameters.df1)&&parameters.df1>0&&Number.isInteger(parameters.df2)&&parameters.df2>0,'Domain ERROR: numerator/denominator df must be positive integers');
 if(all){assert(Number.isInteger(parameters.n)&&parameters.n>=0&&parameters.n<=998,'List Memory Full: all binomial values require n + 1 ≤ 999');parameters.x=Array.from({length:parameters.n+1},(_,i)=>i);if(operation==='cdf'){parameters.lower=0;parameters.upper=parameters.x;delete parameters.x;allowed=['lower','upper'];}else allowed=['x'];}
 return {kind,operation,parameters,allowed};
}
function predictionModel(regression){
 assert(regression&&['linear','ax+b','log','exp','abexp','power'].includes(regression.type),'Domain ERROR: estimates require linear, logarithmic, exponential or power regression');if(regression.rows){const fit=cgRegression(regression.rows,regression.type),originX=cgSummary(regression.rows).mean;return {...fit,originX,originY:fit.predict(originX)};}const c=regression.coefficients,type=regression.type;return {type,coefficients:c,predict:x=>type==='linear'||type==='ax+b'?c[0]+c[1]*x:type==='log'?c[0]+c[1]*Math.log(x):type==='exp'?c[0]*Math.exp(c[1]*x):type==='abexp'?c[0]*c[1]**x:c[0]*x**c[1]};
}
export function evaluateCGStatisticalFunction(name,args,{regression,model}={}){
 const spec=CG_STATISTICAL_FUNCTIONS.find(spec=>spec.name===name||spec.parserName===name);assert(spec,'Statistical function is unavailable');assert(Array.isArray(args)&&args.length>=spec.minArgs&&args.length<=spec.maxArgs,`${name}: ${spec.minArgs}–${spec.maxArgs} arguments required`);
 if(spec.family==='dispersion'){if(args.length===2)assert(isList(args[1]),'Frequency argument must be a list');const values=list(args[0]),weights=frequency(values,args[1]),summary=cgSummary(values.map((x,i)=>[x,0,weights[i]])),value=spec.parserName==='StdDev'?summary.sd:spec.parserName==='StdDev_sigma'?summary.populationSD:spec.parserName==='Variance'?summary.variance:summary.sxx/summary.n;assert(real(value),'Domain ERROR: sample variance requires total frequency > 1');return {value,registers:{},answerKind:'scalar'};}
 if(spec.family==='estimate'){const fitted=model||predictionModel(regression),input=checkedReal(args[0]),c=fitted.coefficients,type=fitted.type;let value;if(spec.parserName==='CGStat_yhat')value=fitted.predict(input);else if(type==='linear'||type==='ax+b')value=fitted.originX===undefined?(input-c[0])/c[1]:fitted.originX+(input-fitted.originY)/c[1];else if(type==='log')value=Math.exp((input-c[0])/c[1]);else if(type==='exp')value=Math.log(input/c[0])/c[1];else if(type==='abexp')value=Math.log(input/c[0])/Math.log(c[1]);else{assert(input/c[0]>0,'Domain ERROR: inverse power estimate requires positive y/a');value=(input/c[0])**(1/c[1]);}assert(real(value)&&(!['log','power'].includes(type)||spec.parserName==='CGStat_yhat'?(!['log','power'].includes(type)||input>0):(!['log','power'].includes(type)||value>0)),'Domain ERROR: regression estimate is outside the real model domain');return {value,registers:{},answerKind:'scalar'};}
 const {kind,operation,parameters,allowed}=parseFunction(name,args),arrays=allowed.filter(key=>Array.isArray(parameters[key])),length=arrays.length?parameters[arrays[0]].length:1;assert(arrays.every(key=>parameters[key].length===length),'Dimension ERROR: lists must have the same length');const rows=[];
 for(let i=0;i<length;i++){
  const p={...parameters};for(const key of arrays)p[key]=p[key][i];let value,registers={};
  if(operation==='inverse'&&kind==='normal'){
   const probability=p.p;assert(probability>0&&probability<1,'Domain ERROR: normal inverse probability must satisfy 0 < p < 1');
   if(p.tail==='C'){value=cgDistribution('normal','inverse',{...p,p:(1-probability)/2});const upper=2*p.mu-value;registers={x1InvN:value,x2InvN:upper};}
   else{value=cgDistribution('normal','inverse',p);if(p.tail==='R')value=2*p.mu-value;registers={x1InvN:value};}
  }else{
   value=operation==='inverse'&&['t','chi2','F'].includes(kind)?nativeRightInverse(kind,p.p,p):cgDistribution(kind,operation,p);registers={[operation==='inverse'?'xInv':'p']:value};
   if(operation==='cdf'&&kind==='normal')Object.assign(registers,{zLow:(p.lower-p.mu)/p.sigma,zUp:(p.upper-p.mu)/p.sigma});
   if(operation==='cdf'&&kind==='t')Object.assign(registers,{tLow:p.lower,tUp:p.upper});
  }
  assert(real(value)&&Object.values(registers).every(real),'Statistical result exceeds numerical range');rows.push({value,registers});
 }
 return {value:arrays.length?rows.map(row=>row.value):rows[0].value,registers:Object.fromEntries(Object.keys(rows[0].registers).map(key=>[key,arrays.length?rows.map(row=>row.registers[key]):rows[0].registers[key]])),answerKind:arrays.length?'list':'scalar'};
}
export function createCGStatisticalScope(calculator){
 const scope={};for(const spec of CG_STATISTICAL_FUNCTIONS)scope[spec.parserName]=(...args)=>{let options;if(spec.family==='estimate'){const regression=calculator.statisticalRegression,cache=calculator._statisticalEstimateCache;if(!cache||cache.source!==regression)calculator._statisticalEstimateCache={source:regression,model:predictionModel(regression)};options={regression,model:calculator._statisticalEstimateCache.model};}const result=evaluateCGStatisticalFunction(spec.name,args,options);commitCGStatisticalRegisters(calculator,result.registers,{answer:result.value,answerKind:result.answerKind});return result.value;};
 for(const spec of CG_STATISTICAL_VARIABLES)Object.defineProperty(scope,spec.parserName,{enumerable:true,get:()=>{const value=calculator.statisticalMemory?.[spec.key];return validStored(value)?clone(value):spec.defaultValue;}});return scope;
}
function summaryRegisters(summary){
 const mapping={n:'n',mean:'mean',sum:'sumX',sumSquares:'sumSquaresX',populationSD:'populationSDX',sd:'sx',min:'minX',max:'maxX',meanY:'meanY',sumY:'sumY',sumSquaresY:'sumSquaresY',sumXY:'sumXY',populationSDY:'populationSDY',sdY:'sy',minY:'minY',maxY:'maxY',Q1:'Q1',Q3:'Q3',median:'Med',modeCount:'modeCount',modeFrequency:'modeFrequency'},updates={};
 for(const [source,key]of Object.entries(mapping))if(real(summary[source]))updates[key]=summary[source];if(Array.isArray(summary.modes)&&summary.modes.length&&summary.modes.every(real))updates.Mod=summary.modes.length===1?summary.modes[0]:summary.modes.slice();return updates;
}
export function recordCGStatisticalSummary(calculator,summary,{histogramStart,histogramPitch}={}){
 const updates=summaryRegisters(summary);if(real(histogramStart))updates.H_Start=histogramStart;if(real(histogramPitch))updates.H_pitch=histogramPitch;commitCGStatisticalRegisters(calculator,updates);return updates;
}
/** Native coefficient letters follow the selected formula, never the helper's internal array order. */
export function recordCGStatisticalRegression(calculator,fit,rows,{quartile='Std'}={}){
 assert(fit&&Array.isArray(fit.coefficients)&&fit.coefficients.every(real),'Regression coefficients must be finite');const summary=cgSummary(rows,true,quartile),updates=summaryRegisters(summary),type=fit.type,coefficients=fit.coefficients;
 const native=['ax+b','medmed','quadratic','cubic','quartic'].includes(type)?coefficients.slice().reverse():coefficients.slice();native.slice(0,5).forEach((value,i)=>updates[String.fromCharCode(97+i)]=value);
 if(['linear','ax+b','log','exp','abexp','power'].includes(type)&&real(fit.r))updates.r=fit.r;if(!['medmed','sin','logistic'].includes(type)&&real(fit.r2))updates.r2=fit.r2;
 if(type!=='medmed'){
  const nativeMSe=['exp','abexp','power'].includes(type)&&summary.n>2?rows.reduce((sum,[x,y,w=1])=>sum+w*(Math.log(y)-Math.log(fit.predict(x)))**2,0)/(summary.n-2):['sin','logistic'].includes(type)&&summary.n>2?fit.SSE/(summary.n-2):fit.MSE;if(real(nativeMSe))updates.MSe=nativeMSe;
 }
 if(type==='medmed'){
  const sorted=rows.filter(row=>(row[2]??1)>0).map(row=>[row[0],row[1],row[2]??1]).sort((a,b)=>a[0]-b[0]),n=summary.n,outer=Number.isInteger(n)?Math.floor(n/3)+(n%3===2?1:0):n/3,cuts=[0,outer,n-outer,n];
  for(let group=0;group<3;group++){let offset=0;const values=[];for(const [x,y,w]of sorted){const portion=Math.max(0,Math.min(offset+w,cuts[group+1])-Math.max(offset,cuts[group]));if(portion)values.push([x,y,portion]);offset+=w;}updates['x'+(group+1)]=cgSummary(values).median;updates['y'+(group+1)]=cgSummary(values.map(([x,y,w])=>[y,0,w])).median;}
 }
 commitCGStatisticalRegisters(calculator,updates);calculator.statisticalRegression={type:fit.type,coefficients:fit.coefficients.slice(),rows:rows.map(row=>[row[0],row[1],row[2]??1])};return updates;
}
export function recordCGStatisticalInference(calculator,type,parameters,result,{interval=false}={}){
 const p=parameters,r=result,updates={};
 if(interval){updates.Lower=r.lower;updates.Upper=r.upper;}else{const key={oneZ:'z',twoZ:'z',oneProp:'z',twoProp:'z',oneT:'t',twoT:'t',linearT:'t',twoF:'F',chiGOF:'chi2',chi2way:'chi2'}[type];if(key&&real(r.statistic))updates[key]=r.statistic;if(key&&real(r.p))updates.p=r.p;}
 for(const suffix of ['','1','2']){
  const source=p['sample'+suffix],sample=Array.isArray(source)?sampleSummary(source):{mean:p['mean'+suffix]??r['mean'+suffix],sd:p['sd'+suffix]??r['sd'+suffix],n:p['n'+suffix]??r['n'+suffix]};
  for(const [field,key]of [['mean','mean'+suffix],['sd',suffix?'sx'+suffix:'sx'],['n','n'+suffix]])if(real(sample[field]))updates[key]=sample[field];
 }
 for(const key of ['df'])if(real(r[key]))updates[key]=r[key];if(real(r.estimate)&&['oneProp'].includes(type))updates.pHat=r.estimate;if(real(r.estimate1))updates.pHat1=r.estimate1;if(real(r.estimate2))updates.pHat2=r.estimate2;if(type==='twoProp'&&real(r.pooled))updates.pHat=r.pooled;
 if(interval&&type==='oneProp')updates.pHat=p.x/p.n;if(interval&&type==='twoProp'){updates.pHat1=p.x1/p.n1;updates.pHat2=p.x2/p.n2;}
 if(type==='twoT'&&p.pooled===true){const a=Array.isArray(p.sample1)?sampleSummary(p.sample1):{sd:p.sd1,n:p.n1},b=Array.isArray(p.sample2)?sampleSummary(p.sample2):{sd:p.sd2,n:p.n2};updates.sp=Math.sqrt(((a.n-1)*a.sd**2+(b.n-1)*b.sd**2)/(a.n+b.n-2));}
 if(type==='linearT'){updates.a=r.intercept;updates.b=r.slope;if(real(r.r)){updates.r=r.r;updates.r2=r.r**2;}if(real(r.se)){const summary=cgSummary(p.rows,true);updates.s=r.se*Math.sqrt(summary.sxx);updates.se=updates.s;}}
 if(type==='anova1')Object.assign(updates,{Adf:r.df1,SSa:r.SSbetween,MSa:r.MSbetween,Fa:r.statistic,pa:r.p,Edf:r.df2,SSe:r.SSerror,MSe:r.MSerror});
 if(type==='anova2'){Object.assign(updates,{Adf:r.dfA,SSa:r.SSA,MSa:r.SSA/r.dfA,Fa:r.FA,pa:r.pA,Bdf:r.dfB,SSb:r.SSB,MSb:r.SSB/r.dfB,Fb:r.FB,pb:r.pB,Edf:r.dfE,SSe:r.SSE,MSe:r.MSE});if(r.dfAB!==undefined)Object.assign(updates,{ABdf:r.dfAB,SSab:r.SSAB,MSab:r.SSAB/r.dfAB,Fab:r.FAB,pab:r.pAB});}
 const finiteUpdates=Object.fromEntries(Object.entries(updates).filter(([,value])=>real(value)));commitCGStatisticalRegisters(calculator,finiteUpdates);return finiteUpdates;
}

const isList=value=>Array.isArray(value)||math.isMatrix(value);
function condition(value){const tail=({'-1':'<','0':'!=','1':'>','≠':'!=','!=':'!=','<':'<','>':'>'})[String(value)];assert(tail,'Condition ERROR: test condition must be <, ≠, > or −1, 0, 1');return tail;}
function frequency(values,freq=1){if(isList(freq)){const weights=list(freq);assert(weights.length===values.length&&weights.every(value=>value>=0),'Dimension/Domain ERROR: frequency list must match nonnegative data weights');return weights;}assert(freq===1,'Frequency must be 1 or a list');return values.map(()=>1);}
function sampleSummary(value,freq=1){const values=list(value),weights=frequency(values,freq),summary=cgSummary(values.map((x,i)=>[x,0,weights[i]]));return {mean:summary.mean,sd:summary.sd,n:summary.n};}
function checkedSample(mean,sd,n){return {mean:checkedReal(mean),...(sd===undefined?{}:{sd:checkedReal(sd)}),n:checkedReal(n)};}
function packed(keys,values,writes=[]){assert(keys.length===values.length&&values.every(real),'Domain ERROR: statistical result exceeds numerical range');return {value:values.slice(),registers:Object.fromEntries(keys.map((key,i)=>[key,values[i]])),answerKind:'list',writes};}
function pooled(value=0){assert(value===0||value===1,'Pooled condition must be 0 or 1');return value===1;}
function count(args,min,max=min){assert(args.length>=min&&args.length<=max,'Argument ERROR: wrong number of test parameters');}
function realMatrix(value){const data=math.isMatrix(value)?value.toArray():value;assert(Array.isArray(data)&&data.length>=2&&Array.isArray(data[0])&&data[0].length>=2&&data.every(row=>Array.isArray(row)&&row.length===data[0].length),'Dimension ERROR: observed matrix must be rectangular and at least 2×2');return data.map(row=>row.map(checkedReal));}
function listTarget(value){const target=typeof value==='string'?Number(/^List\s*(\d{1,2})$/.exec(value)?.[1]):value;assert(Number.isInteger(target)&&target>=1&&target<=26,'CNTRB destination must be List 1–26');return target;}
function matrixTarget(value){const match=/^Mat\s*([A-Z])$/.exec(String(value));assert(match,'Expected-matrix destination must be Mat A–Z');return 'Mat'+match[1];}
/** Pure TEST statement adapter. Callers transactionally apply writes and then commit registers/answer. */
export function evaluateCGStatisticalCommand(name,args){
 assert(CG_STATISTICAL_COMMANDS.some(spec=>spec.name===name)&&Array.isArray(args),'Statistical TEST command is unavailable');
 if(name==='OneSampleZTest'||name==='OneSampleTTest'){
  const z=name==='OneSampleZTest',tail=condition(args[0]),mu0=checkedReal(args[1]),offset=z?3:2,lists=isList(args[offset]);let sample;
  if(lists){count(args,offset+1,offset+2);sample=sampleSummary(args[offset],args[offset+1]);}else{count(args,5);sample=z?checkedSample(args[3],undefined,args[4]):checkedSample(args[2],args[3],args[4]);}
  const result=cgHypothesisTest(z?'oneZ':'oneT',{...sample,mu0,tail,...(z?{sigma:checkedReal(args[2])}:{})});return packed(z&&!lists?['z','p','mean','n']:[z?'z':'t','p','mean','sx','n'],z&&!lists?[result.statistic,result.p,sample.mean,sample.n]:[result.statistic,result.p,sample.mean,sample.sd,sample.n]);
 }
 if(name==='TwoSampleZTest'||name==='TwoSampleTTest'){
  const z=name==='TwoSampleZTest',tail=condition(args[0]),offset=z?3:1,lists=isList(args[offset]);let first,second,usePooled=false;
  if(lists){count(args,offset+2,z?7:6);first=sampleSummary(args[offset],args[offset+2]);second=sampleSummary(args[offset+1],args[offset+3]);if(!z)usePooled=pooled(args[5]);}
  else {count(args,7,z?7:8);first=z?checkedSample(args[3],undefined,args[4]):checkedSample(args[1],args[2],args[3]);second=z?checkedSample(args[5],undefined,args[6]):checkedSample(args[4],args[5],args[6]);if(!z)usePooled=pooled(args[7]);}
  const result=cgHypothesisTest(z?'twoZ':'twoT',{mean1:first.mean,sd1:first.sd,n1:first.n,mean2:second.mean,sd2:second.sd,n2:second.n,tail,pooled:usePooled,...(z?{sigma1:checkedReal(args[1]),sigma2:checkedReal(args[2])}:{})});
  if(z)return packed(lists?['z','p','mean1','mean2','sx1','sx2','n1','n2']:['z','p','mean1','mean2','n1','n2'],lists?[result.statistic,result.p,first.mean,second.mean,first.sd,second.sd,first.n,second.n]:[result.statistic,result.p,first.mean,second.mean,first.n,second.n]);
  const sp=Math.sqrt(((first.n-1)*first.sd**2+(second.n-1)*second.sd**2)/(first.n+second.n-2));return packed(['t','p','df','mean1','mean2','sx1','sx2',...(usePooled?['sp']:[]),'n1','n2'],[result.statistic,result.p,result.df,first.mean,second.mean,first.sd,second.sd,...(usePooled?[sp]:[]),first.n,second.n]);
 }
 if(name==='OnePropZTest'){count(args,4);const tail=condition(args[0]),p0=checkedReal(args[1]),x=checkedReal(args[2]),n=checkedReal(args[3]),result=cgHypothesisTest('oneProp',{tail,p0,x,n});return packed(['z','p','pHat','n'],[result.statistic,result.p,result.estimate,n]);}
 if(name==='TwoPropZTest'){count(args,5);const tail=condition(args[0]),[x1,n1,x2,n2]=args.slice(1).map(checkedReal),result=cgHypothesisTest('twoProp',{tail,x1,n1,x2,n2});return packed(['z','p','pHat1','pHat2','pHat','n1','n2'],[result.statistic,result.p,result.estimate1,result.estimate2,result.pooled,n1,n2]);}
 if(name==='LinRegTTest'){
  count(args,3,4);const tail=condition(args[0]),xs=list(args[1]),ys=list(args[2]);assert(xs.length===ys.length,'Dimension ERROR: paired lists must match');const weights=frequency(xs,args[3]),rows=xs.map((x,i)=>[x,ys[i],weights[i]]),result=cgHypothesisTest('linearT',{tail,rows}),summary=cgSummary(rows,true),output=packed(['t','p','df','a','b','s','r','r2'],[result.statistic,result.p,result.df,result.intercept,result.slope,result.se*Math.sqrt(summary.sxx),result.r,result.r**2]);output.registers.se=output.registers.s;return output;
 }
 if(name==='ChiGOFTest'){
  count(args,4);const observed=list(args[0]),expected=list(args[1]),df=checkedReal(args[2]),target=listTarget(args[3]);assert(Number.isInteger(df)&&df>0,'Domain ERROR: test df must be a positive integer');const result=cgHypothesisTest('chiGOF',{observed,expected,df});return packed(['chi2','p','df'],[result.statistic,result.p,result.df],[{kind:'list',target,value:result.components.slice()}]);
 }
 if(name==='ChiTest'){count(args,2);const table=realMatrix(args[0]),target=matrixTarget(args[1]),result=cgHypothesisTest('chi2way',{table});return packed(['chi2','p','df'],[result.statistic,result.p,result.df],[{kind:'matrix',target,value:clone(result.expected)}]);}
 if(name==='TwoSampleFTest'){
  const tail=condition(args[0]),lists=isList(args[1]);let first,second;if(lists){count(args,3,5);first=sampleSummary(args[1],args[3]);second=sampleSummary(args[2],args[4]);}else{count(args,5);first=checkedSample(0,args[1],args[2]);second=checkedSample(0,args[3],args[4]);}const result=cgHypothesisTest('twoF',{tail,mean1:first.mean,sd1:first.sd,n1:first.n,mean2:second.mean,sd2:second.sd,n2:second.n});return packed(['F','p',...(lists?['mean1','mean2']:[]),'sx1','sx2','n1','n2'],[result.statistic,result.p,...(lists?[first.mean,second.mean]:[]),first.sd,second.sd,first.n,second.n]);
 }
 const two=name==='TwoWayANOVA';count(args,two?3:2);const factors=list(args[0]),dependent=list(args[two?2:1]),factorB=two?list(args[1]):null;assert(factors.length===dependent.length&&(!two||factorB.length===dependent.length),'Dimension ERROR: factor/dependent lists must match');const levels=[...new Set(factors)].sort((a,b)=>a-b);assert(levels.length>=2,'ANOVA requires at least two factor levels');let result,matrix,registers;
 if(!two){const groups=levels.map(level=>dependent.filter((_,i)=>factors[i]===level));result=cgHypothesisTest('anova1',{groups});matrix=[[result.df1,result.SSbetween,result.MSbetween,result.statistic,result.p],[result.df2,result.SSerror,result.MSerror,0,0]];registers={Adf:result.df1,SSa:result.SSbetween,MSa:result.MSbetween,Fa:result.statistic,pa:result.p,Edf:result.df2,SSe:result.SSerror,MSe:result.MSerror};}
 else {const levelsB=[...new Set(factorB)].sort((a,b)=>a-b);assert(levelsB.length>=2,'ANOVA requires at least two factor-B levels');const cells=levels.map(a=>levelsB.map(b=>dependent.filter((_,i)=>factors[i]===a&&factorB[i]===b)));result=cgHypothesisTest('anova2',{cells});registers={Adf:result.dfA,SSa:result.SSA,MSa:result.SSA/result.dfA,Fa:result.FA,pa:result.pA,Bdf:result.dfB,SSb:result.SSB,MSb:result.SSB/result.dfB,Fb:result.FB,pb:result.pB,Edf:result.dfE,SSe:result.SSE,MSe:result.MSE};matrix=[[result.dfA,result.SSA,result.SSA/result.dfA,result.FA,result.pA],[result.dfB,result.SSB,result.SSB/result.dfB,result.FB,result.pB]];if(result.dfAB!==undefined){Object.assign(registers,{ABdf:result.dfAB,SSab:result.SSAB,MSab:result.SSAB/result.dfAB,Fab:result.FAB,pab:result.pAB});matrix.push([result.dfAB,result.SSAB,result.SSAB/result.dfAB,result.FAB,result.pAB]);}matrix.push([result.dfE,result.SSE,result.MSE,0,0]);}
 assert(Object.values(registers).every(real),'Domain ERROR: ANOVA result exceeds numerical range');return {value:matrix,registers,answerKind:'matrix',writes:[]};
}
