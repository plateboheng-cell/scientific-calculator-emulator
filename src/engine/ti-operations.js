import {assert,normalize} from './calculator.js';

// TI-36X Pro guidebook, Stored operations (p.30) and Conversions (pp.66–68).
export const TI_OPERATION_LIMIT=44;
export function sanitizeTiExtensionSettings(source={}){
  return {operation:typeof source.operation==='string'&&source.operation.length<=TI_OPERATION_LIMIT?source.operation:'',
    contrast:Number.isInteger(source.contrast)&&source.contrast>=0&&source.contrast<=10?source.contrast:5};
}
export function storedOperationExpression(operation,input='Ans'){
  assert(typeof operation==='string'&&operation.trim(),'OP NOT DEFINED');
  const op=normalize(operation.trim());
  assert(op.length<=TI_OPERATION_LIMIT,'存储操作最多 44 个字符');
  // An operation is a suffix: ×2+3 acts on the entire current entry, then adds 3.
  // The parentheses also keep a negative entry well-defined for a stored square.
  return `(${input||'Ans'})${op}`;
}
export function validateStoredOperation(calculator,operation){
  if(!operation.trim())return '';
  const clean=normalize(operation.trim());
  calculator.compile(storedOperationExpression(clean));
  return clean;
}
export function runStoredOperation(calculator,operation,input='Ans',{scope={},complex=false,count=0}={}){
  const expression=storedOperationExpression(operation,input);
  const value=calculator.evaluate(expression,scope,complex);
  return {expression,value,approximate:calculator.lastEvaluationApproximate===true,count:count+1};
}

function pair(from,to,factor,offset=0){
  return [{label:`${from} → ${to}`,from,to,convert:value=>value*factor+offset},
    {label:`${to} → ${from}`,from:to,to:from,convert:value=>(value-offset)/factor}];
}
export const tiConversionGroups=[
  {name:'English-Metric',conversions:[
    ...pair('in','cm',2.54),...pair('ft','m',.3048),...pair('yd','m',.9144),...pair('mile','km',1.609344),
    ...pair('acre','m²',4046.8564224),...pair('gal US','L',3.785411784),...pair('gal UK','L',4.54609),
    ...pair('oz','g',28.349523125),...pair('lb','kg',.45359237),
  ]},
  {name:'Temperature',conversions:[...pair('°F','°C',5/9,-32*5/9),...pair('°C','K',1,273.15)]},
  {name:'Speed, Length',conversions:[...pair('km/h','m/s',1/3.6),...pair('ly','m',9460730472580800),...pair('pc','m',3.085677581491367e16),...pair('Å','m',1e-10)]},
  {name:'Pressure',conversions:[...pair('atm','Pa',101325),...pair('mmHg','Pa',133.322387415)]},
  {name:'Power, Energy',conversions:[...pair('J','kWh',1/3600000),...pair('J','cal',1/4.1868),...pair('hp','kW',.745699871582)]},
];
export const tiConversions=tiConversionGroups.flatMap(group=>group.conversions);
export function convertTi(value,index){
  assert(typeof value==='number'&&Number.isFinite(value),'请输入实数');
  const conversion=tiConversions[index];assert(conversion,'换算不存在');
  const result=conversion.convert(value);assert(Number.isFinite(result),'超出数值范围');return result;
}
export function tiMixedNumberExpression(whole,numerator,denominator){
  const values=[whole,numerator,denominator].map(Number);
  assert(values.every(Number.isSafeInteger)&&values[1]>=0&&values[2]>0,'带分数须为整数，分子须非负，分母须为正数');
  return `${values[0]<0||Object.is(values[0],-0)?'-':''}(${Math.abs(values[0])}+${values[1]}/${values[2]})`;
}
