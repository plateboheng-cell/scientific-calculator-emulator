import {assert} from './calculator.js';
import {normalCDF} from './distributions.js';
import {realRoots, regressionValue} from './modes.js';

const symbols = [
  ['SumX','Σx','\\Sigma x'],['SumX2','Σx²','\\Sigma x^2'],['SumY','Σy','\\Sigma y'],['SumY2','Σy²','\\Sigma y^2'],
  ['SumXY','Σxy','\\Sigma xy'],['SumX3','Σx³','\\Sigma x^3'],['SumX2Y','Σx²y','\\Sigma x^2y'],['SumX4','Σx⁴','\\Sigma x^4'],
  ['MeanX','x̄','\\bar{x}'],['PopVarX','σx²','\\sigma_x^2'],['PopX','σx','\\sigma_x'],['SampleVarX','sx²','s_x^2'],['SampleX','sx','s_x'],
  ['MeanY','ȳ','\\bar{y}'],['PopVarY','σy²','\\sigma_y^2'],['PopY','σy','\\sigma_y'],['SampleVarY','sy²','s_y^2'],['SampleY','sy','s_y'],['Count','n','n'],
  ['MinX','min','\\operatorname{min}(x)'],['Q1','Q1','Q_1'],['Median','Med','\\operatorname{Med}'],['Q3','Q3','Q_3'],['MaxX','max','\\operatorname{max}(x)'],
  ['MinY','minY','\\operatorname{min}(y)'],['MaxY','maxY','\\operatorname{max}(y)'],
  ['A','a','a'],['B','b','b'],['C','c','c'],['RCoef','r','r'],
];
const commands = [
  ['P','P(','\\mathrm{P}','call'],['Q','Q(','\\mathrm{Q}','call'],['R','R(','\\mathrm{R}','call'],
  ['T','▶t','\\triangleright t','postfix'],['EstimateX','x̂','\\hat{x}','postfix'],['EstimateX1','x̂₁','\\hat{x}_1','postfix'],
  ['EstimateX2','x̂₂','\\hat{x}_2','postfix'],['EstimateY','ŷ','\\hat{y}','postfix'],
];
export const CW_STAT_SYMBOLS = Object.fromEntries([...symbols,...commands].map(([key,label,latex,kind]) => [key,{name:'CWStat'+key,label,latex,kind}]));
export const CW_STAT_FUNCTIONS = commands.map(([key]) => CW_STAT_SYMBOLS[key].name);
export const CW_STAT_POSTFIX = new Set(commands.filter(command => command[3] === 'postfix').map(([key]) => CW_STAT_SYMBOLS[key].name));
export const CW_STAT_MACROS = Object.fromEntries(Object.values(CW_STAT_SYMBOLS).map(({name,latex}) => [name,{def:latex,args:0,expand:false,captureSelection:true}]));

export function cwStatLatex(action) {
  const name = action.replace(/\($/,'');
  if (!Object.hasOwn(CW_STAT_MACROS,name)) return null;
  return '\\'+name+(action.endsWith('(')?'\\left(#?\\right)':' ');
}

export function cwRegressionCoefficients(fit, kind) {
  if (kind === 'linear') return {a:fit.b,b:fit.a,r:fit.r};
  if (kind === 'quadratic') return {a:fit.c,b:fit.b,c:fit.a};
  return {a:fit.a,b:fit.b,r:fit.r};
}

function estimateX(fit, kind, y, branch = 0) {
  const {a,b,c} = fit;
  let value;
  switch (kind) {
    case 'linear': value=(y-a)/b;break;
    case 'quadratic': value=realRoots([c,b,a-y]).reverse()[branch];break;
    case 'log': value=Math.exp((y-a)/b);break;
    case 'exp': value=Math.log(y/a)/b;break;
    case 'abexp': value=Math.log(y/a)/Math.log(b);break;
    case 'power': value=(y/a)**(1/b);break;
    case 'inverse': value=b/(y-a);break;
  }
  assert(Number.isFinite(value),'数学错误');
  return value;
}

export function cwStatisticsScope(summary, fit, regression) {
  const values = fit ? {...summary,...cwRegressionCoefficients(fit,regression)} : summary;
  const scope = Object.fromEntries(symbols.map(([key,label]) => [CW_STAT_SYMBOLS[key].name,values[label]]).filter(([,value]) => Number.isFinite(value)));
  const add = (key, fn) => { scope[CW_STAT_SYMBOLS[key].name] = fn; };
  if (fit) {
    add('EstimateY', x => regressionValue(fit,regression,x));
    add('EstimateX', y => estimateX(fit,regression,y));
    add('EstimateX1', y => estimateX(fit,regression,y,0));
    add('EstimateX2', y => estimateX(fit,regression,y,1));
  } else {
    add('P', t => normalCDF(-1e99,t));
    add('Q', t => t<0 ? -normalCDF(t,0) : normalCDF(0,t));
    add('R', t => normalCDF(t,1e99));
    add('T', x => {
      assert(summary['σx'] > 0,'数学错误');
      return (x-summary['x̄'])/summary['σx'];
    });
  }
  return scope;
}
