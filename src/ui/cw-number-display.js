import {exactTex,mixedTex} from '../engine/calculator.js';
import {formatCWComplexParts} from '../engine/cw-settings.js';
import {esc} from './html.js';

export function cwNumericHTML(text) {
  const notation=/^(-?[\d.,\u2009]+)e([+-]?\d+)$/.exec(text);
  return notation
    ? esc(notation[1])+'×10<sup>'+esc(Number(notation[2]))+'</sup>'
    : esc(text);
}

export function cwComplexHTML(value,calculator,profile,renderTex,{
  polar=profile.cwSettings.polar,exact,naturalTex,mixed=profile.cwSettings.mixedFractions,
  approximate=false,decimal=false,
}={}){
  const [first,second]=formatCWComplexParts(value,calculator,profile,polar,exact);
  const firstHTML=cwNumericHTML(first);
  if(profile.cwSettings.inputOutput!=='math'){
    const firstName=polar?'radius':'real',secondName=polar?'argument':'imaginary';
    return '<span class="cw-complex-lines"><span data-cw-component="'+firstName+'">'+firstHTML+'</span>'+
      '<span data-cw-component="'+secondName+'">'+(polar?'∠'+cwNumericHTML(second):cwNumericHTML(second)+'i')+'</span></span>';
  }
  if(polar)return firstHTML+'∠'+cwNumericHTML(second);
  if(value.im===0)return firstHTML;
  const sign=value.im<0?'−':value.re===0?'':'+';
  const absImaginary=second.replace(/^-/,'');
  const unit=Math.abs(value.im)===1;
  const natural=profile.format==='Norm'&&!profile.cwSettings.engineering&&!approximate&&!decimal;
  if(natural){
    if(naturalTex)return renderTex(naturalTex);
    const format=mixed?mixedTex:exactTex;
    const re=value.re===0?'':format(value.re),im=unit?'':format(Math.abs(value.im));
    const separator=/\\[A-Za-z]+$/.test(im)?' ':'';
    const expression=re+(sign==='−'?'-':sign)+im+separator+'i';
    if(expression.includes('\\')&&!expression.includes('\\times 10^'))return renderTex(expression);
  }
  return (value.re===0?'':firstHTML)+sign+(unit&&profile.format==='Norm'?'':cwNumericHTML(absImaginary))+'i';
}
