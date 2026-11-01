import {CG_METRIC_CATEGORIES,CG_METRIC_UNITS,CG_METRIC_LIMITS} from './cg-metric-data.js';
export {CG_METRIC_CATEGORIES,CG_METRIC_UNITS,CG_METRIC_LIMITS,CG_METRIC_REQUIREMENT,CG_METRIC_NATIVE_LIMITS,CG_METRIC_SOURCES} from './cg-metric-data.js';

export class CGMetricError extends Error{constructor(code,detail){super(code+(detail?': '+detail:''));this.name='CGMetricError';this.code=code;}}
const fail=(code,detail)=>{throw new CGMetricError(code,detail);};
const plainToken=value=>typeof value==='string'?value.trim().replace(/^\[([^\[\]]+)\]$/u,'$1').normalize('NFKC').replace(/\^([23])/g,'$1').replace(/[•⋅*]/g,'·').replace(/\s+/g,' ').trim():'';
const exactTokens=new Map(),foldedTokens=new Map();
for(const unit of CG_METRIC_UNITS)for(const text of [unit.id,unit.display,unit.name,...unit.aliases]){const token=plainToken(text);exactTokens.set(token,unit);const lower=token.toLowerCase(),matches=foldedTokens.get(lower)||new Set();matches.add(unit);foldedTokens.set(lower,matches);}
const naturalTokens=CG_METRIC_UNITS.flatMap(unit=>[unit.id,unit.display,unit.name,...unit.aliases].map(text=>({text,unit:unit.id}))).sort((a,b)=>b.text.length-a.text.length);
export function getCGMetricCategory(value){const category=CG_METRIC_CATEGORIES.find(row=>row.id===value||row.display===String(value).toUpperCase());return category||fail('Conversion ERROR','Unknown unit category');}
export function resolveCGMetricUnit(value,category){const token=plainToken(value);let unit=exactTokens.get(token);if(!unit){const matches=foldedTokens.get(token.toLowerCase());if(matches?.size===1)unit=[...matches][0];}if(!unit)fail('Conversion ERROR','Unknown conversion command: '+String(value));if(category&&unit.category!==getCGMetricCategory(category).id)fail('Conversion ERROR','Unit is not in the selected category');return unit;}
function pair(from,to){const source=resolveCGMetricUnit(from),target=resolveCGMetricUnit(to);if(source.category!==target.category)fail('Conversion ERROR','Choose two units from the same category');if(source.id===target.id)fail('Conversion ERROR','Choose two different conversion commands');return [source,target];}

const abs=n=>n<0n?-n:n;
function fraction(n,d=1n){if(d===0n)throw Error('Invalid conversion coefficient');if(d<0n){n=-n;d=-d;}let a=abs(n),b=d;while(b){[a,b]=[b,a%b];}return {n:n/(a||1n),d:d/(a||1n)};}
function decimal(value){if(Array.isArray(value))return fraction(BigInt(value[0]),BigInt(value[1]));const match=/^([+-]?)(\d+)(?:\.(\d*))?(?:e([+-]?\d+))?$/i.exec(String(value));if(!match)throw Error('Invalid conversion coefficient');const power=Number(match[4]||0)-(match[3]?.length||0),n=BigInt((match[1]==='-'?'-':'')+match[2]+(match[3]||''));return power>=0?fraction(n*10n**BigInt(power)):fraction(n,10n**BigInt(-power));}
const add=(a,b)=>fraction(a.n*b.d+b.n*a.d,a.d*b.d),multiply=(a,b)=>fraction(a.n*b.n,a.d*b.d),divide=(a,b)=>fraction(a.n*b.d,a.d*b.n);
// Convert the rational with one decimal-to-binary rounding, rather than rounding
// numerator and denominator independently before their division. The documented
// input range and unit ratios require fewer than 140 fractional decimal places.
function numberFromFraction(value){if(value.n===0n)return 0;const sign=value.n<0n?'-':'',n=abs(value.n),integer=n/value.d;let remainder=n%value.d,digits='';for(let i=0;remainder&&i<180;i++){remainder*=10n;digits+=String(remainder/value.d);remainder%=value.d;}return Number(sign+integer+(digits?'.'+digits:''));}
const coefficients=new Map(CG_METRIC_UNITS.map(unit=>[unit.id,{scale:decimal(unit.scale),offset:decimal(unit.offset)}]));
function real(value,label){if(typeof value!=='number')fail('Invalid Type',label+' must be a real number');if(!Number.isFinite(value)||Math.abs(value)>CG_METRIC_LIMITS.maximum)fail('Math ERROR',label+' is outside the calculator range');if(value!==0&&Math.abs(value)<CG_METRIC_LIMITS.minimumNonzero)fail('Underflow',label+' is outside the nonzero calculator range');return value;}
/** Pure, transaction-free conversion. Pass a number or a flat real-number Array.
 * Hosts using mathjs should convert a one-dimensional Matrix with toArray() first;
 * never flatten a 2D matrix into a native List implicitly.
 */
export function convertCGMetric(value,from,to){const [source,target]=pair(from,to),a=coefficients.get(source.id),b=coefficients.get(target.id),ratio=divide(a.scale,b.scale),shift=divide(add(a.offset,{n:-b.offset.n,d:b.offset.d}),b.scale);
  const one=(number,index)=>{real(number,index===undefined?'Input':'List element '+(index+1));const result=add(multiply(decimal(number),ratio),shift),converted=numberFromFraction(result);real(converted,'Result');return Object.is(converted,-0)?0:converted;};
  if(Array.isArray(value)){if(value.length<1||value.length>CG_METRIC_LIMITS.listLength)fail('Dimension ERROR','Conversion List must contain 1–999 elements');return value.map(one);}return one(value);
}
export function formatCGMetricConversion(from,to){const [source,target]=pair(from,to);return source.command+'▶'+target.command;}

/** Native categories are F1 linker, F2–F5 categories, F6 next page.
 * Unit selection is a 10-entry numeric popup (1..9,0), not F-key paging.
 * The manual2-65 examples prove cm=5 on Length page1 and in=2 on page2.
 */
export const CG_METRIC_MENU=Object.freeze({link:Object.freeze({label:'▶',token:'▶',key:'cg-f1'}),categoryPageSize:4,unitPageSize:10,unitNavigation:Object.freeze(['left','right']),sourcePage:'2-65'});
export function getCGMetricMenu(page=0){if(!Number.isInteger(page)||page<0||page>=3)fail('Argument ERROR','Conversion menu page: 0–2');return {page,next:(page+1)%3,entries:[{key:'cg-f1',label:'▶',kind:'link',token:'▶'},...Array.from({length:4},(_,i)=>{const category=CG_METRIC_CATEGORIES[page*4+i];return {key:'cg-f'+(i+2),label:category?.display||'',kind:category?'category':'blank',...(category?{category:category.id}:{})};}),{key:'cg-f6',label:'▶',kind:'next',page:(page+1)%3}]};}
export function getCGMetricUnitPages(category){const row=getCGMetricCategory(category),pages=Math.ceil(row.units.length/10);return Array.from({length:pages},(_,page)=>({page,category:row.id,title:row.display,previous:(page+pages-1)%pages,next:(page+1)%pages,selection:'numeric-popup',entries:row.units.slice(page*10,page*10+10).map((unit,index)=>({unit:unit.id,key:String((index+1)%10),label:unit.display,command:unit.command}))}));}

/** Recognize native bracket commands and a small unambiguous natural spelling.
 * Returned expression is source text for the caller's existing safe evaluator.
 * This parser neither evaluates input nor changes calculator/ListAns memories.
 */
export function parseCGMetricConversion(text){if(typeof text!=='string')return null;if(text.length>3000)fail('Syntax ERROR','Conversion expression is too long');const input=text.trim(),native=/^(.+?)\s*\[([^\[\]]+)\]\s*(?:▶|►|▸|→|->)\s*\[([^\[\]]+)\]$/us.exec(input);if(native){const [source,target]=pair(native[2],native[3]);return {expression:native[1].trim(),from:source.id,to:target.id,category:source.category,native:true};}
  const natural=/^(.+?)\s+(?:to|into)\s+(.+)$/iu.exec(input);if(!natural)return null;let target;try{target=resolveCGMetricUnit(natural[2]);}catch{return null;}const left=natural[1].trim();for(const token of naturalTokens){if(plainToken(left.slice(-token.text.length)).toLowerCase()!==plainToken(token.text).toLowerCase())continue;const expression=left.slice(0,-token.text.length).trim();if(!expression)continue;const [source,end]=pair(token.unit,target.id);return {expression,from:source.id,to:end.id,category:source.category,native:false};}return null;
}
