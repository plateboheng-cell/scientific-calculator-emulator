import {CG_FINANCIAL_VARIABLES,CG_FINANCIAL_FUNCTIONS} from '../engine/cg-financial-functions.js';
import {CG_STATISTICAL_VARIABLES,CG_STATISTICAL_FUNCTIONS} from '../engine/cg-statistical-functions.js';
import {CG_GRAPH_VARIABLES} from './cg-graph-token-data.js';
const references=[...Array.from({length:26},(_,i)=>({name:'List '+(i+1),parserName:'List'+(i+1)})),...Array.from({length:20},(_,i)=>({name:'Str '+(i+1),parserName:'Str'+(i+1)})),{name:'List Ans',parserName:'ListAns'}];
const specs=[...CG_FINANCIAL_VARIABLES,...CG_STATISTICAL_VARIABLES,...references,...CG_GRAPH_VARIABLES];
const letters='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const nameFor=(key,prefix='CGV')=>prefix+Array.from(key,char=>letters[Math.floor(char.charCodeAt(0)/26)]+letters[char.charCodeAt(0)%26]).join('');
function label(name){
  const exact={'χ²':'\\chi^2','p̂':'\\hat{p}','p̂1':'\\hat{p}_1','p̂2':'\\hat{p}_2','x̄':'\\bar{x}','x̄1':'\\bar{x}_1','x̄2':'\\bar{x}_2','ȳ':'\\bar{y}','ȳ':'\\bar{y}','r²':'r^2'};
  return exact[name]||'\\operatorname{'+name.replaceAll('_','\\_').replaceAll('%','\\%').replaceAll('Σ','\\Sigma ').replaceAll('σ','\\sigma ')+'}';
}
const byKey=new Map(specs.map(spec=>[spec.parserName,{...spec,macro:nameFor(spec.parserName)}]));
const byMacro=new Map([...byKey.values()].map(spec=>[spec.macro,spec]));
const arrayFunctions=['List','Dim','Fill','Sum','Prod','Mean','Median','Med','Min','Max','Cuml','Percent','Delta','SortA','SortD','Augment','Seq','ListToMat','MatToList','Det','Trn','Identity','Ref','Rref','Abs','Arg','Conjg','ReP','ImP','DotP','CrossP','Angle','UnitV','Norm'].map(name=>({name,parserName:name}));
const functionsByKey=new Map([...CG_FINANCIAL_FUNCTIONS,...CG_STATISTICAL_FUNCTIONS,...arrayFunctions].filter(spec=>spec.syntax!=='postfix').map(spec=>[spec.parserName,{...spec,macro:nameFor(spec.parserName,'CGF')}]));
const functionsByMacro=new Map([...functionsByKey.values()].map(spec=>[spec.macro,spec]));
export const CG_NATIVE_MACROS={...Object.fromEntries([...byKey.values(),...functionsByKey.values()].map(spec=>[spec.macro,{def:label(spec.name),args:0,expand:false,captureSelection:true}])),CGSimp:{def:'\\mathbin{\\triangleright}\\operatorname{Simp}',args:0,expand:false,captureSelection:true},CGXHat:{def:'\\hat{x}',args:0,expand:false,captureSelection:true},CGYHat:{def:'\\hat{y}',args:0,expand:false,captureSelection:true},CGListPrefix:{def:'\\operatorname{List}',args:0,expand:false,captureSelection:true},CGMatPrefix:{def:'\\operatorname{Mat}',args:0,expand:false,captureSelection:true},CGVctPrefix:{def:'\\operatorname{Vct}',args:0,expand:false,captureSelection:true},CGStrPrefix:{def:'\\operatorname{Str}',args:0,expand:false,captureSelection:true}};
export const CG_NATIVE_VARIABLE_ALIASES=Object.fromEntries(specs.map(spec=>[spec.parserName,spec.parserName]));
export function cgNativeVariableLatex(key){const spec=byKey.get(key);return spec?'\\'+spec.macro+' ':null;}
export function resolveCGNativeLatex(latex){return latex.replace(/\\CG[VF][A-Z]+/g,command=>{const spec=byMacro.get(command.slice(1));return spec?'\\operatorname{'+spec.parserName+'}':functionsByMacro.has(command.slice(1))?'\\operatorname{'+command.slice(1)+'}':command;}).replace(/\\CGXHat(?![A-Za-z])/g,'\\operatorname{CGStat_xhat}').replace(/\\CGYHat(?![A-Za-z])/g,'\\operatorname{CGStat_yhat}').replace(/\\CG(List|Mat|Vct|Str)Prefix(?![A-Za-z])/g,(_all,kind)=>'\\operatorname{CG'+kind+'}');}
export function cgNativeFunctionSpec(name){return functionsByMacro.get(name)||null;}
export function cgNativePrefixLatex(name){return ['List','Mat','Vct','Str'].includes(name)?'\\CG'+name+'Prefix ':null;}
export function cgNativeFunctionLatex(name){const spec=functionsByKey.get(name);return spec?'\\'+spec.macro+' ':null;}
export function cgNativePostfixLatex(name){return name==='CGStat_xhat'?'\\CGXHat ':name==='CGStat_yhat'?'\\CGYHat ':null;}
export function renderCGNativeSymbols(latex){return latex.replace(/\\mathrm\{([^}]+)\}/g,(all,name)=>cgNativeVariableLatex(name.replaceAll('\\_','_'))||all);}
