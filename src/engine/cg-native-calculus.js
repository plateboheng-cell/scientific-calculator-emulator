import {CalcError,math,normalize} from './calculator.js';
import {readOnlyCalculator} from './read-only-calculator.js';
import {createCGArrayScope,createCGVectorScope} from './cg-array-memory.js';
import {createCGGraphVariableScope} from './cg-graph-state.js';
import {createCGFinancialScope} from './cg-financial-functions.js';
import {createCGStatisticalScope} from './cg-statistical-functions.js';
import {cgVariableKey} from '../models/cg-variables.js';

const forbidden=new Set(['solve','solven','fmin','fmax','diff','diff2','integral','sum','prod','sigma','cgsum','cgintegral','cgsolve','cgsolven','cgfmin','cgfmax','rndfix']);
const fail=message=>{throw new CalcError(message);};
const real=value=>{if(typeof value!=='number')fail('Invalid Type');if(!Number.isFinite(value)||Math.abs(value)>=1e100)fail('Ma ERROR');return value;};
/** Snapshot the ordinary constants once. Rebind the calculator's native
 * helpers to its isolated banks rather than retaining the caller's closures. */
function sampler(calculator,expression,variable,extra,{radians=false}={}){
  if(typeof expression!=='string'||!expression.trim()||expression.length>1500)fail('Syntax ERROR');
  const local=readOnlyCalculator(Object.create(calculator));if(radians)local.angle='Rad';
  const source=local.prepareCGExpression?local.prepareCGExpression(expression):expression;
  try{math.parse(normalize(source)).traverse(node=>{if(node.isFunctionNode&&!['Sum','Prod'].includes(node.fn.name)&&forbidden.has(node.fn.name.toLowerCase()))fail('Syntax ERROR');});}catch(error){if(error instanceof CalcError)throw error;fail('Syntax ERROR');}
  const ownNative=new Set([...Object.keys(createCGArrayScope(local,local.arrayMemory)),...Object.keys(createCGVectorScope(local)),...Object.keys(createCGFinancialScope(local)),...Object.keys(createCGStatisticalScope(local)),...Object.keys(createCGGraphVariableScope(local.graphMemory))]);
  const constants={};for(const key of Object.keys(extra||{}))if(!ownNative.has(key))constants[key]=math.clone(extra[key]);
  const code=local.compile(source),scope=local.scope(constants);let evaluations=0;
  return point=>{if(++evaluations>60000)fail('Time Out');scope[variable]=point;return real(code.evaluate(scope));};
}

// Software Guide2-31..2-33: native integral defaults to1E-5 and interprets
// trigonometric functions in radians even when the current setting is Deg.
// Adaptive Simpson and its evaluation/depth budget are project algorithms.
export function evaluateCGIntegral(calculator,expression,lower,upper,tolerance=1e-5,extra={}){
  real(lower);real(upper);real(tolerance);if(tolerance<=0)fail('Argument ERROR');
  const f=sampler(calculator,expression,'x',extra,{radians:true});if(lower===upper)return 0;
  const sign=lower<upper?1:-1,a=Math.min(lower,upper),b=Math.max(lower,upper);
  const simpson=(left,right,fl,fm,fr)=>real((right-left)*(fl+4*fm+fr)/6);
  const visit=(left,right,fl,fm,fr,whole,eps,depth)=>{
    const middle=left+(right-left)/2,lm=f(left+(middle-left)/2),rm=f(middle+(right-middle)/2);
    const l=simpson(left,middle,fl,lm,fm),r=simpson(middle,right,fm,rm,fr),delta=l+r-whole;
    if(Math.abs(delta)<=15*eps)return real(l+r+delta/15);
    if(!depth||middle===left||middle===right)fail('Time Out');
    return real(visit(left,middle,fl,lm,fm,l,eps/2,depth-1)+visit(middle,right,fm,rm,fr,r,eps/2,depth-1));
  };
  const fl=f(a),fm=f(a+(b-a)/2),fr=f(b);return real(sign*visit(a,b,fl,fm,fr,simpson(a,b,fl,fm,fr),tolerance,22));
}

// Software Guide2-33..2-34: integer initial/final terms, final>initial,
// default spacing1. The native loop variable is intentionally updated by
// the caller only after successful evaluation. Its final visited value and
// the10000-term budget are explicit project policies awaiting device checks.
export function evaluateCGSigma(calculator,expression,variable,initial,final,spacing=1,extra={}){
  const key=cgVariableKey(variable);if(!key||!Object.hasOwn(calculator.vars,key))fail('Syntax ERROR');
  real(initial);real(final);real(spacing);if(!Number.isInteger(initial)||!Number.isInteger(final)||final<=initial||spacing<=0)fail('Argument ERROR');
  const count=Math.floor((final-initial)/spacing+1e-12)+1;if(!Number.isSafeInteger(count)||count>10000)fail('Time Out');
  const f=sampler(calculator,expression,key,extra);let value=0,correction=0,lastBinding=initial;
  for(let index=0;index<count;index++){lastBinding=real(initial+index*spacing);const adjusted=f(lastBinding)-correction,next=real(value+adjusted);correction=(next-value)-adjusted;value=next;}
  return {value,variable:key,lastBinding,terms:count};
}
