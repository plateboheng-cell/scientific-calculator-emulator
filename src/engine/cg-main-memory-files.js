/* Independently implemented fx-CG main-memory record codecs.
 * Format facts: Thomas Touhey's libcasio format/mcs/{cells,program,setup}.h
 * https://github.com/Lailouezzz/libcasio/tree/master/include/libcasio/format/mcs
 * https://cahute.org/topics/number-formats.html
 * Token facts cross-checked with native exports published (Unlicense) by
 * https://github.com/abppbd/Casio-Basic-Games and their matching TXT exports.
 * No libcasio/Cahute implementation or complete character table is embedded.
 * Unsupported records stay in the original archive; they are never JSON/UTF-8
 * masquerading as native data. This codec does not execute imported programs.
 */
import {assert} from './calculator.js';
import {parseG3M,encodeG3M,CASIO_FILE_LIMIT,encodeCasioCodes} from './casio-files.js';
import {cgMemoryScalar,cgMemoryJSON} from './cg-array-memory.js';
import {sanitizeCGStatistics,sanitizeCGListFile,switchCGListFile,assertCGStatisticsMemory} from './cg-statistics.js';

export const CG_MAIN_MEMORY_SOURCE_LIMIT=8*1024*1024;
const asBytes=value=>value instanceof ArrayBuffer?new Uint8Array(value):ArrayBuffer.isView(value)?new Uint8Array(value.buffer,value.byteOffset,value.byteLength):Array.isArray(value)&&value.every(n=>Number.isInteger(n)&&n>=0&&n<=255)?Uint8Array.from(value):null;
const byteCopy=value=>{const b=asBytes(value);assert(b,'Expected native bytes');return b.slice();};
const view=b=>new DataView(b.buffer,b.byteOffset,b.byteLength),real=value=>typeof value==='number'&&Number.isFinite(value)&&Math.abs(value)<1e100;
const clone=value=>globalThis.structuredClone?structuredClone(value):JSON.parse(JSON.stringify(value));
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),hex=b=>Array.from(b,n=>n.toString(16).padStart(2,'0')).join('');
const plainName=b=>{const end=b.findIndex(n=>n===0||n===255);return String.fromCharCode(...(end<0?b:b.slice(0,end)));};
const scalarNames=Array.from({length:26},(_,i)=>String.fromCharCode(65+i));
const targetNativeProgramName=name=>typeof name==='string'&&name.length>=1&&name.length<=8&&/^[\x20-\x7e]+$/.test(name);

// These byte/code-name facts are not a text encoding such as UTF-8. ASCII
// punctuation used by the arithmetic parser has dedicated native opcodes.
const tokens=new Map([
 [0x0c,'◢'],[0x0d,'\n'],[0x0e,'→'],[0x0f,'e'],[0x10,'≤'],[0x11,'≠'],[0x12,'≥'],[0x13,'⇒'],
 [0x81,'sin '],[0x82,'cos '],[0x83,'tan '],[0x85,'ln '],[0x86,'√'],[0x87,'-'],[0x89,'+'],[0x8b,'²'],
 [0x91,'asin '],[0x92,'acos '],[0x93,'atan '],[0x95,'log '],[0x97,'Abs '],[0x99,'-'],[0x9b,'⁻¹'],
 [0xa5,'exp '],[0xa6,'Int '],[0xa8,'^'],[0xa9,'*'],[0xb6,'Frac '],[0xb8,'root '],[0xb9,'/'],
 [0xc0,'Ans'],[0xc1,'Ran#'],[0xc2,'x̄'],[0xc3,'ȳ'],[0xc8,'a'],[0xc9,'b'],[0xca,'r'],[0xcb,'x̂'],[0xcc,'ŷ'],[0xcd,'r'],[0xce,'θ'],[0xd0,'π'],
 [0xd4,'Dec'],[0xd5,'Hex'],[0xd6,'Bin'],[0xd7,'Oct'],[0xd9,'Norm '],[0xda,'Deg'],[0xdb,'Rad'],[0xdc,'Gra'],[0xde,'Intg '],
 [0xe0,'Plot '],[0xe2,'Lbl '],[0xe8,'Dsz '],[0xe9,'Isz '],[0xeb,'ViewWindow '],[0xec,'Goto '],[0xed,'Prog '],
 [0x7f20,'Max('],[0x7f22,'Arg '],[0x7f24,'ReP '],[0x7f25,'ImP '],[0x7f2d,'Min('],[0x7f3a,'MOD('],
 [0x7f40,'Mat '],[0x7f41,'Trn '],[0x7f46,'Dim '],[0x7f4a,'List→Mat('],[0x7f4b,'Mat→List('],[0x7f50,'i'],[0x7f51,'List '],
 [0x7f87,'RanInt#('],[0x7f8f,'Getkey'],[0x7fb0,' And '],[0x7fb1,' Or '],[0x7fb3,'Not '],
 [0xe5b8,'⌸'],[0xe690,'←'],[0xe691,'→'],[0xe69b,'▶'],[0xe6a3,'○'],[0xe6a4,'●'],
 [0xf700,'If '],[0xf701,'Then '],[0xf702,'Else '],[0xf703,'IfEnd'],[0xf704,'For '],[0xf705,' To '],[0xf706,' Step '],[0xf707,'Next'],
 [0xf708,'While '],[0xf709,'WhileEnd'],[0xf70a,'Do'],[0xf70b,'LpWhile '],[0xf70c,'Return'],[0xf70d,'Break'],[0xf70e,'Stop'],
 [0xf710,'Locate '],[0xf718,'ClrText'],[0xf719,'ClrGraph'],[0xf71a,'ClrList '],[0xf723,'DrawStat'],
 [0xf74d,'Square'],[0xf74e,'Cross'],[0xf74f,'Dot'],[0xf79e,'Menu '],[0xf7a5,'Text '],[0xf7a7,'F-Line '],[0xf7a8,'PlotOn '],[0xf7a9,'PlotOff '],[0xf7aa,'PlotChg '],[0xf7ab,'PxlOn '],
 [0xf7c2,'AxesOn'],[0xf7c4,'LabelOn'],[0xf7d2,'AxesOff'],[0xf7d4,'LabelOff'],[0xf91e,'ClrMat '],[0xf93e,'ClrVct '],[0xf93f,'Str '],
]);
for(const [index,name]of ['NormPD','NormCD','InvNormCD','tPD','tCD','InvTCD','ChiPD','ChiCD','InvChiCD','FPD','FCD','InvFCD','BinomialPD','BinomialCD','InvBinomialCD','PoissonPD','PoissonCD','InvPoissonCD','GeoPD','GeoCD','InvGeoCD','HypergeoPD','HypergeoCD','InvHypergeoCD'].entries())tokens.set(0xf980+index,name+'(');
const registerCodeAliases=new Map([[0xc2,'CGStat_mean'],[0xc3,'CGStat_meanY'],[0xc8,'CGStat_a'],[0xc9,'CGStat_b'],[0xca,'CGStat_r']]);
// Standard TXT escapes observed literally in the paired original TXT files.
// They retain glyph identity without copying any manufacturer font bitmap.
const knownTextEscapes=new Set([0xe74d,0xe761,0xe762,0xe764,0xe765,0xe770,0xe779,0xe5e8,0xe5e9,0xe5ed,0xe5af,0xe5ea,0xe5eb,0xe6a5,0xe6a6,0xe5a7,0xe6ae,0xe5f0,0xe5f1,0xe5f2,0xe5f3,0xe5f4,0xe5f5,0xe5fb,0xe5fc,0xe6a0,0xe69c,0xe69d,0xe69a]);
const textEscape=code=>'_#'+code.toString(16).toUpperCase().padStart(code>255?4:2,'0')+'_';

export function decodeCGMainMemoryProgram(value){
 const data=byteCopy(value);assert(data.length>=10,'Truncated native program header');let end=10;const codes=[];while(end<data.length&&data[end]!==0){const first=data[end++];if([0x7f,0xe5,0xe6,0xe7,0xf7,0xf9].includes(first)){assert(end<data.length,'Truncated native program character');codes.push(first*256+data[end++]);}else codes.push(first);}const unknown=[],glyphEscapes=[];let nativeText='',source='',quoted=false,comment=false;
 for(const code of codes){let text=tokens.get(code);if(text===undefined&&code>=32&&code<127)text=String.fromCharCode(code);if(text===undefined){text=textEscape(code);if(knownTextEscapes.has(code)&&(quoted||comment))glyphEscapes.push(code);else unknown.push(code);}nativeText+=text;
  // TXT-style raw escapes distinguish an instruction displayed in a string
  // from the ASCII letters/operators that happen to look the same.
  if((quoted||comment)&&code!==0x22&&code!==0x0d)source+=code>=32&&code<127?String.fromCharCode(code):[0xe5b8,0xe690,0xe691,0xe69b,0xe6a3,0xe6a4].includes(code)?text:textEscape(code);
  else if(!quoted&&registerCodeAliases.has(code))source+=registerCodeAliases.get(code);
  else if(code===0x20||[0x2b,0x2d,0x2a,0x2f,0x5e,0xe691].includes(code)||code===0x99&&(source===''||source.endsWith('\n')))source+=textEscape(code);
  else source+=text;
  if(code===0x22&&!comment)quoted=!quoted;if(code===0x27&&!quoted)comment=true;if(code===0x0d)comment=false;
 }
 const passwordBytes=data.slice(0,8),password=plainName(passwordBytes),suffix=data.slice(end),modeBytes=data.slice(8,10);
 return {source,nativeText,codes,complete:unknown.length===0,unknownCodes:[...new Set(unknown)],glyphEscapes:[...new Set(glyphEscapes)],password,passwordBytes,modeBytes,rawBytes:data,nonzeroSuffix:suffix.some(n=>n!==0)};
}
const operatorCodes=new Set([0x0e,0x0f,0x10,0x11,0x12,0x13,0x87,0x89,0x99,0xa8,0xa9,0xb9,0xe690,0xe691]);
const encodableTokens=Array.from(tokens,([code,text])=>({code,text:text.trim()})).filter(item=>item.text&&!operatorCodes.has(item.code)&&!registerCodeAliases.has(item.code)).sort((a,b)=>b.text.length-a.text.length);
for(const [code,name]of registerCodeAliases)encodableTokens.unshift({code,text:name});
encodableTokens.unshift({code:0xcb,text:'x-hat'},{code:0xcc,text:'y-hat'},{code:0xd0,text:'pi'});
const punctuation=new Map([['+',0x89],['-',0x99],['−',0x99],['*',0xa9],['×',0xa9],['/',0xb9],['÷',0xb9],['^',0xa8],['→',0x0e],['≤',0x10],['≠',0x11],['≥',0x12],['⇒',0x13],['◢',0x0c],['π',0xd0],['θ',0xce],['²',0x8b],['⁻¹',0x9b],['⌸',0xe5b8],['←',0xe690],['○',0xe6a3],['●',0xe6a4],['▶',0xe69b]]);
function encodeProgramBody(source){
 assert(typeof source==='string'&&source.length<=40000,'Native program source exceeds the desktop limit');source=source.replace(/\r\n?/g,'\n').replace(/^'ProgramMode:RUN\n/i,'');const codes=[];let quoted=false,comment=false,operand=true;
 for(let i=0;i<source.length;){const c=source[i];if(c==='\n'){codes.push(0x0d);i++;comment=false;operand=true;continue;}if(c==='"'){codes.push(0x22);quoted=!quoted;i++;operand=false;continue;}if(!quoted&&c==="'")comment=true;
  const escape=/^_[#@]([0-9a-f]{2}|[0-9a-f]{4})_/i.exec(source.slice(i));if(escape){const code=parseInt(escape[1],16);assert(code!==0,'NUL cannot be embedded in native program text');codes.push(code);i+=escape[0].length;continue;}
  const literalToken=/^_(->| And | Or |\+|-|\*|\/)_/.exec(source.slice(i));if(literalToken){codes.push({'->':0x0e,' And ':0x7fb0,' Or ':0x7fb1,'+':0x89,'-':0x99,'*':0xa9,'/':0xb9}[literalToken[1]]);i+=literalToken[0].length;continue;}
  if(quoted||comment){const n=c.charCodeAt(0),glyph=c==='→'?0xe691:punctuation.get(c);if(n>=32&&n<=126)codes.push(n);else if(glyph!==undefined)codes.push(glyph);else throw Error('Character has no verified native encoding: '+c);i++;continue;}
  if(c===' '||c==='\t'){i++;continue;}
  const scientific=/^(?:\d+(?:\.\d*)?|\.\d+)[eE]([+-]?)(\d+)/.exec(source.slice(i));if(scientific){const raw=scientific[0],exp=raw.search(/[eE]/);codes.push(...Array.from(raw.slice(0,exp),c=>c.charCodeAt(0)),0x0f,...(scientific[1]==='-'?[0x87]:[]),...Array.from(scientific[2],c=>c.charCodeAt(0)));i+=raw.length;operand=false;continue;}
  if(source.startsWith('(-)',i)){codes.push(0x87);i+=3;operand=true;continue;}if(source.startsWith('Disps',i)){codes.push(0x0c);i+=5;operand=true;continue;}if(source.startsWith('=>',i)){codes.push(0x13);i+=2;operand=true;continue;}if(source.startsWith('->',i)){codes.push(0x0e);i+=2;operand=true;continue;}if(source.startsWith('<>',i)||source.startsWith('!=',i)){codes.push(0x11);i+=2;operand=true;continue;}if(source.startsWith('>=',i)||source.startsWith('<=',i)){codes.push(source[i]==='>'?0x12:0x10);i+=2;operand=true;continue;}
  let match;for(const token of encodableTokens){if(!source.startsWith(token.text,i))continue;const next=source[i+token.text.length],word=/[A-Za-z0-9_]$/.test(token.text);if(word&&next&&/[A-Za-z0-9_]/.test(next)&&!(['List','ClrList'].includes(token.text)&&/\d/.test(next))&&!(['Mat','Vct'].includes(token.text)&&/[A-Z]/.test(next)))continue;match=token;break;}
  if(match){codes.push(match.code);i+=match.text.length;while(source[i]===' '&&/\s$/.test(tokens.get(match.code)||''))i++;operand=![0x8b,0x9b,0xc0,0xc1,0xc2,0xc3,0xc8,0xc9,0xca,0xcb,0xcc,0xcd,0xce,0xd0,0x7f50].includes(match.code);continue;}
  if(punctuation.has(c)){codes.push(c==='-'||c==='−'?operand?0x87:0x99:punctuation.get(c));i++;operand=true;continue;}
  if(c==='r'){codes.push(0xcd);i++;operand=false;continue;}if(c==='x'||c==='y'||c==='z'){codes.push(c.toUpperCase().charCodeAt(0));i++;operand=false;continue;}
  if(/[A-Z0-9().,:?=<>[\]{}|\\]/.test(c)){codes.push(c.charCodeAt(0));i++;operand='(,[{:=<>?'.includes(c);continue;}
  throw Error('Unsupported native program text near: '+source.slice(i,i+24));
 }
 assert(!quoted,'Unclosed native program string');return encodeCasioCodes(codes);
}
export function encodeCGMainMemoryProgram(program,{original}={}){
 assert(program&&typeof program.source==='string','Program source is required');if(original&&program.source===original.source&&String(program.password??original.password)===original.password)return original.rawBytes.slice();if(original)assert(!original.nonzeroSuffix,'Unknown native program suffix cannot be rewritten safely');
 const body=encodeProgramBody(program.source),size=Math.ceil((10+body.length+1)/4)*4,out=new Uint8Array(size),password=String(program.password??original?.password??'');assert(password.length<=8&&/^[\x20-\x7e]*$/.test(password),'Password requires at most 8 native ASCII bytes');out.set(Array.from(password,c=>c.charCodeAt(0)));if(original)out.set(original.modeBytes,8);out.set(body,10);return out;
}

export function decodeCGMainMemoryBCD(value){
 const data=byteCopy(value);assert(data.length===12,'Native real requires exactly 12 bytes');const complex=(data[0]&128)!==0;data[0]&=127;const digits=Array.from(data.slice(0,9),n=>[n>>4,n&15]).flat();assert(digits.every(n=>n<10),'Unsupported native fractional/special numeric encoding');if(digits.slice(3).every(n=>n===0))return {value:0,complex,extension:data.slice(9)};let exponent=digits[0]*100+digits[1]*10+digits[2],sign=1;if(exponent>=500){sign=-1;exponent-=500;}const number=Number((sign<0?'-':'')+digits[3]+'.'+digits.slice(4).join('')+'e'+(exponent-100));assert(real(number),'Native number exceeds supported finite range');return {value:number,complex,extension:data.slice(9)};
}
export function encodeCGMainMemoryBCD(value,{complex=false,extension}={}){
 assert(real(value),'Native real must be finite and below 10^100');const out=new Uint8Array(12);if(value!==0){const [mantissa,power]=Math.abs(value).toExponential(14).split('e'),exponent=Number(power)+100+(value<0?500:0);assert(exponent>=0&&exponent<=999,'Native real exponent is outside the verified BCD range');const digits=String(exponent).padStart(3,'0')+mantissa.replace('.','');for(let i=0;i<9;i++)out[i]=Number(digits[i*2])*16+Number(digits[i*2+1]);}if(complex)out[0]|=128;if(extension){const tail=asBytes(extension);assert(tail?.length===3,'Numeric extension requires 3 bytes');out.set(tail,9);}return out;
}
function parts(value){const n=cgMemoryScalar(value);return typeof n==='number'?{re:n,im:0}:{re:n.re,im:n.im};}
export function decodeCGMainMemoryCells(value,{kind='matrix'}={}){
 const data=byteCopy(value);assert(data.length>=16,'Truncated native cells header');const rows=view(data).getUint16(8),rawColumns=view(data).getUint16(10),columns=kind==='list'?1:rawColumns,count=rows*columns;assert(rows<=999&&columns<=999&&count<=(kind==='list'||kind==='vector'?999:4096),'Native cells exceed the simulator memory budget');if(kind!=='list')assert(rows>0&&columns>0,'Native matrix dimensions must be positive');if(kind==='vector')assert(rows===1||columns===1,'Unsupported multidimensional native vector');assert(data.length>=16+count*12,'Truncated native real cell plane');const rawReals=Array.from({length:count},(_,i)=>data.slice(16+i*12,28+i*12)),reals=rawReals.map(decodeCGMainMemoryBCD),hasImaginary=reals.some(n=>n.complex),end=16+count*12*(hasImaginary?2:1);assert(data.length>=end,'Truncated native imaginary cell plane');
 const values=reals.map((n,i)=>{if(!n.complex)return n.value;const im=decodeCGMainMemoryBCD(data.slice(16+(count+i)*12,28+(count+i)*12)).value;return im===0?n.value:{re:n.value,im};}),matrix=Array.from({length:rows},(_,row)=>values.slice(row*columns,(row+1)*columns));return {kind,rows,columns,rawColumns,titleBytes:data.slice(0,8),title:plainName(data.slice(0,8)),values:kind==='list'?values:matrix,headerBytes:data.slice(0,16),rawBytes:data,hasImaginary,trailingBytes:data.slice(end)};
}
export function encodeCGMainMemoryCells(values,{kind='matrix',title,original}={}){
 title??=original?.title||'';if(kind==='vector'&&Array.isArray(values)&&!Array.isArray(values[0]))values=[values];const matrix=kind==='list'?[values]:values;assert(Array.isArray(matrix)&&matrix.every(Array.isArray),'Native cells require list/matrix values');const rows=kind==='list'?values.length:matrix.length,columns=kind==='list'?1:matrix[0]?.length,count=rows*columns;assert(rows<=999&&columns>=1&&columns<=999&&count<=(kind==='list'||kind==='vector'?999:4096)&&matrix.every(row=>kind==='list'||row.length===columns),'Native cell dimensions exceed memory budget');if(kind!=='list')assert(rows>0,'Native matrix dimensions must be positive');if(kind==='vector')assert(rows===1||columns===1,'Native vector must have one row or column');const flat=(kind==='list'?values:matrix.flat()).map(parts),imaginary=flat.some(n=>n.im!==0);if(original&&same(cgMemoryJSON(values),original.values)&&title===original.title)return original.rawBytes.slice();
 if(original){assert(original.trailingBytes.length===0,'Unknown native cell suffix cannot be rewritten safely');if(rows*columns!==original.rows*original.columns)assert(!Array.from(original.rawBytes.slice(16)).some((n,i)=>i%12>=9&&n!==0),'Unknown numeric extensions prevent safe native resizing');}
 const out=new Uint8Array(16+count*12*(imaginary?2:1));if(original)out.set(original.headerBytes);const name=Array.from(title,c=>c.charCodeAt(0));assert(name.length<=8&&name.every(n=>n>=32&&n<127),'List subname requires at most 8 ASCII bytes');out.fill(0,0,8);out.set(name);view(out).setUint16(8,rows);view(out).setUint16(10,kind==='list'?0:columns);
 if(original?.hasImaginary&&!imaginary)assert(!Array.from(original.rawBytes.slice(16+original.rows*original.columns*12)).some((n,i)=>i%12>=9&&n!==0),'Unknown imaginary numeric extensions prevent dropping the native imaginary plane');
 flat.forEach((n,i)=>{const extension=original&&i<original.rows*original.columns?original.rawBytes.slice(16+i*12+9,16+i*12+12):undefined;out.set(encodeCGMainMemoryBCD(n.re,{complex:n.im!==0,extension}),16+i*12);if(imaginary){const extension=original?.hasImaginary&&i<original.rows*original.columns?original.rawBytes.slice(16+(original.rows*original.columns+i)*12+9,16+(original.rows*original.columns+i)*12+12):undefined;out.set(encodeCGMainMemoryBCD(n.im,{extension}),16+(count+i)*12);}});return out;
}
function decodeVariables(value){const data=byteCopy(value);assert(data.length>0&&data.length%24===0&&data.length<=30*24,'Unsupported native alpha-memory length');const values=Array.from({length:data.length/24},(_,i)=>{const re=decodeCGMainMemoryBCD(data.slice(i*24,i*24+12)).value,im=decodeCGMainMemoryBCD(data.slice(i*24+12,i*24+24)).value;return im===0?re:{re,im};});return {values,rawBytes:data};}
function encodeVariable(value,originalBytes){const p=parts(value),out=new Uint8Array(24);out.set(encodeCGMainMemoryBCD(p.re,{complex:p.im!==0,extension:originalBytes?.slice(9,12)}));out.set(encodeCGMainMemoryBCD(p.im,{extension:originalBytes?.slice(21,24)}),12);return out;}

export function decodeCGMainMemorySetup(value){
 const data=byteCopy(value);assert(data.length===100||data.length===200,'Unverified native SETUP size');const settings={},angle=['Deg','Rad','Gra'][data[0x13]],complex=['real','a+bi','polar'][data[0x2a]];if(angle)settings.angle=angle;if(complex)settings.complex=complex;const display=data[0x2b]&127;if(display===0||display===16)settings.display={mode:'Norm',norm:display===0?1:2};else if(display>=32&&display<=41)settings.display={mode:'Fix',digits:display-32};else if(display>=48&&display<=57)settings.display={mode:'Sci',digits:display===48?10:display-48};settings.engineering=(data[0x2b]&128)!==0;if(data[0x20]<=1)settings.statWindow=data[0x20]===0?'Auto':'Manual';if(data[0x2e]>=1&&data[0x2e]<=6)settings.listFile=data[0x2e];if(data[0x5c]<=1)settings.quartile=data[0x5c]===0?'Std':'OnData';if(data[0x27]<=1)settings.paymentBegin=data[0x27]===0;if(data[0x28]<=1)settings.days=data[0x28]===0?365:360;return {settings,rawBytes:data};
}
export function encodeCGMainMemorySetup(settings,{original}={}){
 assert(original?.rawBytes,'Native SETUP export requires an original SETUP template; unknown settings cannot be invented');const out=original.rawBytes.slice();if(settings.angle!==undefined){const index=['Deg','Rad','Gra'].indexOf(settings.angle);assert(index>=0,'Invalid angle setting');out[0x13]=index;}if(settings.complex!==undefined){const index=['real','a+bi','polar'].indexOf(settings.complex);assert(index>=0,'Invalid complex setting');out[0x2a]=index;}if(settings.display){const d=settings.display;assert(['Norm','Fix','Sci'].includes(d.mode),'Invalid display mode');assert(d.mode==='Norm'?[1,2].includes(d.norm):Number.isInteger(d.digits)&&(d.mode==='Fix'?d.digits>=0&&d.digits<=9:d.digits>=1&&d.digits<=10),'Invalid display digits/norm');out[0x2b]=(out[0x2b]&128)|(d.mode==='Norm'?d.norm===2?16:0:d.mode==='Fix'?32+d.digits:48+(d.digits===10?0:d.digits));}if(settings.engineering!==undefined){assert(typeof settings.engineering==='boolean','Invalid engineering setting');out[0x2b]=out[0x2b]&127|(settings.engineering?128:0);}if(settings.listFile!==undefined){assert(Number.isInteger(settings.listFile)&&settings.listFile>=1&&settings.listFile<=6,'List File: 1–6');out[0x2e]=settings.listFile;}if(settings.statWindow!==undefined){assert(['Auto','Manual'].includes(settings.statWindow),'Invalid Stat Window');out[0x20]=settings.statWindow==='Auto'?0:1;}if(settings.quartile!==undefined){assert(['Std','OnData'].includes(settings.quartile),'Invalid quartile setting');out[0x5c]=settings.quartile==='OnData'?1:0;}if(settings.paymentBegin!==undefined){assert(typeof settings.paymentBegin==='boolean','Invalid payment setting');out[0x27]=settings.paymentBegin?0:1;}if(settings.days!==undefined){assert([360,365].includes(settings.days),'Invalid date mode');out[0x28]=settings.days===365?0:1;}return out;
}

async function digest(bytes){assert(globalThis.crypto?.subtle,'This runtime requires WebCrypto for native source integrity');return hex(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)));}
async function sourceSnapshot(archive,provenance){const bytes=encodeG3M(archive);assert(bytes.length<=CG_MAIN_MEMORY_SOURCE_LIMIT,'Memory Full: native archive exceeds the 8 MiB lossless-retention budget');const chunks=[];for(let i=0;i<bytes.length;i+=49152){let text='';for(const byte of bytes.subarray(i,i+49152))text+=String.fromCharCode(byte);chunks.push(btoa(text));}return {version:1,encoding:'base64-chunks',byteLength:bytes.length,sha256:await digest(bytes),chunks,...(provenance?.length?{provenance}:{} )};}
export async function restoreCGMainMemorySource(source){
 assert(source?.version===1&&source.encoding==='base64-chunks'&&Number.isInteger(source.byteLength)&&source.byteLength>=32&&source.byteLength<=CG_MAIN_MEMORY_SOURCE_LIMIT&&/^[a-f0-9]{64}$/.test(source.sha256)&&Array.isArray(source.chunks)&&source.chunks.length>=1&&source.chunks.length<=171,'Invalid retained native archive');const arrays=source.chunks.map(chunk=>{assert(typeof chunk==='string'&&chunk.length<=65536&&chunk.length%4===0&&/^[A-Za-z0-9+/]+={0,2}$/.test(chunk),'Invalid native archive base64');return Uint8Array.from(atob(chunk),c=>c.charCodeAt(0));}),size=arrays.reduce((sum,b)=>sum+b.length,0);assert(size===source.byteLength,'Retained native archive size mismatch');const bytes=new Uint8Array(size);let offset=0;for(const part of arrays){bytes.set(part,offset);offset+=part.length;}assert(await digest(bytes)===source.sha256,'Retained native archive hash mismatch');const parsed=await parseCGMainMemory(bytes);if(source.provenance!==undefined){assert(Array.isArray(source.provenance)&&source.provenance.length<=64&&source.provenance.every(item=>item&&/^[a-f0-9]{64}$/.test(item.sha256)&&Number.isInteger(item.byteLength)&&item.byteLength>=32&&item.byteLength<=CG_MAIN_MEMORY_SOURCE_LIMIT),'Invalid native archive provenance');parsed.source.provenance=clone(source.provenance);}return parsed;
}
function identity(group,file){return hex(group.nameBytes)+':'+hex(file.directoryBytes)+':'+hex(file.nameBytes)+':'+file.type;}
function classify(group,file){
 const g=plainName(group.nameBytes),name=plainName(file.nameBytes);if(g==='PROGRAM'&&file.type===1)return {kind:'program',destination:{name}};
 if(file.type===5&&/^LIST(?:FILE)?\s+\d+$/.test(g)){const match=/^1LIST(\d{1,2})$/.exec(name);if(match)return {kind:'list',destination:{file:g.startsWith('LISTFILE')?Number(g.match(/\d+$/)[0]):1,list:Number(match[1])}};}
 if(file.type===6){let match=/^(MAT|VCT)_([A-Z]|Ans|ANS)$/.exec(name);if(match){const answer=match[2]==='Ans'||match[2]==='ANS';return {kind:match[1]==='MAT'?'matrix':'vector',destination:{name:(match[1]==='MAT'?'Mat':'Vct')+(answer?'Ans':match[2]),answer}};}}
 if(g==='ALPHA MEM'&&file.type===0)return {kind:name.length===1&&/^[A-Z]$/.test(name)?'variable':'variables',destination:name.length===1?{name}:{}};
 if(g==='SETUP'&&[0,0x12,0x14].includes(file.type)&&name==='SETUP')return {kind:'setup',destination:{}};
 if(file.type===4&&/^STRING\s+\d+$/.test(g))return {kind:'string',destination:{slot:Number(g.match(/\d+$/)[0])}};
 return {kind:'unknown',destination:{}};
}
export async function parseCGMainMemory(value){
 const bytes=asBytes(value);assert(bytes&&bytes.length<=CASIO_FILE_LIMIT,'Expected a bounded native main-memory archive');const archive=parseG3M(bytes),entries=[],issues=[];
 archive.groups.forEach((group,groupIndex)=>group.files.forEach((file,fileIndex)=>{const type=classify(group,file),entry={...type,groupIndex,fileIndex,name:plainName(file.nameBytes),group:plainName(group.nameBytes),directory:plainName(file.directoryBytes),type:file.type,byteLength:file.data.length,identity:identity(group,file),status:'opaque'};
  try{if(type.kind==='program'){assert(targetNativeProgramName(type.destination.name),'Native program name is not representable in the desktop profile; original bytes retained');entry.decoded=decodeCGMainMemoryProgram(file.data);if(!entry.decoded.complete)throw Error('Unmapped native program codes: '+entry.decoded.unknownCodes.map(n=>n.toString(16)).join(', '));}
   else if(['list','matrix','vector'].includes(type.kind)){if(type.kind==='list')assert(type.destination.file>=1&&type.destination.file<=6&&type.destination.list>=1&&type.destination.list<=26,'Native List File/number exceeds supported slots');entry.decoded=decodeCGMainMemoryCells(file.data,{kind:type.kind});}
   else if(type.kind==='variable'||type.kind==='variables'){entry.decoded=decodeVariables(file.data);assert(type.kind==='variable','Compound/polar alpha-memory slot mapping is unverified; original bytes retained');assert(entry.decoded.values.length===1,'Single-variable record has more than one value');}
   else if(type.kind==='setup')entry.decoded=decodeCGMainMemorySetup(file.data);
   else throw Error(type.kind==='string'?'Native string record layout is not yet verified; original bytes retained':'Unmapped native record type; original bytes retained');entry.status='decoded';
  }catch(error){entry.issue=error.message;issues.push({groupIndex,fileIndex,name:entry.name,kind:entry.kind,message:error.message});}entries.push(entry);
 }));return {format:'g3m',archive,entries,issues,source:await sourceSnapshot(archive)};
}

export const CG_MAIN_MEMORY_CAPABILITIES=Object.freeze({program:'Native token/text subset with exact original payload reuse and explicit raw-code escapes',list:'Six List Files × 26 lists, real/complex BCD cells and ASCII subnames',matrix:'Mat A–Z and MatAns, real/complex BCD cells',vector:'Vct A–Z and VctAns, row/column real/complex BCD cells',variables:'A–Z single-variable records; unverified compound/polar alpha slots retained opaque',setup:'Known settings read/patch with an original native SETUP template',string:'Unverified layout retained opaque; no UTF-8/JSON replacement'});
function recordAt(parsed,entry){return parsed.archive.groups[entry.groupIndex].files[entry.fileIndex];}
function scalarKey(name){return {X:'x',Y:'y',Z:'z'}[name]||name;}
function conflict(existing,next,replace){return !replace&&existing!==undefined&&!same(cgMemoryJSON(existing),cgMemoryJSON(next));}
async function mergeOriginalArchives(base,incoming,{replace=false}={}){
 if(!base)return incoming.archive;const merged=parseG3M(encodeG3M(base.archive));
 for(const group of incoming.archive.groups){let target=merged.groups.find(g=>hex(g.nameBytes)===hex(group.nameBytes));if(!target){merged.groups.push(clone(group));continue;}
  for(const file of group.files){const id=identity(group,file),index=target.files.findIndex(f=>identity(target,f)===id);if(index<0){target.files.push(clone(file));continue;}const current=target.files[index];if(same(Array.from(current.data),Array.from(file.data))&&same(Array.from(current.reservedBytes),Array.from(file.reservedBytes)))continue;
   const prior=base.entries.find(entry=>entry.identity===id),next=incoming.entries.find(entry=>entry.identity===id);assert(prior?.status==='decoded'&&next?.status==='decoded','Cannot merge conflicting opaque native records without losing original data');assert(replace,'Native archive record already exists; use the reviewed replace operation');target.files[index]=clone(file);
  }
 }
 return merged;
}
/** Returns a new state. No input object, active List File, or register is mutated. */
export async function stageCGMainMemoryImport(parsed,state={},options={}){
 assert(parsed?.format==='g3m'&&parsed.archive&&Array.isArray(parsed.entries),'Parse the native main-memory archive first');const replace=options.replace===true,workspace=clone(state.workspace||{}),variables=clone(state.variables||{}),matrices=clone(state.matrices||{}),vectors=clone(state.vectors||{}),nativeAnswers=clone(state.nativeAnswers||{}),settings=clone(state.settings||{}),applied=[],skipped=[],issues=parsed.issues.slice();
 const before=workspace.nativeMainMemory?await restoreCGMainMemorySource(workspace.nativeMainMemory):null,archive=await mergeOriginalArchives(before,parsed,{replace});let statistics=sanitizeCGStatistics(workspace.statistics||{});const pendingSettings=[];
 for(const entry of parsed.entries){if(entry.status!=='decoded'){skipped.push({...entry,decoded:undefined,reason:entry.issue});continue;}const d=entry.decoded,target=entry.destination;let accepted=false;
  if(entry.kind==='program'){
   workspace.program??={programs:[],selected:0};workspace.program.programs??=[];const index=workspace.program.programs.findIndex(program=>program.name.toUpperCase()===target.name.toUpperCase());if(index>=0&&!replace&&workspace.program.programs[index].source!==d.source){skipped.push({identity:entry.identity,kind:entry.kind,name:entry.name,reason:'Program already exists'});continue;}assert(d.source.length<=40000,'Program exceeds the desktop source budget');assert(index>=0||workspace.program.programs.length<50,'Program Memory Full');const program={name:target.name,source:d.source,...(d.password?{password:d.password}:{}),nativeImported:true};if(index>=0)workspace.program.programs[index]=program;else workspace.program.programs.push(program);accepted=true;
  }else if(entry.kind==='list'){
   const fileIndex=target.file-1,index=target.list-1,file=fileIndex===statistics.listFile?statistics:statistics.listFiles[fileIndex]||sanitizeCGListFile();if(file.lists[index].length&&conflict(file.lists[index],d.values,replace)){skipped.push({identity:entry.identity,kind:entry.kind,name:entry.name,reason:'List already contains data'});continue;}file.lists[index]=cgMemoryJSON(d.values);file.names[index]=d.title.slice(0,8);file.elementColors[index]=[];if(fileIndex!==statistics.listFile)statistics.listFiles[fileIndex]=sanitizeCGListFile(file);accepted=true;
  }else if(entry.kind==='matrix'||entry.kind==='vector'){
   const collection=target.answer?nativeAnswers:entry.kind==='matrix'?matrices:vectors,key=target.answer?entry.kind:target.name;if(conflict(collection[key],d.values,replace)){skipped.push({identity:entry.identity,kind:entry.kind,name:entry.name,reason:'Array already exists'});continue;}collection[key]=cgMemoryJSON(d.values);accepted=true;
  }else if(entry.kind==='variable'||entry.kind==='variables'){
   const names=entry.kind==='variable'?[target.name]:scalarNames.slice(0,d.values.length);let count=0;for(const [index,name]of names.entries()){const key=scalarKey(name),current=variables[key];if(current!==undefined&&current!==0&&conflict(current,d.values[index],replace)){skipped.push({identity:entry.identity,kind:'variable',name,reason:'Variable already has a value'});continue;}variables[key]=cgMemoryJSON(d.values[index]);count++;}if(entry.kind==='variables'&&d.values.length>26)issues.push({identity:entry.identity,kind:entry.kind,message:'Additional native alpha slots retained without guessing polar/answer ordering'});accepted=count>0;
  }else if(entry.kind==='setup'){pendingSettings.push(d.settings);accepted=true;}
  if(accepted)applied.push({identity:entry.identity,kind:entry.kind,name:entry.name,destination:clone(target)});
 }
 for(const values of pendingSettings){Object.assign(settings,values);workspace.system??={};if(['real','a+bi','polar'].includes(values.complex))workspace.system.complex=values.complex;if(values.statWindow)statistics.autoWindow=values.statWindow==='Auto';if(values.quartile)statistics.quartile=values.quartile;if(values.listFile)statistics=switchCGListFile(statistics,values.listFile-1);}
 assertCGStatisticsMemory(statistics);workspace.statistics=statistics;const provenance=[...(before?.source.provenance||[]),...(before?[{sha256:before.source.sha256,byteLength:before.source.byteLength}]:[]),{sha256:parsed.source.sha256,byteLength:parsed.source.byteLength}];workspace.nativeMainMemory=await sourceSnapshot(archive,provenance.slice(-64));
 return {workspace,variables,matrices,vectors,nativeAnswers,settings,applied,skipped,issues,archive};
}
function newRecord(group,name,type,data,directory='main'){return {group,name,type,data,directory};}
function planKey(kind,destination){return kind+':'+(kind==='list'?destination.file+':'+destination.list:destination.name||'');}
function toNativeName(value,size){assert(typeof value==='string'&&value.length<=size&&/^[\x20-\x7e]*$/.test(value),'Native names require at most '+size+' ASCII bytes');return value;}
/** Encodes native bytes, with existing unhandled payloads carried through unchanged. */
export async function encodeCGMainMemory(state={},options={}){
 const workspace=state.workspace||{},original=state.archive?{format:'g3m',archive:state.archive}:workspace.nativeMainMemory?await restoreCGMainMemorySource(workspace.nativeMainMemory):null,base=original?original.entries?original:await parseCGMainMemory(encodeG3M(original.archive)):null,archive=base?parseG3M(encodeG3M(base.archive)):{groups:[]},selection=options.selection?new Set(options.selection):null,selected=kind=>!selection||selection.has(kind),plans=new Map(),removed=new Map();
 // An explicitly supplied runtime bank is a current snapshot, including empty
 // banks. With only an archive supplied this remains a lossless native SAVE.
 const hasRuntime=entry=>entry.kind==='program'?Array.isArray(workspace.program?.programs):entry.kind==='list'?workspace.statistics!==undefined:entry.kind==='matrix'?entry.destination.answer?state.nativeAnswers!==undefined:state.matrices!==undefined:entry.kind==='vector'?entry.destination.answer?state.nativeAnswers!==undefined:state.vectors!==undefined:entry.kind==='variable'?state.variables!==undefined:false;
 const add=(kind,destination,record,value)=>plans.set(planKey(kind,destination),{kind,destination,record,value});
 if(selected('program')&&Array.isArray(workspace.program?.programs))for(const program of workspace.program.programs){const name=toNativeName(program.name,8);add('program',{name},newRecord('PROGRAM',name,1,null,'system'),program);}
 if(selected('list')&&workspace.statistics){const stats=sanitizeCGStatistics(workspace.statistics);for(let file=0;file<6;file++){const saved=file===stats.listFile?stats:stats.listFiles[file];if(!saved)continue;for(let index=0;index<26;index++)if(saved.lists[index].length)add('list',{file:file+1,list:index+1},newRecord('LISTFILE '+(file+1),'1LIST'+(index+1),5,null),{values:saved.lists[index],title:saved.names[index]});}}
 for(const kind of ['matrix','vector'])if(selected(kind)){const collection=state[kind==='matrix'?'matrices':'vectors'];for(const [name,values]of Object.entries(collection||{})){const match=new RegExp('^'+(kind==='matrix'?'Mat':'Vct')+'([A-Z])$').exec(name);assert(match,'Invalid native array name');add(kind,{name},newRecord((kind==='matrix'?'MAT ':'VCT ')+match[1],(kind==='matrix'?'MAT_':'VCT_')+match[1],6,null),{values});}const answer=state.nativeAnswers?.[kind];if(answer)add(kind,{name:kind==='matrix'?'MatAns':'VctAns',answer:true},newRecord(kind==='matrix'?'MAT Ans':'VCT Ans',kind==='matrix'?'MAT_Ans':'VCT_Ans',6,null),{values:answer});}
 if(selected('variable'))for(const name of scalarNames){const key=scalarKey(name),value=state.variables?.[key]??state.variables?.[name];if(value!==undefined)add('variable',{name},newRecord('ALPHA MEM',name,0,encodeVariable(value),'$GLOBAL'),value);}
 if(selected('string')&&Array.isArray(workspace.strings)&&workspace.strings.some(Boolean))throw Error('Native string encoding is not verified; retained string records are preserved, not replaced by UTF-8');
 let setupWritten=false;
 for(const entry of base?.entries||[]){const group=archive.groups[entry.groupIndex],file=group.files[entry.fileIndex];if(entry.kind==='variables'&&entry.status==='decoded'&&selected('variable')&&state.variables){const bytes=file.data.slice();entry.decoded.values.slice(0,26).forEach((_,index)=>{const name=scalarNames[index],key=scalarKey(name),value=state.variables[key]??state.variables[name];if(value!==undefined){const old=entry.decoded.values[index];if(!same(cgMemoryJSON(value),old))bytes.set(encodeVariable(value,bytes.slice(index*24,index*24+24)),index*24);plans.delete(planKey('variable',{name}));}});file.data=bytes;continue;}
  if(entry.kind==='setup'&&entry.status==='decoded'&&selected('setup')&&state.settings){file.data=encodeCGMainMemorySetup(state.settings,{original:entry.decoded});setupWritten=true;continue;}
  const plan=plans.get(planKey(entry.kind,entry.destination));if(!plan){if(entry.status==='decoded'&&selected(entry.kind)&&hasRuntime(entry)){if(!removed.has(entry.groupIndex))removed.set(entry.groupIndex,new Set());removed.get(entry.groupIndex).add(entry.fileIndex);}continue;}assert(entry.status==='decoded','Cannot overwrite an opaque native record with simulator data');if(plan.kind==='program')file.data=encodeCGMainMemoryProgram(plan.value,{original:entry.decoded});else if(['list','matrix','vector'].includes(plan.kind))file.data=encodeCGMainMemoryCells(plan.value.values,{kind:plan.kind,title:plan.value.title,original:entry.decoded});else if(plan.kind==='variable'){if(!same(cgMemoryJSON(plan.value),entry.decoded.values[0]))file.data=encodeVariable(plan.value,entry.decoded.rawBytes);}plans.delete(planKey(plan.kind,plan.destination));
 }
 if(selected('setup')&&state.settings&&Object.keys(state.settings).length&&!setupWritten)throw Error('Native SETUP export requires a real template so unknown setup bytes are not invented');
 for(const plan of plans.values()){const record=plan.record;if(plan.kind==='program')record.data=encodeCGMainMemoryProgram(plan.value);else if(['list','matrix','vector'].includes(plan.kind))record.data=encodeCGMainMemoryCells(plan.value.values,{kind:plan.kind,title:plan.value.title});let group=archive.groups.find(group=>(group.name||plainName(group.nameBytes))===record.group);if(!group){group={name:record.group,files:[]};archive.groups.push(group);}group.files.push({name:record.name,directory:record.directory,type:record.type,data:record.data});}
 for(let i=0;i<archive.groups.length;i++){const opaque=options.preserveUnknown===false?new Set(base?.entries.filter(entry=>entry.groupIndex===i&&entry.status==='opaque').map(entry=>entry.fileIndex)||[]):null;archive.groups[i].files=archive.groups[i].files.filter((_,index)=>!removed.get(i)?.has(index)&&!opaque?.has(index));}archive.groups=archive.groups.filter(group=>group.files.length);
 return encodeG3M(archive);
}
