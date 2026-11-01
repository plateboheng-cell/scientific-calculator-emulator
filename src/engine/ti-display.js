import {decimal,math} from './calculator.js';

export function tiNumber(value,{notation='Norm',decimals=null}={}){
  if(!Number.isFinite(value))throw new Error('超出数值范围');
  if(Object.is(value,-0))value=0;
  if(notation==='Sci')return value.toExponential(decimals??9);
  if(notation==='Eng'){
    let exponent=value===0?0:3*Math.floor(Math.log10(Math.abs(value))/3);
    let mantissa=value/10**exponent;
    const rounded=Number(decimals===null?mantissa.toPrecision(10):mantissa.toFixed(decimals));
    if(Math.abs(rounded)>=1000){exponent+=3;mantissa=value/10**exponent;}
    return (decimals===null?decimal(mantissa):mantissa.toFixed(decimals))+'e'+(exponent>=0?'+':'')+exponent;
  }
  return decimals===null?decimal(value):value.toFixed(decimals);
}
export function tiDisplay(value,settings,factor=1){
  if(math.isComplex(value)){
    if(settings.result==='polar')return tiNumber(math.abs(value),settings)+'∠'+tiNumber(math.arg(value)/factor,settings);
    return tiNumber(value.re,settings)+(value.im<0?'−':'+')+tiNumber(Math.abs(value.im),settings)+'i';
  }
  return typeof value==='number'?tiNumber(value,settings):decimal(value);
}
