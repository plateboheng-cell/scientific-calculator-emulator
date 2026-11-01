import {CalcError} from './calculator.js';
import {cgVariableKey} from '../models/cg-variables.js';

// Original text rewriting only: no scope lookup, parsing evaluation, getters or
// numerical callbacks. Invoke before normalize() changes Int÷ into Int/.
export const CG_CALC_EXPRESSION_LIMITS=Object.freeze({source:1500,depth:32,calls:256});
export const CG_CALC_EXPRESSION_FUNCTIONS=Object.freeze(['CGIntDiv','CGRmdr','CGLogab','CGSolve','CGSolveN','CGFMin','CGFMax','CGSum','CGIntegral']);
const fail=message=>{throw new CalcError('Syntax ERROR: '+message);};
const open='([{',close=')]}',identifier=/[A-Za-z_]/,continuation=/[A-Za-z0-9_]/;
const names=new Map(['Solve','SolveN','FMin','FMax','diff','diff2','integral','sum','Sigma','logab','RndFix'].map(name=>[name.toLowerCase(),name]));
const allNumerical=new Set(['diff','diff2','integral','sum','sigma','fmin','fmax','solve','rndfix','cgfmin','cgfmax','cgsolve','cgsum','cgintegral']);
const solveNumerical=new Set(['diff2','sum','sigma','fmin','fmax','solve','cgfmin','cgfmax','cgsolve','cgsum']);
function quotedEnd(source,start){for(let i=start+1;i<source.length;i++){if(source[i]==='\\'){i++;continue;}if(source[i]===source[start])return i;}fail('unterminated string');}
function groupEnd(source,start){const stack=[];for(let i=start;i<source.length;i++){const c=source[i];if(c==='"'||c==="'"){i=quotedEnd(source,i);continue;}const opening=open.indexOf(c),closing=close.indexOf(c);if(opening>=0)stack.push(opening);else if(closing>=0){if(stack.pop()!==closing)fail('unbalanced brackets');if(!stack.length)return i;}}fail('unbalanced brackets');}
function splitArguments(source){const result=[];let at=0;for(let i=0;i<source.length;i++){const c=source[i];if(c==='"'||c==="'")i=quotedEnd(source,i);else if(open.includes(c))i=groupEnd(source,i);else if(c===','){result.push(source.slice(at,i).trim());at=i+1;}}result.push(source.slice(at).trim());return result;}
function stringBody(source){const trimmed=source.trim();if((trimmed[0]==='"'||trimmed[0]==="'")&&quotedEnd(trimmed,0)===trimmed.length-1){if(trimmed[0]==='"'){try{return {value:JSON.parse(trimmed),literal:trimmed};}catch{fail('invalid expression string');}}return {value:trimmed.slice(1,-1).replace(/\\([\\'"])/g,'$1'),literal:trimmed};}return {value:trimmed,literal:null};}
function variable(source){const value=source.trim();if(!/^(?:[A-Za-z]|theta|θ|\\theta)$/.test(value))fail('variable must be a native scalar name');const key=cgVariableKey(value);if(!key)fail('invalid variable');return key;}
function scopedVariable(source,name,key){if(name===key)return source;let result='';for(let i=0;i<source.length;i++){const c=source[i];if(c==='"'||c==="'"){const end=quotedEnd(source,i);result+=source.slice(i,end+1);i=end;continue;}if(identifier.test(c)||c==='θ'||c==='\\'&&source.slice(i).startsWith('\\theta')){let end=i+1;if(c==='\\')end=i+6;else while(end<source.length&&continuation.test(source[end]))end++;const symbol=source.slice(i,end);let next=end;while(next<source.length&&/\s/.test(source[next]))next++;result+=symbol===name&&source[next]!=='('?key:symbol;i=end-1;}else result+=c;}return result;}
function validateNested(source,forbidden){for(let i=0;i<source.length;i++){const c=source[i];if(c==='"'||c==="'"){i=quotedEnd(source,i);continue;}if(identifier.test(c)&&(i===0||!continuation.test(source[i-1]))){let end=i+1;while(continuation.test(source[end]||'')&&end<source.length)end++;const name=source.slice(i,end);let next=end;while(/\s/.test(source[next]||'')&&next<source.length)next++;if(source[next]==='('&&name!=='Sum'&&forbidden.has(name.toLowerCase()))fail('nested numerical calculation is unavailable');i=end-1;}}}
function residual(source){let at=-1;for(let i=0;i<source.length;i++){const c=source[i];if(c==='"'||c==="'")i=quotedEnd(source,i);else if(open.includes(c))i=groupEnd(source,i);else if(c==='='){if(at>=0||'!<=>'.includes(source[i-1]||' ')||source[i+1]==='=')fail('one equation equality is required');at=i;}}if(at<0)return source;const left=source.slice(0,at).trim(),right=source.slice(at+1).trim();if(!left||!right)fail('incomplete equation');return '('+left+')-('+right+')';}

function nativeCall(name,args,rewrite){
  if(args.some(arg=>!arg))fail('missing argument');
  const arity=(...counts)=>{if(!counts.includes(args.length))fail(name+' argument count');};
  if(name==='logab'){arity(2);return 'CGLogab('+args.map(rewrite).join(',')+')';}
  const forbidden=name==='Solve'||name==='SolveN'?solveNumerical:name==='RndFix'?new Set([...allNumerical,'logab','cglogab']):allNumerical;
  if(name==='SolveN')args.forEach(arg=>validateNested(stringBody(arg).value,forbidden));else validateNested(stringBody(args[0]).value,forbidden);
  if(name==='RndFix')return name+'('+args.map(rewrite).join(',')+')';
  const original=stringBody(args[0]);let bodySource=original.value;if(name==='SolveN'&&(args.length===2||args.length===4)||name==='Sigma'&&args.length>=4)bodySource=scopedVariable(bodySource,args[1].trim(),variable(args[1]));const body=rewrite(name==='Solve'||name==='SolveN'?residual(bodySource):bodySource),literal=original.literal&&body===original.value?original.literal:JSON.stringify(body);
  if(name==='Solve'){arity(2,4);return 'CGSolve('+[literal,...args.slice(1).map(rewrite)].join(',')+')';}
  if(name==='SolveN'){arity(1,2,3,4);const hasVariable=args.length===2||args.length===4,key=hasVariable?variable(args[1]):'x',bounds=args.slice(hasVariable?2:1);return 'CGSolveN('+[literal,JSON.stringify(key),...bounds.map(rewrite)].join(',')+')';}
  if(name==='FMin'||name==='FMax'){arity(3,4);return 'CG'+name+'('+[literal,...args.slice(1).map(rewrite)].join(',')+')';}
  if(name==='diff'||name==='diff2'){arity(1,2);return name+'('+[literal,args.length===1?'x':rewrite(args[1])].join(',')+')';}
  if(name==='integral'){arity(3,4);return 'CGIntegral('+[literal,...args.slice(1).map(rewrite)].join(',')+')';}
  if(name==='sum'){arity(3);return 'sum('+[literal,...args.slice(1).map(rewrite)].join(',')+')';}
  arity(4,5);
  return 'CGSum('+[literal,JSON.stringify(variable(args[1])),...args.slice(2).map(rewrite)].join(',')+')';
}

// Reassemble only multiplicative chains containing a native integer operator.
// Binary +/- and comparisons form boundaries; scientific exponent signs and
// unary signs remain in their operand. Powers/implicit products stay intact.
function integerOperators(source){
  const segments=[];let at=0,expectOperand=true;
  for(let i=0;i<source.length;i++){
    const c=source[i];if(c==='"'||c==="'"){i=quotedEnd(source,i);expectOperand=false;continue;}if(open.includes(c)){i=groupEnd(source,i);expectOperand=false;continue;}
    const integer=/^(?:Int\s*÷|Rmdr(?![A-Za-z_]))/i.exec(source.slice(i));if(integer&&(i===0||!identifier.test(source[i-1]))){i+=integer[0].length-1;expectOperand=true;continue;}
    const exponent=(c==='+'||c==='-')&&/(?:^|[^\w.])(?:\d+(?:\.\d*)?|\.\d+)[eE]$/.test(source.slice(at,i))&&/\d/.test(source[i+1]||'');
    const logical=/^(?:and|or|xor|mod)\b/i.exec(source.slice(i)),boundary=(c==='+'||c==='-'||c==='−')&&!expectOperand&&!exponent||',;:=<>!'.includes(c)||logical&&(i===0||!continuation.test(source[i-1]));
    if(boundary){segments.push(chain(source.slice(at,i)),logical?logical[0]:c);if(logical)i+=logical[0].length-1;at=i+1;expectOperand=true;continue;}
    if('*/×÷^'.includes(c)){expectOperand=true;continue;}if(!/\s/.test(c))expectOperand=false;
  }
  segments.push(chain(source.slice(at)));return segments.join('');
}
function chain(source){
  const operands=[],operators=[];let at=0;
  for(let i=0;i<source.length;i++){
    const c=source[i];if(c==='"'||c==="'"){i=quotedEnd(source,i);continue;}if(open.includes(c)){i=groupEnd(source,i);continue;}
    const native=/^Int\s*÷/i.exec(source.slice(i)),remainder=/^Rmdr(?![A-Za-z_])/i.exec(source.slice(i)),word=(native||remainder)&&(!i||!identifier.test(source[i-1]));
    if(word||'*/×÷'.includes(c)){const operator=word?(native?'CGIntDiv':'CGRmdr'):c,step=word?(native||remainder)[0].length:1;operands.push(source.slice(at,i).trim());operators.push(operator);i+=step-1;at=i+1;}
  }
  if(!operators.some(op=>op==='CGIntDiv'||op==='CGRmdr'))return source;
  operands.push(source.slice(at).trim());if(operands.some(value=>!value))fail('integer operator requires two operands');let value=operands[0];for(let i=0;i<operators.length;i++){const op=operators[i],right=operands[i+1],arithmetic=op==='×'?'*':op==='÷'?'/':op;value=op==='CGIntDiv'||op==='CGRmdr'?op+'(('+value+'),('+right+'))':'(('+value+')'+arithmetic+'('+right+'))';}return value;
}
export function rewriteCGCalcExpression(source){
  if(typeof source!=='string'||source.length>CG_CALC_EXPRESSION_LIMITS.source)fail('expression is empty or too long');let calls=0;
  const rewrite=(text,depth=0)=>{
    if(depth>CG_CALC_EXPRESSION_LIMITS.depth)fail('expression is too deep');let result='';
    for(let i=0;i<text.length;i++){
      const c=text[i];if(c==='"'||c==="'"){const end=quotedEnd(text,i);result+=text.slice(i,end+1);i=end;continue;}
      if(identifier.test(c)&&(i===0||!continuation.test(text[i-1]))){let end=i+1;while(end<text.length&&continuation.test(text[end]))end++;let next=end;while(next<text.length&&/\s/.test(text[next]))next++;if(text[next]==='('){if(++calls>CG_CALC_EXPRESSION_LIMITS.calls)fail('too many function calls');const last=groupEnd(text,next),name=text.slice(i,end),native=name==='Sum'?null:names.get(name.toLowerCase()),inside=text.slice(next+1,last);result+=native?nativeCall(native,splitArguments(inside),part=>rewrite(part,depth+1)):text.slice(i,next+1)+rewrite(inside,depth+1)+')';i=last;continue;}}
      if(open.includes(c)){const end=groupEnd(text,i);result+=c+rewrite(text.slice(i+1,end),depth+1)+text[end];i=end;continue;}
      result+=c;
    }
    return integerOperators(result);
  };return rewrite(source);
}
