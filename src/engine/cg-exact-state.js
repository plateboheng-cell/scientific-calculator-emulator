import {readCGRational,cgRationalJSON} from './cg-rational-display.js';

export function cgExactForValue(source,value){
  const exact=readCGRational(source);if(!exact||typeof value!=='number'||!Number.isFinite(value))return null;
  if(value===0)return exact.n===0n?exact:null;
  const number=Number(exact.n)/Number(exact.d);if(!Number.isFinite(number)||number===0)return null;
  return Math.abs(number-value)<=32*Number.EPSILON*Math.max(Math.abs(number),Math.abs(value))?exact:null;
}

export function sanitizeCGExactState(source={},variables={}){
  const result={exactVariables:{},exactAnswer:null};
  const own=(object,key)=>{const property=Object.getOwnPropertyDescriptor(object||{},key);return property&&Object.hasOwn(property,'value')?property.value:undefined;},bank=own(source,'exactVariables');
  const answer=cgExactForValue(own(source,'exactAnswer'),own(variables,'Ans'));if(answer)result.exactAnswer=cgRationalJSON(answer);
  if(bank&&typeof bank==='object'&&!Array.isArray(bank))for(const key of Object.keys(variables)){
    if(key==='Ans')continue;const property=Object.getOwnPropertyDescriptor(bank,key);if(!property||!Object.hasOwn(property,'value'))continue;
    const exact=cgExactForValue(property.value,own(variables,key));if(exact)result.exactVariables[key]=cgRationalJSON(exact);
  }
  return result;
}

// The exact parser must not cause another getter/function evaluation. Explicit
// extra scope entries also block stale exact metadata with the same name.
export function cgExactEnvironment(calculator,extra={}){
  const own=(object,key)=>{const property=Object.getOwnPropertyDescriptor(object||{},key);return property&&Object.hasOwn(property,'value')?property.value:undefined;};
  const result=Object.fromEntries(Object.entries(Object.getOwnPropertyDescriptors(own(calculator,'vars')||{})).map(([key,property])=>[key,Object.hasOwn(property,'value')?property.value:undefined]));for(const [key,property]of Object.entries(Object.getOwnPropertyDescriptors(own(calculator,'exactVariables')||{}))){if(!Object.hasOwn(property,'value'))continue;const exact=cgExactForValue(property.value,result[key]);if(exact)result[key]=exact;}
  const answer=cgExactForValue(own(calculator,'exactAnswer'),result.Ans);if(answer)result.Ans=answer;
  for(const [key,property]of Object.entries(Object.getOwnPropertyDescriptors(extra||{})))result[key]=Object.hasOwn(property,'value')?property.value:undefined;
  return result;
}
