import {assert, math, normalize} from './calculator.js';

export function cwVectorMultiply(left, right) {
  if (math.isMatrix(left)) left = left.toArray();
  if (math.isMatrix(right)) right = right.toArray();
  if (!Array.isArray(left) || !Array.isArray(right)) return math.multiply(left,right);
  assert(left.length === right.length && [2,3].includes(left.length),'维数错误');
  return math.cross([...left,...(left.length===2?[0]:[])],[...right,...(right.length===2?[0]:[])]);
}

export function cwVectorExpression(source) {
  function convert(node) {
    const mapped = node.map(convert);
    const operation = mapped.isOperatorNode ? {'*':'CWVectorMultiply','.*':'dot'}[mapped.op] : null;
    return operation ? new math.FunctionNode(new math.SymbolNode(operation),mapped.args) : mapped;
  }
  return convert(math.parse(normalize(source).replaceAll('•','.*'))).toString();
}

export function cwMatrixPower(value,exponent) {
  return (Array.isArray(value)||math.isMatrix(value))&&exponent===-1?math.inv(value):math.pow(value,exponent);
}

export function cwMatrixExpression(source) {
  return math.parse(normalize(source)).transform(node => node.isOperatorNode&&node.op==='^'
    ? new math.FunctionNode(new math.SymbolNode('CWMatrixPower'),node.args) : node).toString();
}
