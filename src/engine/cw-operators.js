import {assert} from './calculator.js';

// Full-width letters keep linear input symbols distinct from f(x), E and
// decimal exponents. The math field uses atomic LaTeX commands for them.
export const CW_ENGINEERING = [
  ['Milli','毫','m','ｍ',-3], ['Micro','微','μ','μ',-6],
  ['Nano','纳','n','ｎ',-9], ['Pico','皮','p','ｐ',-12], ['Femto','飞','f','ｆ',-15],
  ['Kilo','千','k','ｋ',3], ['Mega','兆','M','Ｍ',6], ['Giga','吉','G','Ｇ',9],
  ['Tera','太','T','Ｔ',12], ['Peta','拍','P','Ｐ',15], ['Exa','艾','E','Ｅ',18],
].map(([name,label,symbol,text,exponent])=>({
  name:'CWEng'+name,label:label+'('+text+')',symbol,text,exponent,
  latex:symbol==='μ'?'\\mu':'\\mathrm{'+symbol+'}',
}));

export const CW_ANGLES = [
  {name:'CWAngleDegree',label:'度',text:'°',latex:'{}^{\\circ}',fn:'deg'},
  {name:'CWAngleRadian',label:'弧度',text:'ʳ',latex:'{}^{\\mathrm{r}}',fn:'rad'},
  {name:'CWAngleGradian',label:'百分度',text:'ᵍ',latex:'{}^{\\mathrm{g}}',fn:'gra'},
];

const commands = [...CW_ENGINEERING,...CW_ANGLES];
const byName = new Map(commands.map(command=>[command.name,command]));
const byText = new Map([...commands.map(command=>[command.text,command]),['%',{}]]);

export const cwPostfixCommand = name => byName.get(name);
export const CW_POSTFIX_MACROS = Object.fromEntries(commands.map(({name,latex})=>[
  name,{def:latex,args:0,expand:false,captureSelection:true},
]));
export const CW_POSTFIX_DICTIONARY = commands.map(({name})=>({
  kind:'postfix',name,latexTrigger:'\\'+name,precedence:800,
}));

export function cwPostfixExpression(command,operand) {
  if(command.fn)return command.fn+'('+operand+')';
  if(command.exponent!==undefined)return '(('+operand+')*1e'+command.exponent+')';
  return '(('+operand+')/100)';
}

export const CW_INFIX_TEXT = Object.freeze({perm:'ᴾ',comb:'ᶜ',CWVectorDot:'•',CWRemainder:'÷R','polar-angle':'∠'});
const nativeInfix = new Map([
  ['ᴾ',{fn:'nPr',priority:2}], ['ᶜ',{fn:'nCr',priority:2}], ['∠',{fn:'angle',priority:2}],
  ['•',{fn:'dot',priority:1}], ['÷R',{fn:'CWRemainder',priority:0}],
]);
const tokens=/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\s+|(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?|[A-Za-z_][A-Za-z0-9_]*|[!<>=]=|÷R|⁻¹|./gsu;
const containsPostfix=/[ｍμｎｐｆｋＭＧＴＰＥ°ʳᵍ%]/u;

export function prepareCWPostfix(source) {
  if(!containsPostfix.test(source))return source;
  let output='', operand=null, power=null, identifier=false;
  const groups=[];
  for(const [token] of source.matchAll(tokens)){
    if(/^\s+$/.test(token)){output+=token;continue;}
    const command=byText.get(token);
    if(command){
      assert(operand!==null,'语法错误');
      operand=power??operand;
      output=output.slice(0,operand)+cwPostfixExpression(command,output.slice(operand).trimEnd());
      power=null;
    }else{
      const offset=output.length;
      output+=token;
      if(token==='('){
        groups.push({start:identifier?operand:offset,power:identifier||operand===null?power:null});
        operand=power=null;
      }else if(token===')'){
        const frame=groups.pop();
        operand=frame?.start??null;
        power=frame?.power??null;
      }else if(token==='^'){
        power??=operand;
        operand=null;
      }else if(/^[A-Za-z_π\d.'"]/u.test(token)){
        if(operand!==null)power=null;
        operand=offset;
      }else if(!['!','²','³','⁻¹'].includes(token)){
        if(operand!==null||!['+','-','−'].includes(token))power=null;
        operand=null;
      }
    }
    identifier=/^[A-Za-z_]/.test(token);
  }
  return output;
}

// Preserve ordinary text until a native operator occurs. Split on lower
// precedence boundaries, then reduce each chain at the manual's priorities.
export function prepareCWInfix(source) {
  if(!/[ᴾᶜ•∠]|÷R/u.test(source))return source;
  assert(source.length<=1500,'算式过长');
  const stream=source.match(tokens);
  let index=0;
  const closing={'(':')','[':']','{':'}'};
  function group(end=null,depth=0) {
    assert(depth<=32,'算式过长');
    let result='', term='', expectsOperand=true;
    const terms=[], operators=[];
    function flush() {
      terms.push(term);
      if(operators.some(op=>nativeInfix.has(op))){
        assert(terms.every(value=>value.trim()),'语法错误');
        for(const priority of [2,1,0]){
          for(let position=0;position<operators.length;){
            const op=operators[position], native=nativeInfix.get(op);
            if((native?.priority??0)!==priority){position++;continue;}
            const left='('+terms[position]+')',right='('+terms[position+1]+')';
            terms.splice(position,2,native?native.fn+'('+left+','+right+')':'('+left+op+right+')');
            operators.splice(position,1);
          }
        }
      }
      result+=terms.map((value,i)=>(i?operators[i-1]:'')+value).join('');
      terms.length=operators.length=0;
      term='';
    }
    while(index<stream.length){
      const token=stream[index++];
      if(token===end){flush();return result+token;}
      if(Object.hasOwn(closing,token)){
        term+=token+group(closing[token],depth+1);
        expectsOperand=false;
      }else if(nativeInfix.has(token)||['*','×','/','÷'].includes(token)){
        terms.push(term);operators.push(token);term='';
        expectsOperand=true;
      }else if(/^[,;:=<>≠≤≥]+$/.test(token)||token==='!='||
        !expectsOperand&&['+','-','−','and','or','xor','mod'].includes(token)){
        flush();result+=token;expectsOperand=true;
      }else{
        term+=token;
        if(!/^\s+$/.test(token)&&!['+','-','−'].includes(token))expectsOperand=token==='^';
      }
    }
    assert(end===null,'语法错误');
    flush();
    return result;
  }
  return group();
}
