// Completion inserts validated mathematical notation, never executable JS.
const slot=String.raw`\left(#?\right)`;
const unary=(name,latex,zh,en,modes)=>({name,signature:name+'(x)',latex:latex+slot,zh,en,modes});
const entries=[
  {name:'sqrt',signature:'sqrt(x)',latex:String.raw`\sqrt{#?}`,zh:'平方根',en:'Square root'},
  {name:'cbrt',signature:'cbrt(x)',latex:String.raw`\sqrt[3]{#?}`,zh:'立方根',en:'Cube root'},
  {name:'nthRoot',signature:'nthRoot(x, n)',latex:String.raw`\sqrt[#?]{#?}`,zh:'n 次方根',en:'Nth root'},
  ...[['sin','正弦','Sine'],['cos','余弦','Cosine'],['tan','正切','Tangent'],['sinh','双曲正弦','Hyperbolic sine'],['cosh','双曲余弦','Hyperbolic cosine'],['tanh','双曲正切','Hyperbolic tangent']].map(([name,zh,en])=>unary(name,'\\'+name,zh,en)),
  ...[['asin','arcsin','反正弦','Inverse sine'],['acos','arccos','反余弦','Inverse cosine'],['atan','arctan','反正切','Inverse tangent']].flatMap(([name,command,zh,en])=>[unary(name,'\\'+command,zh,en),unary(command,'\\'+command,zh,en)]),
  ...[['asinh','arsinh'],['acosh','arcosh'],['atanh','artanh']].map(([name,command])=>unary(name,'\\operatorname{'+command+'}','反双曲函数','Inverse hyperbolic function')),
  unary('ln',String.raw`\ln`,'自然对数','Natural logarithm'),
  unary('log',String.raw`\log`,'常用对数（底数 10）','Base-10 logarithm'),
  {name:'logbase',signature:'log(x, base)',latex:String.raw`\log_{#?}\left(#?\right)`,zh:'指定底数对数',en:'Logarithm with a specified base'},
  {name:'exp',signature:'exp(x)',latex:'e^{#?}',zh:'自然指数',en:'Natural exponential'},
  {name:'abs',signature:'abs(x)',latex:String.raw`\left|#?\right|`,zh:'绝对值 / 模',en:'Absolute value / magnitude'},
  ...[['nCr','组合','Combinations'],['nPr','排列','Permutations'],['gcd','最大公约数','Greatest common divisor'],['lcm','最小公倍数','Least common multiple'],['mod','取余','Remainder']].map(([name,zh,en])=>({name,signature:name+'(a, b)',latex:'\\operatorname{'+name+'}\\left(#?,#?\\right)',zh,en})),
  ...[['conj','共轭','Conjugate'],['re','实部','Real part'],['im','虚部','Imaginary part'],['arg','辐角','Argument']].map(([name,zh,en])=>unary(name,'\\operatorname{'+name+'}',zh,en,['complex'])),
  ...[['det','行列式','Determinant'],['inv','逆矩阵','Inverse'],['transpose','转置','Transpose']].map(([name,zh,en])=>unary(name,'\\operatorname{'+name+'}',zh,en,['matrix'])),
  ...[['dot','点积','Dot product'],['cross','叉积','Cross product']].map(([name,zh,en])=>({name,signature:name+'(u, v)',latex:'\\operatorname{'+name+'}\\left(#?,#?\\right)',zh,en,modes:['vector']})),
  unary('norm',String.raw`\operatorname{norm}`,'向量模','Vector magnitude',['vector']),
  {name:'pi',signature:'π',latex:String.raw`\pi`,zh:'圆周率',en:'Pi'},
  {name:'Ans',signature:'Ans',latex:String.raw`\mathrm{Ans}`,zh:'上次答案',en:'Previous answer'},
];

export function completionCatalog({model,mode='calc',definitions={}}){
  if(!model||mode==='base')return [];
  const dataMode=mode==='matrix'||mode==='vector';
  const result=entries.filter(entry=>(!entry.modes||entry.modes.includes(mode))&&!(dataMode&&entry.name==='abs'));
  if(model.registeredFunctions&&mode!=='graph')for(const name of model.functionNames||['f','g'])if(definitions[name])result.push(unary(name,'\\operatorname{'+name+'}','已注册函数','Registered function'));
  if(mode==='matrix')for(const name of model.matrixNames||['MatA','MatB','MatC','MatD'])result.push({name,signature:name,latex:'\\mathbf{'+name.at(-1)+'}',zh:'矩阵变量',en:'Matrix variable'});
  if(mode==='vector')for(const name of model.vectorNames||['VctA','VctB','VctC','VctD']){const label=model.vectorLabels?.[name]||name;result.push({name:label,signature:label,latex:'\\vec{'+(model.vectorLabels?.[name]||name.at(-1))+'}',zh:'向量变量',en:'Vector variable'});}
  // In data modes, the notation layer reserves plain A–D for matrices/vectors.
  // Do not label those symbols as scalar variables or offer ambiguous bars.
  for(const name of model.variables)if(!(dataMode&&/^[ABCD]$/.test(name)))result.push({name,signature:name,latex:name,zh:'存储变量',en:'Stored variable'});
  return result;
}

export function completionMatches(prefix,context,{explicit=false}={}){
  if(!explicit&&prefix.length<2)return [];
  const lower=prefix.toLowerCase();
  return completionCatalog(context).filter(entry=>entry.name.toLowerCase().startsWith(lower))
    .sort((a,b)=>Number(a.name.toLowerCase()!==lower)-Number(b.name.toLowerCase()!==lower)||a.name.localeCompare(b.name,'en'));
}

// MathLive offsets are atom boundaries, not indices into a LaTeX string.
// Read single-letter atoms only; structural/group boundaries stop the scan.
export function readMathPrefix(field){
  const ranges=field.selection?.ranges;
  if(!ranges||ranges.length!==1||ranges[0][0]!==ranges[0][1])return null;
  const end=field.position;let start=end,text='';
  while(start>0&&end-start<40){const atom=field.getValue(start-1,start,'latex').trim();if(!/^[A-Za-z]$/.test(atom))break;text=atom+text;start--;}
  return {text,start,end};
}
