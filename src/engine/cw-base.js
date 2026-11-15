import {assert, normalize} from './calculator.js';

export const CW_BASES = [10,16,2,8];
export const CW_BASE_LABELS = {10:'十进制',16:'十六进制',2:'二进制',8:'八进制'};
export const CW_BASE_PREFIXES = {d:10,h:16,b:2,o:8};
const precedence = {OR:1,XOR:1,XNOR:1,AND:2,'+':4,'-':4,'*':5,'/':5};
const signedMin = -0x80000000n;
const signedMax = 0x7fffffffn;

function signed(value) {
  assert(value >= signedMin && value <= signedMax,'数学错误');
  return value;
}

export function cwBaseCalculate(source, base, variables) {
  const text = normalize(source).trim();
  assert(CW_BASES.includes(base) && text.length > 0 && text.length <= 500,'语法错误');
  const tokens = text.match(/@[A-Fxyz]|[dhbo][\da-f]+|\b(?:AND|OR|XOR|XNOR|NOT|NEG|ANS)\b|[\da-f]+|[()+*/-]/gi) ?? [];
  assert(tokens.join('') === text.replace(/\s/g,''),'语法错误');
  let index = 0;
  function literal(token,allowNegativeLimit) {
    const radix = CW_BASE_PREFIXES[token[0]] ?? base;
    const digits = Object.hasOwn(CW_BASE_PREFIXES,token[0])?token.slice(1):token;
    assert(/^[\da-f]+$/i.test(digits) && [...digits].every(digit => parseInt(digit,16)<radix),'数学错误');
    const prefixes = {2:'0b',8:'0o',10:'',16:'0x'};
    const value = BigInt(prefixes[radix]+digits);
    if (radix === 10 && allowNegativeLimit && value === -signedMin) return value;
    if (radix === 10) return signed(value);
    assert(value <= 0xffffffffn,'数学错误');
    return BigInt.asIntN(32,value);
  }
  function atom(allowNegativeLimit = false) {
    const token = tokens[index++];
    assert(token,'语法错误');
    const upper = token.toUpperCase();
    if (upper === '(') { const value = parse(0); assert(tokens[index++]===')','语法错误'); return value; }
    if (upper === '+' || upper === '-' || upper === 'NEG') return signed((upper==='+'?1n:-1n)*atom(upper!=='+'));
    if (upper === 'NOT') return ~atom();
    if (upper === 'ANS' || token.startsWith('@')) {
      const value = variables[upper === 'ANS'?'Ans':token.slice(1)];
      assert(typeof value === 'number' && Number.isFinite(value),'数学错误');
      return signed(BigInt(Math.trunc(value)));
    }
    return literal(token,allowNegativeLimit);
  }
  function operate(op,left,right) {
    switch(op) {
      case '+': return signed(left+right);
      case '-': return signed(left-right);
      case '*': return signed(left*right);
      case '/': assert(right!==0n,'数学错误');return signed(left/right);
      case 'AND': return left&right;
      case 'OR': return left|right;
      case 'XOR': return left^right;
      case 'XNOR': return ~(left^right);
    }
  }
  function parse(minimum) {
    let value = atom();
    while (index < tokens.length) {
      const op = tokens[index].toUpperCase();
      if (!Object.hasOwn(precedence,op) || precedence[op] < minimum) break;
      index++;
      value = operate(op,value,parse(precedence[op]+1));
    }
    return value;
  }
  const value = parse(0);
  assert(index === tokens.length,'语法错误');
  return Number(value);
}

export function cwBaseFormat(value,base) {
  if (base === 10) return String(value);
  const digits = BigInt.asUintN(32,BigInt(value)).toString(base).toUpperCase();
  if (base === 2) {
    const groups = digits.padStart(32,'0').match(/.{4}/g);
    return groups.slice(0,4).join(' ')+'\n'+groups.slice(4).join(' ');
  }
  return digits.padStart(base===16?8:11,'0');
}
