import {CalcError,math,normalize} from './calculator.js';
import {readOnlyCalculator} from './read-only-calculator.js';
import {polynomialRoots} from './modes.js';
import {solveReal} from './root-solver.js';
import {cgVariableKey} from '../models/cg-variables.js';
import {createCGArrayScope,createCGVectorScope} from './cg-array-memory.js';
import {createCGFinancialScope} from './cg-financial-functions.js';
import {createCGStatisticalScope} from './cg-statistical-functions.js';
import {createCGGraphVariableScope} from './cg-graph-state.js';

export const CG_NUMERICAL_LIMITS=Object.freeze({source:1500,evaluations:120000,roots:10,polynomialDegree:6,scanSegments:2048,maximum:1e100});
export const CG_NUMERICAL_POLICY=Object.freeze({
  defaultExtremumPrecision:6,
  defaultSolveNRange:Object.freeze([-100,100]),
  defaultRangeIsManufacturerValue:false,
  defaultPrecisionIsManufacturerValue:false,
  extremum:'Finite closed-interval sampling plus refinement of every resolved local candidate and endpoint. Narrow/unresolved extrema can be missed.',
  solveN:'Recognized degree1..6 polynomials use the existing polynomial solver; other functions use a bounded scan, sign brackets and resolved tangent-zero checks. No all-roots certificate is issued.',
  boundedSolve:'Choose the resolved in-range root closest to the supplied guess; an out-of-range guess is rejected. This tie/basin policy is not device verified.',
  unboundedSolve:'Reuse solveReal Newton iteration and expanding scans; its work/radius limits are project policies.',
  discontinuities:'Extremum calculations reject sampled non-real/undefined values and unresolved singular or jump candidates. Finite sampling cannot certify continuity.',
  manual:'Software Guide OS3.00 2-27–2-30 and2-34–2-35; default omitted SolveN bounds and omitted FMin/FMax precision are not specified there.'
});
export class CGNumericalError extends CalcError{
  constructor(code,detail=''){super(code);this.name='CGNumericalError';this.code=code;this.detail=detail;}
}
const fail=(code,detail)=>{throw new CGNumericalError(code,detail);};
const requireValue=(condition,code,detail)=>{if(!condition)fail(code,detail);};
const real=value=>typeof value==='number'&&Number.isFinite(value)&&Math.abs(value)<CG_NUMERICAL_LIMITS.maximum;
const ownValue=(object,key)=>{const descriptor=Object.getOwnPropertyDescriptor(object||{},key);return descriptor&&Object.hasOwn(descriptor,'value')?descriptor.value:undefined;};
const forbidden=new Set(['diff','diff2','integral','sum','prod','Solve','SolveN','FMin','FMax','Sigma','Σ','CGSolve','CGSolveN','CGFMin','CGFMax','CGDerivative','CGSecondDerivative','CGIntegral','CGSum','CGSigma'].map(name=>name.toLowerCase()));
// Software Guide2-27..2-28 gives Solve/SolveN a narrower nesting ban than
// extrema: first derivatives and integrals are legal real scalar terms.
const solveForbidden=new Set([...forbidden].filter(name=>!['diff','cgderivative','integral','cgintegral'].includes(name)));

function residualSource(expression){
  requireValue(typeof expression==='string'&&expression.trim()&&expression.length<=CG_NUMERICAL_LIMITS.source,'Syntax ERROR','Expected a bounded expression');
  let quote='',level=0,equals=-1;
  for(let index=0;index<expression.length;index++){
    const char=expression[index];if(quote){if(char==='\\')index++;else if(char===quote)quote='';continue;}
    if(char==='"'||char==="'"){quote=char;continue;}if('([{'.includes(char))level++;else if(')]}'.includes(char))level--;
    else if(char==='='&&level===0&&expression[index-1]!=='='&&expression[index+1]!=='='&&!/[<>!]/.test(expression[index-1]||'')){requireValue(equals<0,'Syntax ERROR','Only one equation equality is supported');equals=index;}
  }
  if(equals<0)return expression;
  const left=expression.slice(0,equals).trim(),right=expression.slice(equals+1).trim();requireValue(left&&right,'Syntax ERROR','Both equation sides are required');return '('+left+')-('+right+')';
}
function requireBounds(lower,upper){
  requireValue(real(lower)&&real(upper),'Argument ERROR','Bounds must be finite real values in range');
  requireValue(lower<upper,'Argument ERROR','The lower bound must be below the upper bound');return [lower,upper];
}
function optionalBounds(lower,upper){
  if(lower===undefined&&upper===undefined)return null;
  requireValue(lower!==undefined&&upper!==undefined,'Argument ERROR','Specify both bounds');return requireBounds(lower,upper);
}
function sampler(calculator,expression,variable='x',{equation=false,extra={}}={}){
  requireValue(calculator&&typeof calculator.compile==='function'&&typeof calculator.scope==='function','Invalid Type','A calculator is required');
  const key=cgVariableKey(variable);requireValue(key&&Object.hasOwn(calculator.vars||{},key),'Argument ERROR','Choose a native scalar variable');
  let source=equation?residualSource(expression):expression;
  requireValue(typeof source==='string'&&source.trim()&&source.length<=CG_NUMERICAL_LIMITS.source,'Syntax ERROR','Expected a bounded expression');
  // readOnlyCalculator is idempotent. A fresh wrapper also isolates a caller
  // that is already one of its isolated copies.
  const local=readOnlyCalculator(Object.create(calculator));
  let node,code,scope;
  try{
    if(typeof local.prepareCGExpression==='function')source=local.prepareCGExpression(source);
    node=math.parse(normalize(source));
    const blocked=equation?solveForbidden:forbidden;
    node.traverse(part=>{if(part.isFunctionNode){const name=part.fn.name;requireValue(name==='Sum'||name==='Prod'||!blocked.has(name.toLowerCase())&&!/^RndFix$/i.test(name),'Syntax ERROR','This nested numerical calculation is unavailable');}});
    // A supplied native scope may contain functions/getters closing over the
    // original calculator. Do not carry those closures across the isolation
    // boundary. Skip their getters, then let local.scope bind its own banks.
    const nativeScopes=[createCGArrayScope(local,local.arrayMemory),createCGVectorScope(local),createCGFinancialScope(local),createCGStatisticalScope(local),...(local.graphMemory?[createCGGraphVariableScope(local.graphMemory)]:[])];
    const nativeKeys=new Set(nativeScopes.flatMap(value=>Object.keys(value))),constants=Object.create(null);
    for(const name of Object.keys(extra||{}))if(!nativeKeys.has(name))constants[name]=math.clone(extra[name]);
    code=local.compile(source);scope=local.scope(constants);
  }catch(error){if(error instanceof CGNumericalError||error instanceof CalcError)throw error;if(error?.name==='CGMetricError')fail(error.code,error.message);fail('Syntax ERROR','Invalid numerical expression');}
  let evaluations=0,lastError=null,fatalError=null;
  const evaluate=(compiled,x)=>{
    // The shared unbounded solver treats callback failures as holes. Cache
    // fatal timeouts so those cheap fallback requests cannot repeat expensive
    // nested integration/differentiation work after its budget has expired.
    if(fatalError)throw fatalError;
    requireValue(real(x),'Argument ERROR','Sampling point is outside range');
    requireValue(++evaluations<=CG_NUMERICAL_LIMITS.evaluations,'Time Out','Numerical evaluation budget exceeded');
    scope[key]=x;let result;
    try{result=compiled.evaluate(scope);}catch(error){if(error instanceof CGNumericalError&&error.code==='Time Out'){fatalError=error;throw error;}if(error instanceof CalcError&&error.message==='Time Out'){fatalError=new CGNumericalError('Time Out','A nested numerical calculation exceeded its budget');throw fatalError;}fail('Ma ERROR','The function is undefined at a sampled point');}
    requireValue(typeof result==='number','Invalid Type','A real scalar function is required');requireValue(real(result),'Ma ERROR','The function result is outside range');return Object.is(result,-0)?0:result;
  };
  const reader=(part,compiled)=>{const value=x=>evaluate(compiled,x),optional=x=>{try{return value(x);}catch(error){if(error instanceof CGNumericalError&&error.code==='Time Out')throw error;lastError=error;return null;}};return {source,node:part,scope,key,value,optional,evaluations:()=>evaluations,lastError:()=>lastError,subexpression:part=>reader(part,local.compile(part.toString()))};};
  return reader(node,code);
}

// Coefficients are assembled in decimal arithmetic first. Only losslessly
// representable assembled coefficients use the polynomial fast path: e.g.
// expanding (x-1)^2+1e-30 must not silently turn its positive minimum into zero.
function coefficients(node,variable,scope){
  const zero=()=>math.bignumber(0),one=()=>math.bignumber(1),trim=values=>{while(values.length>1&&values.at(-1).isZero())values.pop();return values;};
  const bounded=values=>{if(values.length>CG_NUMERICAL_LIMITS.polynomialDegree+1||values.some(value=>!value.isFinite()))return null;return trim(values);};
  const add=(left,right,subtract=false)=>bounded(Array.from({length:Math.max(left.length,right.length)},(_,i)=>math[subtract?'subtract':'add'](left[i]||zero(),right[i]||zero())));
  const multiply=(left,right)=>{if(left.length+right.length-1>CG_NUMERICAL_LIMITS.polynomialDegree+1)return null;const result=Array.from({length:left.length+right.length-1},zero);for(let i=0;i<left.length;i++)for(let j=0;j<right.length;j++)result[i+j]=math.add(result[i+j],math.multiply(left[i],right[j]));return bounded(result);};
  function read(part){
    if(part.isParenthesisNode)return read(part.content);
    if(part.isConstantNode)return typeof part.value==='number'&&Number.isFinite(part.value)?[math.bignumber(String(part.value))]:null;
    if(part.isSymbolNode){if(part.name===variable)return [zero(),one()];const value=ownValue(scope,part.name)??({pi:Math.PI,e:Math.E}[part.name]);return real(value)?[math.bignumber(String(value))]:null;}
    if(!part.isOperatorNode)return null;
    const left=read(part.args[0]);if(!left)return null;if(part.args.length===1)return part.fn==='unaryMinus'?left.map(value=>math.unaryMinus(value)):part.fn==='unaryPlus'?left:null;
    const right=read(part.args[1]);if(!right)return null;
    if(part.fn==='add'||part.fn==='subtract')return add(left,right,part.fn==='subtract');
    if(part.fn==='multiply')return multiply(left,right);
    if(part.fn==='divide')return right.length===1&&!right[0].isZero()?bounded(left.map(value=>math.divide(value,right[0]))):null;
    if(part.fn==='pow'&&right.length===1&&right[0].isInteger()){
      const exponent=Number(right[0]);if(exponent<0||exponent>CG_NUMERICAL_LIMITS.polynomialDegree)return null;let result=[one()];for(let i=0;i<exponent;i++){result=multiply(result,left);if(!result)return null;}return result;
    }
    return null;
  }
  try{const exact=read(node);if(!exact)return null;const ascending=exact.map(value=>Number(value));if(ascending.some((value,index)=>!real(value)||!exact[index].eq(math.bignumber(String(value)))))return null;return ascending.reverse();}catch{return null;}
}
function zeroEquivalentNode(node){
  if(node.isParenthesisNode)return zeroEquivalentNode(node.content);
  if(node.isOperatorNode&&node.args.length===1&&['unaryPlus','unaryMinus'].includes(node.fn))return zeroEquivalentNode(node.args[0]);
  if(node.isOperatorNode&&node.fn==='pow'&&node.args[1].isConstantNode&&Number.isInteger(node.args[1].value)&&node.args[1].value>0)return zeroEquivalentNode(node.args[0]);
  if(node.isFunctionNode&&['abs','Abs'].includes(node.fn.name)&&node.args.length===1)return zeroEquivalentNode(node.args[0]);
  return node;
}
const distinct=values=>values.filter(real).map(value=>Object.is(value,-0)?0:value).sort((a,b)=>a-b).filter((value,index,sorted)=>index===0||Math.abs(value-sorted[index-1])>16*Number.EPSILON*Math.max(Number.MIN_VALUE,Math.abs(value),Math.abs(sorted[index-1])));
function polynomialRealRoots(values){
  if(values.length===1){requireValue(values[0]!==0,'Ma ERROR','An identity has no enumerable isolated root set');return [];}
  try{return distinct(polynomialRoots(values,CG_NUMERICAL_LIMITS.polynomialDegree).filter(value=>typeof value==='number'));}catch(error){if(error instanceof CGNumericalError)throw error;return null;}
}
function polynomialRange(values){const leading=Math.abs(values[0]),bound=values.length===1?1:1+Math.max(...values.slice(1).map(value=>Math.abs(value)/leading));return Number.isFinite(bound)&&bound<CG_NUMERICAL_LIMITS.maximum?[-bound,bound]:[-9.999999999e99,9.999999999e99];}
function inRange(value,lower,upper){return value>=lower&&value<=upper;}

function golden(value,left,right,tolerance,{iterations=120}={}){
  const phi=(Math.sqrt(5)-1)/2;let a=left,b=right,u=b-phi*(b-a),v=a+phi*(b-a),fu=value(u),fv=value(v);
  let best=fu<=fv?{x:u,y:fu}:{x:v,y:fv};
  for(let i=0;i<iterations;i++){
    if(b-a<=tolerance||u===v)break;
    if(fu<=fv){b=v;v=u;fv=fu;u=b-phi*(b-a);fu=value(u);if(fu<best.y)best={x:u,y:fu};}
    else{a=u;u=v;fu=fv;v=a+phi*(b-a);fv=value(v);if(fv<best.y)best={x:v,y:fv};}
  }
  return best;
}
function checkSampleContinuity(sample,points){
  for(let index=1;index<points.length;index++){
    const previous=points[index-1],point=points[index];
    if(previous.y!==0&&point.y!==0&&Math.sign(previous.y)!==Math.sign(point.y)){
      let a=previous.x,b=point.x,fa=previous.y,fb=point.y;const scale=Math.max(Math.abs(fa),Math.abs(fb),Number.MIN_VALUE);let resolved=false;
      for(let iteration=0;iteration<90;iteration++){
        const x=a/2+b/2;if(x===a||x===b)break;const y=sample.value(x);if(y===0||Math.abs(y)<=scale*1e-8){resolved=true;break;}
        if(Math.sign(y)===Math.sign(fa)){a=x;fa=y;}else{b=x;fb=y;}
      }
      requireValue(resolved,'Ma ERROR','A jump or pole cannot be treated as a continuous extremum');
    }
    if(index===points.length-1)continue;
    const next=points[index+1],center=Math.abs(point.y);
    if(center>=Math.abs(previous.y)&&center>=Math.abs(next.y)&&(point.y!==previous.y||point.y!==next.y)){
      const peak=golden(x=>-Math.abs(sample.value(x)),previous.x,next.x,0,{iterations:100});
      requireValue(-peak.y<=Math.max(center,Math.abs(previous.y),Math.abs(next.y),Number.MIN_VALUE)*1e6,'Ma ERROR','An unresolved unbounded peak is inside the interval');
    }
  }
}
function extremum(calculator,expression,lower,upper,precision,extra,maximum){
  requireBounds(lower,upper);precision??=CG_NUMERICAL_POLICY.defaultExtremumPrecision;
  requireValue(Number.isInteger(precision)&&precision>=1&&precision<=9,'Argument ERROR','Precision must be an integer1–9');
  const sample=sampler(calculator,expression,'x',{extra}),sign=maximum?-1:1,segments=256+64*precision,width=upper-lower;
  const points=Array.from({length:segments+1},(_,index)=>{const x=index===segments?upper:lower+width*(index/segments);return {x,y:sample.value(x)};});
  checkSampleContinuity(sample,points);
  const objective=x=>sign*sample.value(x),candidates=[points[0],points.at(-1)],poly=coefficients(sample.node,sample.key,sample.scope);
  if(poly&&poly.length>2){const derivative=poly.slice(0,-1).map((value,index)=>value*(poly.length-1-index)),stationary=polynomialRealRoots(derivative);if(stationary)for(const x of stationary)if(inRange(x,lower,upper))candidates.push({x,y:sample.value(x)});}
  const tolerance=Math.max(16*Number.EPSILON*Math.max(1,Math.abs(lower),Math.abs(upper)),width*10**(-precision-2));
  for(let index=1;index<points.length-1;index++){
    const left=points[index-1],center=points[index],right=points[index+1];
    if(sign*center.y<=sign*left.y&&sign*center.y<=sign*right.y&&(center.y!==left.y||center.y!==right.y)){
      const result=golden(objective,left.x,right.x,tolerance);candidates.push({x:result.x,y:sign*result.y});
    }
  }
  let best=candidates[0];for(const candidate of candidates)if(sign*candidate.y<sign*best.y)best=candidate;
  const reference=Math.max(...points.map(point=>Math.abs(point.y)),Number.MIN_VALUE);
  requireValue(Math.abs(best.y)<=reference*1000,'Ma ERROR','An unresolved singular extremum cannot be accepted');
  if(best.x>lower&&best.x<upper){
    let h=Math.min(Math.max(width/segments/16,8*tolerance),best.x-lower,upper-best.x);
    for(let i=0;i<6&&h>4*tolerance;i++,h/=4){const left=sample.value(best.x-h),right=sample.value(best.x+h),scale=Math.max(Math.abs(best.y),Math.abs(left),Math.abs(right),Number.MIN_VALUE);requireValue(sign*(left-best.y)>=-1e-10*scale&&sign*(right-best.y)>=-1e-10*scale,'Ma ERROR','A candidate does not resolve a continuous local extremum');}
  }
  return [Object.is(best.x,-0)?0:best.x,Object.is(best.y,-0)?0:best.y];
}
export function evaluateCGFMin(calculator,expression,lower,upper,precision,extra={}){return extremum(calculator,expression,lower,upper,precision,extra,false);}
export function evaluateCGFMax(calculator,expression,lower,upper,precision,extra={}){return extremum(calculator,expression,lower,upper,precision,extra,true);}

function rootScan(sample,lower,upper){
  const segments=CG_NUMERICAL_LIMITS.scanSegments,width=upper-lower,step=width/segments,points=Array.from({length:segments+1},(_,index)=>{const x=index===segments?upper:lower+width*(index/segments);return {x,y:sample.optional(x)};}),roots=[];
  const exactZero=x=>{
    if(sample.optional(x)!==0)return false;
    const h=Math.min(step/16,1e-5*Math.max(1,Math.abs(x))),neighbours=[];
    if(x-h>=lower&&x-h<x)neighbours.push(sample.optional(x-h));if(x+h<=upper&&x+h>x)neighbours.push(sample.optional(x+h));
    return neighbours.length>0&&neighbours.every(value=>value!==null&&value!==0);
  };
  const bracket=(left,right)=>{
    let a=left.x,b=right.x,fa=left.y,fb=right.y;const scale=Math.max(Math.abs(fa),Math.abs(fb),Number.MIN_VALUE);
    for(let i=0;i<1150;i++){
      const x=a/2+b/2;if(x===a||x===b)break;const y=sample.optional(x);if(y===null)return null;if(y===0)return exactZero(x)?x:null;
      if(Math.sign(y)===Math.sign(fa)){a=x;fa=y;}else{b=x;fb=y;}
    }
    const x=Math.abs(fa)<Math.abs(fb)?a:b,residual=Math.min(Math.abs(fa),Math.abs(fb));return residual<=scale*1e-10?x:null;
  };
  const finitePoints=points.filter(point=>point.y!==null);if(!finitePoints.length){if(sample.lastError())throw sample.lastError();fail('Ma ERROR','The function is undefined throughout the sampled interval');}requireValue(finitePoints.some(point=>point.y!==0),'Ma ERROR','A sampled zero plateau is not an enumerable isolated root set');
  for(let index=0;index<points.length;index++){
    const point=points[index];if(point.y===0&&exactZero(point.x))roots.push(point.x);
    if(index){const previous=points[index-1];if(previous.y!==null&&point.y!==null&&previous.y!==0&&point.y!==0&&Math.sign(previous.y)!==Math.sign(point.y)){const root=bracket(previous,point);if(root!==null)roots.push(root);}}
    if(index===0||index===points.length-1||point.y===null)continue;
    const left=points[index-1],right=points[index+1];
    if(left.y===null||right.y===null||Math.abs(point.y)>Math.abs(left.y)||Math.abs(point.y)>Math.abs(right.y)||(point.y===left.y&&point.y===right.y))continue;
    // A tangent check minimizes |f|, but a tiny positive minimum is never
    // sufficient evidence. Only a resolved actual zero is accepted here.
    let candidate;
    try{candidate=golden(x=>Math.abs(sample.value(x)),left.x,right.x,0,{iterations:160}).x;}catch(error){if(error instanceof CGNumericalError&&error.code==='Time Out')throw error;continue;}
    for(let iteration=0;iteration<100;iteration++){
      const y=sample.optional(candidate);if(y===null)break;if(y===0){if(exactZero(candidate))roots.push(candidate);break;}
      const h=Math.min(step/64,Math.cbrt(Number.EPSILON)*Math.max(1,Math.abs(candidate)),candidate-lower,upper-candidate);if(h<=0)break;
      const yl=sample.optional(candidate-h),yr=sample.optional(candidate+h);if(yl===null||yr===null)break;const derivative=(yr-yl)/(2*h);if(!Number.isFinite(derivative)||derivative===0)break;
      const next=candidate-y/derivative;if(!inRange(next,left.x,right.x)||next===candidate)break;candidate=next;
    }
  }
  return distinct(roots);
}
function solveNData(calculator,expression,variable,lower,upper,extra){
  const explicit=optionalBounds(lower,upper),sample=sampler(calculator,expression,variable,{equation:true,extra}),equivalent=zeroEquivalentNode(sample.node),rootSample=equivalent===sample.node?sample:sample.subexpression(equivalent),poly=coefficients(rootSample.node,sample.key,sample.scope);
  let roots=poly?polynomialRealRoots(poly):null,method=roots?(rootSample===sample?'polynomial':'polynomial-zero-equivalent'):'scanned';
  const range=explicit||(roots?polynomialRange(poly):[...CG_NUMERICAL_POLICY.defaultSolveNRange]);
  if(roots)roots=roots.filter(value=>inRange(value,...range));else roots=rootScan(rootSample,...range);
  if(rootSample!==sample)roots=roots.filter(value=>sample.optional(value)!==null);
  return {roots,searchRange:range,explicitBounds:!!explicit,method,evaluations:sample.evaluations()};
}
export function evaluateCGSolveN(calculator,expression,variable='x',lower,upper,extra={}){
  const result=solveNData(calculator,expression,variable,lower,upper,extra),truncated=result.roots.length>CG_NUMERICAL_LIMITS.roots,roots=result.roots.slice(0,CG_NUMERICAL_LIMITS.roots);
  return {...result,roots,notice:roots.length?'More solutions may exist.':'No Solution',complete:false,truncated};
}
export function evaluateCGSolve(calculator,expression,guess,lower,upper,extra={}){
  requireValue(real(guess),'Argument ERROR','The initial guess must be a finite real value');
  const bounds=optionalBounds(lower,upper);
  if(bounds){
    requireValue(inRange(guess,...bounds),'Argument ERROR','The initial guess is outside the specified bounds');
    const result=solveNData(calculator,expression,'x',...bounds,extra);requireValue(result.roots.length,'Can’t Solve!','No resolved root was found within the specified bounds');
    return result.roots.reduce((best,value)=>Math.abs(value-guess)<Math.abs(best-guess)?value:best);
  }
  const sample=sampler(calculator,expression,'x',{equation:true,extra});
  try{const root=solveReal(sample.value,guess);requireValue(real(root),'Ma ERROR','Root outside range');return root;}catch(error){if(error instanceof CGNumericalError&&error.code==='Time Out')throw error;fail('Time Out','The unbounded Solve search did not converge');}
}
