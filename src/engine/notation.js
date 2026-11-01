import { ComputeEngine } from '@cortex-js/compute-engine';
import { math, CalcError } from './calculator.js';
import {CG_FINANCIAL_FUNCTION_NAMES,CG_FINANCIAL_FUNCTIONS,CG_FINANCIAL_VARIABLES} from './cg-financial-functions.js';
import {CG_STATISTICAL_FUNCTION_NAMES,CG_STATISTICAL_FUNCTIONS} from './cg-statistical-functions.js';
import {CG_NATIVE_VARIABLE_ALIASES,resolveCGNativeLatex,renderCGNativeSymbols,cgNativeVariableLatex,cgNativePrefixLatex,cgNativePostfixLatex,cgNativeFunctionLatex,cgNativeFunctionSpec} from '../input/cg-native-symbols.js';
import {cgMetricLatexToExpression,cgMetricSymbolSource,metricExpressionToLatex,metricUnitLatex,metricArrowLatex} from '../input/cg-metric-symbols.js';
import {rewriteCGMetricExpression} from './cg-metric-expression.js';
import {CG_CALC_LATEX_DICTIONARY,cgCalcFunctionSpec,cgCalcInfixSpec,cgCalcInfixLatex,resolveCGCalcLatex,prepareCGCalcFunctionDisplay} from '../input/cg-calc-symbols.js';
import {rewriteCGCalcExpression} from './cg-calc-expression.js';
import {cgVariableKey} from '../models/cg-variables.js';

export const notationEngine = new ComputeEngine();
notationEngine.latexSyntax.addEntries(CG_CALC_LATEX_DICTIONARY);
const functionNames={Sin:'sin',Cos:'cos',Tan:'tan',Arcsin:'asin',Arccos:'acos',Arctan:'atan',Sinh:'sinh',Cosh:'cosh',Tanh:'tanh',Arsinh:'asinh',Arcosh:'acosh',Artanh:'atanh',Ln:'ln',Log:'log',Lg:'log',Lb:'log2',Exp:'exp',Sqrt:'sqrt',Abs:'abs',Floor:'Intg',Ceil:'ceil',Round:'Rnd',Factorial:'factorial',GCD:'gcd',LCM:'lcm',Conjugate:'conj',Re:'re',Im:'im',Argument:'arg',Determinant:'det',Transpose:'transpose',Inverse:'inv',Norm:'norm'};
const knownFunctions=new Set(['sin','cos','tan','asin','acos','atan','sinh','cosh','tanh','asinh','acosh','atanh','log','ln','exp','sqrt','nthRoot','abs','nCr','nPr','gcd','lcm','Int','Intg','Rnd','Ran','RanInt','Pol','Rec','angle','arg','conj','re','im','det','inv','transpose','rref','identity','dot','cross','norm','angleBetween','unitVector','dms','deg','rad','gra','f','g']);
const constantNames={Pi:'pi',ExponentialE:'e',ImaginaryUnit:'i',Half:'(1/2)'};
function nativeVariableScope(node,context){const symbol=typeof node==='string'?node:node?.sym;if(typeof symbol!=='string')return null;const key=cgVariableKey(constantNames[symbol]||symbol);return key?{key,context:{...context,variable:undefined,aliases:{...context.aliases,[symbol]:key}}}:null;}
for(const name of CG_FINANCIAL_FUNCTION_NAMES)knownFunctions.add(name);
for(const name of [...CG_STATISTICAL_FUNCTION_NAMES,'ListToMat','MatToList','Med','Det','Trn','Identity','Ref','Rref','Abs','Arg','Conjg','ReP','ImP','DotP','CrossP','Angle','UnitV','Norm'])knownFunctions.add(name);
const cgMemoryReference=name=>/^(?:fn|[xyr]|[xy]t)(?:[1-9]|1\d|20)$/i.test(name);
for(const prefix of ['fn','FN','x','X','y','Y','r','R','xt','Xt','XT','yt','Yt','YT'])for(let number=1;number<=20;number++)knownFunctions.add(prefix+number);
function simpCommand(latex){let quote='';for(let index=0;index<latex.length;index++){const char=latex[index];if(quote){if(char==='\\')index++;else if(char===quote)quote='';continue;}if(char==='"'){quote=char;continue;}if(char!=='\\')continue;const literal=/^\\(?:text|texttt|textrm|verb)\s*\{/.exec(latex.slice(index));if(literal){let depth=1;index+=literal[0].length;for(;index<latex.length&&depth;index++){if(latex[index]==='\\'){index++;continue;}if(latex[index]==='{')depth++;if(latex[index]==='}')depth--;}index--;continue;}const match=/^\\CGSimp(?![A-Za-z])/.exec(latex.slice(index));if(match)return {index,length:match[0].length};}return null;}
function metricListSyntax(source){return source.split(/("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/g).map((part,index)=>index%2?part:part.replaceAll('{','[').replaceAll('}',']')).join('');}
function combineCGArrayPrefixes(latex){
  // Give the parser one named operand before parsing an optional [row,column]
  // suffix. A separate numeric List prefix is otherwise not a valid At target.
  return latex.replace(/\\operatorname\{CG(List|Str|Mat|Vct)\}\s*(\\(?:mathrm|operatorname)\{(?:Ans|[A-Zxyz])\}|Ans|[A-Zxyz]|\d+)/g,(_all,kind,token)=>{const name=token.replace(/^\\(?:mathrm|operatorname)\{([^}]+)\}$/,'$1');if(name==='Ans'&&kind!=='Str')return '\\operatorname{'+kind+'Ans}';if(kind==='Mat'||kind==='Vct'){if(!/^[A-Zxyz]$/.test(name))throw new CalcError('请选择 A–Z 数组名称');return '\\operatorname{'+kind+name.toUpperCase()+'}';}const number=Number(name),maximum=kind==='List'?26:20;if(!Number.isInteger(number)||number<1||number>maximum)throw new CalcError(kind+' 编号超出范围');return '\\operatorname{'+kind+number+'}';});
}

export function mathJSONToExpression(node,context={}) {
  if(typeof node==='number')return String(node);
  if(node&&typeof node==='object'&&!Array.isArray(node)){
    if('num'in node)return String(node.num);
    if('sym'in node)return mathJSONToExpression(node.sym,context);
  }
  if(typeof node==='string'){
    const metric=cgMetricSymbolSource(node);if(metric!==null)return metric;
    if(context.aliases?.[node])return context.aliases[node];
    if(constantNames[node])return constantNames[node];
    if(node==='Nothing'||node==='Missing'||node.startsWith("'"))throw new CalcError('请填写公式空位');
    if(context.variable&&node===context.variable)return 'x';
    if(/^[A-Z]_bold$/.test(node))return `Mat${node[0]}`;
    if(context.mode==='matrix'&&/^[ABCD]$/.test(node))return `Mat${node}`;
    if(context.mode==='vector'&&/^[ABCD]$/.test(node))return `Vct${node}`;
    if(!/^[A-Za-z][A-Za-z0-9]*$/.test(node))throw new CalcError('不支持的数学符号');
    return node;
  }
  if(!Array.isArray(node)||!node.length)throw new CalcError('请填写公式空位');
  const [head,...args]=node,read=n=>mathJSONToExpression(n,context),group=n=>`(${read(n)})`;
  const callArguments=value=>value===undefined||value==='Nothing'?[]:value?.[0]==='Sequence'?value.slice(1):[value];
  if(head==='Error'||head==='Placeholder')throw new CalcError('请填写公式空位');
  if(head==='Matrix')return read(args[0]);
  if(head==='Set')return '['+args.map(read).join(',')+']';
  if(head==='At'){const target=read(args[0]);if(!/^(?:List(?:[1-9]|1\d|2[0-6]|Ans)|(?:Mat|Vct)(?:[A-Z]|Ans))$/.test(target)||args.length<2||args.length>3)throw new CalcError('不支持的数组下标');return target+'['+args.slice(1).map(read).join(',')+']';}
  if(head==='To')return read(args[0])+'→'+read(args[1]);
  const infix=cgCalcInfixSpec(head);if(infix){if(args.length!==2)throw new CalcError('Syntax ERROR');return group(args[0])+infix.canonical+group(args[1]);}
  const nativeCall=(spec,values)=>{if(spec.parserName==='Seq'){if(values.length<4||values.length>5)throw new CalcError('Seq 参数不足');return 'Seq('+JSON.stringify(read(values[0]))+','+JSON.stringify(read(values[1]))+','+values.slice(2).map(read).join(',')+')';}const scoped=spec.parserName==='Sigma'||spec.parserName==='SolveN'&&[2,4].includes(values.length)?nativeVariableScope(values[1],context):null;return spec.parserName+'('+values.map((value,index)=>scoped&&index===0?mathJSONToExpression(value,scoped.context):scoped&&index===1?scoped.key:read(value)).join(',')+')';};
  if(cgCalcFunctionSpec(head))return nativeCall(cgCalcFunctionSpec(head),args);
  if(cgNativeFunctionSpec(head))return nativeCall(cgNativeFunctionSpec(head),args);
  if(head==='Delimiter'||head==='Style')return read(args[0]);
  if(head==='InvisibleOperator'){
    if(args.some(arg=>typeof arg==='string'&&cgMetricSymbolSource(arg)!==null)){let value='';for(const arg of args){const metric=typeof arg==='string'?cgMetricSymbolSource(arg):null;value+=metric!==null?' '+metric:(value?'*':'')+group(arg);}return value.trim();}
    if(typeof args[0]==='string'&&cgNativeFunctionSpec(args[0])&&args[1]?.[0]==='Delimiter')return nativeCall(cgNativeFunctionSpec(args[0]),callArguments(args[1][1]));
    if(typeof args[0]==='string'&&cgCalcFunctionSpec(args[0])&&args[1]?.[0]==='Delimiter')return nativeCall(cgCalcFunctionSpec(args[0]),callArguments(args[1][1]));
    if(args.some(arg=>['CGList','CGMat','CGVct','CGStr'].includes(arg))){const values=[];for(let i=0;i<args.length;i++){const prefix=args[i];if(!['CGList','CGMat','CGVct','CGStr'].includes(prefix)){values.push(group(prefix));continue;}const next=args[++i];if(next==='Ans'&&prefix!=='CGStr'){values.push(prefix.slice(2)+'Ans');continue;}if(prefix==='CGMat'||prefix==='CGVct'){if(typeof next!=='string'||!/^[A-Zxyz]$/.test(next))throw new CalcError('请选择 A–Z 数组名称');values.push(prefix.slice(2)+next.toUpperCase());}else{const index=Number(read(next)),maximum=prefix==='CGList'?26:20;if(!Number.isInteger(index)||index<1||index>maximum)throw new CalcError(prefix.slice(2)+' 编号超出范围');values.push(prefix.slice(2)+index);}}return values.length===1?values[0]:values.join('*');}
    if(['CGStat_xhat','CGStat_yhat'].includes(args.at(-1))&&args.length>=2)return args.at(-1)+'('+read(args.length===2?args[0]:['InvisibleOperator',...args.slice(0,-1)])+')';
    if(typeof args[0]==='string'&&knownFunctions.has(args[0])&&args[1]?.[0]==='Delimiter'){
      return `${args[0]}(${callArguments(args[1][1]).map(read).join(',')})`;
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
  if(head==='OverVector'&&context.aliases?.[args[0]])return context.aliases[args[0]];
  if(head==='OverVector'&&/^[A-Z]$/.test(args[0]))return `Vct${args[0]}`;
  if(head==='Tuple'||head==='List'||head==='Sequence')return `[${args.map(read).join(',')}]`;
  if(head==='Integrate'||head==='Sum'||head==='Product'){
    const range=args[1];if(!Array.isArray(range)||!['Tuple','Triple'].includes(range[0])||range.length<4)throw new CalcError('请填写上下限');
    if(head==='Sum'&&context.family==='cg'){const scoped=nativeVariableScope(range[1],context),nativeContext=scoped?.context||{...context,variable:undefined},body=mathJSONToExpression(args[0],nativeContext),variable=scoped?.key||mathJSONToExpression(range[1],nativeContext);return 'Sigma('+body+','+variable+','+read(range[2])+','+read(range[3])+')';}
    const variable=range[1];const body=mathJSONToExpression(args[0],{...context,variable});
    return `${head==='Integrate'?'integral':head==='Sum'?'sum':'prod'}(${JSON.stringify(body)},${read(range[2])},${read(range[3])})`;
  }
  if(head==='Subscript'&&args[0]?.[0]==='EvaluateAt'&&args[0][1]?.[0]==='D'&&args[1]?.[0]==='Equal'){
    let derivative=args[0][1],order=0;const variable=derivative[2]||'x';
    while(Array.isArray(derivative)&&derivative[0]==='D'){if((derivative[2]||'x')!==variable)throw new CalcError('不支持混合偏导数');order++;derivative=derivative[1];}
    if(order<1||order>2)throw new CalcError('仅支持一阶或二阶导数');
    const body=mathJSONToExpression(derivative,{...context,variable});return (order===2?'diff2':'diff')+'('+JSON.stringify(body)+','+read(args[1][2])+')';
  }
  if(head==='Log'&&args.length>1)return `log(${read(args[0])},${read(args[1])})`;
  if(head==='Lb')return `log(${read(args[0])},2)`;
  if(head==='Choose'||head==='Binomial')return `nCr(${args.map(read).join(',')})`;
  if(head==='Mod')return `mod(${args.map(read).join(',')})`;
  if(head==='Abs'&&context.mode==='matrix')return `det(${read(args[0])})`;
  if(head==='Abs'&&context.mode==='vector')return `norm(${read(args[0])})`;
  if(functionNames[head])return `${functionNames[head]}(${args.map(read).join(',')})`;
  if(knownFunctions.has(head))return `${head}(${args.map(read).join(',')})`;
  throw new CalcError('不支持的数学符号');
}

export function latexToExpression(latex,context={}){
  // Simp is a postfix command with an optional argument, not a function to
  // evaluate while reading an input field. Parse only the two ordinary pieces.
  const simp=simpCommand(latex);if(simp){if(simpCommand(latex.slice(simp.index+simp.length)))throw new CalcError('Syntax ERROR');const base=latexToExpression(latex.slice(0,simp.index),context),tail=latex.slice(simp.index+simp.length).trim();if(!base)throw new CalcError('请填写公式空位');return base+' Simp'+(tail?' '+latexToExpression(tail,context):'');}
  const metric=cgMetricLatexToExpression(latex,resolved=>latexToExpression(resolved,context));if(metric!==null)return metric;
  latex=combineCGArrayPrefixes(resolveCGCalcLatex(resolveCGNativeLatex(latex)));
  if(!latex.trim())return '';
  if(latex.length>3000)throw new CalcError('算式过长');
  const nativeTokens=[...CG_FINANCIAL_FUNCTIONS,...CG_STATISTICAL_FUNCTIONS,...CG_FINANCIAL_VARIABLES];
  latex=latex.replace(/\\operatorname\{([^}]+)\}/g,(all,name)=>{const literal=name.replaceAll('\\%','%').replaceAll('\\_','_').replace(/\\sigma\s*/g,'σ').replace(/\\Sigma\s*/g,'Σ'),token=nativeTokens.find(item=>item.name===literal);return token?'\\operatorname{'+token.parserName+'}':all;});
  context={...context,aliases:{...context.aliases,...CG_NATIVE_VARIABLE_ALIASES}};
  // A whole number followed by a proper numeric fraction is a mixed number.
  latex=latex.replace(/(^|[^0-9A-Za-z])(\d+)\s*\\frac(?:\{(\d+)\}|(\d))(?:\{(\d+)\}|(\d))/g,(all,prefix,whole,n1,n2,d1,d2)=>{const n=Number(n1??n2),d=Number(d1??d2);return n<d?`${prefix}\\left(${whole}+\\frac{${n}}{${d}}\\right)`:all;});
  if(context.mode==='vector')latex=latex.replace(/(\\vec\{[ABCDuvw]\}|[ABCDuvw])\s*\\(times|cdot)\s*(\\vec\{[ABCDuvw]\}|[ABCDuvw])/g,(_all,a,op,b)=>`\\operatorname{${op==='times'?'cross':'dot'}}\\left(${a},${b}\\right)`);
  return mathJSONToExpression(notationEngine.parse(latex,{form:'raw'}).json,context);
}

function ordinaryExpressionToLatex(expression,nativeList=false,displaySymbols=new Map()){
  try{return renderCGNativeSymbols(math.parse(expression).toTex({parenthesis:'auto',implicit:'hide',handler:(node,options)=>{if(node.isSymbolNode&&displaySymbols.has(node.name))return displaySymbols.get(node.name);if(node.isFunctionNode&&cgCalcInfixSpec(node.fn.name)&&node.args.length===2)return '\\left('+node.args[0].toTex(options)+cgCalcInfixLatex(node.fn.name)+node.args[1].toTex(options)+'\\right)';if(nativeList&&node.isAccessorNode&&node.object.isSymbolNode&&/^(?:List(?:[1-9]|1\d|2[0-6]|Ans)|(?:Mat|Vct)(?:[A-Z]|Ans))$/.test(node.object.name)){const name=node.object.name,parts=/^(Mat|Vct)(.+)$/.exec(name),object=cgNativeVariableLatex(name)||(parts?cgNativePrefixLatex(parts[1])+(parts[2]==='Ans'?'\\mathrm{Ans}':parts[2]):undefined);if(object)return object+'\\left['+node.index.dimensions.map(item=>item.toTex(options)).join(',')+'\\right]';}if(node.isSymbolNode)return node.name==='Ans'?'\\mathrm{Ans}':cgNativeVariableLatex(node.name)||(cgMemoryReference(node.name)?'\\operatorname{'+node.name+'}':undefined);if(nativeList&&node.isArrayNode&&!node.items.some(item=>item.isArrayNode))return '\\left\\{'+node.items.map(item=>item.toTex(options)).join(',')+'\\right\\}';if(node.isFunctionNode&&node.fn.name==='CGMetricConvert'&&node.args.length===3&&node.args[1].isConstantNode&&node.args[2].isConstantNode){return node.args[0].toTex(options)+metricUnitLatex(node.args[1].value)+metricArrowLatex()+metricUnitLatex(node.args[2].value);}const postfix=node.isFunctionNode&&cgNativePostfixLatex(node.fn.name);if(postfix&&node.args.length===1)return '\\left('+node.args[0].toTex(options)+'\\right)'+postfix;const fn=node.isFunctionNode&&(cgNativeFunctionLatex(node.fn.name)||(cgMemoryReference(node.fn.name)?'\\operatorname{'+node.fn.name+'}':null));if(fn)return fn+'\\left('+node.args.map(arg=>arg.toTex(options)).join(',')+'\\right)';return undefined;}})
    .replace(/\\mathrm\{Mat([ABCD])\}/g,'\\mathbf{$1}')
    .replace(/\\mathrm\{Vct([ABCD])\}/g,'\\vec{$1}')
    // Compute Engine treats upright single letters such as T and A as units.
    // Calculator variables must remain ordinary mathematical symbols on reload.
    .replace(/\\mathrm\{([A-Za-z])\}/g,'$1'));}
  catch{return String(expression);}
}
export function expressionToLatex(expression){
  expression=String(expression);if(!expression.trim())return '';
  const simp=/\s+Simp(?:\s+([^\r\n]*))?\s*$/i.exec(expression);if(simp&&!/["']/.test(expression.slice(0,simp.index)))return expressionToLatex(expression.slice(0,simp.index))+'\\CGSimp '+(simp[1]?expressionToLatex(simp[1]):'');
  try{const display=prepareCGCalcFunctionDisplay(expression,expressionToLatex),rewritten=rewriteCGMetricExpression(rewriteCGCalcExpression(display.source));if(rewritten!==expression||display.symbols.size)return ordinaryExpressionToLatex(metricListSyntax(rewritten),true,display.symbols);}catch{/* Incomplete entries remain editable without evaluating them. */}
  return metricExpressionToLatex(expression,ordinaryExpressionToLatex)??ordinaryExpressionToLatex(expression);
}
