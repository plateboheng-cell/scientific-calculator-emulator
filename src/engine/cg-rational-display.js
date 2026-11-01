/**
 * Exact display sidecar; this module never calls a Calculator, scope function,
 * getter, eval, or Function. Unknown expressions return null rather than being
 * evaluated again. See CG_RATIONAL_MANUAL_EVIDENCE for the verified examples.
 *
 * Arithmetic preserves equal denominators and otherwise uses cross products.
 * The manual does not specify its intermediate-denominator algorithm. This
 * is an explicit project policy, not a claim of firmware representation parity.
 */
export const CG_RATIONAL_LIMITS=Object.freeze({digits:256,source:1500,nodes:256,depth:32,exponent:999});
export const CG_RATIONAL_MANUAL_EVIDENCE=Object.freeze({
  setup:'OS3.00 1-37: Auto default; Manual displays without reduction',
  simp:'2-26: 15/60 -> F=3,5/20 -> F=5,1/4; complex modes always reduce',
  divisor:'2-27: 27/63 Simp9 -> F=9,3/7; no available simplification leaves the value and omits F',
  error:'Appendix1: 4/8 Simp3 -> Can’t Simplify',
  divisorDomain:'Only positive integer divisor examples are documented; rejection of nonpositive/noninteger factors and identity1 producing no F are project policies awaiting device confirmation.',
  fraction:'2-23 / Appendix2: integer,numerator,denominator and separators total at most10; mixed decimal input displays decimal',
  norm:'2-13 page image: Norm1 |x|<1e-2 or |x|>=1e10; Norm2 |x|<1e-9 or |x|>=1e10',
  unverified:'Half-way rounding direction/order and intermediate Manual denominators have no example on those pages; rounding here is half-away, then notation is selected.'
});
export class CGRationalError extends Error{constructor(message,code='Math ERROR'){super(message);this.name='CGRationalError';this.code=code;}}
const fail=(message,code)=>{throw new CGRationalError(message,code);};
const abs=value=>value<0n?-value:value;
const own=(object,key)=>{const property=Object.getOwnPropertyDescriptor(object,key);return property&&Object.hasOwn(property,'value')?property.value:undefined;};
function integer(value){if(typeof value==='bigint')return bounded(value);if(typeof value==='number'){if(!Number.isSafeInteger(value))fail('Exact rational input requires a safe integer or an integer string','Exact input required');return BigInt(value);}if(typeof value!=='string'||value.length>CG_RATIONAL_LIMITS.digits+1||!/^[-+]?\d+$/.test(value))fail('Exact rational input requires an integer string','Exact input required');return bounded(BigInt(value));}
function bounded(value){if(abs(value).toString().length>CG_RATIONAL_LIMITS.digits)fail('Exact fraction exceeds the project digit budget','Memory ERROR');return value;}
function gcd(a,b){a=abs(a);b=abs(b);while(b){const next=a%b;a=b;b=next;}return a;}
function make(n,d,decimal=false){bounded(n);bounded(d);if(!d)fail('Division by zero');if(d<0n){n=-n;d=-d;}return Object.freeze({kind:'cg-rational-v1',n,d,decimal:decimal===true});}
export function createCGRational(n,d=1,{decimal=false}={}){return make(integer(n),integer(d),decimal);}
export function readCGRational(value){if(!value||typeof value!=='object'||Array.isArray(value)||own(value,'kind')!=='cg-rational-v1')return null;try{const n=integer(own(value,'n')),d=integer(own(value,'d')),decimal=own(value,'decimal');if(decimal!==undefined&&typeof decimal!=='boolean')return null;return make(n,d,decimal);}catch{return null;}}
function rational(value){const result=readCGRational(value);if(!result)fail('An exact rational sidecar is required','Exact input required');return result;}
export function cgRationalJSON(value){const result=rational(value);return {kind:result.kind,n:result.n.toString(),d:result.d.toString(),decimal:result.decimal};}
export function reduceCGRational(value){const r=rational(value),factor=gcd(r.n,r.d);return make(r.n/factor,r.d/factor,r.decimal);}
export function equalCGRational(a,b){a=rational(a);b=rational(b);return a.n*b.d===b.n*a.d;}
function power(base,exponent){let result=1n;while(exponent){if(exponent&1n)result=bounded(result*base);exponent>>=1n;if(exponent)base=bounded(base*base);}return result;}
export function combineCGRationals(left,operator,right){
  const a=rational(left),b=rational(right),decimal=a.decimal||b.decimal;
  if(operator==='+'||operator==='-'){const sign=operator==='+'?1n:-1n;return a.d===b.d?make(a.n+sign*b.n,a.d,decimal):make(a.n*b.d+sign*b.n*a.d,a.d*b.d,decimal);}
  if(operator==='*')return make(a.n*b.n,a.d*b.d,decimal);
  if(operator==='/')return make(a.n*b.d,a.d*b.n,decimal);
  if(operator==='^'){if(b.n%b.d)fail('Only integer powers have an exact rational result','Unsupported exact expression');const exponent=b.n/b.d;if(abs(exponent)>BigInt(CG_RATIONAL_LIMITS.exponent))fail('Exact exponent exceeds the project budget','Memory ERROR');if(!a.n&&exponent<=0n)fail(exponent<0n?'Division by zero':'Zero to zero power is undefined');return exponent<0n?make(power(a.d,-exponent),power(a.n,-exponent),decimal):make(power(a.n,exponent),power(a.d,exponent),decimal);}
  fail('Unsupported exact operator','Unsupported exact expression');
}
function decimalLiteral(source){
  if(typeof source!=='string'||source.length>CG_RATIONAL_LIMITS.source)fail('Decimal literal exceeds the project budget','Memory ERROR');
  const match=/^([+-]?)(?:(\d+)(?:\.(\d*))?|\.(\d+))(?:[eE]([+-]?\d+))?$/.exec(source);if(!match)fail('Not an exact decimal literal','Exact input required');
  const fraction=match[3]??match[4]??'',whole=match[2]||'0',exponent=Number(match[5]||0);if(!Number.isSafeInteger(exponent)||Math.abs(exponent)>CG_RATIONAL_LIMITS.digits)fail('Decimal exponent exceeds the project budget','Memory ERROR');let n=integer((match[1]==='-'?'-':'')+whole+fraction),scale=fraction.length-exponent;
  if(Math.abs(scale)>CG_RATIONAL_LIMITS.digits)fail('Decimal scale exceeds the project budget','Memory ERROR');return scale>=0?make(n,power(10n,BigInt(scale)),source.includes('.')||/[eE]/.test(source)):make(bounded(n*power(10n,BigInt(-scale))),1n,/[eE]/.test(source));
}
/** Parse only a bounded pure exact grammar. No calculator callbacks are accepted. */
export function evaluateCGRationalExpression(source,{variables={}}={}){
  if(typeof source!=='string'||!source.trim()||source.length>CG_RATIONAL_LIMITS.source)return null;
  const tokens=[];for(let at=0;at<source.length;){if(/\s/.test(source[at])){at++;continue;}const tail=source.slice(at),number=/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/.exec(tail),name=/^[A-Za-z_][A-Za-z0-9_]*/.exec(tail);if(number){tokens.push({type:'number',value:number[0]});at+=number[0].length;}else if(name){tokens.push({type:'name',value:name[0]});at+=name[0].length;}else if('+-*/^()×÷−'.includes(source[at])){const operator=source[at++];tokens.push({type:({'×':'*','÷':'/','−':'-'})[operator]||operator,value:operator});}else return null;if(tokens.length>CG_RATIONAL_LIMITS.nodes)return null;}
  let position=0,depth=0,nodes=0;
  const unsupported=()=>{throw new CGRationalError('Unsupported exact expression','Unsupported exact expression');};
  const count=()=>{if(++nodes>CG_RATIONAL_LIMITS.nodes)fail('Exact expression exceeds the project node budget','Memory ERROR');};
  function primary(){count();const token=tokens[position++];if(!token)unsupported();if(token.type==='number')return decimalLiteral(token.value);if(token.type==='name'){if(tokens[position]?.type==='(')unsupported();if(!variables||typeof variables!=='object')unsupported();const value=own(variables,token.value),saved=readCGRational(value);if(saved)return saved;if(typeof value==='bigint'||typeof value==='number'&&Number.isSafeInteger(value)||typeof value==='string'&&/^[-+]?\d+$/.test(value))return createCGRational(value);unsupported();}if(token.type==='('){if(++depth>CG_RATIONAL_LIMITS.depth)fail('Exact expression is nested too deeply','Memory ERROR');const result=add();if(tokens[position++]?.type!==')')unsupported();depth--;return result;}unsupported();}
  function exp(){const left=primary();if(tokens[position]?.type==='^'){position++;if(++depth>CG_RATIONAL_LIMITS.depth)fail('Exact expression is nested too deeply','Memory ERROR');const right=unary();depth--;return combineCGRationals(left,'^',right);}return left;}
  function unary(){const operator=tokens[position]?.type;if(operator==='+'||operator==='-'){position++;count();if(++depth>CG_RATIONAL_LIMITS.depth)fail('Exact expression is nested too deeply','Memory ERROR');const value=unary();depth--;return operator==='-'?make(-value.n,value.d,value.decimal):value;}return exp();}
  function multiply(){let value=unary();while(['*','/'].includes(tokens[position]?.type)){const operator=tokens[position++].type;count();value=combineCGRationals(value,operator,unary());}return value;}
  function add(){let value=multiply();while(['+','-'].includes(tokens[position]?.type)){const operator=tokens[position++].type;count();value=combineCGRationals(value,operator,multiply());}return value;}
  try{const result=add();if(position!==tokens.length)return null;return result;}catch(error){if(error instanceof CGRationalError&&error.code==='Unsupported exact expression')return null;throw error;}
}
function factorSmallest(value){if(value<2n)return null;if(value%2n===0n)return 2n;if(value%3n===0n)return 3n;let checks=0;for(let candidate=5n;candidate*candidate<=value;candidate+=6n){if(++checks>100000)fail('Prime-factor search exceeds the project budget','Time Out');if(value%candidate===0n)return candidate;if(value%(candidate+2n)===0n)return candidate+2n;}return value;}
function exactForDecimal(value){const saved=readCGRational(value);if(saved)return saved;if(typeof value==='string')return decimalLiteral(value);if(typeof value==='bigint')return make(value,1n,true);if(typeof value!=='number'||!Number.isFinite(value))fail('Decimal display requires a finite real value');if(value===0)return {n:0n,d:1n};
  // Read the IEEE754 value for rounding only. It is never offered as a
  // fraction sidecar, so no approximate result becomes manually reducible.
  const buffer=new ArrayBuffer(8),data=new DataView(buffer);data.setFloat64(0,value);const bits=data.getBigUint64(0),field=Number((bits>>52n)&2047n),mantissa=(bits&((1n<<52n)-1n))+(field?1n<<52n:0n),exponent=(field||1)-1075,n=(bits>>63n?-mantissa:mantissa);return exponent>=0?{n:n<<BigInt(exponent),d:1n}:{n,d:1n<<BigInt(-exponent)};
}
const ten=exponent=>10n**BigInt(exponent);
function rounded(n,d,places){const scaled=places>=0?n*ten(places):n,denominator=places>=0?d:d*ten(-places),quotient=scaled/denominator,remainder=scaled%denominator;return quotient+(remainder*2n>=denominator?1n:0n);}
function order10(n,d){let exponent=n.toString().length-d.toString().length;if(exponent>=0?n<d*ten(exponent):n*ten(-exponent)<d)exponent--;return exponent;}
function fixed(coefficient,exponent,{trim=true}={}){let value=coefficient.toString();if(exponent>=0)return value+'0'.repeat(exponent);const point=value.length+exponent;value=point>0?value.slice(0,point)+'.'+value.slice(point):'0.'+'0'.repeat(-point)+value;return trim?value.replace(/(\.\d*?)0+$/,'$1').replace(/\.$/,''):value;}
function exponential(coefficient,order,{trim=true}={}){let digits=coefficient.toString(),tail=digits.slice(1);if(trim)tail=tail.replace(/0+$/,'');return digits[0]+(tail?'.'+tail:'')+'e'+(order>=0?'+':'')+order;}
/** Decimal rounding has no fraction-reconstruction side effects. Norm is ten significant digits by default. */
export function formatCGDecimalDisplay(value,{mode='Norm',digits=10,norm=1}={}){
  if(mode==='Sci'&&digits===0)digits=10;
  if(!['Norm','Fix','Sci'].includes(mode)||!Number.isInteger(digits)||digits<(mode==='Fix'?0:1)||digits>(mode==='Fix'?9:10)||![1,2].includes(norm))fail('Invalid decimal display settings','Argument ERROR');const r=exactForDecimal(value),negative=r.n<0n,n=abs(r.n),d=r.d;if(!n)return mode==='Fix'&&digits?'0.'+'0'.repeat(digits):mode==='Sci'?'0'+(digits>1?'.'+'0'.repeat(digits-1):'')+'e+0':'0';
  if(mode==='Fix'){const number=rounded(n,d,digits),text=fixed(number,-digits,{trim:false});return (number&&negative?'-':'')+text;}
  let order=order10(n,d),coefficient=rounded(n,d,digits-1-order);if(coefficient>=ten(digits)){coefficient/=10n;order++;}const scientific=mode==='Sci'||order>=10||order<(norm===1?-2:-9),text=scientific?exponential(coefficient,order,{trim:mode!=='Sci'}):fixed(coefficient,order-digits+1);return (negative?'-':'')+text;
}
const decimalLatex=text=>text.replace(/^(.+)e([+-]?\d+)$/,'$1\\times10^{$2}');
function preferences(options){const simplify=options.simplify??'Auto',complex=options.complex??'real',inputOutput=options.inputOutput??'Math',fracResult=options.fracResult??'d/c',mode=options.mode??'Norm',digits=mode==='Sci'&&options.digits===0?10:options.digits??10,norm=options.norm??1;if(!['Auto','Manual'].includes(simplify)||!['real','a+bi','polar'].includes(complex)||!['Math','Line'].includes(inputOutput)||!['d/c','ab/c'].includes(fracResult)||!['Norm','Fix','Sci'].includes(mode)||!Number.isInteger(digits)||digits<(mode==='Fix'?0:1)||digits>(mode==='Fix'?9:10)||![1,2].includes(norm))fail('Invalid rational display settings','Argument ERROR');return {...options,simplify,complex,inputOutput,fracResult,mode,digits,norm};}
/** The result carries its exact answer separately from text/LaTeX and float output. */
export function formatCGRationalDisplay(value,options={}){
  const settings=preferences(options),raw=rational(value),answer=settings.simplify==='Auto'||settings.complex!=='real'?reduceCGRational(raw):raw,mode=settings.mode??'Norm',digits=settings.digits??10,norm=settings.norm??1;
  const numeric=()=>{const text=formatCGDecimalDisplay(answer,{mode,digits,norm});return {kind:'decimal',text,latex:decimalLatex(text),answer};};
  if(answer.decimal||settings.forceDecimal||mode!=='Norm')return numeric();if(answer.d===1n||!answer.n){const text=formatCGDecimalDisplay(answer,{digits,norm});return {kind:'integer',text,latex:decimalLatex(text),answer};}
  const sign=answer.n<0n?'-':'',n=abs(answer.n),d=answer.d,whole=n/d,remainder=n%d,mixed=settings.fracResult==='ab/c'&&whole>0n;
  if(mixed&&!remainder){const text=formatCGDecimalDisplay(answer,{digits,norm});return {kind:'integer',text,latex:decimalLatex(text),answer};}
  const numerator=mixed?remainder:n,characters=(mixed?whole.toString().length+1:0)+numerator.toString().length+1+d.toString().length;if(characters>10)return numeric();const text=sign+(mixed?whole+' ':'')+numerator+'/'+d,latex=sign+(mixed?whole.toString():'')+'\\frac{'+numerator+'}{'+d+'}';return {kind:'fraction',text,latex:settings.inputOutput==='Math'?latex:text,answer};
}
/** Pure replacement: invalid specified factors throw before any caller state changes. */
export function simplifyCGRational(value,{divisor,...options}={}){
  const settings={simplify:'Manual',...options},display=formatCGRationalDisplay(value,settings),answer=display.answer;if(display.kind!=='fraction')return {...display,factor:null,changed:false};let factor;
  if(divisor===undefined)factor=factorSmallest(gcd(answer.n,answer.d));else{try{factor=integer(divisor);}catch{fail('Can’t Simplify','Can’t Simplify');}if(factor<=0n||answer.n%factor||answer.d%factor)fail('Can’t Simplify','Can’t Simplify');if(factor===1n)factor=null;}
  if(!factor)return {...display,factor:null,changed:false};const next=make(answer.n/factor,answer.d/factor,answer.decimal);return {...formatCGRationalDisplay(next,settings),factor,changed:true};
}
