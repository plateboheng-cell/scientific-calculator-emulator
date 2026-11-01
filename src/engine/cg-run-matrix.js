import {assert,math} from './calculator.js';
import {CGProgramRunner,compileCGProgram} from './cg-program.js';
import {cgMemoryScalar} from './cg-array-memory.js';
import {sanitizeCGFunctionMemory,parseCGFunctionMemoryAssignment} from './cg-function-memory.js';
import {sanitizeCGExactState} from './cg-exact-state.js';
const restricted=/^(?:If|Then|Else|IfEnd|For|Next|While|WhileEnd|Do|LpWhile|Lbl|Goto|Prog|Return|Break|Stop|Input|Print|Disp|Locate)\b|^\s*(?:"[^"]*")?\s*\?/i;
export function evaluateCGRunMatrix(calculator,source,{lists=[],matrices={},vectors={},strings=[],format,complex=false,complexFormat='a+bi',examination=false}={}){
  assert(typeof source==='string'&&source.trim()&&source.length<=1500,'Calculation input is empty or too long');
  const compiled=compileCGProgram(source);assert(compiled.instructions.every(instruction=>!restricted.test(instruction.text)),'Syntax ERROR: program control is unavailable in Run-Matrix');
  if(examination)assert(!/[:\r\n◢]/.test(source),'Examination Mode: program commands are disabled');
  // Program's frame scheduler yields after drawing. A single synchronous
  // Run-Matrix line completes those commands under the runner's step limit.
  const runner=new CGProgramRunner(calculator,source,{lists,matrices,vectors,strings,format,complex,complexFormat,stepLimit:5000}),snapshot=runner.run();
  assert(snapshot.status==='done','Calculation requires unsupported interactive program input');
  const tail=compiled.instructions.at(-1)?.text||source;
  const noValue=/^(?:ClrList|ClrMat|ClrVct|Fill|SortA|SortD|ExpToStr|Deg|Rad|Gra|Degree|Radian|Gradian|Fix|Sci|Norm|SimplifyAuto|SimplifyMan|DateMode365|DateMode360|PmtBgn|PmtEnd|PeriodsAnnual|PeriodsSemi|RclCapt|StoCapt|RclPict|StoPict|ViewWindow|PlotOn|PlotOff|PlotChg|Plot|F-Line|Line|Circle|Vertical|Horizontal|Horz|Text|PxlOn|PxlOff|PxlChg|ClrGraph|DrawGraph|DrawStat|DrawDyna|Graph|BG-None|AxesOn|AxesOff|GridOn|GridOff|LabelOn|LabelOff|CoordOn|CoordOff)\b/i.test(tail)||!!parseCGFunctionMemoryAssignment(tail);
  return {value:runner.last,approximate:runner.lastResultApproximate,noValue,snapshot,graphics:snapshot.commands||[]};
}
export function commitCGRunMatrix(calculator,result){
  const {snapshot}=result,exact=sanitizeCGExactState(snapshot,snapshot.variables),approximate=new Set(snapshot.approximateVariables??calculator.approximateVariables??[]);
  // Apply the preference before assignment: assigning under the caller's old
  // Auto setting would irreversibly reduce a staged Manual fraction.
  if(snapshot.simplify==='Manual'||snapshot.simplify==='Auto')calculator.cgSimplify=snapshot.simplify;
  for(const [key,value]of Object.entries(snapshot.variables))if(Object.hasOwn(calculator.vars,key)&&!(Array.isArray(value)||math.isMatrix(value))){if(key==='Ans'&&typeof value==='string')continue;const scalar=cgMemoryScalar(value);calculator.assign(key,scalar,approximate.has(key),key==='Ans'?exact.exactAnswer:exact.exactVariables[key]??null);}
  if(snapshot.financialNative){calculator.financialSettings=snapshot.financialNative.settings;calculator.financialMemory=snapshot.financialNative.memory;}
  if(snapshot.statisticalNative){calculator.statisticalMemory=snapshot.statisticalNative.registers;calculator.statisticalRegression=snapshot.statisticalNative.regression;}
  if(snapshot.nativeAnswers)calculator.nativeAnswers=snapshot.nativeAnswers;
  if(snapshot.functionMemory)calculator.functionMemory=sanitizeCGFunctionMemory(snapshot.functionMemory);
  if(snapshot.graphMemory)calculator.graphMemory=structuredClone(snapshot.graphMemory);
  calculator.cgNumericalNotice=typeof snapshot.cgNumericalNotice==='string'?snapshot.cgNumericalNotice:null;
  calculator.angle=snapshot.angle;
}
