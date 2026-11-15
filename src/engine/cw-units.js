import {assert} from './calculator.js';
import {convertCGMetric,resolveCGMetricUnit} from './cg-metric-conversion.js';
import {rewriteCGMetricExpression} from './cg-metric-expression.js';

const groups = [
  ['长度',[['in','cm'],['ft','m'],['yd','m'],['mile','km'],['n_mile','m'],['pc','km']]],
  ['面积',[['acre','m2']]],
  ['体积',[['gal_US','L'],['gal_UK','L']]],
  ['质量',[['oz','g'],['lb','kg']]],
  ['速度',[['km_h','m_s']]],
  ['压强',[['atm','Pa'],['mmHg','Pa'],['kgf_cm2','Pa'],['psi','kPa']]],
  ['能量',[['kgf_m','J'],['J','cal15']]],
  ['功率',[['hp','W']]],
  ['温度',[['degF','degC']]],
];
const unitLabel = id => id==='W'?'kW':resolveCGMetricUnit(id).display;
const texUnit = label => '\\mathrm{'+label.replaceAll(' ','\\,').replaceAll('²','^{2}').replaceAll('₁₅','_{15}').replaceAll('°','{}^{\\circ}').replaceAll('·','\\cdot ')+'}';
let index=0;
export const CW_UNIT_GROUPS = groups.map(([label,pairs]) => ({label,commands:pairs.flatMap(([first,second]) => [[first,second],[second,first]].map(([from,to]) => {
  const id=index++;
  const fromLabel=unitLabel(from),toLabel=unitLabel(to);
  return {name:'CWUnit'+String.fromCharCode(65+Math.floor(id/26),65+id%26),label:fromLabel+'▸'+toLabel,from,to,
    latex:texUnit(fromLabel)+'\\blacktriangleright '+texUnit(toLabel)};
}))}));
const commands = CW_UNIT_GROUPS.flatMap(group=>group.commands);
const byName = new Map(commands.map(command=>[command.name,command]));
const byLabel = new Map(commands.map(command=>[command.label,command]));
const byPair = new Map(commands.map(command=>[command.from+':'+command.to,command]));

export const CW_UNIT_MACROS=Object.fromEntries(commands.map(({name,latex})=>[name,{def:latex,args:0,expand:false,captureSelection:true}]));
export const CW_UNIT_DICTIONARY=commands.map(({name})=>({kind:'postfix',name,latexTrigger:'\\'+name,precedence:405}));
export const cwUnitCommand=name=>byName.get(name);

const unitPattern=new RegExp([...byLabel.keys()].sort((a,b)=>b.length-a.length).map(label=>label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'g');
export function prepareCWUnits(source) {
  if(!source.includes('▸'))return source;
  const bracketed=source.replace(unitPattern,label=>{
    const {from,to}=byLabel.get(label);
    return `[${from}]▶[${to}]`;
  });
  return rewriteCGMetricExpression(bracketed).replace(/\bCGMetricConvert\(/g,'CWConvertUnits(');
}

export function convertCWUnits(value,from,to) {
  assert(typeof value==='number'&&byPair.has(`${from}:${to}`),'自变量错');
  // The shared reference uses watts. The CW power pair is stated in kilowatts.
  if(from==='W'||to==='W')return value*(convertCGMetric(1,from,to)*(from==='W'?1000:.001));
  return convertCGMetric(value,from,to);
}
