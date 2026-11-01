import {assert,math} from './calculator.js';
import {isCGMemoryScalar,cgMemoryScalar} from './cg-array-memory.js';

const plain=value=>math.isMatrix(value)?value.toArray():value;
const isList=value=>Array.isArray(value)&&value.every(isCGMemoryScalar);

// Manual3-13: List arithmetic uses corresponding elements. A native Vct/Mat
// remains two-dimensional and therefore retains matrix multiplication rules.
export function cgListBinaryOperator(operation,left,right){
  assert(['add','subtract','multiply','divide','pow'].includes(operation),'Unsupported List operator');
  left=plain(left);right=plain(right);const a=isList(left),b=isList(right);
  if(!a&&!b)return math[operation](left,right);
  assert((a||isCGMemoryScalar(left))&&(b||isCGMemoryScalar(right)),'List and matrix operations require matching data types');
  if(a&&b)assert(left.length===right.length,'List dimensions must agree');
  return Array.from({length:a?left.length:right.length},(_,index)=>math[operation](cgMemoryScalar(a?left[index]:left),cgMemoryScalar(b?right[index]:right)));
}

export function cgListUnaryOperator(operation,value){
  assert(['unaryPlus','unaryMinus'].includes(operation),'Unsupported unary operator');
  const data=plain(value);return Array.isArray(data)?data.map(item=>cgListUnaryOperator(operation,item)):math[operation](data);
}

/** Apply only after validating the original expression with compileSafe.
 * Each operand becomes one function argument and is evaluated exactly once.
 */
export function transformCGListOperators(node){
  const mapped=node.map(child=>transformCGListOperators(child));
  if(mapped.isOperatorNode&&['add','subtract','multiply','divide','pow'].includes(mapped.fn)&&mapped.args.length===2)return new math.FunctionNode(new math.SymbolNode('CGListBinary'),[new math.ConstantNode(mapped.fn),...mapped.args]);
  if(mapped.isOperatorNode&&['unaryPlus','unaryMinus'].includes(mapped.fn)&&mapped.args.length===1)return new math.FunctionNode(new math.SymbolNode('CGListUnary'),[new math.ConstantNode(mapped.fn),...mapped.args]);
  return mapped;
}

export const CG_LIST_OPERATOR_SCOPE=Object.freeze({CGListBinary:cgListBinaryOperator,CGListUnary:cgListUnaryOperator});
