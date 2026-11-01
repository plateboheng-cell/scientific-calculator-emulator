import {math} from './calculator.js';
const isolated=new WeakSet();
// Numerical sampling must not commit the registers that an ordinary calculation
// function updates. Keep classes/prototypes while separating every mutable bank.
export function readOnlyCalculator(calculator){
  if(isolated.has(calculator))return calculator;
  const copy=Object.create(calculator);
  copy.vars=Object.fromEntries(Object.entries(calculator.vars||{}).map(([key,value])=>[key,math.clone(value)]));
  copy.approximateVariables=new Set(calculator.approximateVariables||[]);
  copy.functionCallStack=[...(calculator.functionCallStack||[])];
  copy.definitions={...(calculator.definitions||{})};
  for(const key of ['nativeAnswers','arrayMemory','financialSettings','financialMemory','statisticalMemory','statisticalRegression','functionMemory','graphMemory','exactAnswer','exactVariables','lastExactResult'])if(calculator[key]!==undefined)copy[key]=structuredClone(calculator[key]);
  isolated.add(copy);return copy;
}
