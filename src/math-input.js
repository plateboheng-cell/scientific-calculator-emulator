import { MathfieldElement } from 'mathlive';
import 'mathlive/fonts.css';
import { notationEngine, latexToExpression, expressionToLatex } from './engine/notation.js';
import {CG_NATIVE_MACROS} from './input/cg-native-symbols.js';
import {CG_METRIC_MACROS} from './input/cg-metric-symbols.js';
import {CG_CALC_MACROS} from './input/cg-calc-symbols.js';
import {CW_STAT_MACROS} from './engine/cw-statistics.js';
import {CW_UNIT_MACROS} from './engine/cw-units.js';
import {CW_POSTFIX_MACROS} from './engine/cw-operators.js';

MathfieldElement.computeEngine=notationEngine;
MathfieldElement.soundsDirectory=null;
MathfieldElement.fontsDirectory=null;

export function createMathInput({id='',name='',label='',value='',latex=false,cwLCD=false,onInput,onMove}={}){
  const mf=new MathfieldElement();
  // MathLive's macros getter requires a mounted field. Configure these before
  // parsing the initial value; its built-in LaTeX macros remain available.
  mf.macros={...CG_NATIVE_MACROS,...CG_METRIC_MACROS,...CG_CALC_MACROS,...CW_STAT_MACROS,...cwInfixMacros,...CW_UNIT_MACROS,...CW_POSTFIX_MACROS,
    CWLog:{def:'\\log',args:0,expand:false,captureSelection:true},CWRandom:{def:'\\mathrm{Ran\\#}',args:0,expand:false,captureSelection:true},
    CWDms:{def:'{}^{\\circ}',args:0,expand:false,captureSelection:true}};
  mf.id=id;mf.dataset.name=name;mf.setAttribute('aria-label',label);mf.setAttribute('math-virtual-keyboard-policy','manual');
  mf.smartFence=true;mf.smartSuperscript=false;mf.popoverPolicy='off';
  mf.addEventListener('mount',()=>{mf.menuItems=[];});
  if(cwLCD)mf.addEventListener('mount',()=>{
    const style=document.createElement('style');
    // MathLive installs its own adopted stylesheets after this style element.
    style.textContent='.ML__cmr { font-family: "CNX LCD", KaTeX_Main, serif !important; }'+
      '.ML__mathit { font-family: "CNX LCD", KaTeX_Math, serif !important; font-style: normal !important; }';
    mf.shadowRoot.append(style);
  },{once:true});
  mf.value=latex?value:expressionToLatex(value);
  mf.addEventListener('input',()=>onInput?.(mf));
  mf.addEventListener('move-out',event=>{if(onMove?.(event.detail?.direction,mf)){event.preventDefault();}});
  return mf;
}
export function isMathInput(el){return el?.tagName==='MATH-FIELD';}
export function readInput(el,context={}){return isMathInput(el)?latexToExpression(el.value,context):el?.value??'';}
export function insertIntoMath(mf,latex){mf.focus();mf.insert(latex,{format:'latex',selectionMode:'placeholder'});mf.dispatchEvent(new Event('input',{bubbles:true}));}
export function setMathLanguage(language){MathfieldElement.locale=language==='en'?'en':'zh-cn';}

const cwInfixMacros=Object.fromEntries(Object.entries({CWVectorDot:'\\cdot',CWPermutation:'\\mathrm{P}',CWCombination:'\\mathrm{C}',CWPolarAngle:'\\angle',CWRemainder:'\\div\\mathrm{R}'}).map(([name,label])=>[name,{def:`\\mathbin{${label}}`,args:0,expand:false,captureSelection:true}]));
export const cwExpressionKeys={
  integral:'\\int_{#?}^{#?}\\left(#?\\right)\\,dx',
  derivative:'\\left.\\frac{d}{dx}\\left(#?\\right)\\right|_{x=#?}',
  sigma:'\\sum_{x=#?}^{#?}\\left(#?\\right)',
  perm:'\\CWPermutation ',comb:'\\CWCombination ',CWRemainder:'\\CWRemainder ','polar-angle':'\\CWPolarAngle ',
  'cw-log':'\\CWLog\\left(#?\\right)','Ran()':'\\CWRandom ',
  dms:'\\CWDms ',
};

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
  'abs(':'\\left|#?\\right|',pi:'\\pi','*':'\\times','/':'\\div','%':'\\%',
  Ans:'\\mathrm{Ans}',MatA:'\\mathbf{A}',MatB:'\\mathbf{B}',MatC:'\\mathbf{C}',MatD:'\\mathbf{D}',
  VctA:'\\vec{A}',VctB:'\\vec{B}',VctC:'\\vec{C}',VctD:'\\vec{D}'
};
