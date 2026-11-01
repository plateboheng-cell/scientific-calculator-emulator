// fx-CG50 Software3.00 manual1-34–1-37 and2-12–2-13.
import {assert,math,exactTex,mixedTex} from './calculator.js';
import {snapshotCGFinancialNative} from './cg-financial-functions.js';
import {readCGRational,formatCGRationalDisplay,formatCGDecimalDisplay} from './cg-rational-display.js';

const object=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
const runModes=new Set(['calc','complex','base','matrix','vector','runmatrix','run-matrix']);
const options=(values,labels=values)=>values.map((value,index)=>({value,label:labels[index]}));
export const CG_SETUP_LIMITATIONS=Object.freeze(['Intermediate Manual fraction denominators, special divisor boundaries and half-way rounding still require device confirmation.']);
const rows={
  inputOutput:{key:'inputOutput',label:'Input/Output',choices:options(['Math','Line'])},
  mode:{key:'mode',label:'Mode',choices:options(['Comp','Dec','Hex','Bin','Oct'])},
  fracResult:{key:'fracResult',label:'Frac Result',choices:options(['d/c','ab/c'])},
  angle:{key:'angle',label:'Angle',choices:options(['Deg','Rad','Gra'])},
  complex:{key:'complex',label:'Complex Mode',choices:options(['real','a+bi','polar'],['Real','a+bi','r∠θ'])},
  display:{key:'display',label:'Display',choices:options(['Fix','Sci','Norm','Eng'])},
  simplify:{key:'simplify',label:'Simplify',choices:options(['Auto','Manual'])},
  payment:{key:'payment',label:'Payment',choices:options(['BEGIN','END'])},
  days:{key:'days',label:'Date Mode',choices:options([365,360],['365','360'])},
  periods:{key:'periods',label:'Periods/YR.',choices:options([1,2],['Annual','Semi'])},
};
function contextMode(profile,mode){const current=mode||profile.mode||'calc';return runModes.has(current)&&runModes.has(profile.mode)?profile.mode:current;}
export function getCGSetupPreferences(calculator,profile={}){
  const system=object(profile.cgWorkspace?.system),format=['Norm','Fix','Sci'].includes(profile.format)?profile.format:'Norm',validDigits=Number.isInteger(profile.digits)&&profile.digits>=(format==='Fix'?0:1)&&profile.digits<=(format==='Fix'?9:10),financial=snapshotCGFinancialNative(calculator).settings;
  return {inputOutput:system.inputOutput==='Line'?'Line':'Math',fracResult:system.fracResult==='ab/c'?'ab/c':'d/c',simplify:system.simplify==='Manual'?'Manual':'Auto',angle:['Deg','Rad','Gra'].includes(calculator.angle)?calculator.angle:'Rad',complex:['real','a+bi','polar'].includes(system.complex)?system.complex:profile.mode==='complex'?'a+bi':'real',format,digits:validDigits?profile.digits:format==='Fix'?2:10,norm:system.norm===2?2:1,engineering:system.engineering===true,
    mode:profile.mode==='base'?({10:'Dec',16:'Hex',2:'Bin',8:'Oct'}[profile.base]||'Dec'):'Comp',payment:financial.begin?'BEGIN':'END',days:financial.days,periods:financial.frequency};
}
export function ensureCGSetupState(calculator,profile){
  assert(profile&&typeof profile==='object'&&!Array.isArray(profile),'SET UP requires the current profile');const preferences=getCGSetupPreferences(calculator,profile);
  if(!profile.cgWorkspace||typeof profile.cgWorkspace!=='object'||Array.isArray(profile.cgWorkspace))profile.cgWorkspace={};
  if(!profile.cgWorkspace.system||typeof profile.cgWorkspace.system!=='object'||Array.isArray(profile.cgWorkspace.system))profile.cgWorkspace.system={};
  Object.assign(profile.cgWorkspace.system,{inputOutput:preferences.inputOutput,fracResult:preferences.fracResult,simplify:preferences.simplify,complex:preferences.complex,norm:preferences.norm,engineering:preferences.engineering});calculator.angle=preferences.angle;profile.format=preferences.format;profile.digits=preferences.digits;return preferences;
}
export function effectiveCGInputOutput(profile,mode){const context=contextMode(profile,mode);return context==='program'||context==='base'?'Line':object(profile.cgWorkspace?.system).inputOutput==='Line'?'Line':'Math';}
export function getCGSetupRows(calculator,profile={},mode){
  const context=contextMode(profile,mode);let keys;
  if(runModes.has(context))keys=context==='base'?['mode']:['inputOutput','mode','fracResult','angle','complex','display','simplify'];
  else if(context==='financial'||context==='finance')keys=['payment','days','periods'];
  else if(context==='program')keys=['angle','complex','display'];
  else if(context==='equation')keys=['inputOutput','fracResult','angle','display'];
  else if(['stat','graph','dynamic','table','recursion','conic','eactivity'].includes(context))keys=['angle'];
  else keys=[];
  return keys.map(key=>({...rows[key],choices:rows[key].choices.map(choice=>({...choice}))}));
}
export function cgSetupDisplayLabel(preferences){return (preferences.format==='Norm'?'Norm'+preferences.norm:preferences.format==='Sci'?'Sci'+(preferences.digits===10?0:preferences.digits):'Fix'+preferences.digits)+(preferences.engineering?'/E':'');}
export function cgSetupRowValue(row,preferences){if(row.key==='display')return cgSetupDisplayLabel(preferences);if(row.key==='complex')return preferences.complex==='real'?'Real':preferences.complex==='polar'?'r∠θ':'a+bi';if(row.key==='payment')return preferences.payment==='BEGIN'?'Begin':'End';if(row.key==='periods')return preferences.periods===2?'Semi':'Annual';return String(preferences[row.key]);}
export function applyCGSetupChoice(calculator,profile,key,value,{mode,digit}={}){
  const row=getCGSetupRows(calculator,profile,mode).find(row=>row.key===key);assert(row,'SET UP setting is unavailable in this mode');const choice=row.choices.find(choice=>choice.value===value);assert(choice,'Invalid SET UP choice');
  if(key==='display'&&['Fix','Sci'].includes(value))assert(Number.isInteger(digit)&&digit>=0&&digit<=9,'Choose one digit0–9');
  const preferences=ensureCGSetupState(calculator,profile),system=profile.cgWorkspace.system;
  if(key==='angle')calculator.angle=value;
  else if(key==='inputOutput')system.inputOutput=value;
  else if(key==='fracResult')system.fracResult=value;
  else if(key==='simplify')system.simplify=value;
  else if(key==='complex'){system.complex=value;if(runModes.has(contextMode(profile,mode)))profile.mode=value==='real'?'calc':'complex';}
  else if(key==='mode'){profile.mode=value==='Comp'?(system.complex==='real'?'calc':'complex'):'base';if(value!=='Comp')profile.base={Dec:10,Hex:16,Bin:2,Oct:8}[value];}
  else if(key==='display'){if(value==='Fix'||value==='Sci'){profile.format=value;profile.digits=value==='Sci'&&digit===0?10:digit;}else if(value==='Norm'){profile.format='Norm';profile.digits=10;system.norm=preferences.norm===1?2:1;}else system.engineering=!preferences.engineering;}
  else {const financial=snapshotCGFinancialNative(calculator).settings;calculator.financialSettings={...financial,...(key==='payment'?{begin:value==='BEGIN'}:key==='days'?{days:value}:{frequency:value})};}
  return getCGSetupPreferences(calculator,profile);
}
function realFormat(value,preferences,{mantissa=false}={}){
  assert(typeof value==='number'&&Number.isFinite(value),'Display requires a finite number');if(Object.is(value,-0))value=0;
  if(mantissa&&preferences.format==='Sci')return Number(value.toPrecision(preferences.digits)).toString();
  return formatCGDecimalDisplay(value,{mode:preferences.format,digits:preferences.digits,norm:mantissa?2:preferences.norm});
}
function engineeringFormat(value,preferences){
  if(value===0)return realFormat(value,preferences);const prefixes={'-15':'f','-12':'p','-9':'n','-6':'μ','-3':'m','0':'','3':'k','6':'M','9':'G','12':'T','15':'P','18':'E'};let exponent=3*Math.floor(Math.log10(Math.abs(value))/3);
  if(!Object.hasOwn(prefixes,String(exponent)))return realFormat(value,preferences);let scaled=value/10**exponent,text=realFormat(scaled,preferences,{mantissa:true});if(Math.abs(Number(text))>=1000&&Object.hasOwn(prefixes,String(exponent+3))){exponent+=3;scaled=value/10**exponent;text=realFormat(scaled,preferences,{mantissa:true});}return text+prefixes[String(exponent)];
}
function exactDisplay(value,exactValue,preferences,profile,{natural=false}={}){
  const exact=readCGRational(value)||(typeof value==='number'?readCGRational(exactValue):null);if(!exact)return null;
  if(preferences.engineering){const number=Number(exact.n)/Number(exact.d),text=engineeringFormat(number,preferences);return {kind:'decimal',text,latex:text};}
  return formatCGRationalDisplay(exact,{...preferences,mode:preferences.format,forceDecimal:!natural&&profile.decimal===true});
}
const displayLatex=text=>text.replace(/^(.+)e([+-]?\d+)$/,'$1\\times10^{$2}');
export function formatCGSetupValue(value,calculator,profile={},exactValue){
  const preferences=getCGSetupPreferences(calculator,profile),format=number=>preferences.engineering?engineeringFormat(number,preferences):realFormat(number,preferences);
  const exact=exactDisplay(value,exactValue,preferences,profile);if(exact)return exact.text;
  if(math.isMatrix(value))value=value.toArray();if(Array.isArray(value))return Array.isArray(value[0])?'['+value.map(row=>'['+row.map(item=>formatCGSetupValue(item,calculator,profile)).join(', ')+']').join(', ')+']':'{'+value.map(item=>formatCGSetupValue(item,calculator,profile)).join(', ')+'}';
  if(math.isComplex(value)||value&&typeof value==='object'&&typeof value.re==='number'&&typeof value.im==='number'){
    const z=math.complex(value.re,value.im);assert(preferences.complex!=='real'||z.im===0,'Non-real result: choose a+bi or r∠θ');if(z.im===0&&preferences.complex!=='polar')return format(z.re);
    if(preferences.complex==='polar')return format(math.abs(z))+'∠'+format(math.arg(z)/calculator.factor());
    const imaginary=(Math.abs(z.im)===1&&preferences.format==='Norm'?'':format(Math.abs(z.im)))+'i';return z.re===0?(z.im<0?'-':'')+imaginary:format(z.re)+(z.im<0?'-':'+')+imaginary;
  }
  return typeof value==='number'?format(value):String(value);
}
export function cgSetupFractionTex(value,calculator,profile={},exactValue){
  const preferences=getCGSetupPreferences(calculator,profile),legacyTex=preferences.fracResult==='ab/c'?mixedTex:exactTex,tex=number=>typeof number==='number'&&Math.abs(number)>=1e10?displayLatex(realFormat(number,preferences)):legacyTex(number);
  const exact=exactDisplay(value,exactValue,preferences,profile,{natural:true});if(exact)return exact.latex;
  if(math.isMatrix(value))value=value.toArray();if(Array.isArray(value))return Array.isArray(value[0])?'\\begin{bmatrix}'+value.map(row=>row.map(item=>cgSetupFractionTex(item,calculator,profile)).join('&')).join('\\\\')+'\\end{bmatrix}':'\\left\\{'+value.map(item=>cgSetupFractionTex(item,calculator,profile)).join(',')+'\\right\\}';
  if(math.isComplex(value)||value&&typeof value==='object'&&typeof value.re==='number'&&typeof value.im==='number'){
    const z=math.complex(value.re,value.im);assert(preferences.complex!=='real'||z.im===0,'Non-real result: choose a+bi or r∠θ');if(preferences.complex==='polar')return tex(math.abs(z))+'\\angle '+tex(math.arg(z)/calculator.factor());if(z.im===0)return tex(z.re);const imaginary=(Math.abs(z.im)===1?'':tex(Math.abs(z.im)))+'i';return z.re===0?(z.im<0?'-':'')+imaginary:tex(z.re)+(z.im<0?'-':'+')+imaginary;
  }
  return tex(value);
}
