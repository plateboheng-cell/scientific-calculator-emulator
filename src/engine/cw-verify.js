import {assert, math} from './calculator.js';
import {compareCWDecimals,equalCWDecimals} from './cw-decimal.js';

export const cwRelations = ['=', '≠', '<', '>', '≤', '≥'];
export const cwRelationLatex = {'=': '=', '≠': '\\ne ', '<': '<', '>': '>', '≤': '\\le ', '≥': '\\ge '};

export function verifyCWExpression(source, evaluate) {
  const [first, ...parts] = source.replaceAll('<=', '≤').replaceAll('>=', '≥').replaceAll('!=', '≠').replaceAll('==', '=').split(/([=≠<>≤≥])/);
  assert(parts.length,'无运算符');
  assert(parts.length % 2 === 0, '语法错误');
  const operations = parts.filter((_, index) => index % 2 === 0);
  const ascending = operations.some(op => op === '<' || op === '≤');
  const descending = operations.some(op => op === '>' || op === '≥');
  assert(!(ascending && descending) && !(operations.includes('≠') && (ascending || descending)), '语法错误');
  const operands = [first, ...parts.filter((_, index) => index % 2 === 1)];
  assert(operands.every(value => value.trim()), '语法错误');
  const evaluations = operands.map(source => {
    const answer = evaluate(source);
    return answer && Object.hasOwn(answer,'value') && Object.hasOwn(answer,'exact') ? answer : {value:answer};
  });
  const values = evaluations.map(result=>result.value);
  assert(values.every(value => typeof value === 'number' || math.isComplex(value)), '数学错误');
  if (ascending || descending) assert(values.every(value => typeof value === 'number'), '数学错误');
  const truth = operations.every((op, index) => {
    const left = values[index];
    const right = values[index + 1];
    if(op==='='||op==='≠'){
      const equal=equalCWDecimals(evaluations[index],evaluations[index+1])??math.equal(left,right);
      return op==='='?equal:!equal;
    }
    const order = compareCWDecimals(evaluations[index],evaluations[index+1]);
    switch (op) {
      case '<': return order===null?left<right:order<0;
      case '>': return order===null?left>right:order>0;
      case '≤': return order===null?left<=right:order<=0;
      case '≥': return order===null?left>=right:order>=0;
    }
  });
  return {truth, rhs: operands.at(-1).trim()};
}
