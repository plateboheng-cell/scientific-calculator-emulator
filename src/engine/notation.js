import { ComputeEngine } from '@cortex-js/compute-engine';
import { math, CalcError } from './calculator.js';

export const notationEngine = new ComputeEngine();
const functionNames={Sin:'sin',Cos:'cos',Tan:'tan',Arcsin:'asin',Arccos:'acos',Arctan:'atan',Sinh:'sinh',Cosh:'cosh',Tanh:'tanh',Arsinh:'asinh',Arcosh:'acosh',Artanh:'atanh',Ln:'ln',Log:'log',Lg:'log',Lb:'log2',Exp:'exp',Sqrt:'sqrt',Abs:'abs',Floor:'Intg',Ceil:'ceil',Round:'Rnd',Factorial:'factorial',GCD:'gcd',LCM:'lcm',Conjugate:'conj',Re:'re',Im:'im',Argument:'arg',Determinant:'det',Transpose:'transpose',Inverse:'inv',Norm:'norm'};
const knownFunctions=new Set(['sin','cos','tan','asin','acos','atan','sinh','cosh','tanh','asinh','acosh','atanh','log','ln','exp','sqrt','nthRoot','abs','nCr','nPr','gcd','lcm','Int','Intg','Rnd','Ran','RanInt','Pol','Rec','angle','arg','conj','re','im','det','inv','transpose','rref','identity','dot','cross','norm','angleBetween','unitVector','dms','deg','rad','gra']);
const constantNames={Pi:'pi',ExponentialE:'e',ImaginaryUnit:'i',Half:'(1/2)'};

export function mathJSONToExpression(node,context={}) {
  if(typeof node==='number')return String(node);
  if(node&&typeof node==='object'&&!Array.isArray(node)){
    if('num'in node)return String(node.num);
    if('sym'in node)return mathJSONToExpression(node.sym,context);
  }
  if(typeof node==='string'){
    if(constantNames[node])return constantNames[node];
    if(node==='Nothing'||node==='Missing'||node.startsWith("'"))throw new CalcError('请填写公式空位');
    if(context.variable&&node===context.variable)return 'x';
    if(/^[ABCD]_bold$/.test(node))return `Mat${node[0]}`;
    if(context.mode==='matrix'&&/^[ABCD]$/.test(node))return `Mat${node}`;
    if(context.mode==='vector'&&/^[ABCD]$/.test(node))return `Vct${node}`;
    if(!/^[A-Za-z][A-Za-z0-9]*$/.test(node))throw new CalcError('不支持的数学符号');
    return node;
  }
  if(!Array.isArray(node)||!node.length)throw new CalcError('请填写公式空位');
  const [head,...args]=node,read=n=>mathJSONToExpression(n,context),group=n=>`(${read(n)})`;
  if(head==='Error'||head==='Placeholder')throw new CalcError('请填写公式空位');
  if(head==='Delimiter'||head==='Style')return read(args[0]);
  if(head==='InvisibleOperator'){
    if(typeof args[0]==='string'&&knownFunctions.has(args[0])&&args[1]?.[0]==='Delimiter'){
      const a=args[1][1],values=a?.[0]==='Sequence'?a.slice(1):[a];return `${args[0]}(${values.map(read).join(',')})`;
    }
    return args.map(group).join('*');
  }
  if(head==='Add')return args.map(group).join('+');
  if(head==='Subtract')return `${group(args[0])}-${group(args[1])}`;
  if(head==='Negate')return `-(${read(args[0])})`;
  if(head==='Multiply')return args.map(group).join('*');
  if(head==='Divide'||head==='Rational')return `${group(args[0])}/${group(args[1])}`;
  if(head==='Power'){
    if(args[1]==='T'||args[1]==='True')return `transpose(${read(args[0])})`;
    return `${group(args[0])}^${group(args[1])}`;
  }
  if(head==='Root')return `nthRoot(${read(args[0])},${read(args[1])})`;
  if(head==='Square')return `${group(args[0])}^2`;
  if(head==='Equal')return args.map(read).join('=');
  if(head==='Percent')return `${group(args[0])}/100`;
  if(head==='OverVector'&&/^[ABCD]$/.test(args[0]))return `Vct${args[0]}`;
  if(head==='Tuple'||head==='List'||head==='Sequence')return `[${args.map(read).join(',')}]`;
  if(head==='Integrate'||head==='Sum'||head==='Product'){
    const range=args[1];if(!Array.isArray(range)||!['Tuple','Triple'].includes(range[0])||range.length<4)throw new CalcError('请填写上下限');
    const variable=range[1];const body=mathJSONToExpression(args[0],{...context,variable});
    return `${head==='Integrate'?'integral':head==='Sum'?'sum':'prod'}(${JSON.stringify(body)},${read(range[2])},${read(range[3])})`;
  }
  if(head==='Subscript'&&args[0]?.[0]==='EvaluateAt'&&args[0][1]?.[0]==='D'&&args[1]?.[0]==='Equal'){
    const derivative=args[0][1],body=mathJSONToExpression(derivative[1],{...context,variable:derivative[2]});
    return `diff(${JSON.stringify(body)},${read(args[1][2])})`;
  }
  if(head==='Log'&&args.length>1)return `log(${read(args[0])},${read(args[1])})`;
  if(head==='Lb')return `log(${read(args[0])},2)`;
  if(head==='Choose')return `nCr(${args.map(read).join(',')})`;
  if(head==='Abs'&&context.mode==='matrix')return `det(${read(args[0])})`;
  if(head==='Abs'&&context.mode==='vector')return `norm(${read(args[0])})`;
  if(functionNames[head])return `${functionNames[head]}(${args.map(read).join(',')})`;
  if(knownFunctions.has(head))return `${head}(${args.map(read).join(',')})`;
  throw new CalcError('不支持的数学符号');
}

export function latexToExpression(latex,context={}){
  if(!latex.trim())return '';
  if(latex.length>3000)throw new CalcError('算式过长');
  // A whole number followed by a proper numeric fraction is a mixed number.
  latex=latex.replace(/(^|[^0-9A-Za-z])(\d+)\s*\\frac(?:\{(\d+)\}|(\d))(?:\{(\d+)\}|(\d))/g,(all,prefix,whole,n1,n2,d1,d2)=>{const n=Number(n1??n2),d=Number(d1??d2);return n<d?`${prefix}\\left(${whole}+\\frac{${n}}{${d}}\\right)`:all;});
  if(context.mode==='vector')latex=latex.replace(/(\\vec\{[ABCD]\}|[ABCD])\s*\\(times|cdot)\s*(\\vec\{[ABCD]\}|[ABCD])/g,(_all,a,op,b)=>`\\operatorname{${op==='times'?'cross':'dot'}}\\left(${a},${b}\\right)`);
  return mathJSONToExpression(notationEngine.parse(latex,{form:'raw'}).json,context);
}

export function expressionToLatex(expression){
  if(!String(expression).trim())return '';
  try{return math.parse(expression).toTex({parenthesis:'auto',implicit:'hide'})
    .replace(/\\mathrm\{Mat([ABCD])\}/g,'\\mathbf{$1}')
    .replace(/\\mathrm\{Vct([ABCD])\}/g,'\\vec{$1}');}
  catch{return String(expression);}
}
