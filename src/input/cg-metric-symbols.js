import {CG_METRIC_UNITS,resolveCGMetricUnit} from '../engine/cg-metric-conversion.js';

// Stable letters-only control words are derived from IDs rather than catalog
// order. These original display macros contain no CASIO add-in/firmware code.
const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const encoded=id=>Array.from(id,c=>alphabet[Math.floor(c.charCodeAt(0)/26)]+alphabet[c.charCodeAt(0)%26]).join('');
const unitMacro=id=>'CGMetricUnit'+encoded(id),arrowMacro='CGMetricArrow';
const byMacro=new Map(CG_METRIC_UNITS.map(unit=>[unitMacro(unit.id),unit]));
const texEscape=value=>value.replace(/[\\{}%_#$&]/g,c=>'\\'+c).replaceAll(' ','\\,').replaceAll('²','^{2}').replaceAll('³','^{3}').replaceAll('₂','_{2}').replaceAll('·','\\cdot ');
function unitBody(unit){if(unit.id==='angstrom')return '\\mathring{\\mathrm{A}}';if(unit.id==='um'||unit.id==='us')return '\\mu\\mathrm{'+(unit.id==='um'?'m':'s')+'}';if(/^deg[CFR]$/.test(unit.id))return '{}^{\\circ}\\mathrm{'+unit.id.at(-1)+'}';const calorie=/^(k?cal)(?:_(th|IT)|(15))$/.exec(unit.id);if(calorie)return '\\mathrm{'+calorie[1]+'}_{\\mathrm{'+(calorie[2]||calorie[3])+'}}';if(unit.id==='cal_th_s')return '\\mathrm{cal}_{\\mathrm{th}}/\\mathrm{s}';return '\\mathrm{'+texEscape(unit.display)+'}';}
export const CG_METRIC_MACROS=Object.freeze({...Object.fromEntries([...byMacro].map(([macro,unit])=>[macro,Object.freeze({def:'\\left['+unitBody(unit)+'\\right]',args:0,expand:false,captureSelection:true})])),[arrowMacro]:Object.freeze({def:'\\mathbin{\\blacktriangleright}',args:0,expand:false,captureSelection:true})});
export function metricUnitLatex(id){return '\\'+unitMacro(resolveCGMetricUnit(typeof id==='object'?id.id:id).id)+' ';}
export const metricArrowLatex=()=>'\\'+arrowMacro+' ';
export function metricUnitToken(id){const unit=resolveCGMetricUnit(typeof id==='object'?id.id:id);return {kind:'metric-unit',unitId:unit.id,name:'['+unit.display+']',parserName:unitMacro(unit.id),canonical:'['+unit.id+']'};}
export const metricArrowToken=()=>({kind:'metric-arrow',name:'▶',parserName:arrowMacro,canonical:'▶'});
export function cgMetricSymbolSource(name){const unit=byMacro.get(name);return unit?'['+unit.id+']':name===arrowMacro?'▶':null;}

function literalMask(source,latex=false){const mask=new Uint8Array(source.length);let quote='';for(let i=0;i<source.length;i++){const c=source[i];if(quote){mask[i]=1;if(c==='\\'&&i+1<source.length)mask[++i]=1;else if(c===quote)quote='';continue;}if(c==='"'||!latex&&c==="'"){quote=c;mask[i]=1;continue;}if(latex&&c==='\\'){const text=/^\\(?:text|texttt|textrm|verb)\s*\{/.exec(source.slice(i));if(text){let level=1,end=i+text[0].length;for(;end<source.length&&level;end++){if(source[end]==='\\'){end++;continue;}if(source[end]==='{')level++;if(source[end]==='}')level--;}mask.fill(1,i,end);i=end-1;}}}return mask;}
const indexReference=/(?:\bList\s*(?:\d{1,2}|Ans)|\bMat\s*(?:[A-Z]|Ans)|\bVct\s*(?:[A-Z]|Ans))$/i;
/** Source offsets use UTF-16. Quotes, numeric indices and tightly attached
 * List/Mat/Vct indices are not unit commands. A naked [N] remains ambiguous
 * with a single-element List unless the caller supplies explicit context.
 */
export function scanCGMetricSource(source,{allowStandalone=false}={}){if(typeof source!=='string'||source.length>40000)return [];const mask=literalMask(source),spans=[];for(let i=0;i<source.length;i++){if(mask[i])continue;if(source[i]==='▶'){spans.push({...metricArrowToken(),start:i,end:i+1,display:'▶'});continue;}if(source[i]!=='[')continue;const end=source.indexOf(']',i+1);if(end<0||source.slice(i+1,end).includes('['))continue;let unit;try{unit=resolveCGMetricUnit(source.slice(i+1,end));}catch{continue;}const prefix=source.slice(0,i),trimmed=prefix.trimEnd(),last=trimmed.at(-1),hasBoundary=/\s$/.test(prefix),isIndex=indexReference.test(trimmed)&&!hasBoundary;if(isIndex){i=end;continue;}const operand=!!last&&(/[\p{L}\p{N}_)}\]]/u.test(last)||last==='▶'),standalone=!trimmed&&(allowStandalone||unit.id.length>1);if(!operand&&!standalone){i=end;continue;}const token=metricUnitToken(unit.id);spans.push({...token,start:i,end:end+1,display:token.name});i=end;}return spans;}
/** Resolve opaque commands to parser symbols before the host parses the whole
 * formula. Keeping the complete syntax tree preserves nested parentheses,
 * fractions and function arguments; splitting around units loses that context.
 * Literal text is never promoted into a unit command.
 */
export function cgMetricLatexToExpression(latex,readPrefix){if(typeof latex!=='string')return null;const mask=literalMask(latex,true);let changed=false;const resolved=latex.replace(/\\(CGMetricUnit[A-Z]+|CGMetricArrow)(?![A-Za-z])/g,(all,name,offset)=>{if(mask[offset]||cgMetricSymbolSource(name)===null)return all;changed=true;return '\\operatorname{'+name+'}';});return changed?readPrefix(resolved):null;}
export function metricExpressionToLatex(source,renderPrefix){if(typeof source!=='string')return null;const spans=scanCGMetricSource(source);if(!spans.length)return null;let result='',at=0;for(const span of spans){const plain=source.slice(at,span.start);if(plain.trim())result+=renderPrefix(plain);result+=span.kind==='metric-unit'?metricUnitLatex(span.unitId):metricArrowLatex();at=span.end;}const tail=source.slice(at);if(tail.trim())result+=renderPrefix(tail);return result;}
