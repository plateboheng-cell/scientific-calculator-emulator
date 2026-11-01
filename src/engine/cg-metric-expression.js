import {parseCGMetricConversion,CGMetricError} from './cg-metric-conversion.js';

// Software Guide2-3 puts native Metric commands after powers/implicit
// multiplication and before explicit multiplication/division and addition.
// Each postfix command therefore consumes only the current higher-priority
// operand, never all text on its left. No expression is evaluated here.
const openings='([{',closings=')]}';
const command=/^\[([^\[\]]+)\]\s*(?:▶|►|▸|→|->)\s*\[([^\[\]]+)\]/u;
function quotedEnd(source,start){const quote=source[start];for(let index=start+1;index<source.length;index++){if(source[index]==='\\'){index++;continue;}if(source[index]===quote)return index;}return source.length-1;}
function groupEnd(source,start){const stack=[];for(let index=start;index<source.length;index++){const char=source[index];if(char==='"'||char==="'"){index=quotedEnd(source,index);continue;}const opening=openings.indexOf(char),closing=closings.indexOf(char);if(opening>=0)stack.push(opening);else if(closing>=0){if(stack.pop()!==closing)return -1;if(!stack.length)return index;}}return -1;}
export function rewriteCGMetricExpression(source,depth=0){
  if(typeof source!=='string')throw new CGMetricError('Syntax ERROR','Expected expression text');
  if(!/[▶►▸]/u.test(source)&&!/\]\s*(?:→|->)\s*\[/u.test(source)&&!/\s(?:to|into)\s/iu.test(source))return source;
  if(depth>24||source.length>30000)throw new CGMetricError('Memory ERROR','Conversion expression is too large');
  let transformed='',boundary=0,expectsOperand=true;
  for(let index=0;index<source.length;index++){
    const char=source[index];
    if(char==='"'||char==="'"){const end=quotedEnd(source,index);transformed+=source.slice(index,end+1);index=end;expectsOperand=false;continue;}
    const match=char==='['?command.exec(source.slice(index)):null;
    if(match){
      const conversion=parseCGMetricConversion('1'+match[0]),operand=transformed.slice(boundary).trim();
      if(!operand||expectsOperand)throw new CGMetricError('Syntax ERROR','Conversion requires an operand');
      transformed=transformed.slice(0,boundary)+'CGMetricConvert(('+operand+'),'+JSON.stringify(conversion.from)+','+JSON.stringify(conversion.to)+')';
      index+=match[0].length-1;expectsOperand=false;continue;
    }
    const opening=openings.indexOf(char);
    if(opening>=0){const end=groupEnd(source,index);if(end>=0){transformed+=char+rewriteCGMetricExpression(source.slice(index+1,end),depth+1)+closings[opening];index=end;expectsOperand=false;continue;}}
    if(char==='+'||char==='-'||char==='−'){
      // A scientific exponent sign is part of its literal, and a unary sign
      // stays with the operand. Binary +/- starts the next conversion operand.
      const exponent=/(?:^|[^\w.])(?:\d+(?:\.\d*)?|\.\d+)[eE]$/.test(transformed)&&/\d/.test(source[index+1]||'');
      transformed+=char;if(!expectsOperand&&!exponent)boundary=transformed.length;expectsOperand=true;continue;
    }
    if('*/×÷,;:=<>'.includes(char)||char==='!'&&source[index+1]==='='){
      transformed+=char;boundary=transformed.length;expectsOperand=true;continue;
    }
    if(char==='^'){transformed+=char;expectsOperand=true;continue;}
    const logical=/^(?:and|or|xor|mod)\b/i.exec(source.slice(index));
    if(logical&&(index===0||!/\w/.test(source[index-1]))){transformed+=logical[0];index+=logical[0].length-1;boundary=transformed.length;expectsOperand=true;continue;}
    transformed+=char;if(!/\s/.test(char))expectsOperand=false;
  }
  // Natural wording is an optional compatibility spelling. Native menu input
  // always uses the postfix scanner above, including nested/multiple commands.
  if(!/\s(?:to|into)\s/iu.test(transformed))return transformed;
  const conversion=parseCGMetricConversion(transformed);if(!conversion)return transformed;
  return 'CGMetricConvert(('+conversion.expression+'),'+JSON.stringify(conversion.from)+','+JSON.stringify(conversion.to)+')';
}
