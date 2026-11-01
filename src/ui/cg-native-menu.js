import {CG_FINANCIAL_FUNCTIONS,CG_FINANCIAL_VARIABLES} from '../engine/cg-financial-functions.js';
import {CG_STATISTICAL_FUNCTIONS,CG_STATISTICAL_VARIABLES,CG_STATISTICAL_COMMANDS} from '../engine/cg-statistical-functions.js';
import {CG_GRAPH_VARIABLES} from '../input/cg-graph-token-data.js';
import {cgCalcTokenMeta} from '../input/cg-calc-symbols.js';
const finance=[['SIMPLE',['Smpl_SI','Smpl_SFV']],['COMPND',['Cmpd_n','Cmpd_I%','Cmpd_PV','Cmpd_PMT','Cmpd_FV']],['CASH',['Cash_NPV','Cash_IRR','Cash_PBP','Cash_NFV']],['AMORTZN',['Amt_BAL','Amt_INT','Amt_PRN','Amt_ΣINT','Amt_ΣPRN']],['CONVERT',['Cnvt_EFF','Cnvt_APR']],['COST',['Cost','Sell','Margin']],['DAYS',['Days_Prd']],['BOND',['Bond_PRC','Bond_YLD']]];
const distributions=[['NORM',['NormPD','NormCD','InvNormCD'],['Npd','Ncd','InvN']],['t',['tPD','tCD','InvTCD'],['tpd','tcd','Invt']],['CHI',['ChiPD','ChiCD','InvChiCD'],['Cpd','Ccd','InvC']],['F',['FPD','FCD','InvFCD'],['Fpd','Fcd','InvF']],['BINOMIAL',['BinomialPD','BinomialCD','InvBinomialCD'],['Bpd','Bcd','InvB']],['POISSON',['PoissonPD','PoissonCD','InvPoissonCD'],['Ppd','Pcd','InvP']],['GEO',['GeoPD','GeoCD','InvGeoCD'],['Gpd','Gcd','InvG']],['HYPRGEO',['HypergeoPD','HypergeoCD','InvHypergeoCD'],['Hpd','Hcd','InvH']]];
const variables={
  X:['n','mean','sumX','sumSquaresX','populationSDX','sx','minX','maxX'],
  Y:['meanY','sumY','sumSquaresY','sumXY','populationSDY','sy','minY','maxY'],
  GRAPH:['a','b','c','d','e','r','r2','MSe','Q1','Q3','Med','Mod','modeCount','modeFrequency','H_Start','H_pitch'],
  PTS:['x1','y1','x2','y2','x3','y3'],
  INPUT:['n','mean','sx','n1','n2','mean1','mean2','sx1','sx2','sp'],
  TEST:['p','z','t','chi2','F','pHat','pHat1','pHat2','df','se','r','r2','pa','Fa','Adf','SSa','MSa','pb','Fb','Bdf','SSb','MSb','pab','Fab','ABdf','SSab','MSab','Edf','SSe','MSe'],
  INTR:['Lower','Upper','pHat','pHat1','pHat2','df'],
  DIST:['p','xInv','x1InvN','x2InvN','zLow','zUp','tLow','tUp'],
};
const tests={Z:[['1-Sample','OneSampleZTest'],['2-Sample','TwoSampleZTest'],['1-Prop','OnePropZTest'],['2-Prop','TwoPropZTest']],t:[['1-Sample','OneSampleTTest'],['2-Sample','TwoSampleTTest'],['REG','LinRegTTest']],CHI:[['GOF','ChiGOFTest'],['2WAY','ChiTest']],ANOVA:[['1WAYANO','OneWayANOVA'],['2WAYANO','TwoWayANOVA']]};
const padded=items=>[...items,...Array(Math.max(0,6-items.length)).fill('')];
const paged=(items,page)=>[...items.slice(page*5,page*5+5),...Array(Math.max(0,5-items.slice(page*5,page*5+5).length)).fill(''),'▶'];
const suffix=name=>name.includes('_')?name.slice(name.indexOf('_')+1):name;
export function createCGNativeMenu({linear=false,onChange=()=>{},onInsert,onOther=()=>{},onExit=()=>{}}){
  let path='options',page=0;const parents=[];
  const push=(next,index=0)=>{parents.push({path,page});path=next;page=index;onChange();};
  const next=count=>{page=(page+1)%Math.max(1,Math.ceil(count/5));onChange();};
  const functionToken=name=>{const item=[...CG_FINANCIAL_FUNCTIONS,...CG_STATISTICAL_FUNCTIONS].find(item=>item.name===name||item.parserName===name);if(item)onInsert({...item,kind:'function'});else onInsert({name,parserName:name,kind:'function'});};
  const statement=name=>{const item=CG_STATISTICAL_COMMANDS.find(item=>item.name===name);if(item)onInsert({...item,parserName:name,kind:'statement'});};
  function labels(){
    if(path==='options')return (linear?[['LIST','MAT/VCT','COMPLEX','CALC','STAT','▶'],['CONVERT','HYPERBL','PROB','NUMERIC','ANGLE','▶'],['ENG-SYM','PICTURE','FUNCMEM','LOGIC','CAPTURE','▶'],['FINANCE','','','','','▶']]:[['LIST','MAT/VCT','COMPLEX','CALC','STAT','▶'],['CONVERT','HYPERBL','PROB','NUMERIC','ANGLE','▶'],['LOGIC','FINANCE','','','','▶']])[page];
    if(path==='variables')return page?['TABLE','RECUR','EQUA','FINANCE','Str','▶']:['V-WIN','FACTOR','STAT','GRAPH','DYNA','▶'];
    if(path==='view-variables')return ['X','Y','Tθ','R-X','R-Y','R-Tθ'];
    if(path.startsWith('view-vars:'))return padded(path.endsWith('TTheta')?['min','max','pitch']:['min','max','scale','dot']);
    if(path==='financial-vars')return paged(CG_FINANCIAL_VARIABLES.map(item=>item.name),page);
    if(path==='finance')return paged(finance.map(item=>item[0]),page);
    if(path.startsWith('finance:'))return padded(finance.find(item=>item[0]===path.slice(8))[1].map(suffix));
    if(path==='stat-options')return page?['TEST','','','','','▶']:['x̂','ŷ','DIST','StdDev','Var',linear?'▶':''];
    if(path==='distributions')return paged(distributions.map(item=>item[0]),page);
    if(path.startsWith('distribution:'))return padded(distributions.find(item=>item[0]===path.slice(13))[2]);
    if(path==='dispersion:sd')return ['S','σ','','','',''];
    if(path==='dispersion:variance')return ['S²','σ²','','','',''];
    if(path==='stat-variables')return page?['RESULT','','','','','▶']:['X','Y','GRAPH','PTS','INPUT','▶'];
    if(path==='stat-result')return ['TEST','INTR','DIST','','',''];
    if(path.startsWith('stat-vars:'))return paged(variables[path.slice(10)].map(key=>CG_STATISTICAL_VARIABLES.find(item=>item.key===key)?.name||key),page);
    if(path==='test-options')return ['Z','t','CHI','F','ANOVA',''];
    if(path==='capture-commands')return ['Recall','','','','',''];
    if(path==='picture-commands')return ['STORE','RECALL','','','',''];
    if(path.startsWith('test:'))return padded(tests[path.slice(5)].map(item=>item[0]));
    if(path==='list-commands')return [['List','Lst→Mat','Dim','Fill(','Seq','▶'],['Min','Max','Mean','Med','Augment','▶'],['Sum','Prod','Cuml','%','ΔList','▶']][page];
    if(path==='array-commands')return [['Mat','Mat→List','Det','Trn','Augmnt','▶'],['Identity','Dim','Fill','Ref','Rref','▶'],['Vct','DotP','CrossP','Angle','UnitV','▶'],['Norm','','','','','▶']][page];
    if(path==='calc-commands')return [['Solve','d/dx','d²/dx²','∫dx','SolveN','▶'],['FMin','FMax','Σ(','logab','','▶'],['Int÷','Rmdr','Simp','','','▶']][page];
    return ['','','','','',''];
  }
  function press(index){
    if(index<1||index>6)return;
    if(path==='options'){if(index===6){page=(page+1)%(linear?4:3);onChange();return;}const label=labels()[index-1];if(label==='FINANCE')push('finance');else if(label==='STAT')push('stat-options');else if(label==='MAT/VCT')push('array-commands');else if(label==='LIST')push('list-commands');else if(label==='CALC')push('calc-commands');else if(label==='CAPTURE')push('capture-commands');else if(label==='PICTURE')push('picture-commands');else if(label)onOther(label);return;}
    if(path==='calc-commands'){if(index===6){page=(page+1)%3;onChange();return;}const name=[['Solve','diff','diff2','integral','SolveN'],['FMin','FMax','Sigma','logab'],['CGIntDiv','CGRmdr','Simp']][page][index-1];if(name==='Simp')onOther('SIMP');else if(name)onInsert(cgCalcTokenMeta(name));return;}
    if(path==='variables'){if(index===6){page=1-page;onChange();return;}const label=labels()[index-1];if(label==='FINANCE')push('financial-vars');else if(label==='STAT')push('stat-variables');else if(label==='V-WIN')push('view-variables');else if(label)onOther('VARS:'+label);return;}
    if(path==='view-variables'){push('view-vars:'+['X','Y','TTheta','RightX','RightY','RightTTheta'][index-1]);return;}
    if(path.startsWith('view-vars:')){const axis=path.slice(10),part=(axis.endsWith('TTheta')?['min','max','ptch']:['min','max','scl','dot'])[index-1],spec=CG_GRAPH_VARIABLES.find(spec=>spec.parserName===axis+part);if(spec)onInsert({...spec,kind:'variable'});return;}
    if(path==='financial-vars'){if(index===6)next(CG_FINANCIAL_VARIABLES.length);else{const item=CG_FINANCIAL_VARIABLES[page*5+index-1];if(item)onInsert({...item,kind:'variable'});}return;}
    if(path==='finance'){if(index===6)next(finance.length);else if(finance[page*5+index-1])push('finance:'+finance[page*5+index-1][0]);return;}
    if(path.startsWith('finance:')){const name=finance.find(item=>item[0]===path.slice(8))[1][index-1];if(name)functionToken(name);return;}
    if(path==='stat-options'){if(index===6){if(linear){page=1-page;onChange();}return;}if(page===1){if(index===1)push('test-options');return;}if(index<=2)functionToken(index===1?'CGStat_xhat':'CGStat_yhat');else if(index===3)push('distributions');else if(index===4)push('dispersion:sd');else if(index===5)push('dispersion:variance');return;}
    if(path==='distributions'){if(index===6)next(distributions.length);else if(distributions[page*5+index-1])push('distribution:'+distributions[page*5+index-1][0]);return;}
    if(path.startsWith('distribution:')){const name=distributions.find(item=>item[0]===path.slice(13))[1][index-1];if(name)functionToken(name);return;}
    if(path==='dispersion:sd'||path==='dispersion:variance'){if(index<=2)functionToken(path.endsWith('sd')?(index===1?'StdDev':'StdDev_sigma'):(index===1?'Variance':'Variance_sigma2'));return;}
    if(path==='stat-variables'){if(index===6){page=1-page;onChange();}else{const label=labels()[index-1];if(label==='RESULT')push('stat-result');else if(label)push('stat-vars:'+label);}return;}
    if(path==='stat-result'){if(index<=3)push('stat-vars:'+['TEST','INTR','DIST'][index-1]);return;}
    if(path.startsWith('stat-vars:')){const keys=variables[path.slice(10)];if(index===6)next(keys.length);else{const spec=CG_STATISTICAL_VARIABLES.find(item=>item.key===keys[page*5+index-1]);if(spec)onInsert({...spec,kind:'variable'});}return;}
    if(path==='test-options'){const label=labels()[index-1];if(label==='F')statement('TwoSampleFTest');else if(label)push('test:'+label);return;}
    if(path==='capture-commands'){if(index===1)onInsert({name:'RclCapt',parserName:'RclCapt',kind:'statement'});return;}
    if(path==='picture-commands'){if(index<=2)onInsert({name:index===1?'StoPict':'RclPict',parserName:index===1?'StoPict':'RclPict',kind:'statement'});return;}
    if(path.startsWith('test:')){const name=tests[path.slice(5)][index-1]?.[1];if(name)statement(name);return;}
    if(path==='list-commands'){if(index===6){page=(page+1)%3;onChange();return;}const name=[['List','ListToMat','Dim','Fill','Seq'],['Min','Max','Mean','Med','Augment'],['Sum','Prod','Cuml','Percent','Delta']][page][index-1];if(name==='List')onInsert({name,parserName:name,kind:'prefix'});else if(name)functionToken(name);return;}
    if(path==='array-commands'){if(index===6){page=(page+1)%4;onChange();return;}const label=labels()[index-1];if(!label)return;if(label==='Mat'||label==='Vct')onInsert({name:label,parserName:label,kind:'prefix'});else functionToken(({'Mat→List':'MatToList',Augmnt:'Augment'})[label]||label);return;}
  }
  return {labels,press,start(kind='options'){path=kind;page=0;parents.length=0;onChange();},back(){const previous=parents.pop();if(previous){path=previous.path;page=previous.page;onChange();}else onExit();}};
}
