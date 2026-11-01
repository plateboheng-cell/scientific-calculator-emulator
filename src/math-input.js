import { MathfieldElement } from 'mathlive';
import 'mathlive/fonts.css';
import { notationEngine, latexToExpression, expressionToLatex } from './engine/notation.js';
import {CG_NATIVE_MACROS} from './input/cg-native-symbols.js';
import {CG_METRIC_MACROS} from './input/cg-metric-symbols.js';
import {CG_CALC_MACROS} from './input/cg-calc-symbols.js';

MathfieldElement.computeEngine=notationEngine;
MathfieldElement.soundsDirectory=null;
MathfieldElement.fontsDirectory=null;

export function createMathInput({id='',name='',label='',value='',latex=false,onInput,onMove}={}){
  const mf=new MathfieldElement();
  // MathLive's macros getter requires a mounted field. Configure these before
  // parsing the initial value; its built-in LaTeX macros remain available.
  mf.macros={...CG_NATIVE_MACROS,...CG_METRIC_MACROS,...CG_CALC_MACROS};
  mf.id=id;mf.dataset.name=name;mf.setAttribute('aria-label',label);mf.setAttribute('math-virtual-keyboard-policy','manual');
  mf.smartFence=true;mf.smartSuperscript=false;mf.popoverPolicy='off';
  mf.addEventListener('mount',()=>{mf.menuItems=[];});
  mf.value=latex?value:expressionToLatex(value);
  mf.addEventListener('input',()=>onInput?.(mf));
  mf.addEventListener('move-out',event=>{if(onMove?.(event.detail?.direction,mf)){event.preventDefault();}});
  return mf;
}
export function isMathInput(el){return el?.tagName==='MATH-FIELD';}
export function readInput(el,context={}){return isMathInput(el)?latexToExpression(el.value,context):el?.value??'';}
export function insertIntoMath(mf,latex){mf.focus();mf.insert(latex,{format:'latex',selectionMode:'placeholder'});mf.dispatchEvent(new Event('input',{bubbles:true}));}
export function setMathLanguage(language){MathfieldElement.locale=language==='en'?'en':'zh-cn';}

export const keyLatex={
  frac:'\\frac{#@}{#?}',mixed:'{#?}\\frac{#?}{#?}','mixed-input':'{#?}\\frac{#?}{#?}',
  'sqrt(':'\\sqrt{#?}','cbrt(':'\\sqrt[3]{#?}',root:'\\sqrt[#?]{#?}',
  '^':'^{#?}','^2':'^{2}','^3':'^{3}','^(-1)':'^{-1}',
  'log(':'\\log_{#?}\\left(#?\\right)','ln(':'\\ln\\left(#?\\right)',
  'log10(':'\\log\\left(#?\\right)',
  'polar-angle':'\\operatorname{angle}\\left(#@,#?\\right)',
  '10^(':'10^{#?}','exp(':'e^{#?}',
  'sin(':'\\sin\\left(#?\\right)','cos(':'\\cos\\left(#?\\right)','tan(':'\\tan\\left(#?\\right)',
  'asin(':'\\arcsin\\left(#?\\right)','acos(':'\\arccos\\left(#?\\right)','atan(':'\\arctan\\left(#?\\right)',
  'sinh(':'\\sinh\\left(#?\\right)','cosh(':'\\cosh\\left(#?\\right)','tanh(':'\\tanh\\left(#?\\right)',
  'asinh(':'\\operatorname{arsinh}\\left(#?\\right)','acosh(':'\\operatorname{arcosh}\\left(#?\\right)','atanh(':'\\operatorname{artanh}\\left(#?\\right)',
  'abs(':'\\left|#?\\right|',pi:'\\pi','*':'\\times','/':'\\div',
  Ans:'\\mathrm{Ans}',MatA:'\\mathbf{A}',MatB:'\\mathbf{B}',MatC:'\\mathbf{C}',MatD:'\\mathbf{D}',
  VctA:'\\vec{A}',VctB:'\\vec{B}',VctC:'\\vec{C}',VctD:'\\vec{D}'
};
