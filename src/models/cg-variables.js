// OS 3.00 2-7/2-8: A..Z plus r and theta; X/x, Y/y and Z/z share memory.
export const CG_VARIABLE_NAMES=[...Array.from({length:23},(_,i)=>String.fromCharCode(65+i)),'x','y','z','r','theta'];
export function cgVariableKey(name){
  if(name==='r')return 'r';if(name==='θ'||/^\\?theta$/i.test(name))return 'theta';
  if(!/^[A-Za-z]$/.test(name))return null;const upper=name.toUpperCase();return {X:'x',Y:'y',Z:'z'}[upper]||upper;
}
export function normalizeCGVariableExpression(source){return source.split(/("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/g).map((part,index)=>index%2?part:part.replaceAll('θ','theta')).join('');}
