import {assert} from './calculator.js';
import {cellPosition,SHEET_ROWS,SHEET_COLUMNS} from './spreadsheet.js';

const FORMAT='scientific-calculator-simulator/cn999cw-sheet';
export const CW_WORKBOOK_MAX_BYTES=512*1024;

export function encodeCWWorkbook(sheet) {
  return JSON.stringify({format:FORMAT,version:1,capacity:sheet.extended?'extended':'handheld',selected:sheet.selected,cells:sheet.cells},null,2);
}

function validateAddress(address) {
  assert(typeof address==='string'&&/^[A-E][1-9]\d?$/.test(address),'工作表文件中有无效的单元格地址');
  cellPosition(address);
}

export function readCWWorkbook(calculator,text) {
  assert(typeof text==='string'&&text.length<=CW_WORKBOOK_MAX_BYTES,'工作表文件过大');
  let saved;
  try {saved=JSON.parse(text.replace(/^\uFEFF/,''));}
  catch {throw new Error('无效的 999 工作表文件');}
  assert(saved?.format===FORMAT&&saved.version===1&&['handheld','extended'].includes(saved.capacity),'无效的 999 工作表文件');
  assert(saved.cells&&typeof saved.cells==='object'&&!Array.isArray(saved.cells),'无效的 999 工作表文件');
  const entries=Object.entries(saved.cells);
  assert(entries.length<=SHEET_ROWS*SHEET_COLUMNS,'无效的 999 工作表文件');
  validateAddress(saved.selected);
  const candidate=calculator.createSpreadsheet({extended:saved.capacity==='extended'});
  for(const [address,source] of entries){
    validateAddress(address);
    assert(typeof source==='string'&&source.trim()===source&&source.length>0,'工作表文件中有无效的单元格内容');
    if(source.startsWith('=')){
      candidate.validateInput(source);
      candidate.cells[address]=source;
    }else{
      const value=Number(source);
      assert(/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(source)&&Number.isFinite(value)&&Math.abs(value)<1e100,'工作表文件中有无效的单元格内容');
      candidate.cells[address]=String(value);
    }
  }
  assert(candidate.usedBytes()<=candidate.capacity,'数据表格内存不足');
  candidate.selected=saved.selected;
  candidate.recalculate();
  return candidate;
}
