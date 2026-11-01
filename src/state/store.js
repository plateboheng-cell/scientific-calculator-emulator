import {getModel} from '../models/registry.js';
import {resolveLanguagePreference} from '../language.js';
import {sanitizeCGWorkspace} from './cg-workspace.js';
import {sanitizeCGExam} from './cg-exam.js';
import {sanitizeCGFinancialNative} from '../engine/cg-financial-functions.js';
import {cgMatrix,cgVector,cgMemoryJSON,sanitizeCGAnswers} from '../engine/cg-array-memory.js';
import {sanitizeCGStatisticalNative} from '../engine/cg-statistical-functions.js';
import {sanitizeCGFunctionMemory} from '../engine/cg-function-memory.js';
import {sanitizeCGExactState} from '../engine/cg-exact-state.js';

export const STORAGE_KEY = 'cnx-v2';
export const LEGACY_KEY = 'cnx-v1';
const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const finite = value => typeof value === 'number' && Number.isFinite(value);
const string = value => typeof value === 'string' && value.length <= 3000 ? value : '';
const validModel = id => {try {getModel(id); return true;} catch {return false;}};
function cgArrayBank(source,names,kind){const result={};for(const [name,value]of Object.entries(object(source)))if(names.includes(name))try{result[name]=cgMemoryJSON(kind==='vector'?cgVector(value):cgMatrix(value));}catch{/* Invalid saved array is unavailable. */}return result;}
export function sanitizeTiSettings(source={}){
  const s=object(source);
  return {notation:['Norm','Sci','Eng'].includes(s.notation)?s.notation:'Norm',decimals:Number.isInteger(s.decimals)&&s.decimals>=0&&s.decimals<=9?s.decimals:null,
    result:['real','rect','polar'].includes(s.result)?s.result:'real',input:s.input==='classic'?'classic':'math',base:[2,8,10,16].includes(s.base)?s.base:10,
    operation:typeof s.operation==='string'?s.operation.slice(0,44):'',contrast:Number.isInteger(s.contrast)&&s.contrast>=0&&s.contrast<=10?s.contrast:5};
}

export function sanitizeGraph(source={},count=4,includeMemories=true) {
  const s=object(source),limit=9.999999999e97,real=value=>finite(value)&&Math.abs(value)<=limit,window=value=>{const w=object(value);return [w.xmin,w.xmax,w.ymin,w.ymax].every(real)&&w.xmin<w.xmax&&w.ymin<w.ymax&&w.xmin+(w.xmax-w.xmin)/2048>w.xmin&&w.ymin+(w.ymax-w.ymin)/2048>w.ymin?{xmin:w.xmin,xmax:w.xmax,ymin:w.ymin,ymax:w.ymax}:null;},initialWindow=count===20?{xmin:-6.3,xmax:6.3,ymin:-3.1,ymax:3.1}:{xmin:-10,xmax:10,ymin:-10,ymax:10},initialParameter=count===20?{min:0,max:2*Math.PI,step:2*Math.PI/100}:{min:0,max:360,step:1};
  const parameter=value=>real(value?.min)&&real(value?.max)&&real(value?.step)&&value.min!==value.max&&value.step!==0&&Math.abs((value.max-value.min)/value.step)<=20000?{min:value.min,max:value.max,step:Math.sign(value.max-value.min)*Math.abs(value.step)}:{...initialParameter};
  const view=(value,fallback={window:initialWindow,xscale:1,yscale:1,parameter:initialParameter})=>{const input=object(value);return {window:window(input.window)||{...fallback.window},xscale:real(input.xscale)&&input.xscale>=0?input.xscale:fallback.xscale,yscale:real(input.yscale)&&input.yscale>=0?input.yscale:fallback.yscale,parameter:input.parameter?parameter(input.parameter):{...fallback.parameter}};},left=view(s),right=view(s.right,left),setup=object(s.setup),table=object(s.graphTable),background=object(s.background);
  return {expressions:Array.from({length:count},(_,i)=>string(s.expressions?.[i]).slice(0,1500)),enabled:Array.from({length:count},(_,i)=>s.enabled?.[i]!==false),window:left.window,selected:Number.isInteger(s.selected)&&s.selected>=0&&s.selected<count?s.selected:0,traceX:finite(s.traceX)?s.traceX:0,
    styles:Array.from({length:count},(_,i)=>['Normal','Thick','Broken','Dot','Thin'].includes(s.styles?.[i])?s.styles[i]:'Normal'),
    zoomX:finite(s.zoomX)&&s.zoomX>1&&s.zoomX<=100?s.zoomX:2,zoomY:finite(s.zoomY)&&s.zoomY>1&&s.zoomY<=100?s.zoomY:2,
    expressions2:Array.from({length:count},(_,i)=>string(s.expressions2?.[i]).slice(0,1500)),
    types:Array.from({length:count},(_,i)=>['y','x','polar','parametric','y>','y<','y>=','y<=','x>','x<','x>=','x<='].includes(s.types?.[i])?s.types[i]:'y'),
    parameter:left.parameter,xscale:left.xscale,yscale:left.yscale,
    setup:{axes:['on','off','scale'].includes(setup.axes)?setup.axes:'scale',grid:['on','off','line'].includes(setup.grid)?setup.grid:'line',label:setup.label!==false,coord:setup.coord!==false,drawType:setup.drawType==='plot'?'plot':'connect',derivative:setup.derivative===true,graphFunc:setup.graphFunc!==false,dual:['gg','gtot'].includes(setup.dual)?setup.dual:'off',simultaneous:setup.simultaneous===true},right,
    destinations:Array.from({length:count},(_,i)=>['L','R','B'].includes(s.destinations?.[i])?s.destinations[i]:'L'),
    viewMemories:Array.from({length:6},(_,i)=>{const record=s.viewMemories?.[i];return record&&typeof record==='object'?{left:view(record.left||record,left),right:view(record.right||record,right)}:null;}),
    graphTable:{active:table.active==='table'?'table':'graph',selected:Number.isInteger(table.selected)&&table.selected>=0&&table.selected<999?table.selected:0,column:table.column===1?1:0,rows:(Array.isArray(table.rows)?table.rows:[]).slice(0,999).filter(row=>row&&[row.x,row.y,row.parameter].every(finite)&&Number.isInteger(row.index)&&row.index>=0&&row.index<count).map(row=>({x:row.x,y:row.y,parameter:row.parameter,index:row.index,...(finite(row.derivative)?{derivative:row.derivative}:{})}))},
    coordinateMarks:(Array.isArray(s.coordinateMarks)?s.coordinateMarks:[]).slice(-200).filter(mark=>mark&&finite(mark.x)&&finite(mark.y)).map(mark=>({x:mark.x,y:mark.y,filled:mark.filled!==false})),
    background:background.kind==='pict'&&Number.isInteger(background.slot)&&background.slot>=1&&background.slot<=20?{kind:'pict',slot:background.slot}:background.kind==='file'&&/^[A-Za-z0-9_]{1,8}$/.test(background.name)?{kind:'file',name:background.name}:{kind:'none'},
    sketches:Array.isArray(s.sketches)?s.sketches.slice(0,200).filter(v=>v&&['point','line','circle','text','path','inverse'].includes(v.kind)).map(v=>JSON.parse(JSON.stringify(v))):[],
    modify:{step:finite(s.modify?.step)&&s.modify.step>0?s.modify.step:1},
    ...(includeMemories?{memories:Array.from({length:20},(_,i)=>s.memories?.[i]&&typeof s.memories[i]==='object'?sanitizeGraph(s.memories[i],count,false):null)}:{}),
  };
}

export function sanitizeProfile(source = {}, modelId = 'cnx',includeExam=true) {
  const s = object(source),model=getModel(modelId),matrixNames=model.matrixNames||['MatA','MatB','MatC','MatD'],vectorNames=model.vectorNames||['VctA','VctB','VctC','VctD'],matrixMax=model.matrixMax||4,vectorDimensions=model.vectorDimensions||[2,3];
  const scalar=value=>finite(value)||model.family==='cg'&&value&&finite(value.re)&&finite(value.im)&&Math.abs(value.re)<1e100&&Math.abs(value.im)<1e100;
  const matrices = model.family==='cg'?cgArrayBank(s.matrices,matrixNames,'matrix'):Object.fromEntries(Object.entries(object(s.matrices)).filter(([k,v]) => matrixNames.includes(k) && Array.isArray(v) && v.length >= 1 && v.length <= matrixMax && v.every(r => Array.isArray(r) && r.length === v[0].length && r.length >= 1 && r.length <= matrixMax && r.every(finite))));
  const vectors = model.family==='cg'?cgArrayBank(s.vectors,vectorNames,'vector'):Object.fromEntries(Object.entries(object(s.vectors)).filter(([k,v]) => vectorNames.includes(k) && Array.isArray(v) && vectorDimensions.includes(v.length) && v.every(finite)));
  const exam=model.family==='cg'&&includeExam?sanitizeCGExam(s.cgExam,backup=>sanitizeProfile(backup,'cg50',false)):null;
  const savedVariables=Object.fromEntries(Object.entries(object(s.calculator?.vars)).filter(([key,value])=>[...model.variables,'Ans'].includes(key)&&scalar(value)).map(([key,value])=>[key,typeof value==='number'?value:{re:value.re,im:value.im}]));
  return {
    calculator:{approximateVariables:Array.isArray(s.calculator?.approximateVariables)?s.calculator.approximateVariables.filter(k=>[...model.variables,'Ans'].includes(k)):[], angle:['Deg','Rad','Gra'].includes(s.calculator?.angle)?s.calculator.angle:model.family==='cg'?'Rad':'Deg', vars:savedVariables, definitions:model.discardDefinitions?{}:Object.fromEntries(Object.entries(object(s.calculator?.definitions)).filter(([k,v]) => (model.functionNames||['f','g']).includes(k) && string(v))),...(model.family==='cg'?{financialNative:sanitizeCGFinancialNative(s.calculator?.financialNative),nativeAnswers:sanitizeCGAnswers(s.calculator?.nativeAnswers),statisticalNative:sanitizeCGStatisticalNative(s.calculator?.statisticalNative),functionMemory:sanitizeCGFunctionMemory(s.calculator?.functionMemory),...sanitizeCGExactState(object(s.calculator),savedVariables)}:{})},
    ...(model.baseKeys?{base:[2,8,10,16].includes(s.base)?s.base:10}:{}),
    mode:model.modes.some(mode=>mode[3]===s.mode)?s.mode:(model.defaultMode||'calc'),
    decimal:s.decimal === true, format:['Norm','Fix','Sci'].includes(s.format)?s.format:'Norm',
    digits:Number.isInteger(s.digits) && s.digits >= (s.format==='Fix'?0:1) && s.digits <= (s.format==='Fix'?9:10) ? s.digits : (s.format==='Fix'?9:10),
    history:Array.isArray(s.history)?s.history.filter(h => h && string(h.expr) && typeof h.answer === 'string' && model.modes.some(mode=>mode[3]===h.mode)).slice(-(model.family==='cg'?30:100)).map(h => ({expr:h.expr, latex:string(h.latex), answer:h.answer.slice(0,1000), mode:h.mode})):[],
    matrices:Object.fromEntries(Object.entries(matrices).map(([k,v])=>[k,v.map(row=>row.slice())])), vectors:Object.fromEntries(Object.entries(vectors).map(([k,v])=>[k,v.slice()])), statsRows:!model.volatileStatistics&&Array.isArray(s.statsRows)?s.statsRows.filter(r => Array.isArray(r) && r.length===3 && r.every(finite) && Number.isInteger(r[2]) && r[2]>0).slice(0,100).map(row=>row.slice()):[],
    graph:{...sanitizeGraph(s.graph,model.graphFunctions||4),xscale:finite(s.graph?.xscale)&&s.graph.xscale>=0?s.graph.xscale:1,yscale:finite(s.graph?.yscale)&&s.graph.yscale>=0?s.graph.yscale:1},
    regression:['single','linear','quadratic','log','exp','abexp','power','inverse'].includes(s.regression)?s.regression:'single',
    frequency:s.frequency===true,
    tiSettings:sanitizeTiSettings(s.tiSettings??{result:s.mode==='complex'?'rect':'real',notation:s.format==='Sci'?'Sci':'Norm',decimals:s.format==='Fix'?s.digits:s.format==='Sci'&&Number.isInteger(s.digits)?s.digits-1:null}),
    ...(model.family==='cg'?{cgWorkspace:sanitizeCGWorkspace(s.cgWorkspace)}:{}),
    ...(exam?{cgExam:exam}:{}),
    menuSelections:Object.fromEntries(Object.entries(object(s.menuSelections)).filter(([k,v])=>k.length<160 && Number.isInteger(v) && v>=0 && v<200)),
  };
}

export function createSession(profile = {}, language = 'zh', modelId = 'cnx') {
  const saved = sanitizeProfile(profile,modelId);
  if(modelId==='ti36xpro'&&['calc','complex','base'].includes(saved.mode))saved.mode=saved.tiSettings.base!==10?'base':saved.tiSettings.result==='real'?'calc':'complex';
  return {...saved, language, view:'calc', shift:false, alpha:false, off:false, expr:'', latex:'', answer:0, hasAnswer:false,
    historyIndex:-1, base:modelId==='ti36xpro'?saved.tiSettings.base:saved.base||10, form:null, list:null, selected:0, stack:[], undo:[], eng:null, pending:[], error:'', displayValues:[], displayApproximate:[], resultHasApproximateHeading:false, approximateAnswer:false};
}

// Storage is injected so migration and failure behavior run in plain Node tests.
export class AppStore {
  constructor(storage, defaultLanguage = 'zh') {
    this.storage=storage; this.warning='';
    const fallbackLanguage=resolveLanguagePreference(defaultLanguage);
    this.data={version:2, activeModel:null, language:fallbackLanguage, profiles:{}};
    try {
      const raw=storage.getItem(STORAGE_KEY);
      if (raw !== null) {
        const data=JSON.parse(raw);
        if (data?.version !== 2) throw new Error('Unsupported state version');
        this.data.activeModel=validModel(data.activeModel)?data.activeModel:null;
        this.data.language=resolveLanguagePreference(data.language,fallbackLanguage);
        for (const [id, profile] of Object.entries(object(data.profiles))) if (validModel(id)) this.data.profiles[id]=sanitizeProfile(profile,id);
      } else {
        const legacy=storage.getItem(LEGACY_KEY);
        if (legacy !== null) {
          const saved=JSON.parse(legacy);
          this.data={version:2,activeModel:'cnx',language:resolveLanguagePreference(saved?.language,fallbackLanguage),profiles:{cnx:sanitizeProfile(saved)}};
          this.write(); // The original v1 key remains intact for rollback.
        }
      }
    } catch {this.warning='无法读取已保存的数据';}
  }
  profile(id) {getModel(id); return sanitizeProfile(this.data.profiles[id],id);}
  saveProfile(id, calculator, state) {
    getModel(id);try{this.data.profiles[id]=sanitizeProfile({...state, calculator:calculator.save()},id);}catch(error){this.warning=error.message||'无法保存设置：请检查可用存储空间';return false;}
    this.data.language=state.language==='en'?'en':'zh'; return this.write();
  }
  select(id) {getModel(id); this.data.activeModel=id; return this.write();}
  resetProfile(id) {getModel(id); this.data.profiles[id]=sanitizeProfile({},id); return this.write();}
  write() {
    try {this.storage.setItem(STORAGE_KEY,JSON.stringify(this.data)); this.warning=''; return true;}
    catch {this.warning='无法保存设置：请检查可用存储空间'; return false;}
  }
}
