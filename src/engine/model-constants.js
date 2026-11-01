import {constants} from './catalog.js';

// First-generation CN CW manual p.55: 47 entries, CODATA 2018.
// https://physics.nist.gov/cuu/Constants/ArchiveASCII/allascii_2018.txt
// SI-derived values are computed from the defining constants in doubles.
const h=6.62607015e-34,e=1.602176634e-19,k=1.380649e-23,c=299792458,na=6.02214076e23;
const values={'c₀':c,h,'ℏ':h/(2*Math.PI),G:6.67430e-11,lP:1.616255e-35,tP:5.391247e-44,
  'μ₀':1.25663706212e-6,'ε₀':8.8541878128e-12,'Z₀':376.730313668,t:273.15,e,
  'μB':9.2740100783e-24,'μN':5.0507837461e-27,'Φ₀':h/(2*e),'G₀':2*e*e/h,
  KJ:2*e/h,RK:h/(e*e),me:9.1093837015e-31,'mμ':1.883531627e-28,
  mp:1.67262192369e-27,mn:1.67492749804e-27,'mτ':3.16754e-27,mu:1.66053906660e-27,
  F:na*e,NA:na,k,Vm:na*k*273.15/101325,R:na*k,'c₁':2*Math.PI*h*c*c,'c₂':h*c/k,
  'σ':2*Math.PI**5*k**4/(15*h**3*c*c),'KJ−90':483597.9e9,'α':7.2973525693e-3,
  'a₀':5.29177210903e-11,re:2.8179403262e-15,'λC':2.42631023867e-12,
  'λCp':1.32140985539e-15,'λCn':1.31959090581e-15,'R∞':10973731.568160,
  'γp':2.6752218744e8,'μe':-9.2847647043e-24,'μp':1.41060679736e-26,
  'μn':-9.6623651e-27,'μμ':-4.49044830e-26,'RK−90':25812.807,gn:9.80665,atm:101325};
export const cwConstants=Object.freeze(constants.map(([symbol,name,,unit])=>Object.freeze([symbol,name,values[symbol],unit])));
export const cwConstantGroups=Object.freeze([
  ['通用常数',['h','ℏ','c₀','ε₀','μ₀','Z₀','G','lP','tP']],
  ['电磁常数',['μN','μB','e','Φ₀','G₀','KJ','RK']],
  ['原子与核常数',['mp','mn','me','mμ','a₀','α','re','λC','γp','λCp','λCn','R∞','μp','μe','μn','μμ','mτ']],
  ['物理与化学常数',['mu','F','NA','k','Vm','R','c₁','c₂','σ']],
  ['采用值',['gn','atm','RK−90','KJ−90']],['其他',['t']],
]);

// TI guidebook pp.67–68, current official revision: preserve its tabulated
// finite values instead of substituting another model's precision or catalog.
const tiSymbols=['c₀','gn','h','NA','R','me','mp','mn','mμ','G','F','a₀','re','k','e','mu','atm','ε₀','μ₀'];
export const tiConstants=Object.freeze([
  ...tiSymbols.map(symbol=>{const entry=cwConstants.find(row=>row[0]===symbol);return Object.freeze([entry[0],entry[1],symbol==='R'?8.314462618:symbol==='F'?96485.33212:entry[2],entry[3]]);}),
  Object.freeze(['Cc','库仑常数',8.987551792261e9,'m/F']),
]);
export function constantsFor(model){return model.constants==='codata2018'?cwConstants:model.constants==='ti20'?tiConstants:model.constants==='codata2010'?constants:[];}
