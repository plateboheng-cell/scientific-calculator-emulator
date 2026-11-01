import {assert} from './calculator.js';
import {cgRange} from './cg-workspace.js';
import {NativeCGSpreadsheet,sheetRectangle,sheetPosition,sheetAddress,SHEET_DEFAULT_FORMAT} from './cg-spreadsheet-native.js';
import {sanitizeCGStatistics,sanitizeCGListFile} from './cg-statistics.js';
const clone=value=>JSON.parse(JSON.stringify(value));
const letter=value=>{const name=String(value).replace(/^(?:Mat|Vct)/i,'').toUpperCase();assert(/^[A-Z]$/.test(name),'Memory name: A–Z');return name;};
const index=(value,max)=>{const n=Number(value);assert(Number.isInteger(n)&&n>=1&&n<=max,'Memory number: 1–'+max);return n-1;};
function selectedColors(sheet,range){const r=sheetRectangle(range);return Array.from({length:r.bottom-r.top+1},(_,row)=>Array.from({length:r.right-r.left+1},(_,col)=>sheet.effectiveFormat(sheetAddress(r.left+col,r.top+row)).charColor));}
export function storeSheetMemory(sheet,{kind,target,range=sheet.selection},{calculator,data,matrices={},vectors={}}){
  const rectangle=sheetRectangle(range),matrix=sheet.numericRows(range),colors=selectedColors(sheet,range);
  if(kind==='var'){assert(rectangle.left===rectangle.right&&rectangle.top===rectangle.bottom,'Select a single cell');const key=sheetAddress(rectangle.left,rectangle.top),cell=sheet.values[key];assert(Object.hasOwn(sheet.cells,key)&&!cell?.error&&typeof cell.value==='number','Invalid variable data');const name=String(target)==='θ'?'theta':/^[XYZ]$/.test(String(target))?String(target).toLowerCase():String(target);calculator.assign(name,cell.value);return;}
  if(kind==='mat'){assert(matrix.length*matrix[0].length<=(calculator.model?.matrixCells||4096),'Memory ERROR: matrix exceeds available storage');matrices['Mat'+letter(target)]=clone(matrix);return;}
  assert(kind==='file'||rectangle.left===rectangle.right||rectangle.top===rectangle.bottom,'Select one row or one column');
  const values=matrix.flat(),textColors=colors.flat();if(kind==='vct'){vectors['Vct'+letter(target)]=clone(matrix);return;}
  const statistics=sanitizeCGStatistics(data.statistics);
  if(kind==='list'){const targetIndex=index(target,26);statistics.lists[targetIndex]=values;statistics.elementColors[targetIndex]=textColors;}
  else if(kind==='file'){const targetIndex=index(target,6),file=sanitizeCGListFile({lists:Array.from({length:matrix[0].length},(_,col)=>matrix.map(row=>row[col])),elementColors:Array.from({length:matrix[0].length},(_,col)=>colors.map(row=>row[col]))});if(targetIndex===statistics.listFile)Object.assign(statistics,file);else statistics.listFiles[targetIndex]=file;}
  else assert(false,'Unknown memory type');data.statistics=statistics;
}
export function recallSheetMemory(sheet,{kind,target,destination=sheet.selected},{calculator,data,matrices={},vectors={}}){
  let matrix,colors=null;const statistics=sanitizeCGStatistics(data.statistics),direction=sheet.settings.move;
  if(kind==='list'){const n=index(target,26),values=statistics.lists[n];assert(values.length,'No Data');matrix=direction==='right'?[values]:values.map(value=>[value]);const textColors=statistics.elementColors[n];colors=direction==='right'?[textColors]:textColors.map(value=>[value]);}
  else if(kind==='file'){const n=index(target,6),file=n===statistics.listFile?statistics:statistics.listFiles[n];assert(file,'No Data');const last=file.lists.reduce((end,list,i)=>list.length?i:end,-1);assert(last>=0,'No Data');const rows=Math.max(...file.lists.slice(0,last+1).map(list=>list.length));matrix=Array.from({length:rows},(_,row)=>file.lists.slice(0,last+1).map(list=>list[row]??0));colors=Array.from({length:rows},(_,row)=>file.lists.slice(0,last+1).map((_,col)=>file.elementColors?.[col]?.[row]||'#000000'));}
  else if(kind==='mat'){matrix=matrices['Mat'+letter(target)];assert(matrix,'No Data');}
  else if(kind==='vct'){const values=vectors['Vct'+letter(target)];assert(values?.length,'No Data');matrix=Array.isArray(values[0])?values:[values];assert(matrix.length===1||matrix[0]?.length===1,'Dimension ERROR: vector must be one row or one column');}
  else assert(false,'Unknown memory type');
  const candidate=new NativeCGSpreadsheet(calculator,sheet.serialize());candidate.recall(matrix,destination);if(colors){const start=sheetPosition(destination);for(let row=0;row<colors.length;row++)for(let col=0;col<colors[row].length;col++)if(colors[row][col]&&colors[row][col]!=='#000000')candidate.format(sheetAddress(start.col+col,start.row+row),{...SHEET_DEFAULT_FORMAT,charColor:colors[row][col]});}
  candidate.recalculate();return candidate;
}
