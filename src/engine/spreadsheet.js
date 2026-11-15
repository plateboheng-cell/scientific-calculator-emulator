import {assert,compileSafe} from './calculator.js';
import {prepareCWLinearInput} from './cw-notation.js';
import {aggregateCWDecimals,cwDecimalResult,roundCWNumber} from './cw-decimal.js';

export const SHEET_ROWS=45,SHEET_COLUMNS=5,SHEET_CAPACITY=1700;
const EXTENDED_INPUT_BYTES=128;
export const SHEET_EXTENDED_CAPACITY=SHEET_ROWS*SHEET_COLUMNS*(EXTENDED_INPUT_BYTES+15);
export const SHEET_SOURCE_LIMIT=500;
const reference=/\$?[A-Za-z]\$?[1-9]\d*/g;
const embeddedReference=(text,offset,source,native=false)=>offset>0&&(/[A-Za-z_]/.test(source[offset-1])||(/[0-9.]/.test(source[offset-1])&&(native?/^e\d+$/:/^[eE]\d+$/).test(text)));
export function cellPosition(address){const m=/^\$?([A-E])\$?([1-9]\d?)$/i.exec(address);assert(m&&+m[2]<=SHEET_ROWS,'单元格范围须为 A1:E45');return {col:m[1].toUpperCase().charCodeAt(0)-65,row:+m[2]-1};}
export function cellAddress(col,row){assert(Number.isInteger(col)&&col>=0&&col<SHEET_COLUMNS&&Number.isInteger(row)&&row>=0&&row<SHEET_ROWS,'单元格范围须为 A1:E45');return String.fromCharCode(65+col)+(row+1);}
function cellKey(address){const {col,row}=cellPosition(address);return cellAddress(col,row);}
export function rangeAddresses(range){
  const parts=range.split(':');assert(parts.length<=2,'单元格范围须为 A1:E45');const a=cellPosition(parts[0]),b=cellPosition(parts[1]||parts[0]);assert(a.col<=b.col&&a.row<=b.row,'单元格范围顺序错误');
  const cells=[];for(let row=a.row;row<=b.row;row++)for(let col=a.col;col<=b.col;col++)cells.push(cellAddress(col,row));return cells;
}
export function shiftReferences(expression,dx,dy,native=false){
  return expression.replace(reference,(text,offset,source)=>{
    if(embeddedReference(text,offset,source,native))return text;
    const p=cellPosition(text),m=/^(\$?)[A-Za-z](\$?)\d+$/.exec(text),col=p.col+(m[1]?0:dx),row=p.row+(m[2]?0:dy);
    // As on the handheld, out-of-range copied references become error cells.
    return (m[1]||'')+(col>=0&&col<SHEET_COLUMNS?String.fromCharCode(65+col):'?')+(m[2]||'')+(row>=0&&row<SHEET_ROWS?row+1:'?');
  });
}
// Textual token count approximates the manual's command-byte convention;
// firmware byte encoding and its undocumented dependency memory limit differ.
export function sheetInputBytes(expression){return expression.replace(/\b[A-Za-z]+\s*\(/g,'(').replace(/\s+/g,'').length;}
export class Spreadsheet {
  constructor(calculator,{extended=false}={}){
    this.calculator=calculator;this.cells={};this.values={};this.selected='A1';
    this.memory={constantBytes:14,formulaOverhead:15,constantInputBytes:49,...calculator.model?.spreadsheetMemory};
    this.autoCalculate=true;
    assert(!extended||calculator.model?.nativeCw,'此型号不支持扩展工作表');
    this.extended=extended;
  }
  get capacity(){return this.extended?SHEET_EXTENDED_CAPACITY:SHEET_CAPACITY;}
  clear(){this.cells={};this.values={};this.selected='A1';}
  usedBytes(cells=this.cells){return Object.values(cells).reduce((n,v)=>n+(v.startsWith('=')?this.memory.formulaOverhead+sheetInputBytes(v):this.memory.constantBytes),0);}
  validateInput(text,extended=this.extended){
    if(this.calculator.model?.nativeCw)assert(text.length<=SHEET_SOURCE_LIMIT,'不支持的数据表格算式');
    const limit=extended?EXTENDED_INPUT_BYTES:text.startsWith('=')?49:this.memory.constantInputBytes;
    assert(sheetInputBytes(text)<=limit,`单元格输入不得超过 ${limit} 字节`);
  }
  setExtended(extended){
    assert(!extended||this.calculator.model?.nativeCw,'此型号不支持扩展工作表');
    if(!extended){
      assert(this.usedBytes()<=SHEET_CAPACITY,'当前工作表超出原机容量');
      for(const text of Object.values(this.cells))if(text.startsWith('='))this.validateInput(text,false);
    }
    this.extended=extended;
  }
  record(value){
    const exact=this.calculator.model?.nativeCw?cwDecimalResult(this.calculator.lastExactResult,value):null;
    return exact===null?{value}:{value,exact};
  }
  constant(expression,cells=this.cells){
    const value=this.evaluate(expression,cells);
    return String(this.calculator.model?.nativeCw?roundCWNumber(value,'Sci',10,this.calculator.lastExactResult):Number(value.toPrecision(10)));
  }
  source(address){return this.cells[cellKey(address)]||'';}
  value(address){
    if(!this.calculator.model?.nativeCw&&this.autoCalculate)this.recalculate();
    const result=this.values[cellKey(address)];
    if(result?.error)throw new Error(result.error);
    return result?.value??0;
  }
  evaluate(expression,cells=this.cells,cache={},visiting=new Set()){
    assert(typeof expression==='string'&&expression.length<=SHEET_SOURCE_LIMIT&&!/["'\[\]{};]/.test(expression),'不支持的数据表格算式');
    let text=expression.replace(/^=/,'').replaceAll('×','*').replaceAll('÷','/');
    const native=this.calculator.model?.nativeCw;
    const read=address=>{
      const p=cellPosition(address),key=cellAddress(p.col,p.row);
      assert(!visiting.has(key),'循环引用错误');
      if(cache[key]){if(cache[key].error)throw new Error(cache[key].error);return cache[key];}
      if(!cells[key])return {value:0};
      visiting.add(key);try {
        cache[key]=this.record(this.evaluate(cells[key],cells,cache,visiting));return cache[key];
      }finally {visiting.delete(key);}
    };
    text=text.replace(/\b(Sum|Mean|Min|Max)\s*\(\s*(\$?[A-Za-z]\$?\d+)\s*:\s*(\$?[A-Za-z]\$?\d+)\s*\)/gi,(_,fn,a,b)=>{
      const addresses=rangeAddresses(a+':'+b),records=addresses.filter(k=>cells[k]).map(read),name=fn.toLowerCase();
      assert(name==='sum'||records.length,'范围中没有数据');
      if(native)return '('+aggregateCWDecimals(records.map(cell=>cell.exact??cell.value),name)+')';
      const values=records.map(cell=>cell.value);
      const v=name==='sum'?values.reduce((a,b)=>a+b,0):name==='mean'?values.reduce((a,b)=>a+b,0)/values.length:name==='min'?Math.min(...values):Math.max(...values);
      return '('+v+')';
    });
    text=text.replace(reference,(address,offset,source)=>{
      if(embeddedReference(address,offset,source,native))return address;
      const cell=read(address);
      return '('+(cell.exact??cell.value)+')';
    });
    if(native)text=prepareCWLinearInput(text);
    compileSafe(text,[...this.calculator.functionNames(),...(native?['CWLog','CWConvertUnits']:[])]);
    const value=this.calculator.evaluate(text);assert(typeof value==='number'&&Number.isFinite(value),'数据表格结果须为有限实数');return value;
  }
  calculateCells(addresses, cache={}){
    for(const key of addresses){
      const text=this.cells[key];
      if(!text){delete cache[key];continue;}
      try {cache[key]=this.record(this.evaluate(text,this.cells,cache,new Set([key])));}
      catch(e){cache[key]={error:e.message};}
    }
    return cache;
  }
  recalculate(){this.values=this.calculateCells(Object.keys(this.cells));return this.values;}
  applyCells(next,changed){
    assert(this.usedBytes(next)<=this.capacity,'数据表格内存不足');
    this.cells=next;
    if(this.autoCalculate){this.recalculate();return;}
    const current=this.calculateCells(changed);
    for(const key of changed){
      if(current[key])this.values[key]=current[key];
      else delete this.values[key];
    }
  }
  set(address,expression){
    address=cellKey(address);const text=String(expression).trim();this.validateInput(text);
    const next={...this.cells};if(!text)delete next[address];else {
      // Constants are evaluated once and rounded to ten significant digits.
      next[address]=text.startsWith('=')?text:this.constant(text);
      if(text.startsWith('='))this.evaluate(text,next,{},new Set([address]));
    }
    this.applyCells(next,[address]);
  }
  copy(from,to,cut=false){
    from=cellKey(from);to=cellKey(to);
    const a=cellPosition(from),b=cellPosition(to),text=this.source(from);if(from===to)return;
    const next={...this.cells};if(text){
      next[to]=!cut&&text.startsWith('=')?shiftReferences(text,b.col-a.col,b.row-a.row,this.calculator.model?.nativeCw):text;
      // Constants already contain rounded numerical values, not fresh input.
      // Their decimal representation may be longer than the input byte limit.
      if(next[to].startsWith('='))this.validateInput(next[to]);
    }else delete next[to];if(cut)delete next[from];
    this.applyCells(next,cut?[from,to]:[to]);
  }
  fill(range,expression,formula=true){
    const addresses=rangeAddresses(range),origin=cellPosition(addresses[0]),next={...this.cells};
    const source=formula?'='+expression.replace(/^=/,''):expression;
    this.validateInput(source);
    for(const address of addresses){const p=cellPosition(address),text=shiftReferences(source,p.col-origin.col,p.row-origin.row,this.calculator.model?.nativeCw);this.validateInput(text);next[address]=formula?text:this.constant(text,next);}
    this.applyCells(next,addresses);
  }
}
