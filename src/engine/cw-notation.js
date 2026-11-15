import {prepareCWUnits} from './cw-units.js';
import {prepareCWInfix,prepareCWPostfix} from './cw-operators.js';
import {math,normalize} from './calculator.js';

const dmsComponent='(\\d+(?:\\.\\d*)?|\\.\\d+)';
const degrees=marker=>new RegExp(`${dmsComponent}${marker}${dmsComponent}${marker}${dmsComponent}${marker}`,'g');
const dmsLinear=degrees('°');
const dmsMath=degrees('\\s*\\\\CWDms(?![A-Za-z])\\s*');

export function prepareCWLinearInput(source) {
  return prepareCWInput(source.replace(/\blog\s*\(/g,'CWLog('));
}

export function prepareCWInput(source) {
  const dms=source.replace(/(?<![A-Za-z_])i(?=\s*\()/g,'(i)').replace(dmsLinear,(_,d,m,s)=>'dms('+[d,m,s].join(',')+')');
  return prepareCWPostfix(prepareCWUnits(prepareCWInfix(dms)));
}

export function displayCWLinearInput(source) {
  return source.replace(/\bCWLog\(/g,'log(');
}

export function prepareCWDegreeLatex(latex) {
  return latex.replace(dmsMath,(_,d,m,s)=>`\\operatorname{dms}\\left(${d},${m},${s}\\right)`);
}

export function groupCWImplicitDivision(tree) {
  let changed=false;
  function visit(node) {
    const result=node.map(visit);
    if (!result.isOperatorNode||result.op!=='*'||!result.implicit) return result;
    const [left,right]=result.args;
    if (!left.isOperatorNode||left.op!=='/') return result;
    changed=true;
    const denominator=new math.OperatorNode('*','multiply',[left.args[1],right],true);
    return new math.OperatorNode('/','divide',[left.args[0],new math.ParenthesisNode(denominator)]);
  }
  const result=visit(tree);
  return {tree:result,changed};
}

export function prepareCWImplicitDivision(source,display=false) {
  if (typeof source!=='string'||!/[\/÷]/.test(source)) return source;
  const {tree,changed}=groupCWImplicitDivision(math.parse(normalize(source)));
  return changed?tree.toString({parenthesis:'keep',implicit:display?'hide':'show'}):source;
}

export function cwSexagesimalText(value) {
  if (typeof value!=='number'||Math.abs(value)>9999999+59/60+59/3600) return null;
  const hundredths=Math.round(Math.abs(value)*360000);
  const degrees=Math.floor(hundredths/360000);
  const minutes=Math.floor(hundredths/6000)%60;
  const seconds=(hundredths%6000)/100;
  return `${value<0?'−':''}${degrees}°${minutes}′${seconds}″`;
}
