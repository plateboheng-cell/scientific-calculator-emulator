import {math} from './calculator.js';
import {formatCGDecimalDisplay as decimalDisplay} from './cg-rational-display.js';
import {cwComplexResult,cwDecimalResult,cwEngineeringExponent,cwEngineeringMantissa,cwPolarComponents} from './cw-decimal.js';
import {CW_ENGINEERING} from './cw-operators.js';

const inputOutputModes = ['math', 'math-decimal', 'line', 'line-decimal'];
const prefixes = new Map([[0,''],...CW_ENGINEERING.map(({symbol,exponent})=>[exponent,symbol])]);

export function sanitizeCWSettings(source, legacyDecimal = false) {
  return {
    inputOutput: inputOutputModes.includes(source?.inputOutput) ? source.inputOutput : legacyDecimal ? 'math-decimal' : 'math',
    norm: source?.norm === 2 ? 2 : 1,
    engineering: source?.engineering === true,
    mixedFractions: source?.mixedFractions === true,
    polar: source?.polar === true,
    decimalComma: source?.decimalComma === true,
    digitSeparator: source?.digitSeparator === true,
    smallFont: source?.smallFont === true,
    contrast: Number.isInteger(source?.contrast) && source.contrast >= 0 && source.contrast <= 10 ? source.contrast : 5,
    complexRoots: source?.complexRoots !== false,
    tableType: ['f','g'].includes(source?.tableType) ? source.tableType : 'fg',
  };
}

function decorate(text,{decimalComma,digitSeparator}) {
  if (digitSeparator) text = text.replace(/^(-?\d+)(?=\.|$)/, (_, digits) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, '\u2009'));
  if (decimalComma) text = text.replace('.', ',');
  return text;
}

export function formatCWEngineering(value,profile,exponent,exact) {
  const mantissa=cwEngineeringMantissa(value,exponent,profile.format,profile.digits,exact);
  const suffix=profile.cwSettings.engineering?prefixes.get(exponent):undefined;
  return decorate(mantissa+(suffix??'e'+exponent),profile.cwSettings);
}

function formatReal(value, profile, exact) {
  const {norm, engineering} = profile.cwSettings;
  const mode = profile.format;
  const digits = mode === 'Norm' ? 10 : profile.digits;
  const source = cwDecimalResult(exact,value);
  if (engineering && value !== 0) {
    let exponent=cwEngineeringExponent(value,exact);
    if(prefixes.has(exponent)){
      const mantissa=cwEngineeringMantissa(value,exponent,mode,digits,exact);
      if(Math.abs(Number(mantissa))>=1000&&prefixes.has(exponent+3))exponent+=3;
      return formatCWEngineering(value,profile,exponent,exact);
    }
  }
  return decorate(decimalDisplay(source??value,{mode,digits,norm}),profile.cwSettings);
}

export function formatCWComplexParts(value,calculator,profile,polar,exact) {
  if(polar)return cwPolarComponents(value,calculator.angle,exact).map(part=>formatReal(part.value,profile,part.exact));
  const stored=cwComplexResult(exact,value);
  return ['re','im'].map(key=>formatReal(value[key],profile,stored&&{kind:'cw-decimal',decimal:stored[key]}));
}

export function formatCWValue(value, calculator, profile, polar = profile.cwSettings.polar, exact) {
  if (math.isComplex(value)) {
    const [real,imaginaryPart]=formatCWComplexParts(value,calculator,profile,polar,exact);
    if(polar)return real+'∠'+imaginaryPart;
    if(value.im===0)return real;
    const coefficient=Math.abs(value.im)===1?'':imaginaryPart.replace(/^-/,'');
    const imaginary=coefficient+'i';
    if (value.re === 0) return (value.im < 0 ? '-' : '') + imaginary;
    return real + (value.im < 0 ? '−' : '+') + imaginary;
  }
  return typeof value === 'number' ? formatReal(value,profile,exact) : null;
}
