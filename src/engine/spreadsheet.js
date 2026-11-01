import {assert,compileSafe} from './calculator.js';

export const SHEET_ROWS=45,SHEET_COLUMNS=5,SHEET_CAPACITY=1700;
const reference=/\$?[A-Za-z]\$?[1-9]\d*/g;
const embeddedReference=(text,offset,source)=>offset>0&&(/[A-Za-z_]/.test(source[offset-1])||(/[0-9.]/.test(source[offset-1])&&/^[eE]\d+$/.test(text)));
export function cellPosition(address){const m=/^\$?([A-E])\$?([1-9]\d?)$/i.exec(address);assert(m&&+m[2]<=SHEET_ROWS,'单元格范围须为 A1:E45');return {col:m[1].toUpperCase().charCodeAt(0)-65,row:+m[2]-1};}
export function cellAddress(col,row){assert(Number.isInteger(col)&&col>=0&&col<SHEET_COLUMNS&&Number.isInteger(row)&&row>=0&&row<SHEET_ROWS,'单元格范围须为 A1:E45');return String.fromCharCode(65+col)+(row+1);}
export function rangeAddresses(range){
  const parts=range.split(':');assert(parts.length<=2,'单元格范围须为 A1:E45');const a=cellPosition(parts[0]),b=cellPosition(parts[1]||parts[0]);assert(a.col<=b.col&&a.row<=b.row,'单元格范围顺序错误');
  const cells=[];for(let row=a.row;row<=b.row;row++)for(let col=a.col;col<=b.col;col++)cells.push(cellAddress(col,row));return cells;
}
export function shiftReferences(expression,dx,dy){
  return expression.replace(reference,(text,offset,source)=>{
    if(embeddedReference(text,offset,source))return text;
    const p=cellPosition(text),m=/^(\$?)[A-Za-z](\$?)\d+$/.exec(text),col=p.col+(m[1]?0:dx),row=p.row+(m[2]?0:dy);
    // As on the handheld, out-of-range copied references become error cells.
    return (m[1]||'')+(col>=0&&col<SHEET_COLUMNS?String.fromCharCode(65+col):'?')+(m[2]||'')+(row>=0&&row<SHEET_ROWS?row+1:'?');
  });
}
// Textual token count approximates the manual's command-byte convention;
// firmware byte encoding and its undocumented dependency memory limit differ.
export function sheetInputBytes(expression){return expression.replace(/\b[A-Za-z]+\s*\(/g,'(').replace(/\s+/g,'').length;}
export class Spreadsheet {
  constructor(calculator){
    this.calculator=calculator;this.cells={};this.values={};this.selected='A1';
    this.memory={constantBytes:14,formulaOverhead:15,constantInputBytes:49,...calculator.model?.spreadsheetMemory};
  }
  clear(){this.cells={};this.values={};this.selected='A1';}
  usedBytes(cells=this.cells){return Object.values(cells).reduce((n,v)=>n+(v.startsWith('=')?this.memory.formulaOverhead+sheetInputBytes(v):this.memory.constantBytes),0);}
  validateInput(text){
    const limit=text.startsWith('=')?49:this.memory.constantInputBytes;
    assert(sheetInputBytes(text)<=limit,`单元格输入不得超过 ${limit} 字节`);
  }
  source(address){cellPosition(address);return this.cells[address.toUpperCase()]||'';}
  value(address){this.recalculate();const result=this.values[address.toUpperCase()];if(result?.error)throw new Error(result.error);return result?.value??0;}
  evaluate(expression,cells=this.cells,cache={},visiting=new Set()){
    assert(typeof expression==='string'&&expression.length<=500&&!/["'\[\]{};]/.test(expression),'不支持的数据表格算式');
    let text=expression.replace(/^=/,'').replaceAll('×','*').replaceAll('÷','/');
    const read=address=>{
      const p=cellPosition(address),key=cellAddress(p.col,p.row);
      assert(!visiting.has(key),'循环引用错误');
      if(cache[key]){if(cache[key].error)throw new Error(cache[key].error);return cache[key].value;}
      if(!cells[key])return 0;
      visiting.add(key);try {const value=this.evaluate(cells[key],cells,cache,visiting);cache[key]={value};return value;}finally {visiting.delete(key);}
    };
    text=text.replace(/\b(Sum|Mean|Min|Max)\s*\(\s*(\$?[A-Za-z]\$?\d+)\s*:\s*(\$?[A-Za-z]\$?\d+)\s*\)/gi,(_,fn,a,b)=>{
      const addresses=rangeAddresses(a+':'+b),values=addresses.filter(k=>cells[k]).map(read),name=fn.toLowerCase();
      assert(name==='sum'||values.length,'范围中没有数据');
      const v=name==='sum'?values.reduce((a,b)=>a+b,0):name==='mean'?values.reduce((a,b)=>a+b,0)/values.length:name==='min'?Math.min(...values):Math.max(...values);
      return '('+v+')';
    });
    text=text.replace(reference,(address,offset,source)=>embeddedReference(address,offset,source)?address:'('+read(address)+')');
    compileSafe(text,this.calculator.functionNames());
    const value=this.calculator.evaluate(text);assert(typeof value==='number'&&Number.isFinite(value),'数据表格结果须为有限实数');return value;
  }
  recalculate(){
    const cache={};for(const [key,text]of Object.entries(this.cells)){try {cache[key]={value:this.evaluate(text,this.cells,cache,new Set([key]))};}catch(e){cache[key]={error:e.message};}}
    this.values=cache;return cache;
  }
  set(address,expression){
    address=address.toUpperCase();cellPosition(address);const text=String(expression).trim();this.validateInput(text);
    const next={...this.cells};if(!text)delete next[address];else {
      // Constants are evaluated once and rounded to ten significant digits.
      next[address]=text.startsWith('=')?text:String(Number(this.evaluate(text).toPrecision(10)));
      if(text.startsWith('='))this.evaluate(text,next,{},new Set([address]));
    }
    assert(this.usedBytes(next)<=SHEET_CAPACITY,'数据表格内存不足');this.cells=next;this.recalculate();
  }
  copy(from,to,cut=false){
    from=from.toUpperCase();to=to.toUpperCase();
    const a=cellPosition(from),b=cellPosition(to),text=this.source(from);if(from===to)return;
    const next={...this.cells};if(text){
      next[to]=!cut&&text.startsWith('=')?shiftReferences(text,b.col-a.col,b.row-a.row):text;
      // Constants already contain rounded numerical values, not fresh input.
      // Their decimal representation may be longer than the input byte limit.
      if(next[to].startsWith('='))this.validateInput(next[to]);
    }else delete next[to];if(cut)delete next[from];
    assert(this.usedBytes(next)<=SHEET_CAPACITY,'数据表格内存不足');this.cells=next;this.recalculate();
  }
  fill(range,expression,formula=true){
    const addresses=rangeAddresses(range),origin=cellPosition(addresses[0]),previous=this.cells,next={...previous};
    const source=formula?'='+expression.replace(/^=/,''):expression;
    this.validateInput(source);
    for(const address of addresses){const p=cellPosition(address),text=shiftReferences(source,p.col-origin.col,p.row-origin.row);this.validateInput(text);next[address]=formula?text:String(Number(this.evaluate(text,next).toPrecision(10)));}
    assert(this.usedBytes(next)<=SHEET_CAPACITY,'数据表格内存不足');this.cells=next;this.recalculate();
  }
}
