import {assert,validateValue,decimal,math} from './calculator.js';
import {CGProgramMemory,splitCGArguments} from './cg-program-memory.js';
import {cgMemoryJSON} from './cg-array-memory.js';
import {CG_STATISTICAL_COMMANDS,evaluateCGStatisticalCommand,commitCGStatisticalRegisters,snapshotCGStatisticalNative} from './cg-statistical-functions.js';
import {sanitizeCGFunctionMemory,storeCGFunctionMemory,parseCGFunctionMemoryAssignment} from './cg-function-memory.js';
import {applyCGFinancialCommand,snapshotCGFinancialNative} from './cg-financial-functions.js';
import {cgVariableKey} from '../models/cg-variables.js';
import {initializeCGGraphState} from './cg-graph-state.js';
import {sanitizeCGExactState,cgExactForValue} from './cg-exact-state.js';
import {readCGRational,createCGRational,combineCGRationals,formatCGRationalDisplay} from './cg-rational-display.js';

const variableName=cgVariableKey;
function statements(source){
  assert(typeof source==='string'&&source.length<=40000,'程序不得超过 40000 字符');
  const out=[];let text='',quoted=false,line=1,start=1,comment=false;
  const push=()=>{if(text.trim())out.push({text:text.trim(),line:start});text='';start=line;comment=false;};
  for(let i=0;i<source.length;i++){
    const c=source[i];if(c==='\n'){assert(!quoted,`第 ${line} 行：字符串没有结束`);push();line++;start=line;continue;}
    if(comment){if(c===':')push();continue;}
    if(c==='"'){quoted=!quoted;text+=c;continue;}
    if(!quoted&&(c==="'"||c==='’')){comment=true;continue;}
    if(!quoted&&(c===':'||c==='◢')){push();if(c==='◢')out.push({text:'Display',line});continue;}
    text+=c;
  }
  assert(!quoted,`第 ${line} 行：字符串没有结束`);push();assert(out.length<=5000,'程序语句过多');return out;
}
export function compileCGProgram(source){
  const instructions=statements(source),stack=[],labels=new Map();
  for(let i=0;i<instructions.length;i++){
    const ins=instructions[i],s=ins.text;let m;
    if((m=/^Lbl\s+([A-Z0-9]{1,8})$/i.exec(s))){const key=m[1].toUpperCase();assert(!labels.has(key),`第 ${ins.line} 行：标签重复`);labels.set(key,i);}
    if(/^If\s+/i.test(s)){stack.push({type:'if',index:i});continue;}
    if(/^Else$/i.test(s)){const frame=stack.at(-1);assert(frame?.type==='if'&&frame.otherwise===undefined,`第 ${ins.line} 行：Else 不匹配`);frame.otherwise=i;instructions[frame.index].otherwise=i;continue;}
    if(/^IfEnd$/i.test(s)){const frame=stack.pop();assert(frame?.type==='if',`第 ${ins.line} 行：IfEnd 不匹配`);instructions[frame.index].end=i;if(frame.otherwise!==undefined)instructions[frame.otherwise].end=i;continue;}
    if(/^For\s+/i.test(s)){stack.push({type:'for',index:i});continue;}
    if(/^While\s+/i.test(s)){stack.push({type:'while',index:i});continue;}
    if(/^Do$/i.test(s)){stack.push({type:'do',index:i});continue;}
    const type=/^Next$/i.test(s)?'for':/^WhileEnd$/i.test(s)?'while':/^LpWhile\s+/i.test(s)?'do':null;
    if(type){const frame=stack.pop();assert(frame?.type===type,`第 ${ins.line} 行：循环结束符不匹配`);instructions[frame.index].end=i;ins.start=frame.index;}
  }
  assert(stack.length===0,'程序缺少 IfEnd / Next / WhileEnd / LpWhile');return {instructions,labels};
}
const splitArguments=splitCGArguments;
function conditionExpression(source){return source.split(/("(?:\\.|[^"\\])*")/g).map((part,index)=>index%2?part:part.replaceAll('≠','!=').replaceAll('≥','>=').replaceAll('≤','<=').replace(/(?<![<>=!])=(?!=)/g,'==').replace(/\bAnd\b/gi,'and').replace(/\bOr\b/gi,'or').replace(/\bNot\b/gi,'not')).join('');}
function initialProgramFormat(source={}){const mode=['Norm','Fix','Sci'].includes(source?.mode)?source.mode:'Norm',valid=Number.isInteger(source?.digits)&&source.digits>=(mode==='Fix'?0:1)&&source.digits<=(mode==='Fix'?9:10);return {mode,digits:mode==='Norm'?10:valid?source.digits:mode==='Fix'?2:10,norm:source?.norm===2?2:1};}

// This interpreter executes calculator expressions with compileSafe, never JS
// eval or Function. Input and Display suspend execution and resume in place.
export class CGProgramRunner {
  constructor(calculator,source,{variables={},programs=[],stepLimit=50000,pauseOnDisplay=false,lists=[],listNames=calculator.arrayMemory?.names||[],matrices={},vectors={},strings=[],nativeAnswers=calculator.nativeAnswers||{},format,onCommand,keyProvider,complex=false,complexFormat='a+bi'}={}){
    assert(calculator?.compile&&calculator?.scope,'缺少计算引擎');
    this.variables={...calculator.vars,...variables};const exact=sanitizeCGExactState(calculator,this.variables);for(const key of Object.keys(variables)){if(key==='Ans')exact.exactAnswer=null;else delete exact.exactVariables[key];}this.calculator=Object.assign(Object.create(calculator),{vars:this.variables,approximateVariables:new Set(calculator.approximateVariables||[]),...structuredClone(exact),cgSimplify:calculator.cgSimplify==='Manual'?'Manual':'Auto',cgComplexMode:calculator.cgComplexMode||'real',lastExactResult:null,cgNumericalNotice:null});this.cgNumericalNotice=null;this.lastEvaluationApproximate=false;this.lastEvaluationNotice=null;this.programs=programs;this.stepLimit=Math.min(100000,Math.max(1,stepLimit));this.pauseOnDisplay=pauseOnDisplay;this.complex=complex===true;this.complexFormat=complexFormat==='polar'?'polar':'a+bi';this.format=initialProgramFormat(format);
    this.frame={...compileCGProgram(source),pc:0,loops:new Map()};this.calls=[];this.outputs=[];this.steps=0;this.status='ready';this.request=null;this.last=0;this.lastExact=null;this.lastResultApproximate=false;this.lastPrinted=false;
    this.calculator.functionMemory=sanitizeCGFunctionMemory(calculator.functionMemory);
    const graph=structuredClone(calculator.graphMemory||{});graph.window??={xmin:-6.3,xmax:6.3,ymin:-3.1,ymax:3.1};graph.parameter??={min:0,max:2*Math.PI,step:2*Math.PI/100};graph.xscale??=1;graph.yscale??=1;this.calculator.graphMemory=initializeCGGraphState(graph,20);
    this.memory=new CGProgramMemory(this.calculator,{lists,names:listNames,matrices,vectors,strings,nativeAnswers,onCommand,keyProvider,complex:this.complex});
    const memory=this.memory;this.calculator.arrayMemory=Object.defineProperties({},Object.fromEntries(['lists','names','matrices','vectors','strings'].map(key=>[key,{enumerable:true,get:()=>memory[key]}])));this.textScreen=Array(7).fill('');
  }
  evaluate(source,condition=false){
    const value=this.memory.evaluate(condition?conditionExpression(source):source,this.variables);
    this.lastEvaluationApproximate=this.memory.lastEvaluationApproximate===true;this.lastEvaluationNotice=this.calculator.cgNumericalNotice||null;this.calculator.lastEvaluationApproximate=this.lastEvaluationApproximate;this.calculator.vars=this.variables;this.calculator.lastExactResult=null;
    if(condition){assert(typeof value==='boolean'||typeof value==='number','条件须为逻辑值或实数');return value;}
    if(typeof value==='boolean')return Number(value);if(typeof value==='number'||math.isComplex(value))validateValue(value,this.complex);
    if(this.calculator.captureExactResult)this.calculator.captureExactResult(this.memory.lastPreparedExpression||source,value,{},this.complex);return value;
  }
  commitResult(value,exactValue=null,approximate=false,notice=null){this.last=value;this.lastExact=null;this.lastResultApproximate=approximate===true;this.cgNumericalNotice=typeof notice==='string'?notice:null;this.calculator.cgNumericalNotice=this.cgNumericalNotice;this.calculator.vars=this.variables;if(typeof value==='number'||math.isComplex(value)){this.calculator.assign('Ans',value,approximate,exactValue);this.variables.Ans=this.calculator.vars.Ans;this.lastExact=cgExactForValue(this.calculator.exactAnswer,value);}return value;}
  set(name,value,exactValue=null,approximate=false,notice=null){const key=variableName(name);assert(key&&Object.hasOwn(this.variables,key),'变量须为 A–Z');if(typeof value==='boolean')value=Number(value);validateValue(value,this.complex);assert(typeof value==='number'||this.complex&&math.isComplex(value),'变量须为数值');this.calculator.vars=this.variables;this.calculator.assign(key,value,approximate,exactValue);this.variables[key]=this.calculator.vars[key];this.commitResult(value,exactValue,approximate,notice);this.lastPrinted=false;}
  output(value){assert(this.outputs.length<1000,'输出超过 1000 行，请缩小循环范围');this.outputs.push(String(value));}
  formatValue(value,exactValue=null){if(typeof value==='string')return value;if(Array.isArray(value))return '['+value.map(v=>this.formatValue(v)).join(', ')+']';if(math.isComplex(value)){if(this.complexFormat==='polar')return this.formatValue(math.abs(value))+'∠'+this.formatValue(math.arg(value)/this.calculator.factor());const imag=(Math.abs(value.im)===1&&this.format.mode==='Norm'?'':this.formatValue(Math.abs(value.im)))+'i';return value.im===0?this.formatValue(value.re):value.re===0?(value.im<0?'-':'')+imag:this.formatValue(value.re)+(value.im<0?'-':'+')+imag;}if(exactValue&&this.calculator.cgSimplify==='Manual')return formatCGRationalDisplay(exactValue,{simplify:'Manual',complex:this.complex?this.complexFormat:this.calculator.cgComplexMode,inputOutput:'Line',mode:this.format.mode,digits:this.format.digits,norm:this.format.norm}).text;if(this.format.mode==='Fix')return value.toFixed(this.format.digits);if(this.format.mode==='Sci')return value.toExponential(this.format.digits-1);return math.format(value,{precision:this.format.digits,lowerExp:this.format.norm===1?-2:-9,upperExp:10});}
  displayValue(source,commit=true){const s=source.trim();if(/^"[^"\n]*"$/.test(s))return s.slice(1,-1);const value=this.evaluate(s),exact=this.calculator.lastExactResult;if(commit){this.memory.recordAnswer(value,s,0);this.commitResult(value,exact,this.lastEvaluationApproximate,this.lastEvaluationNotice);}return this.formatValue(value,commit?this.lastExact:exact);}
  snapshot(){return {status:this.status,request:this.request,outputs:[...this.outputs],variables:{...this.variables},approximateVariables:[...this.calculator.approximateVariables],cgNumericalNotice:this.cgNumericalNotice,...sanitizeCGExactState(this.calculator,this.variables),simplify:this.calculator.cgSimplify,angle:this.calculator.angle,format:{...this.format},functionMemory:sanitizeCGFunctionMemory(this.calculator.functionMemory),graphMemory:structuredClone(this.calculator.graphMemory),financialNative:snapshotCGFinancialNative(this.calculator),statisticalNative:snapshotCGStatisticalNative(this.calculator),textScreen:[...this.textScreen],steps:this.steps,...this.memory.snapshot()};}
  executeStatisticalCommand(source){
    const header=/^([A-Za-z][A-Za-z0-9]*)(?:\s+(.*))?$/s.exec(source),spec=header&&CG_STATISTICAL_COMMANDS.find(item=>item.name.toLowerCase()===header[1].toLowerCase());if(!spec)return false;
    const calculator=this.calculator,before={statistical:calculator.statisticalMemory,regression:calculator.statisticalRegression,financialSettings:calculator.financialSettings,financialMemory:calculator.financialMemory,answers:calculator.nativeAnswers,vars:calculator.vars,exact:sanitizeCGExactState(calculator,this.variables),lastExactResult:calculator.lastExactResult,memoryAnswers:{...this.memory.nativeAnswers}};
    try{
      const raw=header[2]?splitCGArguments(header[2]):[],args=raw.map((part,index)=>{
        const destination=spec.name==='ChiGOFTest'&&index===3?'list':spec.name==='ChiTest'&&index===1?'matrix':null;
        if(destination){const target=this.memory.target(part,this.variables,text=>this.evaluate(text));if(target){assert(target.kind===destination&&!target.answer&&!target.indices.length,'Invalid statistical output destination');return destination==='list'?target.index+1:target.key;}}
        if(index===0&&['<','>','!=','≠'].includes(part))return part;return this.evaluate(part);
      }),result=evaluateCGStatisticalCommand(spec.name,args),staged=Object.create(this.memory);
      staged.lists=this.memory.lists.slice();staged.matrices={...this.memory.matrices};staged.vectors={...this.memory.vectors};staged.nativeAnswers={...this.memory.nativeAnswers};
      for(const write of result.writes||[]){const name=write.kind==='list'&&typeof write.target==='number'?'List'+write.target:write.target,target=staged.target(name,this.variables,text=>this.evaluate(text));assert(target&&target.kind===write.kind&&!target.answer&&!target.indices.length,'Invalid statistical output destination');staged.assign(target,write.value);}
      if(Array.isArray(result.value)){const kind=result.answerKind==='matrix'?'matrix':'list';staged.assign({kind,answer:true,indices:[]},result.value);if(kind==='matrix')staged.recordAnswer(result.value,spec.name,0);}else validateValue(result.value,false);
      // All target shapes, capacities and result registers are checked before
      // committing either arrays or dedicated statistical outputs.
      commitCGStatisticalRegisters(calculator,result.registers,{answer:result.value,answerKind:result.answerKind});
      this.memory.lists=staged.lists;this.memory.matrices=staged.matrices;this.memory.vectors=staged.vectors;this.memory.nativeAnswers=staged.nativeAnswers;calculator.nativeAnswers=Object.fromEntries(Object.entries(staged.nativeAnswers).map(([key,value])=>[key,cgMemoryJSON(value)]));
      this.commitResult(result.value,null,true);this.lastPrinted=false;return true;
    }catch(error){calculator.statisticalMemory=before.statistical;calculator.statisticalRegression=before.regression;calculator.financialSettings=before.financialSettings;calculator.financialMemory=before.financialMemory;calculator.nativeAnswers=before.answers;calculator.vars=before.vars;Object.assign(calculator,before.exact,{lastExactResult:before.lastExactResult});this.memory.nativeAnswers=before.memoryAnswers;throw error;}
  }
  run(input,{instructionBudget=Infinity}={}){
    if(this.status==='done'||this.status==='stopped')return this.snapshot();
    if(this.status==='input'){
      assert(input!==undefined,'请先输入数值');const value=typeof input==='number'?input:this.evaluate(String(input)),exact=typeof input==='number'?(Number.isSafeInteger(input)?createCGRational(input):null):this.calculator.lastExactResult;this.set(this.request.variable,value,exact,typeof input==='number'?false:this.lastEvaluationApproximate,typeof input==='number'?null:this.lastEvaluationNotice);this.request=null;
    }else if(this.status==='display'){this.request=null;}
    this.status='running';let executed=0;
    while(this.status==='running'){
      if(executed++>=instructionBudget){this.status='yield';break;}
      const f=this.frame;if(f.pc>=f.instructions.length){if(this.calls.length){this.frame=this.calls.pop();continue;}this.status='done';break;}
      assert(++this.steps<=this.stepLimit,'程序步数超限，已停止（检查无限循环）');
      const ins=f.instructions[f.pc++];try{this.execute(ins,f);}catch(e){this.status='error';throw new Error(`第 ${ins.line} 行：${e.message}`);}
      if(instructionBudget!==Infinity&&this.memory.polledEmptyKey&&this.status==='running'){this.memory.polledEmptyKey=false;this.status='yield';}
      if(instructionBudget!==Infinity&&this.memory.graphicsEmitted&&this.status==='running'){this.memory.graphicsEmitted=false;this.status='yield';}
    }
    return this.snapshot();
  }
  execute(ins,f){
    let s=ins.text,m;
    const functionAssignment=parseCGFunctionMemoryAssignment(s);if(functionAssignment){storeCGFunctionMemory(this.calculator,functionAssignment.number,functionAssignment.expression);this.last=functionAssignment.expression;this.lastPrinted=false;return;}
    if(this.executeStatisticalCommand(s))return;
    if(applyCGFinancialCommand(this.calculator,s))return;
    if(/^Simplify(?:Auto|Man)$/i.test(s)){this.calculator.cgSimplify=/Auto$/i.test(s)?'Auto':'Manual';return;}
    if((m=/^(Deg|Rad|Gra|Degree|Radian|Gradian)$/i.exec(s))){this.calculator.angle=m[1].toLowerCase().startsWith('deg')?'Deg':m[1].toLowerCase().startsWith('rad')?'Rad':'Gra';return;}
    if((m=/^(Fix|Sci|Norm)\s+(\d+)$/i.exec(s))){const value=Number(m[2]),mode=m[1].toLowerCase();assert(mode==='norm'?[1,2].includes(value):value>=0&&value<=9,'显示格式参数无效');this.format=mode==='norm'?{mode:'Norm',digits:10,norm:value}:{mode:mode==='fix'?'Fix':'Sci',digits:mode==='sci'&&value===0?10:value,norm:this.format.norm};return;}
    if(this.memory.statement(s,this.variables,source=>this.evaluate(source))){if(this.memory.lastAssignmentValue!==undefined){this.commitResult(this.memory.lastAssignmentValue,this.memory.lastAssignmentExact,this.memory.lastAssignmentApproximate,this.memory.lastAssignmentNotice);this.lastPrinted=false;}if(this.pauseOnDisplay&&this.memory.lastCommand?.toLowerCase()==='drawdyna'){this.status='display';this.request={prompt:'EXE 继续'};}return;}
    if(/^Then$/i.test(s)||/^IfEnd$/i.test(s)||/^Lbl\s+/i.test(s))return;
    if((m=/^Then\s+(.+)$/i.exec(s))){this.execute({...ins,text:m[1]},f);return;}
    if(/^Else$/i.test(s)){f.pc=ins.end+1;return;}
    if((m=/^If\s+(.+?)(?:\s+Then)?$/i.exec(s))){if(!this.evaluate(m[1],true))f.pc=(ins.otherwise??ins.end)+1;return;}
    if((m=/^For\s+(.+?)(?:→|->)\s*([A-Z]|theta|θ)\s+To\s+(.+?)(?:\s+Step\s+(.+))?$/i.exec(s))){
      const value=this.evaluate(m[1]),initialExact=this.calculator.lastExactResult,initialApproximate=this.lastEvaluationApproximate,initialNotice=this.lastEvaluationNotice,name=variableName(m[2]),end=this.evaluate(m[3]),step=m[4]?this.evaluate(m[4]):1,stepExact=m[4]?this.calculator.lastExactResult:createCGRational(1),stepApproximate=m[4]?this.lastEvaluationApproximate:false;assert([value,end,step].every(v=>typeof v==='number'&&Number.isFinite(v)),'For 范围须为实数');assert(step!==0,'Step 不能为零');this.set(name,value,initialExact,initialApproximate,initialNotice);
      if(step>0?value>end:value<end){f.pc=ins.end+1;return;}f.loops.set(f.pc-1,{name,end,step,stepExact,stepApproximate,kind:'for',endPC:ins.end});return;
    }
    if(/^For\s+/i.test(s))throw new Error('For 格式：For 1→A To 10 Step 1');
    if(/^Next$/i.test(s)){
      const loop=f.loops.get(ins.start);assert(loop,'Next 没有活动的 For 循环');const key=variableName(loop.name),value=this.variables[key]+loop.step,old=readCGRational(this.calculator.exactVariables[key]);let exact=null;if(old&&loop.stepExact)try{exact=combineCGRationals(old,'+',loop.stepExact);}catch{}this.set(loop.name,value,exact,this.calculator.approximateVariables.has(key)||loop.stepApproximate);
      if(loop.step>0?value<=loop.end:value>=loop.end)f.pc=ins.start+1;else f.loops.delete(ins.start);return;
    }
    if((m=/^While\s+(.+)$/i.exec(s))){if(!this.evaluate(m[1],true)){f.loops.delete(f.pc-1);f.pc=ins.end+1;}else f.loops.set(f.pc-1,{kind:'while',endPC:ins.end});return;}
    if(/^WhileEnd$/i.test(s)){f.pc=ins.start;return;}
    if(/^Do$/i.test(s)){f.loops.set(f.pc-1,{kind:'do',endPC:ins.end});return;}
    if((m=/^LpWhile\s+(.+)$/i.exec(s))){if(this.evaluate(m[1],true))f.pc=ins.start+1;else f.loops.delete(ins.start);return;}
    if(/^Break$/i.test(s)){const loop=[...f.loops.entries()].filter(([start,l])=>start<f.pc&&l.endPC>=f.pc-1).sort((a,b)=>b[0]-a[0])[0];assert(loop,'Break 不在循环内');f.loops.delete(loop[0]);f.pc=loop[1].endPC+1;return;}
    if((m=/^Goto\s+([A-Z0-9]{1,8})$/i.exec(s))){const pc=f.labels.get(m[1].toUpperCase());assert(pc!==undefined,'标签不存在');for(const [start,l] of f.loops)if(pc<start||pc>l.endPC)f.loops.delete(start);f.pc=pc+1;return;}
    if((m=/^(?:Isz|Dsz)\s+([A-Z]|theta|θ)$/i.exec(s))){const name=variableName(m[1]),increment=/^Isz/i.test(s)?1:-1,value=this.variables[name]+increment,old=readCGRational(this.calculator.exactVariables[name]);let exact=null;if(old)try{exact=combineCGRationals(old,'+',createCGRational(increment));}catch{}this.set(name,value,exact,this.calculator.approximateVariables.has(name));if(value===0)f.pc++;return;}
    if(/^Return$/i.test(s)){if(this.calls.length)this.frame=this.calls.pop();else this.status='done';return;}
    if(/^Stop$/i.test(s)){this.status='stopped';return;}
    if(/^ClrText$/i.test(s)){this.outputs=[];this.textScreen=Array(7).fill('');return;}
    if(/^Display$/i.test(s)){if(!this.lastPrinted)this.output(this.formatValue(this.last,this.lastExact));this.lastPrinted=true;if(this.pauseOnDisplay){this.status='display';this.request={prompt:'EXE 继续'};}return;}
    if((m=/^Prog\s+"([^"\n]+)"$/i.exec(s))){assert(this.calls.length<16,'子程序调用超过 16 层');const program=this.programs.find(p=>p.name.toUpperCase()===m[1].toUpperCase());assert(program,'找不到子程序 '+m[1]);this.calls.push(f);this.frame={...compileCGProgram(program.source),pc:0,loops:new Map()};return;}
    if((m=/^(?:"([^"\n]*)"\s*)?\?\s*(?:→|->)\s*([A-Z]|theta|θ)$/i.exec(s))||(m=/^Input\s+([A-Z]|theta|θ)(?:\s*,\s*"([^"\n]*)")?$/i.exec(s))){
      const casio=s.includes('?'),name=variableName(casio?m[2]:m[1]),prompt=(casio?m[1]:m[2])||name+'?';this.status='input';this.request={variable:name,prompt};return;
    }
    if((m=/^(?:Print|Disp)\s+(.+)$/i.exec(s))){this.output(splitArguments(m[1]).map(x=>this.displayValue(x)).join(' '));this.lastPrinted=true;return;}
    if((m=/^Locate\s+(.+)$/i.exec(s))){const args=splitArguments(m[1]);assert(args.length===3,'Locate 格式：Locate 列,行,内容');const col=this.evaluate(args[0]),row=this.evaluate(args[1]);assert(Number.isInteger(col)&&col>=1&&col<=21&&Number.isInteger(row)&&row>=1&&row<=7,'Locate 坐标须为列 1–21、行 1–7');const text=this.displayValue(args[2],false).slice(0,22-col),old=this.textScreen[row-1].padEnd(21,' ');this.textScreen[row-1]=(old.slice(0,col-1)+text+old.slice(col-1+text.length)).trimEnd();return;}
    if(/^"[^"\n]*"$/.test(s)){this.output(s.slice(1,-1));this.lastPrinted=true;return;}
    if((m=/^(.+?)⇒(.+)$/.exec(s))){if(this.evaluate(m[1],true))this.execute({...ins,text:m[2].trim()},f);return;}
    if((m=/^(.+?)(?:→|->)\s*([A-Z]|theta|θ)$/i.exec(s))){const value=this.evaluate(m[1]);this.set(m[2],value,this.calculator.lastExactResult,this.lastEvaluationApproximate,this.lastEvaluationNotice);return;}
    const value=this.evaluate(s);this.memory.recordAnswer(value,s,0);this.commitResult(value,this.calculator.lastExactResult,this.lastEvaluationApproximate,this.lastEvaluationNotice);this.lastPrinted=false;
  }
}
export function runCGProgram(calculator,source,{inputs=[],...options}={}){
  const runner=new CGProgramRunner(calculator,source,options);let result=runner.run(),index=0;
  while(result.status==='input'&&index<inputs.length)result=runner.run(inputs[index++]);return result;
}
export function sanitizePrograms(data={}){
  if(!data||typeof data!=='object')data={};
  const source=Array.isArray(data.programs)?data.programs:[];
  const programs=source.slice(0,50).filter(p=>p&&typeof p.name==='string'&&typeof p.source==='string').map(p=>({name:p.name.slice(0,20),source:p.source.slice(0,40000)}));
  return {programs,selected:Math.max(0,Math.min(programs.length-1,Math.trunc(data.selected)||0))};
}
