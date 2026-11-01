import {assert,math} from './calculator.js';
import {readOnlyCalculator} from './read-only-calculator.js';
import {cgVariableKey} from '../models/cg-variables.js';
const real=value=>typeof value==='number'&&Number.isFinite(value)&&Math.abs(value)<1e100;
export const isCGMemoryScalar=value=>real(value)||value&&typeof value==='object'&&real(value.re)&&real(value.im);
export function cgMemoryScalar(value){assert(isCGMemoryScalar(value),'Array elements must be finite real or complex numbers');return real(value)?value:value.im===0?value.re:math.complex(value.re,value.im);}
export function cgMemoryJSON(value){if(Array.isArray(value))return value.map(cgMemoryJSON);const n=cgMemoryScalar(value);return math.isComplex(n)?{re:n.re,im:n.im}:n;}
const array=value=>math.isMatrix(value)?value.toArray():value;
export function cgMatrix(value,{max=999,cells=4096}={}){
  const rows=array(value);assert(Array.isArray(rows)&&rows.length>=1&&rows.length<=max&&Array.isArray(rows[0])&&rows[0].length>=1&&rows[0].length<=max&&rows.every(row=>Array.isArray(row)&&row.length===rows[0].length),'Matrix dimensions: 1–'+max);
  assert(rows.length*rows[0].length<=cells,'Matrix Memory Full');return rows.map(row=>row.map(cgMemoryScalar));
}
export function cgVector(value){
  const rows=array(value);assert(Array.isArray(rows)&&rows.length>=1,'Vector is empty');
  const matrix=Array.isArray(rows[0])?rows:[rows];assert(matrix.length===1||matrix.every(row=>Array.isArray(row)&&row.length===1),'Vector must be one row or one column');
  return cgMatrix(matrix,{max:999,cells:999});
}
export function cgVectorValues(value){return cgVector(value).flat();}
export function cgNorm(value){const data=array(value),items=Array.isArray(data)?data.flat():[data];items.forEach(cgMemoryScalar);return Math.hypot(...items.map(item=>math.abs(cgMemoryScalar(item))));}
export function cgRowEchelon(value,reduced=false){
  const rows=cgMatrix(value),width=rows[0].length;let lead=0;
  for(let column=0;column<width&&lead<rows.length;column++){
    let pivot=lead;for(let row=lead+1;row<rows.length;row++)if(math.abs(rows[row][column])>math.abs(rows[pivot][column]))pivot=row;
    if(math.abs(rows[pivot][column])===0)continue;
    [rows[lead],rows[pivot]]=[rows[pivot],rows[lead]];const divisor=rows[lead][column];rows[lead]=rows[lead].map(item=>math.divide(item,divisor));rows[lead][column]=1;
    for(let row=reduced?0:lead+1;row<rows.length;row++){if(row===lead)continue;const multiplier=rows[row][column];if(math.abs(multiplier)===0)continue;for(let col=column+1;col<width;col++)rows[row][col]=math.subtract(rows[row][col],math.multiply(multiplier,rows[lead][col]));rows[row][column]=0;}
    lead++;
  }
  return rows;
}
export function createCGVectorScope(calculator){
  const pair=(a,b)=>{const x=cgVector(a),y=cgVector(b);assert(x.length===y.length&&x[0].length===y[0].length,'Vector dimensions must agree');return {x,y,a:x.flat(),b:y.flat()};};
  const dot=(a,b)=>{const p=pair(a,b);return math.dot(p.a,p.b);};
  const cross=(a,b)=>{const p=pair(a,b);assert([2,3].includes(p.a.length),'CrossP requires two or three elements');if(p.a.length===2){p.a.push(0);p.b.push(0);}const result=math.cross(p.a,p.b);return p.x.length===1?[result]:result.map(value=>[value]);};
  const unit=value=>{const v=cgVector(value),n=cgNorm(v);assert(n>0,'The zero vector has no unit vector');return math.divide(v,n);};
  const angle=(a,b)=>{const d=dot(a,b),n=cgNorm(a)*cgNorm(b);assert(typeof d==='number'&&n>0,'Vector angle requires nonzero real vectors');return Math.acos(Math.max(-1,Math.min(1,d/n)))/calculator.factor();};
  return {dot,cross,angleBetween:angle,unitVector:unit,norm:cgNorm,DotP:dot,CrossP:cross,Angle:angle,UnitV:unit,Norm:cgNorm};
}
export function sanitizeCGAnswers(source={}){
  const result={};for(const kind of ['matrix','vector','list'])if(source[kind]!==undefined)try{const value=kind==='matrix'?cgMatrix(source[kind]):kind==='vector'?cgVector(source[kind]):array(source[kind]);if(kind==='list')assert(Array.isArray(value)&&value.length<=999&&value.every(isCGMemoryScalar),'List Memory Full');result[kind]=cgMemoryJSON(value);}catch{/* Invalid saved answer is unavailable. */}return result;
}
export function createCGArrayScope(calculator,memory={}){
  const lists=memory.lists||[],plain=value=>math.isMatrix(value)?value.toArray():value;
  const list=value=>{const a=plain(value);assert(Array.isArray(a)&&!a.some(Array.isArray),'List requires one-dimensional data');return a.map(cgMemoryScalar);};
  const reals=value=>{const a=list(value);assert(a.every(item=>typeof item==='number'),'Domain ERROR: real list required');return a;};
  const weighted=(value,frequency)=>{const values=list(value),weights=frequency===undefined?values.map(()=>1):typeof frequency==='number'?values.map(()=>frequency):reals(frequency);assert(values.length&&weights.length===values.length&&weights.every(item=>Number.isFinite(item)&&item>=0),'Invalid list frequencies');const total=math.sum(weights);assert(total>0,'Frequency sum must be positive');return {values,weights,total};};
  const mean=(value,frequency)=>{const {values,weights,total}=weighted(value,frequency);return math.divide(values.reduce((sum,item,index)=>math.add(sum,math.multiply(item,weights[index])),0),total);};
  const median=(value,frequency)=>{const {values,weights,total}=weighted(reals(value),frequency),pairs=values.map((value,index)=>({value,weight:weights[index]})).filter(item=>item.weight>0).sort((a,b)=>a.value-b.value);let sum=0;for(let index=0;index<pairs.length;index++){sum+=pairs[index].weight;if(sum>total/2)return pairs[index].value;if(sum===total/2)return (pairs[index].value+pairs[index+1].value)/2;}return pairs.at(-1).value;};
  const extreme=(fn,a,b)=>{a=reals(a);if(b===undefined){assert(a.length,'List is empty');return fn(...a);}b=reals(b);assert(a.length===b.length,'List dimensions must agree');return a.map((value,index)=>fn(value,b[index]));};
  const scope={},unary=(value,fn)=>{const data=plain(value);return Array.isArray(data)?data.map(item=>unary(item,fn)):fn(cgMemoryScalar(data));};
  for(let i=0;i<26;i++)scope['List'+(i+1)]=list(lists[i]||[]);
  for(let i=0;i<20;i++)scope['Str'+(i+1)]=memory.strings?.[i]||'';
  for(const [key,value]of Object.entries(memory.matrices||{}))scope[key]=cgMatrix(value);
  for(const [key,value]of Object.entries(memory.vectors||{}))scope[key]=cgVector(value);
  return {...scope,
    abs:value=>unary(value,math.abs),Abs:value=>unary(value,math.abs),arg:value=>unary(value,item=>math.arg(item)/calculator.factor()),Arg:value=>unary(value,item=>math.arg(item)/calculator.factor()),
    conj:value=>unary(value,math.conj),Conjg:value=>unary(value,math.conj),re:value=>unary(value,math.re),ReP:value=>unary(value,math.re),im:value=>unary(value,math.im),ImP:value=>unary(value,math.im),
    Int:value=>unary(value,item=>{assert(typeof item==='number','Real entries required');return Math.trunc(item);}),Intg:value=>unary(value,item=>{assert(typeof item==='number','Real entries required');return Math.floor(item);}),
    Det:value=>math.det(cgMatrix(value)),Trn:value=>math.transpose(cgMatrix(value)),Ref:value=>cgRowEchelon(value),Rref:value=>cgRowEchelon(value,true),
    Identity:size=>{assert(Number.isInteger(size)&&size>=1&&size<=999&&size*size<=(calculator.model?.matrixCells||4096),'Identity dimensions exceed available matrix memory');return math.identity(size).toArray();},
    MatToList:(value,column=1)=>{const matrix=cgMatrix(value);assert(Number.isInteger(column)&&column>=1&&column<=matrix[0].length,'Matrix column out of range');return matrix.map(row=>row[column-1]);},
    ListToMat:(...values)=>{const columns=values.map(value=>{if(typeof value==='number'){assert(Number.isInteger(value)&&value>=1&&value<=26,'List number: 1–26');return list(lists[value-1]||[]);}return list(value);});assert(columns.length&&columns.every(column=>column.length===columns[0].length)&&columns[0].length,'List dimensions must agree');return cgMatrix(columns[0].map((_,row)=>columns.map(column=>column[row])));},
    List:(number,row)=>{if(typeof number==='string')number=(memory.names||[]).indexOf(number)+1;assert(Number.isInteger(number)&&number>=1&&number<=26,'List number: 1–26');const a=list(lists[number-1]||[]);if(row===undefined)return a;assert(Number.isInteger(row)&&row>=1&&row<=a.length,'List row out of range');return a[row-1];},
    Dim:value=>{const a=plain(value);assert(Array.isArray(a),'Dim requires an array');return Array.isArray(a[0])?[a.length,a[0].length]:a.length;},
    Sum:value=>math.sum(list(value)),Prod:value=>list(value).reduce((a,b)=>math.multiply(a,b),1),Mean:mean,
    Median:median,Med:median,Min:(a,b)=>extreme(Math.min,a,b),Max:(a,b)=>extreme(Math.max,a,b),
    Cuml:value=>{let total=0;return list(value).map(item=>total=math.add(total,item));},Delta:value=>{const a=list(value);return a.slice(1).map((item,index)=>math.subtract(item,a[index]));},
    Percent:value=>{const a=list(value),total=math.sum(a);assert(math.abs(total)>0,'Sum must be nonzero');return a.map(item=>math.divide(math.multiply(100,item),total));},
    SortA:value=>reals(value).sort((a,b)=>a-b),SortD:value=>reals(value).sort((a,b)=>b-a),Augment:(a,b)=>{a=plain(a);b=plain(b);if(Array.isArray(a?.[0])||Array.isArray(b?.[0])){a=cgMatrix(a);b=cgMatrix(b);assert(a.length===b.length,'Matrix row counts must agree');return cgMatrix(a.map((row,index)=>row.concat(b[index])));}return list(a).concat(list(b));},
    Seq:(expression,variable,start,end,step=1)=>{const key=cgVariableKey(variable);assert(typeof expression==='string'&&key&&[start,end,step].every(Number.isFinite)&&step!==0&&(end-start)*step>=0,'Invalid Seq range');const count=Math.floor((end-start)/step+1e-10)+1;assert(count>=1&&count<=999,'Seq maximum: 999');const local=readOnlyCalculator(calculator),code=local.compile(expression);return Array.from({length:count},(_,index)=>code.evaluate(local.scope({[key]:start+index*step})));},
  };
}
