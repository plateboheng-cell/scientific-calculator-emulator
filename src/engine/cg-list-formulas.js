import {math} from './calculator.js';
import {CGProgramMemory} from './cg-program-memory.js';
import {isCGMemoryScalar,cgMemoryJSON} from './cg-array-memory.js';
import {readOnlyCalculator} from './read-only-calculator.js';
import {sanitizeCGStatistics,sanitizeCGListFile,assertCGStatisticsMemory,CG_STATISTICS_MEMORY_BYTES} from './cg-statistics.js';

// fx-CG50 Software User's Guide v3.00: 3-2/3-3 column-header calculation,
// 3-13 corresponding-element arithmetic, 3-14 subname references, 3-17 Files.
// This is a one-shot calculation. It creates no persistent formula metadata,
// dependencies, automatic recalculation, or native G3M formula payload.
export const CG_LIST_FORMULA_MAX_SOURCE=1500;
export const CG_LIST_FORMULA_UNVERIFIED=Object.freeze([
  'Exact firmware behavior for an empty source or an empty/scalar column result',
  'Duplicate subname resolution: this implementation rejects ambiguous names',
  'Element-color propagation for calculated data: this implementation resets destination colors',
  'Nested function-memory/calculus/sequence combinations in the native Statistics column editor',
]);

export class CGListFormulaError extends Error{
  constructor(code,message){super(message);this.name='CGListFormulaError';this.code=code;}
}
const fail=(code,message)=>{throw new CGListFormulaError(code,message);};
const requireValue=(test,code,message)=>{if(!test)fail(code,message);};
const clone=value=>structuredClone(value);
const nativeListNumber=value=>{
  requireValue(Number.isInteger(value)&&value>=1&&value<=26,'LIST_NUMBER','List number: 1–26');return value;
};
function validateFile(file){
  if(!file||typeof file!=='object')return;
  if(file.lists===undefined)return;
  requireValue(Array.isArray(file.lists)&&file.lists.length<=26,'LIST_DATA','A List File contains at most 26 lists');
  for(const list of file.lists)requireValue(Array.isArray(list)&&list.length<=999&&list.every(isCGMemoryScalar),'LIST_DATA','Lists require at most 999 finite real/complex values');
}
function context(statistics,listFile){
  requireValue(statistics&&typeof statistics==='object'&&!Array.isArray(statistics),'LIST_DATA','Statistics data is required');
  validateFile(statistics);
  requireValue(statistics.listFiles===undefined||Array.isArray(statistics.listFiles)&&statistics.listFiles.length<=6,'LIST_FILE','List File: 1–6');
  for(const file of statistics.listFiles||[])validateFile(file);
  const data=sanitizeCGStatistics(clone(statistics)),fileIndex=listFile??data.listFile;
  requireValue(Number.isInteger(fileIndex)&&fileIndex>=0&&fileIndex<6,'LIST_FILE','List File: 1–6');
  const bank=fileIndex===data.listFile?data:sanitizeCGListFile(data.listFiles[fileIndex]);
  return {data,bank,listFile:fileIndex};
}
function namedList(names,name){
  const matches=names.flatMap((value,index)=>value===name?[index+1]:[]);
  requireValue(name.length>0&&matches.length>0,'LIST_NAME','List subname not found: '+name);
  requireValue(matches.length===1,'AMBIGUOUS_LIST_NAME','List subname is ambiguous: '+name);
  return matches[0];
}
function quotedEnd(source,start){
  for(let index=start+1;index<source.length;index++){
    if(source[index]==='\\'){index++;continue;}
    if(source[index]==='"')return index+1;
  }
  fail('SYNTAX','Unclosed quoted text in list formula');
}
// These existing calculator functions take expression text in argument 1.
// Normalize inside that expression, never inside ordinary display text or the
// sequence's variable-name argument. No expression is evaluated to infer type.
const expressionTextFunctions=new Set(['seq','diff2','diff','integral','sum','prod','strtoexp']);
function normalizeSource(source,{names,prepare,reference,answer},depth=0){
  requireValue(depth<16,'SYNTAX','List formula nesting is too deep');
  source=prepare?prepare(source):source;
  let output='';const frames=[];
  for(let index=0;index<source.length;){
    const remaining=source.slice(index),boundary=index===0||!/[A-Za-z0-9_]/.test(source[index-1]);
    if(boundary&&remaining.startsWith('ΔList')){
      const match=/^ΔList\s*(\d+)/.exec(remaining);
      requireValue(match,'SYNTAX','ΔList requires a list number');const number=nativeListNumber(Number(match[1]));reference(number);output+='Delta(List'+number+')';index+=match[0].length;continue;
    }
    if(boundary&&/^List(?=\s|["(0-9]|Ans\b)/i.test(remaining)){
      const match=/^List\s*/i.exec(remaining),after=index+match[0].length;
      if(source[after]==='"'){
        const end=quotedEnd(source,after);let name;try{name=JSON.parse(source.slice(after,end));}catch{fail('SYNTAX','Invalid quoted list subname');}
        const number=namedList(names,name);reference(number);output+='List'+number;index=end;continue;
      }
      const digits=/^\d+/.exec(source.slice(after));
      if(digits){const number=nativeListNumber(Number(digits[0]));reference(number);output+='List'+number;index=after+digits[0].length;continue;}
      if(/^Ans\b/i.test(source.slice(after))){answer();output+='ListAns';index=after+3;continue;}
    }
    const character=source[index];
    if(character==='"'){
      const end=quotedEnd(source,index),frame=[...frames].reverse().find(item=>item.name);
      if(frame&&frame.argument===0&&expressionTextFunctions.has(frame.name)){
        let expression;try{expression=JSON.parse(source.slice(index,end));}catch{fail('SYNTAX','Invalid quoted expression');}
        output+=JSON.stringify(normalizeSource(expression,{names,prepare,reference,answer},depth+1));
      }else output+=source.slice(index,end);
      index=end;continue;
    }
    if('([{'.includes(character)){
      const name=character==='('?/([A-Za-z_][A-Za-z0-9_]*)\s*$/.exec(output)?.[1]?.toLowerCase():undefined;
      frames.push({opening:character,name,argument:0});
    }else if(')]}'.includes(character))frames.pop();
    else if(character===','&&frames.length)frames.at(-1).argument++;
    output+=character;index++;
  }
  return output;
}

/** Read-only one-shot evaluation. listFile is the existing zero-based 0..5
 * state index. List numbers in source/references/target are native 1..26.
 * The passed calculator is never reused as the evaluation context, even when
 * it is already one of readOnlyCalculator's idempotent isolated instances.
 */
export function evaluateCGListFormula({calculator,statistics,source,listFile,complex=false}={}){
  requireValue(calculator&&typeof calculator.scope==='function','CALCULATOR','A calculator is required');
  requireValue(typeof source==='string'&&source.trim().length>0&&source.length<=CG_LIST_FORMULA_MAX_SOURCE,'SYNTAX','List formula must contain 1–1500 characters');
  const selected=context(statistics,listFile),{bank}=selected,referenced=new Set();let usesListAns=false;
  const reference=number=>referenced.add(nativeListNumber(number));
  const local=readOnlyCalculator(Object.create(calculator));
  const memory=new CGProgramMemory(local,{lists:bank.lists,names:bank.names,matrices:local.arrayMemory?.matrices,vectors:local.arrayMemory?.vectors,strings:local.arrayMemory?.strings,nativeAnswers:local.nativeAnswers,complex:complex===true});
  // Nested F-MEM, Seq and numerical sampling must see these selected-file
  // banks rather than inheriting the caller's different active List File.
  local.arrayMemory=Object.defineProperties({},Object.fromEntries(['lists','names','matrices','vectors','strings'].map(key=>[key,{enumerable:true,get:()=>memory[key]}])));
  const read=memory.read.bind(memory);
  memory.read=target=>{if(target.kind==='list'){if(target.answer)usesListAns=true;else reference(target.index+1);}return read(target);};
  const scope=local.scope.bind(local);
  local.scope=extra=>{
    const result=scope(extra);
    if(typeof result.List==='function'){
      const list=result.List;result.List=(number,...args)=>{const resolved=typeof number==='string'?namedList(bank.names,number):number;reference(resolved);return list(resolved,...args);};
    }
    if(typeof result.Delta==='function'){
      const delta=result.Delta;result.Delta=values=>{requireValue(Array.isArray(values)&&values.length>=2,'DIMENSION','ΔList requires at least two source values');return delta(values);};
    }
    return result;
  };
  const normalizedSource=normalizeSource(source,{names:bank.names,prepare:typeof local.prepareCGExpression==='function'?text=>local.prepareCGExpression(text):null,reference,answer:()=>{usesListAns=true;}});
  let value=memory.evaluate(normalizedSource);
  if(math.isMatrix(value))value=value.toArray();
  for(const number of referenced)requireValue(bank.lists[number-1].length>0,'EMPTY_SOURCE','Source List '+number+' is empty');
  requireValue(Array.isArray(value)&&value.every(isCGMemoryScalar),'LIST_RESULT','List formula must produce a one-dimensional numeric list');
  requireValue(value.length>0&&value.length<=999,'LIST_SIZE','List result must contain 1–999 values');
  return {values:cgMemoryJSON(value),references:[...referenced].sort((a,b)=>a-b).map(list=>({list,subName:bank.names[list-1]})),usesListAns,listFile:selected.listFile,source,normalizedSource};
}

/** Return a new statistics snapshot. The caller can persist that snapshot as
 * one transaction; a calculation/storage error leaves both inputs unchanged.
 * Evaluating a self target reads its old list, not a circular dependency.
 */
export function applyCGListFormula({calculator,statistics,source,target,listFile,complex=false,memoryLimit=CG_STATISTICS_MEMORY_BYTES}={}){
  nativeListNumber(target);
  const selected=context(statistics,listFile),result=evaluateCGListFormula({calculator,statistics,source,listFile:selected.listFile,complex}),next=selected.data;
  const bank=selected.listFile===next.listFile?next:selected.bank;
  bank.lists[target-1]=clone(result.values);bank.elementColors[target-1]=[];
  if(selected.listFile!==next.listFile)next.listFiles[selected.listFile]=sanitizeCGListFile(bank);
  assertCGStatisticsMemory(next,memoryLimit);
  return {...result,statistics:next};
}
