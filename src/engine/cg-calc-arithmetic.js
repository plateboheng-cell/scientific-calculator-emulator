import {CalcError} from './calculator.js';

export const CG_CALC_ARITHMETIC_POLICY=Object.freeze({
  integerRange:'Safe JavaScript integers only; wider native BCD integers are not reproduced.',
  signedDivision:'Truncate quotient toward zero; remainder has the dividend sign. This negative-operand policy has not been measured on a device.',
  source:'fx-CG50 Software3.00,2-25:107 Int÷7=15 and107 Rmdr7=2.'
});
function integer(value){if(typeof value!=='number'||!Number.isSafeInteger(value))throw new CalcError('Domain ERROR: integer operands must be within the safe integer range');return BigInt(value);}
function divide(a,b){const left=integer(a),right=integer(b);if(right===0n)throw new CalcError('Math ERROR: division by zero');return {left,right};}
export function cgIntegerQuotient(a,b){const {left,right}=divide(a,b);return Number(left/right);}
export function cgIntegerRemainder(a,b){const {left,right}=divide(a,b);return Number(left%right);}
export function cgLogarithmBase(base,value){
  if(typeof base!=='number'||typeof value!=='number'||!Number.isFinite(base)||!Number.isFinite(value)||base<=0||base===1||value<=0)throw new CalcError('Domain ERROR: logarithm requires positive value and positive base other than1');
  const result=Math.log(value)/Math.log(base);if(!Number.isFinite(result)||Math.abs(result)>=1e100)throw new CalcError('Math ERROR: logarithm outside range');return Object.is(result,-0)?0:result;
}
