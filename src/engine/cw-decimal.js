import {all, create} from 'mathjs';
import {assert, math, normalize} from './calculator.js';
import {evaluateCGRationalExpression} from './cg-rational-display.js';
import {groupCWImplicitDivision} from './cw-notation.js';

const Decimal = math.BigNumber.clone({precision:23,rounding:math.BigNumber.ROUND_HALF_UP});
const minMagnitude = new Decimal('1e-99');
const maxMagnitude = new Decimal('9.999999999e99');
const zero = new Decimal(0);
const pi = new Decimal(-1).acos();
const e = new Decimal(1).exp();
const constants = {pi,e};
const rangeByAngle = {Deg:'9e9',Rad:'157079632.7',Gra:'1e10'};
let decimalParser;

function checked(value) {
  const magnitude = value.abs();
  assert(value.isFinite() && magnitude.lte(maxMagnitude),'数学错误');
  return magnitude.lt(minMagnitude) ? zero : value;
}

function exactDecimal(text,value) {
  if (typeof text !== 'string' || text.length > 48 || !/^-?\d+(?:\.\d+)?(?:e[+-]?\d{1,2})?$/.test(text) || typeof value !== 'number' || Number(text) !== value) return null;
  const decimal = new Decimal(text);
  if (decimal.sd()>23 || !decimal.isFinite() || decimal.abs().gt(maxMagnitude) || !decimal.isZero() && decimal.abs().lt(minMagnitude)) return null;
  return decimal.toString();
}

export function sanitizeCWDecimals(source,variables) {
  const entries = [];
  for (const [name,value] of Object.entries(variables)) {
    const saved=source&&Object.hasOwn(source,name)?source[name]:null;
    const exact=typeof value==='number'?exactDecimal(saved,value):exactComplexParts(saved,value);
    if(exact!==null)entries.push([name,exact]);
  }
  return Object.fromEntries(entries);
}

export function cwDecimalResult(tag,value) {
  return tag?.kind==='cw-decimal' ? exactDecimal(tag.decimal,value) : null;
}

function exactComplexParts(source,value) {
  if(!source||typeof source!=='object'||!value)return null;
  const re=exactDecimal(source.re,value.re),im=exactDecimal(source.im,value.im);
  return re!==null&&im!==null?{re,im}:null;
}

export function cwComplexResult(tag,value) {
  return tag?.kind==='cw-complex-decimal'?exactComplexParts(tag,value):null;
}

export function cwDecimalMemory(tag,value) {
  return cwDecimalResult(tag,value)??cwComplexResult(tag,value);
}

export function compareCWDecimals(left,right) {
  const a=cwDecimalResult(left.exact,left.value),b=cwDecimalResult(right.exact,right.value);
  return a===null||b===null?null:new Decimal(a).cmp(b);
}

export function equalCWDecimals(left,right) {
  const a=cwDecimalMemory(left.exact,left.value),b=cwDecimalMemory(right.exact,right.value);
  if(a===null||b===null)return null;
  if(typeof a==='string'&&typeof b==='string')return a===b;
  return (a.re??a)===(b.re??b)&&(a.im??'0')===(b.im??'0');
}

export function roundCWNumber(value,format,digits,exact) {
  const input=new Decimal(cwDecimalResult(exact,value)??value);
  return roundDecimal(input,format,digits).toNumber();
}

function roundDecimal(value,format,digits) {
  return format==='Fix'?value.toDecimalPlaces(digits):value.toSignificantDigits(format==='Sci'?digits:11);
}

export function cwEngineeringMantissa(value,exponent,format,digits,exact) {
  const shifted=new Decimal(cwDecimalResult(exact,value)??value).times('1e'+(-exponent));
  if(format==='Fix')return shifted.toFixed(digits);
  return shifted.toSignificantDigits(format==='Sci'?digits:10).toFixed();
}

export function cwEngineeringExponent(value,exact) {
  return 3*Math.floor(new Decimal(cwDecimalResult(exact,value)??value).e/3);
}

export function aggregateCWDecimals(values,operation) {
  const numbers=values.map(value=>new Decimal(value));
  if (operation==='min'||operation==='max') {
    return (operation==='min'?Decimal.min(...numbers):Decimal.max(...numbers)).toString();
  }
  const sum=numbers.reduce((total,value)=>total.plus(value),zero);
  return checked(operation==='mean'?sum.div(numbers.length):sum).toString();
}

export function enforceCWScalarDomain(scope,angle) {
  const ranges={...limits,sin:rangeByAngle[angle],cos:rangeByAngle[angle],tan:rangeByAngle[angle],asin:1,acos:1};
  for (const [name,limit] of Object.entries(ranges)) {
    const original=scope[name]??math[name];
    scope[name]=(value,...args)=>{
      if(typeof value==='number'){
        const bounded=forwardTrig.includes(name)?Math.abs(value)<Number(limit):Math.abs(value)<=Number(limit);
        assert(bounded&&(name!=='acosh'||value>=1),'数学错误');
      }
      return original(value,...args);
    };
  }
}

function power(base,exponent,fraction) {
  if (base.isZero()) { assert(exponent.gt(0),'数学错误'); return zero; }
  if (base.eq(10)) assert(exponent.lte('99.99999999'),'数学错误');
  const magnitude = base.abs();
  const order = exponent.times(magnitude.log(10));
  assert(order.lt(100),'数学错误');
  if (order.lt(-99)) return zero;
  if (base.isPositive() || exponent.isInteger()) return base.pow(exponent);
  assert(fraction && fraction.d%2n!==0n,'数学错误');
  const result = magnitude.pow(exponent);
  return fraction.n%2n!==0n ? result.neg() : result;
}

function factorial(value) {
  assert(value.isInteger() && value.gte(0) && value.lte(69),'数学错误');
  let result = new Decimal(1);
  for (let i=2;i<=value.toNumber();i++) result=result.times(i);
  return result;
}

function countSelections(total,count,ordered) {
  assert(total.isInteger() && count.isInteger() && total.gte(0) && total.lt('1e10') && count.gte(0) && count.lte(total),'数学错误');
  const n = total.toNumber(), r = count.toNumber();
  const terms = ordered ? r : Math.min(r,n-r);
  let result = new Decimal(1);
  for (let i=1;i<=terms;i++) {
    result = ordered ? result.times(n-i+1) : result.times(n-terms+i).div(i);
    checked(result);
  }
  return result.toDecimalPlaces(0);
}

function trig(name,input,angle) {
  assert(input.abs().lt(rangeByAngle[angle]),'数学错误');
  const quarter = angle==='Deg'?new Decimal(90):angle==='Gra'?new Decimal(100):pi.div(2);
  const quadrants = input.div(quarter);
  if (quadrants.isInteger()) {
    const q = quadrants.mod(4).plus(4).mod(4).toNumber();
    if (name==='tan') { assert(q%2===0,'数学错误'); return zero; }
    return new Decimal((name==='sin'?[0,1,0,-1]:[1,0,-1,0])[q]);
  }
  const radians = angle==='Rad'?input:input.mod(quarter.times(4)).times(pi).div(quarter.times(2));
  return radians[name]();
}

function inverseTrig(name,input,angle) {
  const radians = input[name]();
  return angle==='Rad'?radians:radians.times(angle==='Deg'?180:200).div(pi);
}

const methods = {abs:'abs',sqrt:'sqrt',cbrt:'cbrt',ln:'ln',exp:'exp',Int:'trunc',Intg:'floor',floor:'floor',ceil:'ceil',trunc:'trunc'};
const limits = {sinh:'230.2585092',cosh:'230.2585092',asinh:'4.999999999e99',acosh:'4.999999999e99',atanh:'0.9999999999'};
const forwardTrig = ['sin','cos','tan'];
const reverseTrig = ['asin','acos','atan'];
const unaryFunctions = new Set([...Object.keys(methods),...Object.keys(limits),...forwardTrig,...reverseTrig,'tanh','factorial','lg','deg','rad','gra','Rnd']);
const binaryFunctions = new Set(['nthRoot','nPr','nCr','mod']);
const complexFunctions = new Set(['conj','re','im','arg']);
const logarithms = new Set(['ln','lg','log','CWLog']);
const operatorNames = new Set(['add','subtract','multiply','divide','pow','unaryMinus','unaryPlus','factorial']);
const useNumericalEvaluator = Symbol('unsupported decimal operation');

function supportedFunction(name,arity,complex) {
  if(complex&&name==='angle')return arity===2;
  if(complex&&complexFunctions.has(name))return arity===1;
  if (name==='log' || name==='CWLog') return arity===1 || arity===2;
  if (name==='dms') return arity===3;
  if (unaryFunctions.has(name)) return arity===1;
  return binaryFunctions.has(name) && arity===2;
}

const realPart = value => value.re??value;
const imaginaryPart = value => value.im??zero;
const hasImaginaryPart = value => value.im!==undefined;

function complexNumber(re,im) {
  const real=checked(re),imaginary=checked(im);
  return imaginary.isZero()?real:{re:real,im:imaginary};
}

function complexBinary(op,left,right) {
  const a=realPart(left),b=imaginaryPart(left),c=realPart(right),d=imaginaryPart(right);
  switch(op){
    case 'add': return complexNumber(a.plus(c),b.plus(d));
    case 'subtract': return complexNumber(a.minus(c),b.minus(d));
    case 'multiply': return complexNumber(a.times(c).minus(b.times(d)),a.times(d).plus(b.times(c)));
    case 'divide': {
      const divisor=c.times(c).plus(d.times(d));
      assert(!divisor.isZero(),'数学错误');
      return complexNumber(a.times(c).plus(b.times(d)).div(divisor),b.times(c).minus(a.times(d)).div(divisor));
    }
    default: throw useNumericalEvaluator;
  }
}

function complexPower(base,exponent) {
  if(hasImaginaryPart(exponent)||!exponent.isInteger())throw useNumericalEvaluator;
  assert(exponent.abs().lt('1e10'),'指数超出范围');
  let count=Math.abs(exponent.toNumber()),factor=exponent.isNegative()?complexBinary('divide',new Decimal(1),base):base;
  let result=new Decimal(1);
  while(count>0){
    if(count%2)result=complexBinary('multiply',result,factor);
    count=Math.floor(count/2);
    if(count)factor=complexBinary('multiply',factor,factor);
  }
  return result;
}

function complexMagnitude(re,im) {
  return re.times(re).plus(im.times(im)).sqrt();
}

function complexArgument(re,im,angle) {
  if(im.isZero()&&re.isNegative())return angle==='Rad'?pi:new Decimal(angle==='Deg'?180:200);
  if(angle!=='Rad'&&re.abs().eq(im.abs())&&!re.isZero()){
    const degrees=angle==='Deg'?45:50;
    return new Decimal(degrees*(re.isNegative()?3:1)*(im.isNegative()?-1:1));
  }
  const radians=Decimal.atan2(im,re);
  return angle==='Rad'?radians:radians.div(pi).times(angle==='Deg'?180:200);
}

function complexNaturalLog(value) {
  const re=realPart(value),im=imaginaryPart(value);
  const magnitude=complexMagnitude(re,im);
  assert(!magnitude.isZero(),'数学错误');
  return complexNumber(magnitude.ln(),complexArgument(re,im,'Rad'));
}

function scalarResult(value) {
  return {value:value.toNumber(),exact:{kind:'cw-decimal',decimal:value.toString()}};
}

export function cwPolarComponents(value,angle,exact) {
  const stored=cwComplexResult(exact,value);
  const re=new Decimal(stored?.re??value.re),im=new Decimal(stored?.im??value.im);
  return [scalarResult(complexMagnitude(re,im)),scalarResult(complexArgument(re,im,angle))];
}

function complexCall(name,args,angle) {
  const [value,phase]=args, re=realPart(value),im=imaginaryPart(value);
  if(logarithms.has(name)){
    if(name==='ln')return complexNaturalLog(value);
    const baseFirst=name==='CWLog'&&phase!==undefined;
    const argument=baseFirst?phase:value;
    const base=baseFirst?value:phase??new Decimal(10);
    return complexBinary('divide',complexNaturalLog(argument),complexNaturalLog(base));
  }
  if(name==='angle'){
    assert(!hasImaginaryPart(value)&&!hasImaginaryPart(phase),'数学错误');
    const eighth=angle==='Deg'?new Decimal(45):angle==='Gra'?new Decimal(50):pi.div(4);
    const turns=phase.div(eighth);
    if(turns.isInteger()&&turns.mod(2).abs().eq(1)){
      assert(phase.abs().lt(rangeByAngle[angle]),'数学错误');
      const octant=turns.mod(8).plus(8).mod(8).toNumber();
      const component=re.times(new Decimal(2).sqrt().div(2));
      return complexNumber(octant===1||octant===7?component:component.neg(),octant<4?component:component.neg());
    }
    return complexNumber(re.times(trig('cos',phase,angle)),re.times(trig('sin',phase,angle)));
  }
  switch(name){
    case 're': return re;
    case 'im': return im;
    case 'conj': return complexNumber(re,im.neg());
    case 'arg': return checked(complexArgument(re,im,angle));
    case 'abs': return checked(complexMagnitude(re,im));
    case 'sqrt': {
      const radius=complexMagnitude(re,im);
      if(re.isNegative()){
        const imaginary=radius.minus(re).div(2).sqrt();
        return complexNumber(im.abs().div(imaginary.times(2)),im.isNegative()?imaginary.neg():imaginary);
      }
      const real=radius.plus(re).div(2).sqrt();
      return complexNumber(real,real.isZero()?zero:im.div(real.times(2)));
    }
    default: throw useNumericalEvaluator;
  }
}

function call(name,args,angle,sourceNodes,rounding) {
  const [a,b,c] = args;
  if (Object.hasOwn(methods,name)) return a[methods[name]]();
  if (forwardTrig.includes(name)) return trig(name,a,angle);
  if (reverseTrig.includes(name)) return inverseTrig(name,a,angle);
  if (Object.hasOwn(limits,name)) assert(a.abs().lte(limits[name]),'数学错误');
  if (Object.hasOwn(limits,name) || name==='tanh') return a[name]();
  if (name==='log' || name==='CWLog' || name==='lg') {
    const value = name==='CWLog'&&b ? b : a;
    const base = (name==='CWLog'&&b ? a : b) ?? new Decimal(10);
    return value.log(base);
  }
  if (name==='factorial') return factorial(a);
  if (name==='nPr' || name==='nCr') return countSelections(a,b,name==='nPr');
  if (name==='mod') return a.mod(b);
  if (name==='Rnd') return roundDecimal(a,rounding.format,rounding.digits);
  if (name==='dms') {
    assert(b.gte(0)&&c.gte(0),'数学错误');
    const magnitude=a.abs().plus(b.div(60)).plus(c.div(3600));
    return a.isNegative()?magnitude.neg():magnitude;
  }
  if (name==='nthRoot') {
    assert(!b.isZero(),'数学错误');
    const root = b.isInteger() ? {n:1n,d:BigInt(b.toFixed(0))} : evaluateCGRationalExpression(`1/(${sourceNodes[1].toString()})`);
    return power(a,new Decimal(1).div(b),root);
  }
  if (name.toLowerCase()===angle.toLowerCase()) return a;
  if (angle==='Rad') return a.times(pi).div(name==='deg'?180:200);
  const turn = angle==='Deg'?180:200;
  return name==='rad'?a.div(pi).times(turn):a.times(turn).div(name==='deg'?180:200);
}

// Decimal arithmetic handles expressions whose complete tree is supported.
// Other operations retain the numerical evaluator.
export function evaluateCWDecimal(source,variables,decimals,extra,angle,definitions={},rounding={format:'Norm',digits:10},complex=false) {
  if (typeof source!=='string' || !source.trim() || source.length>1500) return null;
  let tree;
  try {
    decimalParser ??= create(all,{number:'BigNumber',precision:23});
    tree = decimalParser.parse(normalize(source));
    if (/[\/÷]/.test(source)) tree=groupCWImplicitDivision(tree).tree;
  } catch { return null; }
  const unit=complex?math.complex(0,1):undefined;
  const resolve = name => Object.hasOwn(extra,name) ? extra[name] : Object.hasOwn(variables,name) ? variables[name] : name==='i'?unit:constants[name];
  const functionTrees=new Map();
  function registered(name) {
    if (!['f','g'].includes(name)||Object.hasOwn(extra,name)||!definitions[name]) return null;
    if (!functionTrees.has(name)) {
      try {
        const definition=decimalParser.parse(normalize(definitions[name]));
        functionTrees.set(name,/[\/÷]/.test(definitions[name])?groupCWImplicitDivision(definition).tree:definition);
      }
      catch { functionTrees.set(name,null); }
    }
    return functionTrees.get(name);
  }
  let remaining = 499;
  function supported(node,bindings=[]) {
    assert(--remaining>=0,'算式过长');
    if (node.isConstantNode) return typeof node.value==='number' || math.isBigNumber(node.value);
    if (node.isSymbolNode) {
      if (node.name==='x'&&bindings.length) return true;
      const value = resolve(node.name);
      return typeof value==='number'&&Number.isFinite(value)||
        complex&&math.isComplex(value)||Object.hasOwn(constants,node.name)&&value===constants[node.name];
    }
    if (node.isParenthesisNode) return supported(node.content,bindings);
    if (node.isOperatorNode) return operatorNames.has(node.fn) && node.args.every(arg=>supported(arg,bindings));
    if (!node.isFunctionNode||!node.fn.isSymbolNode||Object.hasOwn(extra,node.fn.name)) return false;
    const name=node.fn.name,definition=registered(name);
    if (definition) {
      assert(!bindings.includes(name),'循环引用错误');
      return node.args.length===1&&supported(node.args[0],bindings)&&supported(definition,[...bindings,name]);
    }
    return supportedFunction(name,node.args.length,complex)&&node.args.every(arg=>supported(arg,bindings));
  }
  if (!supported(tree)) return null;

  function evaluate(node,binding=null) {
    if (node.isConstantNode) return checked(new Decimal(node.value.toString()).toSignificantDigits(23));
    if (node.isSymbolNode) {
      if (node.name==='x'&&binding!==null) return binding;
      const saved = Object.hasOwn(extra,node.name)?null:decimals[node.name];
      const value=resolve(node.name);
      if(complex&&math.isComplex(value)){
        return complexNumber(new Decimal(saved?.re??value.re),new Decimal(saved?.im??value.im));
      }
      return checked(new Decimal(saved??value));
    }
    if (node.isParenthesisNode) return evaluate(node.content,binding);
    const args = node.args.map(arg=>evaluate(arg,binding)), [a,b] = args;
    const complexOperands=complex&&args.some(hasImaginaryPart);
    if (node.isFunctionNode) {
      const definition=registered(node.fn.name);
      if(definition)return evaluate(definition,a);
      const name=node.fn.name;
      const realDomainCrossing=!complexOperands&&(name==='sqrt'&&a.isNegative()||
        logarithms.has(name)&&args.some(value=>value.isNegative()));
      if(complex&&(complexOperands||name==='angle'||complexFunctions.has(name)||realDomainCrossing)){
        return complexCall(name,args,angle);
      }
      return checked(call(name,args,angle,node.args,rounding));
    }
    if(complexOperands){
      if(node.fn==='pow')return complexPower(a,b);
      if(node.fn==='unaryPlus')return a;
      if(node.fn==='unaryMinus')return complexNumber(realPart(a).neg(),imaginaryPart(a).neg());
      if(args.length<2)throw useNumericalEvaluator;
      return args.reduce((left,right)=>complexBinary(node.fn,left,right));
    }
    switch (node.fn) {
      case 'add': return checked(args.reduce((sum,value)=>sum.plus(value),zero));
      case 'subtract': return checked(a.minus(b));
      case 'multiply': return checked(args.reduce((product,value)=>product.times(value),new Decimal(1)));
      case 'divide': return checked(a.div(b));
      case 'unaryMinus': return a.neg();
      case 'unaryPlus': return a;
      case 'factorial': return checked(factorial(a));
      case 'pow': {
        if(complex&&b.isInteger())assert(b.abs().lt('1e10'),'指数超出范围');
        const largeIntegral=complex&&b.isInteger()&&b.abs().lt('1e10');
        assert(!node.args[1].isConstantNode||largeIntegral||b.abs().lt(10001),'指数超出范围');
        if(complex&&a.isNegative()&&!b.isInteger())throw useNumericalEvaluator;
        const fraction = a.isNegative() && !b.isInteger() ? evaluateCGRationalExpression(node.args[1].toString()) : null;
        return checked(power(a,b,fraction));
      }
    }
  }
  let result;
  try{result=evaluate(tree);}
  catch(error){if(error===useNumericalEvaluator)return null;throw error;}
  if(hasImaginaryPart(result)){
    return {
      value:math.complex(result.re.toNumber(),result.im.toNumber()),
      exact:{kind:'cw-complex-decimal',re:result.re.toString(),im:result.im.toString()},
    };
  }
  return scalarResult(result);
}
