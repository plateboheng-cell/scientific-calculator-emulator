// Original input/display definitions for native RUN-MATRIX CALC commands.
// No numerical expression is executed while constructing or reading a token.
const letters='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const encoded=name=>Array.from(name,char=>letters[Math.floor(char.charCodeAt(0)/26)]+letters[char.charCodeAt(0)%26]).join('');
const definitions=[
  ['Solve','Solve',['expression','guess','lower','upper']],
  ['SolveN','SolveN',['equation','variable','lower','upper']],
  ['FMin','FMin',['expression','lower','upper','n']],
  ['FMax','FMax',['expression','lower','upper','n']],
  ['diff','d/dx',['expression','point']],
  ['diff2','d²/dx²',['expression','point']],
  ['integral','∫',['expression','lower','upper','tolerance']],
  ['Sigma','Σ',['expression','variable','lower','upper','step']],
  ['logab','logab',['base','value']],
];
export const CG_CALC_FUNCTIONS=Object.freeze(definitions.map(([parserName,name,args])=>Object.freeze({parserName,name,args:Object.freeze(args),kind:'function',body:parserName!=='logab',macro:'CGCalcF'+encoded(parserName)})));
export const CG_CALC_INFIXES=Object.freeze([
  Object.freeze({parserName:'CGIntDiv',name:'Int÷',canonical:' Int÷ ',kind:'infix',syntax:'infix',macro:'CGCalcIntDiv'}),
  Object.freeze({parserName:'CGRmdr',name:'Rmdr',canonical:' Rmdr ',kind:'infix',syntax:'infix',macro:'CGCalcRmdr'}),
]);
const byFunction=new Map(CG_CALC_FUNCTIONS.flatMap(spec=>[[spec.parserName,spec],[spec.macro,spec],[spec.name,spec]]));
const byInfix=new Map(CG_CALC_INFIXES.flatMap(spec=>[[spec.parserName,spec],[spec.name,spec],[spec.macro,spec]]));
const label=spec=>spec.parserName==='Sigma'?'\\Sigma':spec.parserName==='integral'?'\\int':spec.parserName==='diff2'?'\\operatorname{d}^{2}/\\operatorname{dx}^{2}':'\\operatorname{'+spec.name+'}';
export const CG_CALC_MACROS=Object.freeze({...Object.fromEntries(CG_CALC_FUNCTIONS.map(spec=>[spec.macro,Object.freeze({def:label(spec),args:0,expand:false,captureSelection:true})])),...Object.fromEntries(CG_CALC_INFIXES.map(spec=>[spec.macro,Object.freeze({def:'\\mathbin{'+(spec.name==='Int÷'?'\\operatorname{Int}\\div':'\\operatorname{Rmdr}')+'}',args:0,expand:false,captureSelection:true})]))});
// Compute Engine's installed arithmetic dictionary assigns × precedence390.
// Native integer quotient/remainder have the same precedence and bind left.
export const CG_CALC_LATEX_DICTIONARY=Object.freeze(CG_CALC_INFIXES.map(spec=>Object.freeze({kind:'infix',name:spec.parserName,latexTrigger:'\\'+spec.macro,precedence:390,associativity:'left'})));
export const cgCalcFunctionSpec=name=>byFunction.get(name)||null;
export const cgCalcInfixSpec=name=>byInfix.get(name)||null;
export function cgCalcFunctionLatex(name){const spec=cgCalcFunctionSpec(name);return spec?'\\'+spec.macro+' ':null;}
export function cgCalcInfixLatex(name){const spec=cgCalcInfixSpec(name);return spec?'\\'+spec.macro+' ':null;}
export function cgCalcTokenMeta(name){const spec=cgCalcFunctionSpec(name)||cgCalcInfixSpec(name);return spec?{...spec,...(spec.args?{args:[...spec.args]}:{})}:null;}
function quoteEnd(source,start){const quote=source[start];for(let index=start+1;index<source.length;index++){if(source[index]==='\\'){index++;continue;}if(source[index]===quote)return index+1;}return source.length;}
function literalMask(source,latex=false){const mask=new Uint8Array(source.length);for(let index=0;index<source.length;index++){if(source[index]==='"'||!latex&&source[index]==="'"){const end=quoteEnd(source,index);mask.fill(1,index,end);index=end-1;continue;}if(latex&&source[index]==='\\'){const text=/^\\(?:text|texttt|textrm|verb)\s*\{/.exec(source.slice(index));if(text){let depth=1,end=index+text[0].length;for(;end<source.length&&depth;end++){if(source[end]==='\\'){end++;continue;}if(source[end]==='{')depth++;if(source[end]==='}')depth--;}mask.fill(1,index,end);index=end-1;}}}return mask;}
export function resolveCGCalcLatex(latex){const mask=literalMask(latex,true);return latex.replace(/\\(CGCalcF[A-Z]+)(?![A-Za-z])/g,(all,name,offset)=>mask[offset]||!cgCalcFunctionSpec(name)?all:'\\operatorname{'+name+'}');}
export function scanCGCalcInfixSource(source){if(typeof source!=='string'||source.length>40000)return [];const mask=literalMask(source),spans=[];for(const match of source.matchAll(/Int÷|Rmdr/g)){const start=match.index,end=start+match[0].length;if(mask[start]||/[\p{L}_]/u.test(source[start-1]||'')||/[\p{L}_]/u.test(source[end]||''))continue;const spec=cgCalcInfixSpec(match[0]);spans.push({...spec,start,end,display:spec.name});}return spans;}
function matchingClose(source,start){const stack=[')'];for(let index=start+1;index<source.length;index++){const char=source[index];if(char==='"'||char==="'"){index=quoteEnd(source,index)-1;continue;}if('([{'.includes(char))stack.push(({ '(':')','[':']','{':'}'})[char]);else if(')]}'.includes(char)){if(char!==stack.pop())return -1;if(!stack.length)return index;}}return -1;}
function splitArguments(source){const result=[];let start=0,depth=0;for(let index=0;index<source.length;index++){const char=source[index];if(char==='"'||char==="'"){index=quoteEnd(source,index)-1;continue;}if('([{'.includes(char))depth++;else if(')]}'.includes(char))depth--;else if(char===','&&!depth){result.push(source.slice(start,index).trim());start=index+1;}}result.push(source.slice(start).trim());return result;}
function bodyLatex(source,render){if(/^"/.test(source))try{const body=JSON.parse(source);if(typeof body==='string')source=body;}catch{/* Invalid source stays editable and the execution path reports it. */}let depth=0;for(let index=0;index<source.length;index++){const char=source[index];if(char==='"'||char==="'"){index=quoteEnd(source,index)-1;continue;}if('([{'.includes(char))depth++;else if(')]}'.includes(char))depth--;else if(char==='='&&!depth&&source[index-1]!=='='&&source[index+1]!=='=')return render(source.slice(0,index))+'='+render(source.slice(index+1));}return render(source);}
/** Replace complete native calls with display-only symbols before the generic
 * math parser runs. The first argument is serialized as an expression, never
 * evaluated. This also preserves the original SolveN equation on source reload.
 */
export function prepareCGCalcFunctionDisplay(source,render){const symbols=new Map();let prefix='CGCalcDisplay';while(source.includes(prefix))prefix+='Z';let result='',at=0;const mask=literalMask(source);for(let index=0;index<source.length;index++){if(mask[index]||index&&/[A-Za-z0-9_]/.test(source[index-1]))continue;const match=/^([A-Za-z][A-Za-z0-9]*)\s*\(/.exec(source.slice(index));if(!match)continue;const spec=CG_CALC_FUNCTIONS.find(spec=>spec.parserName===match[1]);if(!spec)continue;const open=index+match[0].lastIndexOf('('),close=matchingClose(source,open);if(close<0)continue;const args=splitArguments(source.slice(open+1,close)),latex=cgCalcFunctionLatex(spec.parserName)+'\\left('+args.map((arg,argIndex)=>argIndex===0&&spec.body?bodyLatex(arg,render):render(arg)).join(',')+'\\right)',symbol=prefix+symbols.size;symbols.set(symbol,latex);result+=source.slice(at,index)+symbol;at=close+1;index=close;}return {source:result+source.slice(at),symbols};}
