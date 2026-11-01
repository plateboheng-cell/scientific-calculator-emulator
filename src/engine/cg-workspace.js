import {assert,decimal,compileSafe,math,normalize} from './calculator.js';
import {readOnlyCalculator} from './read-only-calculator.js';

export const CG_SHEET_ROWS=999,CG_SHEET_COLUMNS=26,CG_SHEET_CAPACITY=30*1024;
const finite=(...values)=>assert(values.every(Number.isFinite),'请输入有限实数');
const pos=address=>{const m=/^\$?([A-Z])\$?([1-9]\d{0,2})$/i.exec(String(address));assert(m,'单元格范围须为 A1:Z999');return {col:m[1].toUpperCase().charCodeAt(0)-65,row:+m[2]-1};};
const address=(col,row)=>{assert(col>=0&&col<26&&row>=0&&row<999,'单元格范围须为 A1:Z999');return String.fromCharCode(65+col)+(row+1);};
const keyOf=value=>{const p=pos(value);return address(p.col,p.row);};
export function cgRange(range){
  const parts=String(range).split(':');assert(parts.length<=2,'范围格式错误');const a=pos(parts[0]),b=pos(parts[1]||parts[0]);assert(a.row<=b.row&&a.col<=b.col,'单元格范围顺序错误');
  const keys=[];for(let row=a.row;row<=b.row;row++)for(let col=a.col;col<=b.col;col++)keys.push(address(col,row));return keys;
}
const ref=/\$?[A-Za-z]\$?[1-9]\d*/g;
const embedded=(text,index,source)=>index>0&&(/[A-Za-z_]/.test(source[index-1])||(/[\d.]/.test(source[index-1])&&/^[eE]\d+$/.test(text)));
function quotedSegments(text,outside,quoted=value=>value){
  let result='',start=0;
  for(let i=0;i<text.length;i++)if(text[i]==='"'||text[i]==="'"){
    result+=outside(text.slice(start,i));const quote=text[i];let end=i+1;
    for(;end<text.length;end++){if(text[end]==='\\'){end++;continue;}if(text[end]===quote)break;}
    assert(end<text.length,'文本引号未闭合');result+=quoted(text.slice(i,end+1));i=end;start=end+1;
  }
  return result+outside(text.slice(start));
}
const textLiteral=source=>{if(source[0]==="'"){if(source.length>1&&source.endsWith("'")){try{const node=math.parse(source);if(node.isConstantNode&&typeof node.value==='string')return node.value;}catch{/* An apostrophe prefix may contain arbitrary text. */}}return source.slice(1);}try{const value=JSON.parse(source);if(typeof value==='string')return value;}catch{/* The native editor also accepts a leading quote without a closing quote. */}return source.slice(1);};
const cellConstant=value=>typeof value==='string'?JSON.stringify(value):decimal(value,15);
const aggregateNames=['Sum','Mean','Average','Min','Max','Prod','Count','CountA','Median','StdDev','Variance'];
const arithmetic={add:'CGAdd',subtract:'CGSubtract',multiply:'CGMultiply',divide:'CGDivide',pow:'CGPower',mod:'CGMod',unaryMinus:'CGNegative',unaryPlus:'CGPositive',factorial:'CGFactorial',equal:'CGEqual',unequal:'CGUnequal',larger:'CGGreater',smaller:'CGLess',largerEq:'CGGreaterEqual',smallerEq:'CGLessEqual'};
const stringFunctions=['Len','Length','Left','Right','Mid','Concat','Concatenate','StrJoin','Upper','Lower','Trim','Text'];
export function shiftCGReferences(source,dx,dy){return quotedSegments(source,part=>part.replace(ref,(text,index,whole)=>{if(embedded(text,index,whole))return text;const p=pos(text),m=/^(\$?)[A-Z](\$?)\d+$/i.exec(text);const col=p.col+(m[1]?0:dx),row=p.row+(m[2]?0:dy);assert(col>=0&&col<26&&row>=0&&row<999,'复制后的引用超出 A1:Z999');return m[1]+String.fromCharCode(65+col)+m[2]+(row+1);}));}
export class CGSpreadsheet {
  constructor(calculator,data={}){
    this.calculator=calculator;this.cells={};this.values={};this.selected='A1';
    for(const [key,value]of Object.entries(data?.cells||{})){try{const a=keyOf(key);if(typeof value==='string'&&value.length<=1500)this.cells[a]=value;}catch{/* Ignore malformed persisted cells. */}}
    try{this.selected=keyOf(data.selected||'A1');}catch{/* Default selected cell. */}
  }
  source(key){return this.cells[keyOf(key)]||'';}
  get(key){return this.source(key);}
  clear(){this.cells={};this.values={};this.selected='A1';}
  usedBytes(cells=this.cells){return new TextEncoder().encode(JSON.stringify(cells)).byteLength;}
  checkMemory(cells){const size=this.usedBytes(cells);assert(size<=CG_SHEET_CAPACITY||size<this.usedBytes(),'电子表格超过 30KB 存储容量');}
  evaluate(source,cells=this.cells,cache={},visiting=new Set()){
    assert(typeof source==='string'&&source.length>0&&source.length<=1500,'不支持的单元格算式');
    if(!source.startsWith('=')&&(source[0]==='"'||source[0]==="'"))return textLiteral(source);
    const read=raw=>{
      const key=keyOf(raw);assert(!visiting.has(key),'循环引用错误');
      if(Object.hasOwn(cache,key)){if(cache[key].error)throw new Error(cache[key].error);return cache[key].value;}
      if(!cells[key])return 0;visiting.add(key);
      try{const value=this.evaluate(cells[key],cells,cache,visiting);cache[key]={value};return value;}finally{visiting.delete(key);}
    };
    const literals={};let literalIndex=0;
    let expression=quotedSegments(source.replace(/^=/,''),part=>normalize(part).replaceAll('≠','!=').replaceAll('≤','<=').replaceAll('≥','>=').replace(/(?<![<>!=])=(?!=)/g,'=='),part=>{const node=math.parse(part);assert(node.isConstantNode&&typeof node.value==='string','文本格式错误');const key='__cg_text_'+literalIndex++;literals[key]=node.value;return key;});
    let balance=0;for(const character of expression){if(character==='(')balance++;if(character===')')balance--;assert(balance>=0,'括号不匹配');}expression+=')'.repeat(balance);
    expression=expression.replace(/\b((?:Cell)?(?:Sum|Mean|Average|Min|Max|Prod|CountA?|Median|StdDev|Variance))\s*\(\s*(\$?[A-Za-z]\$?\d+)\s*:\s*(\$?[A-Za-z]\$?\d+)\s*\)/gi,(_,name,from,to)=>'CGRange'+name.replace(/^Cell/i,'')+'('+JSON.stringify(from+':'+to)+')');
    expression=quotedSegments(expression,part=>part.replace(ref,(text,index,whole)=>embedded(text,index,whole)?text:'CGCell('+JSON.stringify(text)+')'));
    const numeric=value=>{assert(typeof value==='number'&&Number.isFinite(value),'文本不能用于数值运算');return value;};
    const text=value=>{assert(['string','number','boolean'].includes(typeof value),'文本函数参数错误');return typeof value==='number'?decimal(numeric(value),15):String(value);};
    const count=(value,minimum=0)=>{numeric(value);assert(Number.isInteger(value)&&value>=minimum&&value<=1500,'文本位置或长度超出范围');return value;};
    const aggregate=(kind,values)=>{
      const numbers=values.filter(value=>typeof value==='number'&&Number.isFinite(value));
      if(kind==='CountA')return values.length;if(kind==='Count')return numbers.length;
      assert(numbers.length||['Sum','Prod'].includes(kind),'范围中没有数值数据');
      if(kind==='Sum')return numbers.reduce((s,x)=>s+x,0);if(kind==='Prod')return numbers.reduce((s,x)=>s*x,1);
      if(kind==='Mean'||kind==='Average')return numbers.reduce((s,x)=>s+x,0)/numbers.length;
      if(kind==='Min')return Math.min(...numbers);if(kind==='Max')return Math.max(...numbers);
      if(kind==='Median'){numbers.sort((a,b)=>a-b);const m=Math.floor(numbers.length/2);return numbers.length%2?numbers[m]:(numbers[m-1]+numbers[m])/2;}
      assert(numbers.length>1,'样本统计量至少需要两项');const mean=numbers.reduce((s,x)=>s+x,0)/numbers.length,variance=numbers.reduce((s,x)=>s+(x-mean)**2,0)/(numbers.length-1);return kind==='Variance'?variance:Math.sqrt(variance);
    };
    const functions={CGCell:read,CGAdd:(a,b)=>numeric(a)+numeric(b),CGSubtract:(a,b)=>numeric(a)-numeric(b),CGMultiply:(a,b)=>numeric(a)*numeric(b),CGDivide:(a,b)=>{numeric(a);numeric(b);assert(b!==0,'除数不能为零');return a/b;},CGPower:(a,b)=>numeric(a)**numeric(b),CGMod:(a,b)=>{numeric(a);numeric(b);assert(b!==0,'除数不能为零');return a%b;},CGNegative:a=>-numeric(a),CGPositive:numeric,CGFactorial:a=>math.factorial(numeric(a)),CGEqual:(a,b)=>a===b,CGUnequal:(a,b)=>a!==b,CGGreater:(a,b)=>numeric(a)>numeric(b),CGLess:(a,b)=>numeric(a)<numeric(b),CGGreaterEqual:(a,b)=>numeric(a)>=numeric(b),CGLessEqual:(a,b)=>numeric(a)<=numeric(b),Len:value=>text(value).length,Length:value=>text(value).length,Left:(value,n=1)=>text(value).slice(0,count(n)),Right:(value,n=1)=>{n=count(n);return n?text(value).slice(-n):'';},Mid:(value,start,n=1500)=>text(value).slice(count(start,1)-1,count(start,1)-1+count(n)),Concat:(...values)=>values.map(text).join(''),Concatenate:(...values)=>values.map(text).join(''),StrJoin:(...values)=>values.map(text).join(''),Upper:value=>text(value).toUpperCase(),Lower:value=>text(value).toLowerCase(),Trim:value=>text(value).trim(),Text:text};
    for(const name of aggregateNames){functions[name]=(...values)=>aggregate(name,values);functions['CGRange'+name]=range=>aggregate(name,cgRange(range).filter(key=>cells[key]).map(read));}
    const aliases=Object.fromEntries([...aggregateNames,...stringFunctions].flatMap(name=>[[name.toLowerCase(),name],['cell'+name.toLowerCase(),name]]));
    const rewrite=node=>{
      const next=node.map(child=>rewrite(child));
      if(next.isFunctionNode){const name=next.fn.name||'';if(['if','cellif'].includes(name.toLowerCase())){assert(next.args.length===3,'CellIf 需要条件及两个结果');return new math.ConditionalNode(...next.args);}const canonical=aliases[name.toLowerCase()]||Object.keys(functions).find(key=>key.toLowerCase()===name.toLowerCase());if(canonical)return new math.FunctionNode(canonical,next.args);}
      if(next.isOperatorNode&&arithmetic[next.fn])return new math.FunctionNode(arithmetic[next.fn],next.args);
      return next;
    };
    const node=rewrite(math.parse(expression)),allowed=[...(this.calculator.functionNames?.()||[]),...Object.keys(functions)];
    const code=compileSafe(node.toString(),allowed);let value=code.evaluate(this.calculator.scope({...functions,...literals}));
    if(typeof value==='boolean')value=value?1:0;
    assert(typeof value==='string'||typeof value==='number'&&Number.isFinite(value)&&Math.abs(value)<1e100,'单元格结果须为文本或有限实数');if(typeof value==='string')assert(value.length<=1500,'文本结果过长');return value;
  }
  recalculate(){const cache={};for(const [key,source]of Object.entries(this.cells)){if(Object.hasOwn(cache,key))continue;try{cache[key]={value:this.evaluate(source,this.cells,cache,new Set([key]))};}catch(e){cache[key]={error:e.message};}}this.values=cache;return cache;}
  value(key){key=keyOf(key);this.recalculate();if(this.values[key]?.error)throw new Error(this.values[key].error);return this.values[key]?.value??0;}
  set(key,source){
    key=keyOf(key);source=String(source);source=/^\s*["']/.test(source)?source.trimStart():source.trim();assert(source.length<=1500,'单元格算式过长');const next={...this.cells};
    if(!source)delete next[key];else {next[key]=source.startsWith('=')?source:cellConstant(this.evaluate(source));if(source.startsWith('='))this.evaluate(source,next,{},new Set([key]));}
    this.checkMemory(next);this.cells=next;this.recalculate();return this;
  }
  copy(from,to,cut=false){
    const keys=cgRange(from),origin=pos(keys[0]),dest=pos(to),next={...this.cells};
    if(cut)for(const key of keys)delete next[key];
    for(const key of keys){const p=pos(key),target=address(dest.col+p.col-origin.col,dest.row+p.row-origin.row),source=this.cells[key];if(source)next[target]=!cut&&source.startsWith('=')?shiftCGReferences(source,dest.col-origin.col,dest.row-origin.row):source;else delete next[target];}
    this.checkMemory(next);this.cells=next;this.recalculate();return this;
  }
  fill(range,source){
    const keys=cgRange(range),origin=pos(keys[0]),next={...this.cells};source=String(source);source=/^\s*["']/.test(source)?source.trimStart():source.trim();assert(source.length<=1500,'单元格算式过长');
    for(const key of keys){const p=pos(key);if(!source)delete next[key];else next[key]=source.startsWith('=')?shiftCGReferences(source,p.col-origin.col,p.row-origin.row):cellConstant(this.evaluate(source));}
    this.checkMemory(next);
    this.cells=next;this.recalculate();return this;
  }
  serialize(){return {cells:{...this.cells},selected:this.selected};}
  save(){return this.serialize();}
}

function range(start,end,step,limit=1000,integers=false){
  finite(start,end,step);assert(step>0&&end>=start,'范围须递增且步长为正');if(integers)assert([start,end,step].every(Number.isInteger),'递推范围须为整数');
  const count=Math.floor((end-start)/step+1e-10)+1;assert(count>=1&&count<=limit,'行数或帧数超出范围');return Array.from({length:count},(_,i)=>start+i*step);
}
function real(calculator,code,scope){const value=code.evaluate(calculator.scope(scope));assert(typeof value==='number'&&Number.isFinite(value)&&Math.abs(value)<1e100,'结果不是有限实数');return value;}
export function generateRecursion(calculator,settings={}){
  calculator=readOnlyCalculator(calculator);
  const {type='explicit',expressions=['n+1'],initial={},start=0,end=10,step=1}=settings;
  assert(['explicit','first','second'].includes(type),'未知递推类型');const indices=range(start,end,step,1000,true),codes=expressions.slice(0,3).map(s=>String(s).trim()?calculator.compile(String(s)):null);assert(codes.some(Boolean),'请输入至少一个递推式');
  const rows=[],n0=initial.n??settings.n0??0;assert(Number.isInteger(n0),'初始下标须为整数');
  if(type==='explicit')return indices.map(n=>({n,a:codes[0]?real(calculator,codes[0],{n,x:n}):null,b:codes[1]?real(calculator,codes[1],{n,x:n}):null,...(codes[2]?{c:real(calculator,codes[2],{n,x:n})}:{})}));
  assert(start>=n0&&end-n0<=10000,'递推范围须从初始下标开始，最多递推 10000 次');
  let a=initial.a0??1,b=initial.b0??1,c=initial.c0??1,ap=a,bp=b,cp=c;finite(a,b,c);const targets=new Set(indices);
  const row=n=>({n,a:codes[0]?a:null,b:codes[1]?b:null,...(codes[2]?{c}:{})});
  if(targets.has(n0))rows.push(row(n0));
  if(type==='second'){
    a=initial.a1??1;b=initial.b1??1;c=initial.c1??1;finite(a,b,c);if(targets.has(n0+1))rows.push(row(n0+1));
  }
  for(let n=n0+(type==='second'?1:0);n<end;n++){
    const scope={n:type==='second'?n-1:n,x:n,a,b,c,ap,bp,cp,a0:ap,b0:bp,c0:cp,a1:a,b1:b,c1:c};let nextA,nextB,nextC;
    try{nextA=codes[0]?real(calculator,codes[0],scope):a;nextB=codes[1]?real(calculator,codes[1],scope):b;nextC=codes[2]?real(calculator,codes[2],scope):c;}catch(e){throw new Error('n='+n+'：'+e.message);}
    ap=a;bp=b;cp=c;a=nextA;b=nextB;c=nextC;if(targets.has(n+1))rows.push(row(n+1));
  }
  return rows;
}
export function graphTable(calculator,expressions,start=0,end=10,step=1,{variables=[]}={}){
  calculator=readOnlyCalculator(calculator);
  assert(Array.isArray(expressions)&&expressions.length>0&&expressions.length<=40,'函数须有 1–40 项');const indices=range(start,end,step,1000),codes=expressions.map(s=>String(s).trim()?calculator.compile(String(s)):null);
  return indices.map(x=>{const errors=[],values=codes.map((code,i)=>{
    if(!code){errors[i]=null;return null;}
    const variable=variables[i]||'parameter',scope={x};
    if(['parameter','T','t'].includes(variable))Object.assign(scope,{T:x,t:x});
    if(['parameter','theta','θ'].includes(variable))Object.assign(scope,{theta:x,'θ':x});
    if(variable==='y')scope.y=x;
    try{errors[i]=null;return real(calculator,code,scope);}catch(e){errors[i]=e.message;return null;}
  });return {x,values,errors};});
}
export function dynamicFrames(calculator,{expression,parameter='A',start=0,end=3,step=1,xmin=-5,xmax=5,samples=100}={}){
  calculator=readOnlyCalculator(calculator);
  const frames=range(start,end,step,101);finite(xmin,xmax,samples);assert(xmax>xmin&&samples>=16&&samples<=2000&&Number.isInteger(samples),'采样窗口或数量无效');assert(frames.length*(samples+1)<=150000,'动态图采样总数超出范围');
  parameter=({Y:'y',Z:'z'}[parameter]||parameter);assert(/^[A-Wyz]$/.test(parameter)&&Object.hasOwn(calculator.vars,parameter),'请选择 X 以外的模型变量');
  const code=calculator.compile(String(expression));return frames.map(value=>({parameter,value,points:Array.from({length:samples+1},(_,i)=>{const x=xmin+(xmax-xmin)*i/samples;try{return {x,y:real(calculator,code,{x,[parameter]:value})};}catch{return null;}})}));
}
export function conicRelations(settings={}){
  const {type='circle',h=0,k=0,r=3,a=3,b=2,p=1,orientation='horizontal'}=settings;finite(h,k,r,a,b,p);assert(['circle','ellipse','hyperbola','parabola'].includes(type),'未知圆锥曲线');assert(['horizontal','vertical'].includes(orientation),'未知方向');const horizontal=orientation==='horizontal',point=(u,v)=>({x:h+(horizontal?u:v),y:k+(horizontal?v:u)}),center={x:h,y:k};
  const result={type,equation:'',center,vertices:[],foci:[],asymptotes:[],directrix:null};
  const x='(x-('+h+'))',y='(y-('+k+'))';
  if(type==='circle'){assert(r>0,'半径须为正');result.equation=x+'² + '+y+'² = '+r*r;result.vertices=[{x:h+r,y:k},{x:h-r,y:k},{x:h,y:k+r},{x:h,y:k-r}];return result;}
  if(type==='parabola'){assert(p!==0,'p 不能为零');result.center=null;result.equation=(horizontal?y:x)+'² = '+(4*p)+'×'+(horizontal?x:y);result.vertices=[{x:h,y:k}];result.foci=[point(p,0)];result.directrix={axis:horizontal?'x':'y',value:(horizontal?h:k)-p};return result;}
  assert(a>0&&b>0,'半轴长度须为正');const major=horizontal?x:y,minor=horizontal?y:x;
  if(type==='ellipse'){assert(a>=b,'长半轴 a 须不小于短半轴 b');const c=Math.sqrt(a*a-b*b);result.equation=major+'²/'+(a*a)+' + '+minor+'²/'+(b*b)+' = 1';result.vertices=[point(a,0),point(-a,0),point(0,b),point(0,-b)];result.foci=[point(c,0),point(-c,0)];}
  else {const c=Math.hypot(a,b),slope=horizontal?b/a:a/b;result.equation=major+'²/'+(a*a)+' − '+minor+'²/'+(b*b)+' = 1';result.vertices=[point(a,0),point(-a,0)];result.foci=[point(c,0),point(-c,0)];result.asymptotes=[{slope,intercept:k-slope*h},{slope:-slope,intercept:k+slope*h}];}
  return result;
}
export function conicSamples(settings={},options={}){
  const info=conicRelations(settings),{type='circle',h=0,k=0,r=3,a=3,b=2,p=1,orientation='horizontal'}=settings,{samples=360,extent=10}=options;finite(samples,extent);assert(Number.isInteger(samples)&&samples>=16&&samples<=2000&&extent>0,'采样数量或范围无效');const horizontal=orientation==='horizontal',point=(u,v)=>({x:h+(horizontal?u:v),y:k+(horizontal?v:u)});let segments;
  if(type==='circle')segments=[Array.from({length:samples+1},(_,i)=>({x:h+r*Math.cos(2*Math.PI*i/samples),y:k+r*Math.sin(2*Math.PI*i/samples)}))];
  else if(type==='ellipse')segments=[Array.from({length:samples+1},(_,i)=>point(a*Math.cos(2*Math.PI*i/samples),b*Math.sin(2*Math.PI*i/samples)))];
  else if(type==='parabola')segments=[Array.from({length:samples+1},(_,i)=>{const t=-extent+2*extent*i/samples;return point(t*t/(4*p),t);})];
  else {const tmax=Math.acosh(1+extent/a);segments=[-1,1].map(sign=>Array.from({length:samples+1},(_,i)=>{const t=-tmax+2*tmax*i/samples;return point(sign*a*Math.cosh(t),b*Math.sinh(t));}));}
  return {...info,segments};
}
