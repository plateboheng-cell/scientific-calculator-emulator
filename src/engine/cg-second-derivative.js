import {assert,math,normalize} from './calculator.js';
import {readOnlyCalculator} from './read-only-calculator.js';
const smooth=new Set(['sin','cos','tan','asin','acos','atan','sinh','cosh','tanh','asinh','acosh','atanh','log','ln','exp','sqrt','nthRoot']);
export function cgSecondDerivative(calculator,expression,x,extra={}){
  assert(typeof expression==='string'&&Number.isFinite(x),'Second derivative requires an expression and real point');
  const local=readOnlyCalculator(calculator),source=local.prepareCGExpression?local.prepareCGExpression(expression):local.prepareExpression?local.prepareExpression(expression):expression;
  local.compile(source);const original=math.parse(normalize(source));let analytic=true;
  original.traverse(node=>{if(node.isFunctionNode&&!smooth.has(node.fn.name))analytic=false;});
  const scope=local.scope(extra),real=value=>{assert(typeof value==='number'&&Number.isFinite(value)&&Math.abs(value)<1e100,'Second derivative is undefined or outside range');return Object.is(value,-0)?0:value;};
  if(analytic){
    let derived;
    try{
      const factor=local.factor(),rewrite=node=>{const mapped=node.map(rewrite);if(!mapped.isFunctionNode)return mapped;const name=mapped.fn.name,args=mapped.args;
        if(['sin','cos','tan'].includes(name))return new math.FunctionNode(name,[new math.OperatorNode('*','multiply',[new math.ConstantNode(factor),args[0]])]);
        if(['asin','acos','atan'].includes(name))return new math.OperatorNode('/','divide',[mapped,new math.ConstantNode(factor)]);
        if(name==='ln')return new math.FunctionNode('log',args);
        if(name==='log'&&args.length===1)return new math.OperatorNode('/','divide',[new math.FunctionNode('log',args),new math.ConstantNode(Math.log(10))]);
        return mapped;};
      derived=math.derivative(math.derivative(rewrite(original),'x'),'x').compile();
    }catch{analytic=false;}
    if(analytic){scope.x=x;Object.assign(scope,{sin:math.sin,cos:math.cos,tan:math.tan,asin:math.asin,acos:math.acos,atan:math.atan,log:math.log});return real(derived.evaluate(scope));}
  }
  const code=local.compile(source),f=point=>{scope.x=point;return real(code.evaluate(scope));},center=f(x);
  let h=Math.pow(Number.EPSILON,1/6)*Math.max(1,Math.abs(x)),previous,best,bestError=Infinity;
  for(let level=0;level<24;level++,h/=2){
    if(x+h===x||x-h===x)break;
    let value;try{value=(-f(x+2*h)+16*f(x+h)-30*center+16*f(x-h)-f(x-2*h))/(12*h*h);}catch{continue;}
    if(!Number.isFinite(value))continue;
    if(previous!==undefined){const error=Math.abs(value-previous),candidate=value+(value-previous)/15;if(error<bestError){bestError=error;best=candidate;}if(error<=1e-8*Math.max(1,Math.abs(candidate)))return real(candidate);if(level>4&&error>bestError*100)break;}
    previous=value;
  }
  assert(best!==undefined&&bestError<=1e-6*Math.max(1,Math.abs(best)),'Second derivative did not converge');return real(best);
}
