import {assert,math} from './calculator.js';
import {cgMatrix,cgVector,cgMemoryScalar,cgMemoryJSON} from './cg-array-memory.js';

const dimension=value=>{assert(Number.isInteger(value)&&value>=1&&value<=999,'Dimension ERROR: dimensions must be integers from 1 to 999');return value;};
const checked=(value,{vector=false,cells=4096}={})=>vector?cgVector(value):cgMatrix(value,{max:999,cells});
export function createCGArray(rows,columns,{vector=false,cells=4096}={}){
  dimension(rows);dimension(columns);assert(!vector||rows===1||columns===1,'Dimension ERROR: vector must have one row or one column');assert(rows*columns<=(vector?999:cells),'Memory ERROR: array exceeds available cell storage');
  return Array.from({length:rows},()=>Array(columns).fill(0));
}
export function setCGArrayCell(value,row,column,scalar,options={}){
  const matrix=checked(value,options);assert(Number.isInteger(row)&&Number.isInteger(column)&&row>=0&&row<matrix.length&&column>=0&&column<matrix[0].length,'Cell position is outside the array');matrix[row][column]=cgMemoryScalar(scalar);return cgMemoryJSON(checked(matrix,options));
}
export function operateCGArrayRow(value,operation,{first=1,second=1,scalar=1}={},options={}){
  assert(!options.vector,'ROW-OP is unavailable for vectors');const matrix=checked(value,options),a=first-1,b=second-1;assert(Number.isInteger(first)&&a>=0&&a<matrix.length,'Row number is outside the matrix');if(operation!=='multiply')assert(Number.isInteger(second)&&b>=0&&b<matrix.length,'Row number is outside the matrix');
  if(operation==='swap')[matrix[a],matrix[b]]=[matrix[b],matrix[a]];
  else if(operation==='multiply'){const k=cgMemoryScalar(scalar);matrix[a]=matrix[a].map(value=>math.multiply(k,value));}
  else if(operation==='multiply-add'||operation==='add'){const k=operation==='add'?1:cgMemoryScalar(scalar),source=matrix[a].slice(),target=matrix[b].slice();matrix[b]=target.map((value,i)=>math.add(value,math.multiply(k,source[i])));}
  else assert(false,'Unknown row operation');return cgMemoryJSON(checked(matrix,options));
}
export function restructureCGArray(value,axis,operation,index,options={}){
  assert(['row','column'].includes(axis)&&['delete','insert','add'].includes(operation),'Invalid array structure operation');const matrix=checked(value,options),count=axis==='row'?matrix.length:matrix[0].length;assert(Number.isInteger(index)&&index>=0&&index<count,'Array position is outside the dimensions');const rows=matrix.length+(axis==='row'?(operation==='delete'?-1:1):0),columns=matrix[0].length+(axis==='column'?(operation==='delete'?-1:1):0);createCGArray(rows,columns,options);
  const position=index+(operation==='add'?1:0);if(axis==='row'){if(operation==='delete')matrix.splice(index,1);else matrix.splice(position,0,Array(columns).fill(0));}else for(const row of matrix){if(operation==='delete')row.splice(index,1);else row.splice(position,0,0);}return cgMemoryJSON(checked(matrix,options));
}
export function cgArrayValueText(value,compact=false){
  const scalar=cgMemoryScalar(value),number=value=>{if(!compact)return String(value);if(value===0)return '0';if(Number.isInteger(value)&&value>=-99999&&value<=999999)return String(value);const abs=Math.abs(value);return abs>=1e6||abs<1e-4?value.toExponential(2).replace(/e([+-])(\d+)$/,'E$1$2'):String(Number(value.toPrecision(6)));};
  if(typeof scalar==='number')return number(scalar);const real=scalar.re,imaginary=scalar.im,part=Math.abs(imaginary)===1?'i':number(Math.abs(imaginary))+'i';return (real?number(real):'')+(imaginary<0?'-':real?'+':'')+part;
}
function csvFields(text,delimiter){assert(typeof text==='string'&&text.length<=2000000,'CSV file is too large');const rows=[],row=[];let field='',quoted=false;const push=()=>{row.push(field);field='';};for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++;}else if(quoted||!field)quoted=!quoted;else field+=c;}else if(c===delimiter&&!quoted)push();else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;push();rows.push(row.splice(0));}else field+=c;}assert(!quoted,'CSV Syntax ERROR: unclosed quote');if(field||row.length){push();rows.push(row);}return rows;}
export function parseCGArrayCSV(text,calculator,{delimiter=',',decimal='.',vector=false,cells=4096}={}){
  assert([',',';'].includes(delimiter)&&['.',','].includes(decimal)&&delimiter!==decimal,'Invalid CSV settings');const source=csvFields(text,delimiter),columns=Math.max(0,...source.map(row=>row.length));assert(source.length&&columns&&source.length<=999&&columns<=999,'Invalid Data Size');createCGArray(source.length,columns,{vector,cells});
  return source.map((row,r)=>Array.from({length:columns},(_,c)=>{let raw=(row[c]||'').trim();if(!raw)return 0;if(decimal===',')raw=raw.replace(',','.');let value;if(/^[-+]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(raw))value=Number(raw);else if(/^=[0-9eE+\-*/^().\s]+$/.test(raw))value=calculator.evaluate(raw.slice(1));assert(typeof value==='number'&&Number.isFinite(value)&&Math.abs(value)<1e100,'Invalid Data: row '+(r+1)+', column '+(c+1));return value;}));
}
export function encodeCGArrayCSV(value,{delimiter=',',decimal='.'}={}){
  assert([',',';'].includes(delimiter)&&['.',','].includes(decimal)&&delimiter!==decimal,'Invalid CSV settings');const matrix=cgMatrix(value);return matrix.map(row=>row.map(value=>{const scalar=cgMemoryScalar(value);return String(typeof scalar==='number'?scalar:scalar.re).replace('.',decimal);}).join(delimiter)).join('\r\n');
}
