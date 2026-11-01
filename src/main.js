import './style.css';
import './ui/classwiz-chassis.css';
import './ui/model-picker.css';
import './ui/model-cover.css';
import katex from 'katex';
import { math, assert, decimal, exactTex, mixedTex, factorize, normalize } from './engine/calculator.js';
import { ModelCalculator } from './engine/model-calculator.js';
import { polynomialRoots, linearSystem, inequality, statistics, regressionValue, ratio, baseCalculate, baseFormat, rref } from './engine/modes.js';
import { conversions } from './engine/catalog.js';
import {constantsFor,cwConstantGroups} from './engine/model-constants.js';
import { getModel } from './models/registry.js';
import { shortcutAction, modifiedKeyAction } from './keyboard/mapping.js';
import { AppStore, createSession } from './state/store.js';
import {createDesktopStorage} from './state/desktop-storage.js';
import {enterCGExam,powerOnCGExam,cgExamElapsed,cgExamAllowsMode} from './state/cg-exam.js';
import {createCGExamPanel} from './ui/cg-exam-panel.js';
import {createCGFinancialMenu} from './ui/cg-financial-menu.js';
import {createCGRunMenu} from './ui/cg-run-menu.js';
import {createCGMetricMenu} from './ui/cg-metric-menu.js';
import {metricUnitLatex,metricArrowLatex,metricUnitToken,metricArrowToken} from './input/cg-metric-symbols.js';
import {cgCalcFunctionLatex,cgCalcInfixLatex} from './input/cg-calc-symbols.js';
import {simplifyCGRational} from './engine/cg-rational-display.js';
import {CG_FINANCIAL_FUNCTIONS,CG_FINANCIAL_VARIABLES} from './engine/cg-financial-functions.js';
import {CG_STATISTICAL_FUNCTIONS,CG_STATISTICAL_VARIABLES,CG_STATISTICAL_COMMANDS} from './engine/cg-statistical-functions.js';
import {cgNativeVariableLatex,cgNativePostfixLatex,cgNativeFunctionLatex,cgNativePrefixLatex} from './input/cg-native-symbols.js';
import { detectSystemLanguage } from './language.js';
import { calculatorHTML } from './ui/calculator.js';
import { modelPickerHTML } from './ui/model-picker.js';
import { revealModelCover } from './ui/model-cover.js';
import {createTiMultiTap} from './ui/ti-multitap.js';
import {createTiMode} from './ui/ti-mode.js';
import {createXSolvePanel} from './ui/x-solve-panel.js';
import {tiDisplay} from './engine/ti-display.js';
import {cwHomeHTML,updateCwHomePage} from './ui/cw-home.js';
import {classwizMenuHTML,updateClasswizMenu} from './ui/classwiz-menu.js';
import {createCompletionController} from './input/completion.js';
import {createTextUndo} from './input/text-undo.js';
import {createCGLinearEditor} from './input/cg-linear-editor.js';
import {createGraphPanel} from './ui/graph-panel.js';
import {createSpreadsheetPanel} from './ui/spreadsheet-panel.js';
import {createCGWorkspacePanel} from './ui/cg-workspace-panel.js';
import {createCGArrayPanel} from './ui/cg-array-panel.js';
import {createCGSetupPanel} from './ui/cg-setup-panel.js';
import {createCGFunctionMemoryPanel} from './ui/cg-function-memory-panel.js';
import {createCGCaptureDialog} from './ui/cg-capture-dialog.js';
import {createCGCalculationNotice} from './ui/cg-calculation-notice.js';
import {stageCGMainMemoryImport,encodeCGMainMemory,restoreCGMainMemorySource} from './engine/cg-main-memory-files.js';
import {cgNativeMemoryState,cgProfileFromNative} from './state/cg-native-profile.js';
import {effectiveCGInputOutput,ensureCGSetupState,formatCGSetupValue,cgSetupFractionTex} from './engine/cg-setup-state.js';
import {CGProgramRunner} from './engine/cg-program.js';
import {evaluateCGRunMatrix,commitCGRunMatrix} from './engine/cg-run-matrix.js';
import {renderCGProgramGraphics,disposeCGProgramGraphics} from './ui/cg-program-canvas.js';
import {CGSpreadsheet} from './engine/cg-workspace.js';
import {createCGArrayScope,createCGVectorScope} from './engine/cg-array-memory.js';
import {storeProgramPicture,decodeProgramPicture,encodeProgramPicture} from './engine/cg-program-pictures.js';
import {createCGProgramPanel} from './ui/cg-program-panel.js';
import {createFinancePanel} from './ui/finance-panel.js';
import {createCGVisualPanel} from './ui/cg-visual-panel.js';
import {createCGStatisticsPanel} from './ui/cg-statistics-panel.js';
import {createCGSystemPanel} from './ui/cg-system-panel.js';
import {createTiExtensions} from './ui/ti-extensions.js';
import {createQrPanel} from './ui/qr-panel.js';
import {buildQrPayload} from './engine/qr-export.js';
import {distributionTypes} from './engine/distributions.js';
import { createLocalizer } from './i18n.js';
import { createMathInput, isMathInput, readInput as baseReadInput, insertIntoMath, keyLatex, setMathLanguage } from './math-input.js';
import { expressionToLatex,latexToExpression } from './engine/notation.js';
import { formulaLayout } from './templates.js';

const $=s=>document.querySelector(s), esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const store=new AppStore(createDesktopStorage(localStorage,window.simulatorDevice),detectSystemLanguage());
const textUndo=createTextUndo(document);
let model=getModel(store.data.activeModel||'cnx');
let modes=model.modes;
const bootProfile=store.profile(model.id),bootPowered=powerOnCGExam(bootProfile);
let state=createSession(bootPowered,store.data.language,model.id);
let calc=new ModelCalculator(model.id,state.calculator);
let graphPanel=null,sheetPanel=null,sheet=null,tiPanel=null,xSolvePanel=null;
let appPanel=null,qrPanel=null,tiExtensions=null,cgSoftPage=0,graphInsertionPending=false,cgNativeMenu=null;
let coverReveal=null;
let cgRunGraphicsSession={};
let cgCaptureDialog=null;
let cgCalculationNotice=null;
let cgCapturePending=false;
let cgLinearEditor=null,cgLinearElement=null;
function closeCGNativeMenu(){const previous=cgNativeMenu;cgNativeMenu=null;previous?.destroy?.();}
function syncCGCalculationSettings(){if(model.family!=='cg')return;const preferences=ensureCGSetupState(calc,state);calc.cgSimplify=preferences.simplify;calc.cgComplexMode=preferences.complex;}
function closeCGCalculationNotice(){const previous=cgCalculationNotice;cgCalculationNotice=null;previous?.close();}
function showCGCalculationNotice(message){closeCGCalculationNotice();if(!message)return;cgCalculationNotice=createCGCalculationNotice({parent:$('#app'),message,onClose:()=>{cgCalculationNotice=null;if($('#entry')&&!cgCaptureDialog)focusEntry();}});queueMicrotask(()=>{if(!cgCaptureDialog)cgCalculationNotice?.focus();});}
function readInput(element,context={}){return element===cgLinearElement&&cgLinearEditor?cgLinearEditor.source():baseReadInput(element,{family:model.family,...context});}
function uncover(){coverReveal?.finish();coverReveal=revealModelCover($('.calculator'),model);}
let distributionParameters={},distributionRows=[];
const tiMultiTap=createTiMultiTap(insert);
const menuModes=()=>model.nativeMenu||modes;
function unavailable(label){let notice=$('#capability-notice');if(!notice){notice=document.createElement('div');notice.id='capability-notice';notice.setAttribute('role','status');$('#app').append(notice);}notice.innerHTML='<span>尚未实现</span>: '+esc(label);}
function activateMode(id){
  closeCGNativeMenu();
  if(model.family==='cg'&&!cgExamAllowsMode(state.cgExam,id)){result('Examination Mode',[['Application','Restricted in Examination Mode']]);return;}
  graphInsertionPending=false;
  if(model.family==='cg'&&id==='calc'&&cgComplexEnabled())id='complex';
  $('#capability-notice')?.remove();const index=modes.findIndex(m=>m[3]===id);if(index<0)return;
  if(model.spreadsheetLifecycle==='leave-app'&&state.mode==='spreadsheet'&&id!=='spreadsheet'){sheet?.clear();sheet=null;}
  if(model.volatileStatistics&&state.mode==='stat'&&id!=='stat'){state.statsRows=[];state.statResult=null;}
  if(state.mode==='distribution'&&id!=='distribution')distributionRows=[];
  if(model.family==='ti'&&['calc','complex'].includes(id)){
    state.tiSettings.base=10;state.base=10;
    if(id==='calc')state.tiSettings.result='real';else if(state.tiSettings.result==='real')state.tiSettings.result='rect';
  }
  state.selected=index;state.mode=id;state.stack=[];state.hasAnswer=false;state.error='';state.expr='';state.latex='';state.approximateAnswer=false;state.shift=false;state.alpha=false;state.alphaLock=false;state.cgClipSelecting=false;
  syncCGCalculationSettings();persist();status();if(id==='graph')showGraph();else if(['calc','complex'].includes(id)||id==='base'&&model.baseKeys)showCalc();else modeOptions();
}
function tiMode(){
  if($('#entry')){try{state.expr=readInput($('#entry'),inputContext());state.latex=isMathInput($('#entry'))?$('#entry').value:'';}catch{}}
  closeGraph();state.view='ti-mode';state.form=null;state.list=null;state.format='Norm';
  tiPanel=createTiMode({host:$('#screen'),settings:state.tiSettings,angle:calc.angle,
    onChange:(name,value)=>{if(name==='angle')calc.angle=value;persist();status();},
    onQuit:tiReturn});
}
function tiReturn(){state.mode=state.tiSettings.base===10?(state.tiSettings.result==='real'?'calc':'complex'):'base';state.base=state.tiSettings.base;state.stack=[];showCalc();persist();}
function closeGraph(){closeCGCalculationNotice();if(cgNativeMenu?.kind==='metric')closeCGNativeMenu();cgLinearEditor?.destroy();cgLinearEditor=null;cgLinearElement=null;appPanel?.destroy();appPanel=null;qrPanel?.destroy();qrPanel=null;$('#cg-context-softkeys')?.remove();xSolvePanel?.destroy();xSolvePanel=null;tiPanel?.destroy();tiPanel=null;sheetPanel?.destroy();sheetPanel=null;graphPanel?.destroy();graphPanel=null;$('.calculator')?.classList.remove('graph-view');$('#screen')?.classList.remove('calculation-screen');}
function fitModel(){const element=$('.calculator');if(element)element.style.setProperty('--model-scale',String(Math.min(1,(innerHeight-80)/element.offsetHeight,(innerWidth-20)/element.offsetWidth)));}
function showGraph(){graphInsertionPending=false;closeGraph();state.mode='graph';state.view='graph';state.form=null;state.list=null;$('.calculator').classList.add('graph-view');graphPanel=createGraphPanel({host:$('#screen'),calculator:calc,settings:state.graph,workspace:model.family==='cg'?state.cgWorkspace:undefined,profile:model.family==='cg'?state:undefined,onCommit:persist});status();requestAnimationFrame(fitModel);}
function initialView(){if(state.mode==='graph'&&model.graphing)showGraph();else if(['distribution','spreadsheet'].includes(state.mode)||model.family==='cg'&&!['calc','complex','base'].includes(state.mode))modeOptions();else showCalc();requestAnimationFrame(fitModel);}
function inputContext(mode=state.mode){return {mode,family:model.family,aliases:mode==='vector'?Object.fromEntries(Object.entries(model.vectorLabels||{}).map(([name,label])=>[label,name])):{}};}
$('#app').innerHTML=calculatorHTML(model);
function bindCGArrayMemory(){if(model.family==='cg'){calc.arrayMemory={lists:state.cgWorkspace?.statistics?.lists||[],names:state.cgWorkspace?.statistics?.names||[],matrices:state.matrices||{},vectors:state.vectors||{},strings:state.cgWorkspace?.strings||[]};calc.graphMemory=state.graph;}}
function persist(){bindCGArrayMemory();const saved=store.data.activeModel?store.saveProfile(model.id,calc,state):store.write();showStorageWarning();return saved;}
function showStorageWarning(){
  let warning=$('#storage-warning');
  if(!warning){warning=document.createElement('div');warning.id='storage-warning';warning.setAttribute('role','alert');$('#app').append(warning);}
  warning.textContent=store.warning;warning.hidden=!store.warning;
}
function showModelPicker(){
  coverReveal?.finish();
  $('#model-picker')?.remove();
  $('#app').insertAdjacentHTML('beforeend',modelPickerHTML(state.language,store.data.activeModel));
  const picker=$('#model-picker');
  picker.addEventListener('cancel',e=>{if(!store.data.activeModel)e.preventDefault();});
  picker.addEventListener('close',()=>focusEntry());
  picker.showModal();
}
function resetCurrentProfile(){if(model.family==='cg'&&state.cgExam?.active){importCGProfile(enterCGExam({...state,calculator:calc.save()}));return;}const language=state.language;closeGraph();sheet=null;store.resetProfile(model.id);state=createSession(store.profile(model.id),language,model.id);calc=new ModelCalculator(model.id,state.calculator);bindModelExtensions();initialView();persist();}
function bindModelExtensions(){
  calc.examination=model.family==='cg'&&state.cgExam?.active===true;
  syncCGCalculationSettings();
  bindCGArrayMemory();
  tiExtensions=model.family==='ti'?createTiExtensions({state,calculator:calc,list,item,form,field,result,showCalc,insert,setAnswer,persist,resetProfile:resetCurrentProfile,readExpression:()=>$('#entry')?readInput($('#entry'),inputContext()):state.expr,scope:extraScope}):null;
  const brightness=model.family==='cg'?state.cgWorkspace?.system?.brightness:undefined;if($('.screen-rim'))$('.screen-rim').style.filter=Number.isFinite(brightness)?`brightness(${brightness})`:'';
}
function showCGApplication(mode){
  closeGraph();state.view='cg-app';state.form=null;state.list=null;state.cgWorkspace??={};
  const common={host:$('#screen'),calculator:calc,onBack:()=>menu(false)};
  if(mode==='program')appPanel=createCGProgramPanel({...common,data:state.cgWorkspace.program,workspace:state.cgWorkspace,matrices:state.matrices,vectors:state.vectors,graph:state.graph,initialFormat:{mode:state.format,digits:state.digits,norm:state.cgWorkspace.system.norm},onChange:value=>{state.cgWorkspace.program=value;persist();},onMemoryChange:memory=>{state.cgWorkspace.statistics.lists=memory.lists;state.cgWorkspace.strings=memory.strings;state.matrices=memory.matrices;if(memory.vectors)state.vectors=memory.vectors;if(memory.graphMemory)state.graph=memory.graphMemory;if(memory.simplify){state.cgWorkspace.system.simplify=memory.simplify;syncCGCalculationSettings();}if(memory.cgNumericalNotice)showCGCalculationNotice(memory.cgNumericalNotice);if(memory.format){state.format=memory.format.mode;state.digits=memory.format.mode==='Sci'&&memory.format.digits===0?10:memory.format.digits;state.cgWorkspace.system??={};state.cgWorkspace.system.norm=memory.format.norm;}persist();},onCommand:command=>{state.cgWorkspace.programGraphics??=[];state.cgWorkspace.programGraphics.push(command);state.cgWorkspace.programGraphics=state.cgWorkspace.programGraphics.slice(-300);}});
  else if(mode==='financial')appPanel=createFinancePanel({...common,calculator:calc,data:state.cgWorkspace.finance,onChange:value=>{state.cgWorkspace.finance=value;persist();}});
  else if(mode==='stat')appPanel=createCGStatisticsPanel({...common,complex:cgComplexEnabled(),data:state.cgWorkspace.statistics,onChange:value=>{state.cgWorkspace.statistics=value;return persist();},onUseLists:payload=>{state.cgWorkspace.statistics.lists=payload.lists;state.cgWorkspace.statistics.names=payload.names;persist();if(payload.target==='graph'&&payload.formula){let expression=payload.formula;if(payload.regression==='sin'&&payload.coefficients){const c=payload.coefficients;expression=`${c[0]}*sin(rad(${c[1]}*x+${c[2]}))+${c[3]}`;}state.graph.expressions[0]=expression;state.graph.enabled[0]=true;showGraph();}else activateMode('calc');}});
  else if(['geometry','pictureplot','graph3d'].includes(mode)){state.cgWorkspace[mode]??={};appPanel=createCGVisualPanel({...common,mode,data:state.cgWorkspace[mode],graph:state.graph,lists:state.cgWorkspace.statistics.lists,onListsChange:lists=>cgWorkspaceTransaction(()=>{state.cgWorkspace.statistics.lists=lists;}),onGraphChange:graph=>{state.graph=graph;persist();},onPicture:({slot,picture})=>storeCGSharedPicture('pict',slot,picture),onStoreList:storeCGGeometryList,onStoreSpreadsheet:storeCGGeometrySpreadsheet,onStorePicture:(slot,picture,window)=>storeCGSharedPicture('pict',slot,picture,window),onRecallPicture:slot=>recallCGSharedPicture('pict',slot),onStoreCapture:(slot,picture)=>storeCGSharedPicture('capture',slot,picture),onRecallCapture:slot=>cgPicturePNG(recallCGSharedPicture('capture',slot).picture),onChange:value=>{state.cgWorkspace[mode]=value;return persist();}});}
  else if(['memory','system','link','econ'].includes(mode))appPanel=createCGSystemPanel({...common,mode,data:state.cgWorkspace,exam:state.cgExam,onChange:value=>{state.cgWorkspace=value;persist();},onSetup:setup,onExport:()=>({...state,calculator:calc.save()}),onImport:importCGProfile,onNativeImport:importCGNativeMemory,onNativeExport:exportCGNativeMemory,onPicture:image=>{state.cgWorkspace.pictureplot={imageUrl:image,points:[],xUnit:1,yUnit:1};state.mode='pictureplot';showCGApplication('pictureplot');persist();}});
  else appPanel=createCGWorkspacePanel({...common,mode,data:state.cgWorkspace,graph:state.graph,matrices:state.matrices,vectors:state.vectors,onChange:value=>{state.cgWorkspace=value;persist();},onGraph:()=>{state.mode='graph';showGraph();persist();}});
  status();requestAnimationFrame(fitModel);appPanel?.focus?.();
}
function cgComplexEnabled(){return model.family==='cg'&&['a+bi','polar'].includes(state.cgWorkspace?.system?.complex);}
function cgLineInput(){return model.family==='cg'&&effectiveCGInputOutput(state,state.mode)==='Line';}
function showCGArrayEditor(uiState={}){
  if($('#entry')){try{state.expr=readInput($('#entry'),inputContext());state.latex=isMathInput($('#entry'))?$('#entry').value:'';}catch{/* Keep the unfinished input already tracked by its editor. */}}
  closeCGNativeMenu();closeGraph();state.view='cg-array';state.form=null;state.list=null;
  appPanel=createCGArrayPanel({host:$('#screen'),calculator:calc,matrices:state.matrices,vectors:state.vectors,complex:cgComplexEnabled(),csvSettings:state.cgWorkspace.csvSettings||{},uiState,scope:extraScope,onChange:memory=>{state.matrices=memory.matrices;state.vectors=memory.vectors;state.cgWorkspace.csvSettings=memory.csvSettings;return persist();},onBack:()=>showCalc()});status();appPanel.focus();
}
function showCGSetup(){
  const previous={mode:state.mode,view:state.view,panel:appPanel?.getState?.(),graphDrawn:graphPanel&&!!$('#graph-canvas')&&!$('#graph-canvas').closest('[hidden]')};
  if($('#entry')){state.latex=isMathInput($('#entry'))?$('#entry').value:'';try{state.expr=readInput($('#entry'),inputContext());}catch{/* An incomplete formula remains editable after SET UP. */}}
  closeCGNativeMenu();closeGraph();state.view='cg-setup';state.form=null;state.list=null;
  appPanel=createCGSetupPanel({host:$('#screen'),calculator:calc,profile:state,mode:previous.mode,onChange:()=>{syncCGCalculationSettings();persist();status();},onBack:()=>{closeGraph();if(previous.view==='cg-array'&&state.mode!=='base')showCGArrayEditor(previous.panel);else if(state.mode==='graph'){showGraph();if(previous.graphDrawn)graphPanel.draw();}else if(previous.view==='cg-app'&&state.mode===previous.mode)showCGApplication(state.mode);else initialView();}});status();appPanel.focus?.();
}
function executeCGNativeCalculation(source){
  const output=evaluateCGRunMatrix(calc,source,{lists:state.cgWorkspace.statistics.lists,matrices:state.matrices,vectors:state.vectors,strings:state.cgWorkspace.strings||[],format:{mode:state.format,digits:state.digits,norm:state.cgWorkspace.system.norm??1},complex:cgComplexEnabled(),complexFormat:state.cgWorkspace.system.complex,examination:state.cgExam?.active});
  if(output.graphics.length){const before={calculator:calc.save(),workspace:structuredClone(state.cgWorkspace),matrices:state.matrices,vectors:state.vectors,graph:state.graph,format:state.format,digits:state.digits,history:state.history.slice(),historyIndex:state.historyIndex,answer:state.answer};output.rollback=()=>{disposeCGProgramGraphics(cgRunGraphicsSession);cgRunGraphicsSession={};calc=new ModelCalculator(model.id,before.calculator);Object.assign(state,{cgWorkspace:before.workspace,matrices:before.matrices,vectors:before.vectors,graph:before.graph,format:before.format,digits:before.digits,history:before.history,historyIndex:before.historyIndex,answer:before.answer});bindModelExtensions();persist();};}
  commitCGRunMatrix(calc,output);const memory=output.snapshot;
  state.cgWorkspace.statistics.lists=memory.lists;state.matrices=memory.matrices;state.vectors=memory.vectors;state.cgWorkspace.strings=memory.strings;
  if(memory.graphMemory)state.graph=memory.graphMemory;
  state.format=memory.format.mode;state.digits=memory.format.digits;state.cgWorkspace.system.norm=memory.format.norm;state.cgWorkspace.system.simplify=memory.simplify;syncCGCalculationSettings();bindCGArrayMemory();
  return output;
}
function showCGRunGraphics(commands){
  cgRunGraphicsSession.lastIndex=0;
  const coordinates=document.createElement('div'),canvas=renderCGProgramGraphics(calc,commands,{graph:state.graph,lists:state.cgWorkspace.statistics.lists,workspace:state.cgWorkspace,session:cgRunGraphicsSession,onCoordinate:value=>{coordinates.textContent=value;}});
  if(!canvas)return;closeGraph();state.view='cg-run-graph';const display=document.createElement('section');display.className='cg-visual-panel';display.append(canvas,coordinates);$('#screen').replaceChildren(display);
  appPanel={handleAction(action){if(['back','cg-clear-on','cg-quit','execute'].includes(action)){showCalc();return true;}return /^graph-/.test(action);},handleKey(event){if(event.key==='Escape'){showCalc();return true;}return false;},destroy(){disposeCGProgramGraphics(cgRunGraphicsSession);}};status();persist();
}
function cgWorkspaceTransaction(change){
  const before=structuredClone(state.cgWorkspace),previous=store.data.profiles[model.id];
  try{change();if(!persist())throw Error(store.warning||'Memory Full');}catch(error){state.cgWorkspace=before;store.data.profiles[model.id]=previous;bindCGArrayMemory();throw error;}
}
function storeCGGeometryList(number,values){
  assert(Number.isInteger(number)&&number>=1&&number<=26,'List number: 1–26');assert(Array.isArray(values)&&values.length<=999&&values.every(value=>typeof value==='number'&&Number.isFinite(value)),'List entries must be finite real values; maximum 999');
  cgWorkspaceTransaction(()=>{state.cgWorkspace.statistics.lists[number-1]=values.slice();if(state.cgWorkspace.statistics.elementColors)state.cgWorkspace.statistics.elementColors[number-1]=[];});
}
function storeCGSharedPicture(kind,slot,picture,window){
  cgWorkspaceTransaction(()=>{state.cgWorkspace.programImageBanks??={pict:{},capture:{}};storeProgramPicture(state.cgWorkspace.programImageBanks,kind,slot,picture);if(kind==='pict'){delete state.cgWorkspace.pictureWindows?.[slot];delete state.cgWorkspace.graphPictureMeta?.[slot];if(window){state.cgWorkspace.pictureWindows??={};state.cgWorkspace.pictureWindows[slot]=structuredClone(window);}}});
  cgRunGraphicsSession[kind==='pict'?'pictures':'captures']?.delete(slot);delete cgRunGraphicsSession.banks;
}
function recallCGSharedPicture(kind,slot){
  assert(Number.isInteger(slot)&&slot>=1&&slot<=20,'Picture number: 1–20');const picture=state.cgWorkspace.programImageBanks?.[kind]?.[slot];assert(picture,'No Data');decodeProgramPicture(picture);return {picture:structuredClone(picture),window:kind==='pict'?state.cgWorkspace.pictureWindows?.[slot]:undefined};
}
function cgPicturePNG(picture){
  const decoded=decodeProgramPicture(picture),canvas=document.createElement('canvas');canvas.width=decoded.width;canvas.height=decoded.height;const context=canvas.getContext('2d'),pixels=context.createImageData(canvas.width,canvas.height);pixels.data.set(decoded.data);context.putImageData(pixels,0,0);return canvas.toDataURL('image/png');
}
function storeCGGeometrySpreadsheet(name,rows,{overwrite=false}={}){
  name=String(name).trim();assert(name.length>=1&&name.length<=8&&!['constructor','prototype','__proto__'].includes(name),'Spreadsheet name: 1–8 characters');assert(Array.isArray(rows)&&rows.length<=999&&rows.every(row=>Array.isArray(row)&&row.length<=26),'Spreadsheet range: A1:Z999');
  const cells={};for(let row=0;row<rows.length;row++)for(let col=0;col<rows[row].length;col++){const value=rows[row][col];if(value===null||value===undefined)continue;assert(typeof value==='string'||typeof value==='number'&&Number.isFinite(value),'Invalid spreadsheet value');cells[String.fromCharCode(65+col)+(row+1)]=typeof value==='string'?JSON.stringify(value):String(value);}
  const sheet=new CGSpreadsheet(calc,{cells,selected:'A1'});sheet.checkMemory(cells);sheet.recalculate();
  cgWorkspaceTransaction(()=>{const workspace=state.cgWorkspace,files=workspace.spreadsheetFiles??={};if((files[name]||workspace.spreadsheetName===name)&&!overwrite)throw Error('File exists');if(workspace.spreadsheet)files[workspace.spreadsheetName||'SHEET1']=structuredClone(workspace.spreadsheet);files[name]=sheet.serialize();workspace.spreadsheetName=name;workspace.spreadsheet=sheet.serialize();});
}
function showQR(){
  const previous={view:state.view,form:state.form,list:state.list,selected:state.selected,html:$('#screen').innerHTML};
  if(state.view==='form')formValues();
  const payload=buildQrPayload({modelName:model.name,mode:state.mode,angle:calc.angle,expression:$('#entry')?.value||state.expr,answer:state.hasAnswer?formatted(state.answer):'',rows:state.displayValues,error:state.error});
  closeGraph();state.view='qr';
  qrPanel=createQrPanel({host:$('#screen'),payload,language:state.language,onClose:()=>{qrPanel?.destroy();qrPanel=null;if(previous.view==='form')form(previous.form.title,previous.form.fields,previous.form.submit,false,previous.form.layout);else if(previous.view==='list')list(previous.list.title,previous.list.items,false,previous.selected);else if(previous.view==='menu')menu(false,previous.selected);else if(previous.view==='result'){state.view='result';$('#screen').innerHTML=previous.html;}else showCalc();}});
}
function importCGProfile(source){
  const candidate=createSession(source,state.language,model.id),calculator=new ModelCalculator(model.id,candidate.calculator);
  closeGraph();const previous=store.data.profiles[model.id];
  if(!store.saveProfile(model.id,calculator,candidate)){store.data.profiles[model.id]=previous;initialView();throw Error(store.warning);}
  closeCGNativeMenu();cgSoftPage=0;state=candidate;calc=calculator;bindModelExtensions();initialView();persist();
}
async function importCGNativeMemory(parsed,options={}){
  assert(!state.cgExam?.active,'Examination Mode: data transfer is disabled');const current=state,workspace=state.cgWorkspace,panel=appPanel;
  const staged=await stageCGMainMemoryImport(parsed,structuredClone(cgNativeMemoryState(state,calc)),options);assert(current===state&&model.id==='cg50'&&workspace===state.cgWorkspace&&appPanel===panel,'Native import canceled after changing the active profile or application');
  const candidate=cgProfileFromNative(state,calc,staged),previous=store.data.profiles[model.id];
  if(!store.saveProfile(model.id,candidate.calculator,candidate.profile)){store.data.profiles[model.id]=previous;throw Error(store.warning||'Memory Full');}
  for(const key of Object.keys(workspace))delete workspace[key];Object.assign(workspace,candidate.profile.cgWorkspace);
  Object.assign(calc,candidate.calculator);Object.assign(state,candidate.profile,{cgWorkspace:workspace,view:'cg-app'});bindModelExtensions();status();
  return {applied:staged.applied,skipped:staged.skipped,issues:staged.issues};
}
async function exportCGNativeMemory(){
  const memory=structuredClone(cgNativeMemoryState(state,calc)),selection=['program','list','matrix','vector','variable'];
  if(memory.workspace.nativeMainMemory){const original=await restoreCGMainMemorySource(memory.workspace.nativeMainMemory);if(original.entries.some(entry=>entry.kind==='setup'&&entry.status==='decoded'))selection.push('setup');}
  return encodeCGMainMemory(memory,{preserveUnknown:true,selection});
}
function showCGExamEntry(){
  if(model.family!=='cg')return;coverReveal?.finish();closeGraph();state.off=false;state.view='cg-exam';state.shift=false;state.alpha=false;
  appPanel=createCGExamPanel({host:$('#screen'),exam:state.cgExam,onEnter:()=>importCGProfile(enterCGExam({...state,calculator:calc.save()})),onBack:()=>{closeGraph();initialView();}});status();
}
function showCGExamClock(){result('Examination Mode',[['Elapsed',Math.floor(cgExamElapsed(state.cgExam)/3600000)+' h '+Math.floor(cgExamElapsed(state.cgExam)/60000)%60+' min']]);}
function cgExtraScope(){
  if(model.family!=='cg')return {};
  return createCGArrayScope(calc,{lists:state.cgWorkspace.statistics.lists,names:state.cgWorkspace.statistics.names,matrices:state.matrices,vectors:state.vectors,strings:state.cgWorkspace.strings});
}
function cgFunctionKey(index){
  if(cgNativeMenu){cgNativeMenu.press(index);return;}
  if(state.view==='menu'){if(index===1)chooseMode(state.selected);return;}
  if(state.view!=='calc')return;
  if(state.cgClipSelecting){if(index===1||index===2){const input=$('#entry'),latex=isMathInput(input)?input.getValue(input.selection,'latex'):'';let canonical;if(input===cgLinearElement)canonical=cgLinearEditor.sourceSelection();else if(latex)try{canonical=latexToExpression(latex,inputContext());}catch{/* Incomplete Math selections remain valid for a Math paste. */}state.cgClipboard={latex,text:input===cgLinearElement?input.value.slice(input.selectionStart,input.selectionEnd):canonical||'',...(canonical!==undefined?{canonical}: {})};if(index===2)dispatch('delete');state.cgClipSelecting=false;cgContextKeys();}else if(index===6){state.cgClipSelecting=false;cgContextKeys();}return;}
  const actions=[()=>cgOpenRunMenu('jump'),()=>cgOpenRunMenu('delete'),()=>{if(state.mode!=='base')showCGArrayEditor();},()=>{if(!cgLineInput())cgOpenRunMenu('math');}];
  actions[index-1]?.();
}
function cgContextKeys(){
  $('#cg-context-softkeys')?.remove();if(model.family!=='cg'||graphPanel||appPanel||state.view!=='calc')return;
  const labels=cgNativeMenu?cgNativeMenu.labels():state.cgClipSelecting?['COPY','CUT','','','','EXIT']:['JUMP','DELETE',state.mode==='base'?'':'▶MAT/VCT',cgLineInput()?'':'MATH','',''];
  const bar=document.createElement('div');bar.id='cg-context-softkeys';bar.innerHTML=labels.map((label,i)=>`<button type="button" data-action="cg-f${i+1}">${label}</button>`).join('');$('.screen-rim').append(bar);
}
function showCGFunctionMemory(){
  if($('#entry')){state.expr=readInput($('#entry'),inputContext());state.latex=isMathInput($('#entry'))?$('#entry').value:'';}
  const expression=state.expr;let recalled=null;closeGraph();state.view='cg-function-memory';
  appPanel=createCGFunctionMemoryPanel({host:$('#screen'),calculator:calc,expression,onChange:()=>persist(),onInsert:text=>{recalled=text;},onBack:()=>{showCalc();if(recalled!==null)insertCGSource(recalled);}});status();appPanel.focus();
}
function cgNativeOptions(kind='options'){
  if(model.family!=='cg'||appPanel)return false;
  closeCGNativeMenu();
  cgNativeMenu=createCGFinancialMenu({linear:cgLineInput(),onChange:cgContextKeys,onExit:()=>{closeCGNativeMenu();cgContextKeys();},onOther:label=>{const parentMenu=cgNativeMenu;if(label==='CONVERT'){openCGMetricMenu({},parentMenu);return;}if(label==='SIMP'){insertCGSimp();return;}closeCGNativeMenu();if(label==='FUNCMEM')showCGFunctionMemory();else if(label==='MAT/VCT')matrixOptions();else if(label==='COMPLEX')list('COMPLEX',[exprItem('i','i'),exprItem('Abs','abs('),exprItem('Arg','arg('),exprItem('Conjg','conj('),exprItem('ReP','re('),exprItem('ImP','im(')]);else if(label.startsWith('VARS:'))variableMenu();else if(label==='CALC:derivative')calculus('derivative');else if(label==='CALC:integral')calculus('integral');else if(label==='CALC:sum')calculus('sigma');else if(label==='CALC:solve')solveForm();else functions();},onInsert:insertCGNativeToken});
  cgNativeMenu.start(kind);return true;
}
function openCGMetricMenu(initialState={},parentMenu=null){
  closeCGNativeMenu();
  const controller=createCGMetricMenu({host:$('#screen'),initialState,showSoftkeys:false,onChange:cgContextKeys,onInsertUnit:unit=>insertCGNativeToken({...metricUnitToken(unit.id),syntax:'postfix'}),onInsertArrow:()=>insertCGNativeToken({...metricArrowToken(),syntax:'postfix'}),onBack:()=>{closeCGNativeMenu();cgNativeMenu=parentMenu;cgContextKeys();$('#entry')?.focus();}});
  cgNativeMenu={...controller,kind:'metric',parentMenu};cgContextKeys();
}
function insertCGSimp(){
  if(!state.hasAnswer){execute();if(!state.hasAnswer)return;}
  assert(typeof state.answer==='number','Invalid Type');state.expr='Ans Simp ';state.latex='\\mathrm{Ans}\\CGSimp ';state.hasAnswer=false;state.error='';state.cgSimpFactor=null;showCalc();
}
function cgOpenRunMenu(type){
  cgNativeMenu=createCGRunMenu({type,onChange:cgContextKeys,onExit:()=>{cgNativeMenu=null;cgContextKeys();},onAction:(action,dimensions)=>{
    if(action==='top'||action==='bottom'){const input=$('#entry');if(isMathInput(input))input.executeCommand(action==='top'?'moveToMathfieldStart':'moveToMathfieldEnd');else input?.setSelectionRange(action==='top'?0:input.value.length,action==='top'?0:input.value.length);return;}
    if(action==='delete-line'||action==='delete-all'){if(action==='delete-all')state.history=[];else if(state.history.length)state.history.splice(Math.min(state.history.length-1,Math.max(0,state.historyIndex)),1);state.expr='';state.latex='';state.hasAnswer=false;state.error='';persist();showCalc();return;}
    if(action==='matrix-dimensions'){const selection=isMathInput($('#entry'))?structuredClone($('#entry').selection):null;form('MAT/VCT',[field('rows','m (1–6)','2'),field('cols','n (1–6)','2')],values=>{const rows=number(values.rows),cols=number(values.cols);assert(Number.isInteger(rows)&&Number.isInteger(cols)&&rows>=1&&rows<=6&&cols>=1&&cols<=6,'Natural array input: maximum6×6');showCalc();if(selection)$('#entry').selection=selection;cgInsertNaturalMatrix(rows,cols);});return;}
    if(action==='matrix-template'){cgInsertNaturalMatrix(...dimensions);return;}
    const templates={derivative:String.raw`\left.\frac{d}{dx}#?\right|_{x=#?}`,'second-derivative':String.raw`\left.\frac{d^{2}}{dx^{2}}#?\right|_{x=#?}`,integral:String.raw`\int_{#?}^{#?}#?\,\mathrm{d}x`,sum:String.raw`\sum_{x=#?}^{#?}#?`};if(templates[action])insertIntoMath($('#entry'),templates[action]);else if(action==='log')insert('log(');else if(action==='abs')insert('abs(');
  }});cgContextKeys();
}
function cgInsertNaturalMatrix(rows,cols){const matrix='\\begin{bmatrix}'+Array.from({length:rows},()=>Array(cols).fill('#?').join('&')).join('\\\\')+'\\end{bmatrix}';insertIntoMath($('#entry'),matrix);}
function insertCGNativeToken(token){
  if(token.kind==='infix')token={...token,syntax:'postfix'};
  if(state.view!=='calc'&&!isMathInput(document.activeElement))showCalc();const field=isMathInput(document.activeElement)?document.activeElement:$('#entry');
  if(token.kind==='prefix'){insertCGNativePrefix(token.parserName);return;}
  if(token.kind==='statement'){assert(cgLineInput(),'Syntax ERROR: switch Input/Output to Line');insert(token.parserName+' ');cgContextKeys();return;}
  if(field===cgLinearElement&&cgLinearEditor){if(state.hasAnswer){cgLinearEditor.setSource(token.syntax==='postfix'?'Ans':'');state.hasAnswer=false;state.error='';}cgLinearEditor.insertToken(token);cgContextKeys();return;}
  if(field?.id==='entry'&&state.hasAnswer&&isMathInput(field)){field.value=token.syntax==='postfix'?'\\mathrm{Ans}':'';state.hasAnswer=false;state.error='';}
  if(isMathInput(field)){const metric=token.kind==='metric-unit'?metricUnitLatex(token.unitId):token.kind==='metric-arrow'?metricArrowLatex():token.kind==='infix'?cgCalcInfixLatex(token.parserName):null,name=token.name.replaceAll('_',String.raw`\_`).replaceAll('%',String.raw`\%`),variable=token.kind==='variable'?cgNativeVariableLatex(token.parserName):null,postfix=token.syntax==='postfix'?cgNativePostfixLatex(token.parserName):null,fn=token.kind==='function'?(cgNativeFunctionLatex(token.parserName)||cgCalcFunctionLatex(token.parserName)):null,template=token.kind==='function'?(token.parserName==='log'?String.raw`\log\left(#?\right)`:keyLatex[token.parserName+'(']):null;insertIntoMath(field,metric||variable||postfix||(fn?fn+String.raw`\left(#?\right)`:template||(String.raw`\operatorname{`+name+'}'+(token.kind==='function'?String.raw`\left(#?\right)`:''))));}
  else insert(token.parserName+(token.kind==='function'?'(':''));cgContextKeys();
}
function insertCGNativePrefix(name){if(appPanel?.insert?.(name+' '))return;if(graphPanel){graphPanel.edit();graphPanel.focusEntry();}let field=document.activeElement;if(!isMathInput(field))field=$('#entry');if(isMathInput(field))insertIntoMath(field,cgNativePrefixLatex(name));else insert(name+' ');}
function insertCGSource(source){if(cgLinearEditor&&$('#entry')===cgLinearElement){if(state.hasAnswer){cgLinearEditor.setSource(/^[+*/^-]/.test(source)?'Ans':'');state.hasAnswer=false;state.error='';}cgLinearEditor.insertSource(source);}else insert(source);}
function cgInsertLiteral(text){const plain=({'\\to':'→','\\ ':' ','\\{':'{','\\}':'}','\\theta':'θ'})[text]??text;if(appPanel?.insert?.(plain))return;if(graphPanel&&!isMathInput(document.activeElement)){graphPanel.edit();graphPanel.focusEntry();}const input=document.activeElement;if(isMathInput(input)){const latex=({'→':'\\to',' ':'\\ ','{':'\\{','}':'\\}','θ':'\\theta'})[plain]??text;input.insert(latex,{format:'latex',selectionMode:'after'});input.dispatchEvent(new Event('input',{bubbles:true}));}else insert(plain);}
function handleCGAction(action){
  if(action==='x'&&graphPanel){const type=state.graph.types?.[state.graph.selected];if(type==='polar'||type==='parametric'){graphPanel.edit();graphPanel.focusEntry();cgInsertLiteral(type==='polar'?String.raw`\theta`:'T');return true;}}
  if(graphPanel&&['cg-catalog','cg-list','cg-matrix','variables'].includes(action))graphInsertionPending=true;
  if(state.mode==='program'&&appPanel){const tokens={'cg-store-arrow':'→','cg-list':'List ','cg-matrix':'Mat ','cg-open-list':'{','cg-close-list':'}','cg-open-matrix':'[','cg-close-matrix':']','cg-space':' '};if(Object.hasOwn(tokens,action)){appPanel.insert(tokens[action]);return true;}}
  if(action==='cg-alpha-lock'){state.alphaLock=!state.alphaLock;state.alpha=state.alphaLock;state.shift=false;status();return true;}
  if(action==='cg-quit'){state.stack=[];if(state.mode==='graph')showGraph();else initialView();return true;}
  if(action==='cg-prgm'){showCGProgramCommands();return true;}
  if(action==='cg-store-arrow'){cgInsertLiteral(String.raw`\to`);return true;}
  if(action==='cg-catalog'){showCGTokenCatalog();return true;}if(action==='cg-format'){cgFormatMenu();return true;}if(action==='cg-list'){insertCGNativePrefix('List');return true;}if(action==='cg-matrix'){insertCGNativePrefix('Mat');return true;}
  if(action==='cg-open-list'||action==='cg-close-list'||action==='cg-open-matrix'||action==='cg-close-matrix'){cgInsertLiteral(action==='cg-open-list'?String.raw`\{`:action==='cg-close-list'?String.raw`\}`:action==='cg-open-matrix'?'[':']');return true;}
  if(action==='cg-equals'){insert('=');return true;}if(action==='cg-space'){cgInsertLiteral(String.raw`\ `);return true;}if(action==='cg-newline'){if(appPanel?.insert?.('\n'))return true;cgInsertLiteral(String.raw`\colon`);return true;}
  if(action==='cg-strings'){if(appPanel?.insert?.('"'))return true;form('String memory',[field('index','Str 1–20','1'),field('text','Text','',{type:'area',optional:true})],v=>{const index=number(v.index);assert(Number.isInteger(index)&&index>=1&&index<=20);if(!Array.isArray(state.cgWorkspace.strings))state.cgWorkspace.strings=Array(20).fill('');state.cgWorkspace.strings[index-1]=v.text;persist();result('Str'+index,[['Text',v.text]]);});return true;}
  if(action==='cg-capture'){void captureCGScreen().catch(error=>{let note=$('#capability-notice');if(!note){note=document.createElement('div');note.id='capability-notice';$('#app').append(note);}note.textContent=error.message;});return true;}
  if(action==='cg-clip'){const input=$('#entry');if(isMathInput(input)||input===cgLinearElement){closeCGNativeMenu();input.focus();if(isMathInput(input))input.executeCommand('selectAll');else input.select();state.cgClipSelecting=true;cgContextKeys();}return true;}
  if(action==='cg-paste'){const input=$('#entry'),clip=state.cgClipboard;if(clip?.latex&&isMathInput(input)){if(state.hasAnswer){input.value='';state.hasAnswer=false;state.error='';}insertIntoMath(input,clip.latex);}else if(clip?.canonical!==undefined)insertCGSource(clip.canonical);else if(clip?.latex)throw Error('Complete the selected formula before pasting into Line input');else if(clip?.text)insert(clip.text);else throw Error('Clipboard is empty');return true;}
  return false;
}
function cgFormatMenu(){list('FORMAT',[item('Real',()=>{state.cgWorkspace.system??={};state.cgWorkspace.system.complex='real';activateMode('calc');}),item('a+bi',()=>{state.cgWorkspace.system??={};state.cgWorkspace.system.complex='a+bi';activateMode('complex');}),item('Exact / Decimal',()=>dispatch('sd')),item('Mixed / Improper fraction',()=>dispatch('mixed')),...[1,2].map(norm=>item('Norm'+norm,()=>{state.cgWorkspace.system??={};state.cgWorkspace.system.norm=norm;state.format='Norm';persist();initialView();})),item('Angle / Display settings',setup)]);}
function showCGProgramCommands(){
  $('#cg-command-dialog')?.remove();const dialog=document.createElement('dialog');dialog.id='cg-command-dialog';
  const commands=['If \nThen\n\nIfEnd','For 1→A To 10\n\nNext','While \n\nWhileEnd','Do\n\nLpWhile ','Print ','?→','→','Lbl ','Goto ','Prog ""','Return','Stop','Break','ClrText','ClrGraph','Locate ','Plot ','Line ','Circle ','Text ','ViewWindow ','DrawGraph'];
  dialog.innerHTML='<h3>PRGM</h3>'+commands.map((command,i)=>`<button type="button" data-command-index="${i}">${esc(command.split('\n')[0])}</button>`).join('')+'<button type="button" data-command-close>EXIT</button>';
  dialog.addEventListener('click',event=>{const button=event.target.closest('[data-command-index]');if(button){const command=commands[+button.dataset.commandIndex];dialog.close();dialog.remove();if(!appPanel?.insert?.(command))insert(command);}else if(event.target.closest('[data-command-close]')){dialog.close();dialog.remove();}});$('#app').append(dialog);dialog.showModal();
}
function showCGTokenCatalog(){
  const target=document.activeElement,controller=appPanel;$('#cg-token-dialog')?.remove();const dialog=document.createElement('dialog');dialog.id='cg-token-dialog';
  const names=['abs','sin','cos','tan','asin','acos','atan','sinh','cosh','tanh','asinh','acosh','atanh','log','ln','exp','sqrt','cbrt','nthRoot','Int','Intg','Rnd','RanInt','mod','gcd','lcm','nCr','nPr','Pol','Rec','List','Dim','Sum','Prod','Mean','Med','Min','Max','Cuml','Percent','Delta','SortA','SortD','Fill','Augment','Seq','ListToMat','MatToList','Identity','Det','Trn','Ref','Rref','Abs','Arg','Conjg','ReP','ImP','DotP','CrossP','Angle','UnitV','Norm'];
  const tokens=[...names.map(name=>({name,parserName:name,kind:'function'})),...CG_FINANCIAL_FUNCTIONS.map(spec=>({...spec,kind:'function'})),...CG_STATISTICAL_FUNCTIONS.map(spec=>({...spec,kind:'function'})),...(cgLineInput()||state.mode==='program'?CG_STATISTICAL_COMMANDS.map(spec=>({...spec,parserName:spec.name,kind:'statement'})):[]),...['Ran()','pi','e','i'].map(name=>({name,raw:name}))].sort((a,b)=>a.name.localeCompare(b.name));
  const label=token=>token.name+(token.kind==='function'&&token.syntax!=='postfix'?'(':token.kind==='statement'?' ':'');
  dialog.innerHTML='<h3>CATALOG</h3><input aria-label="Search functions" placeholder="Search"><div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px">'+tokens.map((token,index)=>`<button type="button" data-cg-token="${index}">${esc(label(token))}</button>`).join('')+'</div><button type="button" data-token-exit>EXIT</button>';
  dialog.querySelector('input').addEventListener('input',event=>dialog.querySelectorAll('[data-cg-token]').forEach(button=>button.hidden=!tokens[+button.dataset.cgToken].name.toLowerCase().includes(event.target.value.toLowerCase())));
  dialog.addEventListener('click',event=>{const button=event.target.closest('[data-cg-token]');if(!button){if(event.target.closest('[data-token-exit]')){dialog.close();dialog.remove();}return;}const token=tokens[+button.dataset.cgToken];dialog.close();dialog.remove();if(target?.isConnected&&target.matches?.('#screen input,#screen textarea,#screen math-field'))target.focus();if(controller?.insert?.(token.raw||label(token)))return;if(graphPanel&&!isMathInput(document.activeElement)){graphPanel.edit();graphPanel.focusEntry();}if(token.raw)insert(token.raw);else insertCGNativeToken(token);});$('#app').append(dialog);dialog.showModal();
}
async function captureCGScreen(){
  assert(!appPanel?.isBusy?.(),'CAPTURE is unavailable while an operation is in progress');if(cgCaptureDialog||cgCapturePending)return;cgCapturePending=true;const capturedProfile=state;
  try{
  const target=$('#screen'),rect=target.getBoundingClientRect();let image;
  if(window.simulatorDevice?.captureScreen)image=await window.simulatorDevice.captureScreen({x:rect.x,y:rect.y,width:rect.width,height:rect.height});
  else {const canvas=target.querySelector('canvas');if(!canvas)throw Error('LCD capture is available in the desktop application');image=canvas.toDataURL('image/png');}
  const source=new Image();source.src=image;await source.decode();const canvas=document.createElement('canvas');canvas.width=384;canvas.height=216;const context=canvas.getContext('2d');context.drawImage(source,0,0,384,216);const encoded=encodeProgramPicture(context.getImageData(0,0,384,216));
  if(state!==capturedProfile)return;
  cgCaptureDialog=createCGCaptureDialog({parent:$('#app'),onStore:slot=>storeCGSharedPicture('capture',slot,encoded),onClose:()=>{cgCaptureDialog=null;if(cgCalculationNotice)cgCalculationNotice.focus();else if($('#entry'))focusEntry();}});
  }finally{cgCapturePending=false;}
}
function selectModel(id){
  const next=getModel(id);
  disposeCGProgramGraphics(cgRunGraphicsSession);cgRunGraphicsSession={};
  closeCGNativeMenu();
  if(store.data.activeModel===id){$('#model-picker').close();return;}
  coverReveal?.finish();persist();closeGraph();sheet=null;distributionParameters={};distributionRows=[];store.select(id);model=next;modes=model.modes;
  state=createSession(powerOnCGExam(store.profile(id)),store.data.language,id);calc=new ModelCalculator(id,state.calculator);
  document.body.classList.remove('expanded');
  $('#app').innerHTML=calculatorHTML(model);setMathLanguage(state.language);localizer.setLanguage(state.language);
  bindModelExtensions();initialView();showStorageWarning();uncover();
}
const localizer=createLocalizer($('#app'),state.language);setMathLanguage(state.language);
const completion=createCompletionController(()=>({model,mode:state.mode,definitions:calc.definitions,language:state.language,enabled:!state.off&&!cgLineInput()}));
function setLanguage(language){state.language=language;store.data.language=language;setMathLanguage(language);status();localizer.setLanguage(language);persist();if($('#model-picker')?.open)showModelPicker();else if(appPanel)showCGApplication(state.mode);else if(qrPanel)showQR();}
function languageMenu(){list('语言 / Language',[item('中文',()=>{state.selected=0;highlight();setLanguage('zh');}),item('English',()=>{state.selected=1;highlight();setLanguage('en');})],true,state.language==='en'?1:0);}

function status(){
  $('#shift-ind').classList.toggle('muted',!state.shift);$('#alpha-ind').classList.toggle('muted',!state.alpha);
  $('#memory-ind').classList.toggle('muted',!calc.vars.M);
  $('#alpha-ind').hidden=!model.keyboard.controls.left.some(key=>key[1]==='alpha');
  $('#memory-ind').hidden=!model.variables.includes('M');
  $('#angle-ind').textContent=calc.angle==='Deg'?'D':calc.angle==='Rad'?'R':'G';
  $('#format-ind').textContent=model.baseKeys&&state.mode==='base'?({2:'BIN',8:'OCT',10:'DEC',16:'HEX'}[state.base]):model.family==='ti'?state.tiSettings.notation+(state.tiSettings.decimals===null?'':' '+state.tiSettings.decimals):state.format==='Norm'?(state.decimal?'Decimal':'Math'):state.format;
  $('#mode-label').textContent=modes.find(m=>m[3]===state.mode)?.[0]||'计算';
  $('.calculator').classList.toggle('off',state.off);
  $('.screen-rim').classList.toggle('cg-examination',model.family==='cg'&&state.cgExam?.active===true);
  let examIcon=$('#cg-exam-ind');if(model.family==='cg'&&state.cgExam?.active){if(!examIcon){examIcon=document.createElement('span');examIcon.id='cg-exam-ind';examIcon.textContent='EXAM';examIcon.setAttribute('aria-label','Examination Mode');$('.status').append(examIcon);}examIcon.style.animationDuration=cgExamElapsed(state.cgExam)>=900000?'2s':'1s';}else examIcon?.remove();
  tiExtensions?.applyContrast();
  if(model.family==='cg')$('.key[data-action="alpha"]')?.classList.toggle('alpha-locked',!!state.alphaLock);
  cgContextKeys();
}
function texRender(tex){try{return katex.renderToString(tex,{throwOnError:false,output:'htmlAndMathml',trust:false});}catch{return esc(tex);}}
function cgResultProfile(value){const values=math.isMatrix(value)?value.toArray():value,items=Array.isArray(values)?values.flat(Infinity):[values];return state.cgWorkspace.system.complex==='real'&&items.some(item=>item&&typeof item==='object'&&typeof item.im==='number'&&item.im!==0)?{...state,cgWorkspace:{...state.cgWorkspace,system:{...state.cgWorkspace.system,complex:'a+bi'}}}:state;}
function formatted(v,exactValue){if(model.family==='cg')return formatCGSetupValue(v,calc,cgResultProfile(v),exactValue);if(model.family==='ti')return tiDisplay(v,state.tiSettings,calc.factor());if(typeof v==='number'&&state.format==='Fix')return v.toFixed(state.digits);if(typeof v==='number'&&state.format==='Sci')return v.toExponential(Math.max(0,state.digits-1));return decimal(v);}
function valueHTML(v,approximate=state.approximateAnswer,exactValue){if(v&&typeof v==='object'&&typeof v.tex==='string')return texRender(v.tex);if(typeof v==='string')return esc(v);const ti=model.family==='ti'&&(state.tiSettings.input==='classic'||state.tiSettings.notation!=='Norm'||state.tiSettings.decimals!==null||(math.isComplex(v)&&state.tiSettings.result==='polar'));if(model.family==='cg'){let profile=cgResultProfile(v);if(state.mixedAnswer!==null&&state.mixedAnswer!==undefined)profile={...profile,cgWorkspace:{...profile.cgWorkspace,system:{...profile.cgWorkspace.system,fracResult:state.mixedAnswer?'ab/c':'d/c'}}};return cgLineInput()||state.decimal||state.format!=='Norm'||approximate||state.cgWorkspace.system.engineering?esc(formatCGSetupValue(v,calc,profile,exactValue)):texRender(cgSetupFractionTex(v,calc,profile,exactValue));}return ti||state.decimal||state.format!=='Norm'||approximate?esc(formatted(v)):texRender(exactTex(v));}
function setAnswer(value,approximate=false,exactValue=null){calc.assign('Ans',value,approximate,exactValue);state.answer=value;state.hasAnswer=true;state.approximateAnswer=approximate;state.cgSimpFactor=null;state.mixedAnswer=model.family==='cg'?null:false;}
function extraScope(){if(model.family==='cg'){const native=cgExtraScope();return {...native,...state.matrices,...state.vectors,...createCGVectorScope(calc),rref:native.Rref,identity:native.Identity};}return {...state.matrices,...state.vectors,rref,unitVector:v=>math.divide(v,math.norm(v)),angleBetween:(a,b)=>{const n=math.norm(a)*math.norm(b);assert(n>0);return Math.acos(Math.max(-1,Math.min(1,math.dot(a,b)/n)))/calc.factor();},identity:n=>{assert(Number.isInteger(n)&&n>=1&&n<=(model.matrixMax||4));return math.identity(n);},MatAns:state.MatAns||[[0]],VctAns:state.VctAns||[0,0]};}
function showCalc(focus=true){
  if(graphInsertionPending&&model.family==='cg'){showGraph();return;}
  const metricMenu=cgNativeMenu?.kind==='metric'?{state:cgNativeMenu.getState(),parent:cgNativeMenu.parentMenu}:null;if(metricMenu)closeCGNativeMenu();
  closeGraph();
  $('#screen').classList.add('calculation-screen');
  state.view='calc';state.form=null;state.list=null;
  $('#screen').innerHTML='<div id="expression-host"></div><div class="answer" id="answer" aria-live="polite"></div>';
  let entry;
  if(state.mode==='base'||cgLineInput()||model.family==='ti'&&state.tiSettings.input==='classic'){
    entry=document.createElement('input');entry.id='entry';entry.className='entry';entry.value=state.expr;entry.setAttribute('aria-label','算式');
    if(model.family==='cg'&&state.mode!=='base'){cgLinearElement=entry;cgLinearEditor=createCGLinearEditor(entry,{source:state.expr,onChange:source=>{state.expr=source;state.latex='';state.hasAnswer=false;state.error='';state.eng=null;renderAnswer();}});}
    else entry.addEventListener('input',()=>{state.expr=entry.value;state.hasAnswer=false;state.error='';renderAnswer();});
  }else{
    entry=createMathInput({id:'entry',label:'算式',value:state.latex||expressionToLatex(state.expr),latex:true,onInput:mf=>{
      // MathLive can notify without editing; retain the result/error in that case.
      if(state.latex===mf.value)return;
      state.latex=mf.value;try{state.expr=readInput(mf,inputContext());state.parseError='';}catch(e){state.expr='';state.parseError=e.message;}
      state.hasAnswer=false;state.error='';state.eng=null;renderAnswer();
    },onMove:direction=>{if(direction==='upward'||direction==='downward'){historyStep(direction==='upward'?-1:1);return true;}return false;}});
    entry.className='entry';state.latex=entry.value;
  }
  entry.addEventListener('mount',()=>{if(focus&&$('#entry')===entry&&document.activeElement===document.body)focusEntry();},{once:true});
  $('#expression-host').append(entry);renderAnswer();if(focus){focusEntry();requestAnimationFrame(()=>{if($('#entry')===entry&&document.activeElement===document.body)focusEntry();});}if(metricMenu)openCGMetricMenu(metricMenu.state,metricMenu.parent);status();
}
function renderPreview(){if(!$('#preview'))return;try{let expr=state.expr;if(!expr){$('#preview').innerHTML='';return;}$('#preview').innerHTML=texRender(math.parse(normalize(expr)).toTex({parenthesis:'auto',implicit:'hide'}));}catch{$('#preview').textContent='';}}
function renderAnswer(){const el=$('#answer');if(!el)return;el.classList.remove('error');el.style.textAlign=model.family==='cg'&&typeof state.answer==='string'?'left':'';if(state.error){el.textContent=state.error;el.classList.add('error');return;}el.innerHTML=state.hasAnswer?`${state.approximateAnswer&&model.family!=='cg'?'<span class="approximation" aria-label="近似结果">≈ </span>':''}${state.eng!==null&&typeof state.answer==='number'?texRender(`${decimal(state.answer/10**state.eng)}\\times10^{${state.eng}}`):state.mode==='base'?esc(baseFormat(state.answer,state.base)):model.family!=='cg'&&state.mixedAnswer&&!state.approximateAnswer&&!state.decimal&&state.format==='Norm'?texRender(mixedTex(state.answer)):valueHTML(state.answer,state.approximateAnswer,calc.exactAnswer)}`+(state.cgSimpFactor?'<span class="cg-simp-factor">F='+esc(state.cgSimpFactor)+'</span>':''):'';}
function focusEntry(){const el=$('#entry');if(el){el.focus();if(isMathInput(el))el.position=el.lastOffset;else el.setSelectionRange(el.value.length,el.value.length);}}
function historyStep(step){state.historyIndex=Math.max(0,Math.min(state.history.length-1,(state.historyIndex<0?state.history.length:state.historyIndex)+step));const h=state.history[state.historyIndex];if(h){state.expr=h.expr;state.latex=h.latex||expressionToLatex(h.expr);state.hasAnswer=false;state.error='';showCalc();}}
function remember(){state.undo.push(state.expr);if(state.undo.length>100)state.undo.shift();}
function insert(text,caret=null){
  if(appPanel?.insert?.(text)||graphPanel?.insert?.(text))return;
  let el=document.activeElement;
  if(graphPanel&&!el?.matches('#screen input,#screen textarea,#screen math-field')){graphPanel.edit();graphPanel.focusEntry();el=document.activeElement;}
  if(!el?.matches('#screen input,#screen textarea,#screen math-field')){if(state.view!=='calc')showCalc();el=$('#entry');}
  if(!el)return;
  if(el===cgLinearElement&&cgLinearEditor){if(state.hasAnswer){cgLinearEditor.setSource(/^[+*/^-]/.test(text)?'Ans':'');state.hasAnswer=false;state.error='';}text=({frac:'/',root:'nthRoot(',mixed:'(','mixed-input':'('})[text]||text;remember();cgLinearEditor.insertText(text);return;}
  if(isMathInput(el)){
    if(el.id==='entry'&&state.hasAnswer){el.value=/^[+*/^-]/.test(text)?'\\mathrm{Ans}':'';state.hasAnswer=false;state.error='';}
    const latex=(text==='log('&&['ti','cg'].includes(model.family)?String.raw`\log\left(#?\right)`:null)||(state.mode==='vector'&&model.vectorLabels?.[text]?String.raw`\vec{${model.vectorLabels[text]}}`:null)||keyLatex[text]||(/^[A-Za-z]+\($/.test(text)?'\\operatorname{'+text.slice(0,-1)+'}\\left(#?\\right)':expressionToLatex(text));
    insertIntoMath(el,latex);return;
  }
  if(xSolvePanel||model.family==='ti'&&state.tiSettings.input==='classic')text=({frac:'/',root:'nthRoot(',mixed:'(','mixed-input':'('})[text]||text;
  if(el.id==='entry'&&state.hasAnswer){el.value=/^[+*/^-]/.test(text)?'Ans':'';state.hasAnswer=false;state.error='';el.setSelectionRange(el.value.length,el.value.length);}
  if(el.id==='entry')remember();const start=el.selectionStart??el.value.length,end=el.selectionEnd??start;el.setRangeText(text,start,end,'end');if(caret!==null)el.setSelectionRange(start+caret,start+caret);el.focus();el.dispatchEvent(new Event('input',{bubbles:true}));
}
function setExpr(s){remember();state.expr=s;state.latex=expressionToLatex(s);state.hasAnswer=false;state.error='';state.pending=[];showCalc();}
function executeCGSimp(source){
  const match=/^(.+?)\s+Simp(?:\s+(.+))?$/i.exec(source.trim());if(!match)return null;
  const unwrap=text=>{let value=text.trim();while(value.startsWith('(')&&value.endsWith(')'))value=value.slice(1,-1).trim();return value;};
  assert(unwrap(match[1])==='Ans','Syntax ERROR');assert(typeof calc.vars.Ans==='number','Invalid Type');
  let divisor;if(match[2]!==undefined){divisor=unwrap(match[2]);assert(/^\+?\d+$/.test(divisor),'Can’t Simplify');}
  const exact=calc.exactAnswer,settings=state.cgWorkspace.system;
  if(!exact)return {value:calc.vars.Ans,exact:null,factor:null};
  const result=simplifyCGRational(exact,{divisor,simplify:settings.simplify,complex:settings.complex,inputOutput:settings.inputOutput,fracResult:settings.fracResult,mode:state.format,digits:state.digits,norm:settings.norm});
  return {value:calc.vars.Ans,exact:result.answer,factor:result.factor};
}
function execute(){
  if(model.family==='cg'&&state.cgClipSelecting){cgFunctionKey(1);return;}
  if(state.view==='menu'){chooseMode(state.selected);return;}if(state.view==='list'){rememberMenuSelection();state.list.items[state.selected]?.run();return;}if(state.view==='form'){formNext();return;}if(state.view==='result'){back();return;}
  let nativeResult;try{
    if($('#entry')){if(isMathInput($('#entry')))state.latex=$('#entry').value;state.expr=readInput($('#entry'),inputContext());}
    if(model.family==='cg'&&state.cgExam?.active)assert(!state.pending.length&&!/[:\r\n◢]/.test(state.expr),'Examination Mode: program commands are disabled');
    if(model.family!=='cg'){if(state.pending.length)state.expr=state.pending.shift();else {const chunks=state.expr.split(':').filter(Boolean);if(chunks.length>1){state.expr=chunks.shift();state.pending=chunks;}}}
    assert(state.expr.trim(),'请输入算式');
    // Like a handheld calculator, complete trailing open parentheses at execution.
    if(state.mode!=='base'){let depth=0,quote='';for(const ch of state.expr){if(ch==='"'||ch==="'"){quote=quote===ch?'':quote||ch;}if(!quote){if(ch==='(')depth++;else if(ch===')')depth--;}}if(depth>0)state.expr+=')'.repeat(depth);}
    state.cgSimpFactor=null;const simpResult=model.family==='cg'?executeCGSimp(state.expr):null;
    let v;if(simpResult)v=simpResult.value;else if(state.mode==='base')v=baseCalculate(state.expr,state.base,calc.vars.Ans);else if(model.family==='cg'&&(cgLineInput()||state.expr.includes('→')||/\b(?:SolveN?|FMin|FMax|Sigma|diff2?|integral|CGSolveN?|CGFMin|CGFMax|CGSum|CGIntegral)\s*\(/.test(state.expr)||/\b(?:List(?:[1-9]|1\d|2[0-6]|Ans)|(?:Mat|Vct)(?:[A-Z]|Ans))\s*\[/.test(state.expr)||/^(?:Fill|SortA|SortD|ClrMat|ClrVct|ClrList)\b/.test(state.expr))){nativeResult=executeCGNativeCalculation(state.expr);v=nativeResult.noValue?{tex:'\\mathrm{Done}'}:nativeResult.value;}else v=calc.evaluate(state.expr,extraScope(),state.mode==='complex');
    state.approximateAnswer=state.mode==='base'?false:simpResult?calc.approximateVariables.has('Ans'):nativeResult?nativeResult.approximate===true:calc.lastEvaluationApproximate;const exact=simpResult?simpResult.exact:nativeResult?nativeResult.snapshot.exactAnswer:calc.lastExactResult;if(typeof v==='number'||math.isComplex(v)||Array.isArray(v)||math.isMatrix(v))calc.assign('Ans',v,state.approximateAnswer,exact??null);state.cgSimpFactor=simpResult?.factor?.toString()||null;state.answer=v;state.hasAnswer=true;state.error='';state.eng=null;state.mixedAnswer=model.family==='cg'?null:false;
    if(state.mode==='matrix')state.MatAns=v;if(state.mode==='vector')state.VctAns=v;
    state.history.push({expr:state.expr,latex:state.latex,answer:nativeResult?.noValue?'Done':typeof v==='string'?v:decimal(v),mode:state.mode});state.history=state.history.slice(-(model.family==='cg'?30:100));state.historyIndex=state.history.length;persist();showCalc();if(nativeResult?.graphics.length)showCGRunGraphics(nativeResult.graphics);if(!simpResult&&calc.cgNumericalNotice)showCGCalculationNotice(calc.cgNumericalNotice);
  }catch(e){nativeResult?.rollback?.();state.error=e.message||'数学错误';state.hasAnswer=false;renderAnswer();}
}
function rememberMenuSelection(){if(state.view==='list'&&state.list)state.menuSelections[`${state.mode}:${state.list.title}`]=state.selected;}
function push(){rememberMenuSelection();if(state.view==='form'&&$('#parameters')){const values=formValues();state.form.fields.forEach(f=>f.value=values[f.name]);}state.stack.push({view:state.view,form:state.form,list:state.list,selected:state.selected});if(state.stack.length>20)state.stack.shift();}
function back(){if(cgNativeMenu){cgNativeMenu.back();return;}state.error='';if(graphPanel&&state.view==='graph'){if(!graphPanel.back?.())graphPanel.edit();return;}const prev=state.stack.pop();if(!prev){if(state.mode==='spreadsheet')menu(false);else if(state.mode==='distribution')distributionMenu();else showCalc();return;}if(prev.view==='list')list(prev.list.title,prev.list.items,false,prev.selected);else if(prev.view==='menu')menu(false,prev.selected);else if(prev.view==='form')form(prev.form.title,prev.form.fields,prev.form.submit,false,prev.form.layout);else if(prev.view==='cg-app')showCGApplication(state.mode);else if(prev.view==='x-solve')xSolve();else if(prev.view==='spreadsheet'&&model.spreadsheet)showSpreadsheet();else if(prev.view==='graph'&&model.graphing)showGraph();else showCalc();}
function menu(save=true,selected=null){if(save)push();closeCGNativeMenu();closeGraph();selected??=Math.max(0,menuModes().findIndex(m=>m[3]===state.mode));state.view='menu';state.selected=selected;state.list=null;state.form=null;$('#screen').innerHTML=model.family==='cw'?cwHomeHTML(modes,selected):['x','ex'].includes(model.family)?classwizMenuHTML(modes,selected):`<div class="mode-grid ${model.nativeMenu?'native-menu-grid':''}">${menuModes().map((m,i)=>`<button class="mode-tile ${i===selected?'selected':''}" data-mode="${i}"><span class="symbol">${esc(m[2])}</span><span><small>${m[1]}</small> ${m[0]}</span></button>`).join('')}</div>`;highlight();}
function chooseMode(index){const entry=menuModes()[index];if(!entry)return;if(!entry[3]){unavailable(entry[0]);return;}activateMode(entry[3]);}
function list(title,items,save=true,selected=null){if(save)push();closeGraph();selected??=state.menuSelections[`${state.mode}:${title}`]??0;selected=Math.max(0,Math.min(items.length-1,selected));state.view='list';state.list={title,items};state.form=null;state.selected=selected;$('#screen').innerHTML=`<div class="screen-heading">${esc(title)}<span class="screen-hint">↑↓ = · Esc 返回</span></div><div>${items.map((item,i)=>`<button class="list-item ${i===selected?'selected':''}" data-list="${i}"><span class="idx">${i<9?i+1:''}</span>${esc(item.label)}${item.formula?`<span class="menu-formula">${texRender(item.formula)}</span>`:''}</button>`).join('')}</div>`;highlight();}
function highlight(){rememberMenuSelection();if(model.family==='cw'&&state.view==='menu')updateCwHomePage($('#screen'),state.selected);if(['x','ex'].includes(model.family)&&state.view==='menu')updateClasswizMenu($('#screen'),modes,state.selected);const sel=state.view==='menu'?'.mode-tile':'.list-item';document.querySelectorAll(sel).forEach((el,i)=>el.classList.toggle('selected',i===state.selected));if(state.view==='list'){const host=$('#screen'),row=host.querySelector('.selected');if(row){const h=host.getBoundingClientRect(),r=row.getBoundingClientRect();if(r.top<h.top)host.scrollTop+=r.top-h.top;else if(r.bottom>h.bottom)host.scrollTop+=r.bottom-h.bottom;}}if(state.view==='menu'&&model.nativeMenu)$('#screen .mode-tile.selected')?.scrollIntoView({block:'nearest',inline:'nearest'});cgContextKeys();}
function form(title,fields,submit,save=true,layout=null){
  if(save)push();closeGraph();state.view='form';state.form={title,fields,submit,layout};state.list=null;
  $('#screen').innerHTML='<div class="screen-heading">'+esc(title)+'<span class="screen-hint">Enter 下一项 / 计算</span></div><form id="parameters"><div id="form-content"></div><button class="run-button" type="submit">= 计算</button><div id="form-error" role="alert"></div></form>';
  const content=$('#form-content');
  if(layout)content.innerHTML=formulaLayout(layout,fields);
  fields.forEach((f,i)=>{
    let el;
    if(f.options){el=document.createElement('select');for(const [value,label]of f.options){const option=new Option(label,value);el.add(option);}el.value=f.value||f.options[0][0];el.dataset.name=f.name;}
    else if(f.type==='area'){el=document.createElement('textarea');el.value=f.value||'';el.dataset.name=f.name;}
    else el=createMathInput({label:f.label,value:f.latex??f.value??'',latex:f.latex!==undefined,onMove:direction=>{const controls=formControls(),index=controls.indexOf(el);if(['forward','backward','upward','downward'].includes(direction)){const next=controls[index+(direction==='backward'||direction==='upward'?-1:1)];if(next){next.focus();return true;}}return false;}});
    el.id='param-'+i;el.dataset.name=f.name;el.setAttribute('aria-label',f.label);
    let host=layout?content.querySelector('[data-slot="'+f.name+'"]'):null;
    if(!host){host=document.createElement('div');host.className='form-row'+(f.type==='area'?' wide':'');const label=document.createElement('label');label.htmlFor=el.id;label.textContent=f.label;host.append(label);content.append(host);}
    if(isMathInput(el)&&i===0)el.addEventListener('mount',()=>{if(state.view==='form'&&$('#param-0')===el&&document.activeElement===document.body)el.focus();},{once:true});
    host.append(el);
  });
  $('#parameters').addEventListener('submit',e=>{e.preventDefault();submitForm();});if(layout?.kind==='stats'){$('#frequency-toggle').checked=!!layout.frequency;$('#frequency-toggle').addEventListener('change',refreshStatColumns);$('#param-0').addEventListener('change',refreshStatColumns);refreshStatColumns();}const first=formControls()[0];first?.focus();requestAnimationFrame(()=>{if(state.view==='form'&&formControls()[0]===first&&document.activeElement===document.body)first?.focus();});$('#screen').scrollTop=0;
}
function formControls(){return state.form?.fields.map((_,i)=>$('#param-'+i)).filter(el=>el&&!el.closest('.unused'))||[];}
function formValues(strict=false){const out={};state.form.fields.forEach((f,i)=>{const el=$('#param-'+i);if(strict&&el?.closest('.unused')){out[f.name]='';return;}if(isMathInput(el))f.latex=el.value;try{out[f.name]=readInput(el,f.context||{});}catch(e){if(strict)throw e;out[f.name]='';}});return out;}
function formNext(){const els=formControls(),index=els.indexOf(document.activeElement);if(state.form?.layout?.kind==='stats'&&document.activeElement.dataset.name?.startsWith('x')&&!document.activeElement.value){submitForm();return;}if(index>=0&&index<els.length-1)els[index+1].focus();else submitForm();}
function submitForm(){try{const values=formValues(true);for(const f of state.form.fields){if(!f.optional&&!f.options&&!String(values[f.name]??'').trim())throw new Error('请输入「'+f.label+'」');}state.form.fields.forEach(f=>f.value=values[f.name]);state.form.submit(values);persist();}catch(e){$('#form-error').textContent=e.message||'输入错误';}}

function resultValueHTML(v,index){const approximate=state.displayApproximate[index];return typeof v==='string'?esc(v):`${approximate&&!state.resultHasApproximateHeading?'≈ ':''}${valueHTML(v,approximate)}`;}
function result(title,rows,approximate=false){push();closeGraph();state.view='result';state.list=null;state.form=null;state.displayValues=rows.map(r=>r[1]);state.displayApproximate=rows.map(r=>r[2]??approximate);state.resultHasApproximateHeading=approximate;$('#screen').innerHTML=`<div class="screen-heading">${esc(title)}<span class="screen-hint">${approximate?'≈ ':''}↑↓ 浏览 · Esc 返回</span></div><div class="result-list">${rows.map(([k,v],i)=>`<div class="result-row"><span>${esc(k)}</span><span data-result-number="${i}">${resultValueHTML(v,i)}</span></div>`).join('')}</div>`;$('#screen').focus();}
function matrixResult(title,v){push();closeGraph();state.view='result';state.list=null;state.form=null;state.displayValues=[v];state.displayApproximate=[calc.lastEvaluationApproximate===true];state.resultHasApproximateHeading=false;$('#screen').innerHTML=`<div class="screen-heading">${esc(title)}</div><div class="result-block" data-result-number="0">${resultValueHTML(v,0)}</div>`;}
const number=v=>{const x=calc.evaluate(v,extraScope());assert(typeof x==='number','请输入实数');return x;};
const lines=v=>v.trim().split(/[\n;]+/).filter(s=>s.trim()).map(s=>s.trim().split(/[,，\s]+/).filter(Boolean).map(number));
const field=(name,label,value='',extras={})=>({name,label,value,...extras});
const item=(label,run,formula='')=>({label,run,formula});
const exprItem=(label,text,caret=null)=>item(label,()=>{showCalc();insert(text,caret);});


function showSpreadsheet(){
  assert(model.spreadsheet,'此型号不支持数据表格应用');closeGraph();sheet??=calc.createSpreadsheet();
  state.view='spreadsheet';state.form=null;state.list=null;
  sheetPanel=createSpreadsheetPanel({host:$('#screen'),sheet,onBack:()=>menu()});status();
}
function sheetTools(){
  sheet??=calc.createSpreadsheet();
  list('工具',[
    item('编辑单元格',()=>{showSpreadsheet();sheetPanel.edit();}),
    item('公式填充',()=>sheetFill(true)),item('数值填充',()=>sheetFill(false)),
    item('复制 & 粘贴',()=>{sheet.clipboard={from:sheet.selected,cut:false};showSpreadsheet();}),
    item('剪切 & 粘贴',()=>{sheet.clipboard={from:sheet.selected,cut:true};showSpreadsheet();}),
    ...(sheet.clipboard?[item('粘贴',()=>{sheet.copy(sheet.clipboard.from,sheet.selected,sheet.clipboard.cut);if(sheet.clipboard.cut)sheet.clipboard=null;showSpreadsheet();})]:[]),
    item('全部删除',()=>{sheet.clear();showSpreadsheet();}),
    item('剩余字节',()=>result('剩余字节',[['bytes',1700-sheet.usedBytes()]])),
    item('重新计算',showSpreadsheet),
  ]);
}
function sheetFill(formula){
  form(formula?'公式填充':'数值填充',[field('expression',formula?'公式':'数值','',{type:'area'}),field('range','范围',sheet.selected+':'+sheet.selected,{type:'area'})],v=>{
    sheet.fill(v.range.trim().toUpperCase(),v.expression.trim(),formula);showSpreadsheet();
  });
}
function distributionMenu(){
  assert(model.distribution,'此型号不支持分布应用');
  const specs=model.distributionOrder?model.distributionOrder.map(id=>distributionTypes.find(spec=>spec.id===id)):distributionTypes;
  list('分布',specs.map(spec=>item(spec.label,()=>{
    if(spec.list)list(spec.label,[item('列表',()=>distributionForm(spec,true)),item('变量',()=>distributionForm(spec,false))]);
    else distributionForm(spec,false);
  })));
}
function distributionForm(spec,useList){
  spec={...spec,parameters:model.distributionParameterOrder?.[spec.id]||spec.parameters};
  const defaults={x:0,N:1,p:.5,'μ':0,'σ':1,'λ':1,'下限':-1,'上限':1,'区域':.5};
  if(model.family==='ti')Object.assign(defaults,{'λ':0,'下限':-1e99,'上限':1e99});
  const fields=spec.parameters.filter(k=>!useList||k!=='x').map(k=>field(k,k,String(distributionParameters[k]??defaults[k])));
  if(useList===true)fields.unshift(field('values','x 数值列表',distributionRows.join('\n'),{type:'area'}));
  form(spec.label,fields,v=>{
    const parameters=Object.fromEntries(spec.parameters.filter(k=>!useList||k!=='x').map(k=>[k,number(v[k])]));
    if(useList){
      const limit=model.distributionListLimit||45;
      if(useList==='all')assert(Number.isInteger(parameters.N)&&parameters.N>=0&&parameters.N<limit,'ALL 最多支持 42 项');
      const entries=useList==='all'?Array.from({length:parameters.N+1},(_,i)=>String(i)):v.values.trim().split(/[,，;；\s]+/).filter(Boolean);
      assert(entries.length>0&&entries.length<=limit,limit===42?'分布列表须有 1–42 项':'分布列表须有 1–45 项');
      const xs=entries.map(number);calc.distribution(spec.id,{...parameters,x:0});distributionRows=xs;Object.assign(distributionParameters,parameters);
      result(spec.label,xs.map(x=>{try{return ['x = '+x,calc.distribution(spec.id,{...parameters,x}),true];}catch{return ['x = '+x,'错误'];}}),true);
    }else {
      const value=calc.distribution(spec.id,parameters);Object.assign(distributionParameters,parameters);setAnswer(value,true);persist();result(spec.label,[[spec.id==='inverseNormal'?'x':'P',value]],true);
    }
  });
}

function tiStats(tab='stat'){
  state.mode='stat';persist();
  if(tab==='stat')statOptions();else{
    const specs=[['normalPDF','Normalpdf'],['normalCDF','Normalcdf'],['inverseNormal','invNorm'],['binomialPDF','Binompdf'],['binomialCDF','Binomcdf'],['poissonPDF','Poissonpdf'],['poissonCDF','Poissoncdf']];
    list('DISTR',specs.map(([id,label])=>item(label,()=>{
      const spec={...distributionTypes.find(spec=>spec.id===id),label};
      if(spec.list)list(label,[item('SINGLE',()=>distributionForm(spec,false)),item('LIST',()=>distributionForm(spec,true)),...(id.startsWith('binomial')?[item('ALL',()=>distributionForm(spec,'all'))]:[])]);
      else distributionForm(spec,false);
    })));
  }
  $('#screen').insertAdjacentHTML('afterbegin','<div id="ti-stat-tabs"><button data-action="ti-stat-tab-stat">STAT-REG</button><button data-action="ti-stat-tab-distr">DISTR</button></div>');
}

function modeOptions(){
  if(model.family==='cg'&&['stat','eactivity','spreadsheet','dynamic','table','recursion','conic','program','financial','geometry','pictureplot','graph3d','system','memory','link','econ'].includes(state.mode)){showCGApplication(state.mode);return;}
  if(model.family==='cg'&&state.mode==='equation'){list('Equation',[item('Simultaneous (2–6)',()=>list('Unknowns',model.linearSizes.map(n=>item(String(n),()=>systemForm(n))))),item('Polynomial (2–6)',()=>degreeMenu(false)),item('Solver',solveForm)]);return;}
  switch(state.mode){
    case 'graph':showGraph();break;
    case 'distribution':distributionMenu();break;
    case 'spreadsheet':showSpreadsheet();break;
    case 'base':list('基数 · 32 位',[[10,'十进制 DEC'],[16,'十六进制 HEX'],[2,'二进制 BIN'],[8,'八进制 OCT']].map(([b,label])=>item(label,()=>{state.base=b;showCalc();})).concat([item('逻辑运算',()=>list('逻辑运算',['AND','OR','XOR','XNOR','NOT','NEG'].map(f=>exprItem(f,`${f==='NOT'||f==='NEG'?'':' '}${f} `))))]));break;
    case 'equation':list('方程/函数',[
      item((model.linearSizes||[2,3,4]).at(-1)===3?'联立方程（2–3 元）':'联立方程（2–4 元）',()=>list('未知数个数',(model.linearSizes||[2,3,4]).map(n=>item(`${n} 元联立方程`,()=>systemForm(n))))),
      item((model.polynomialDegrees||[2,3,4]).at(-1)===3?'多项式方程（2–3 次）':'多项式方程（2–4 次）',()=>degreeMenu(false)),
      ...(model.solveLocation==='calc'?[]:[item('求解方程',solveForm)]),
    ]);break;
    case 'inequality':degreeMenu(true);break;
    case 'ratio':list('比例',[item('A : B = X : D',()=>ratioForm('left')),item('A : B = C : X',()=>ratioForm('right'))]);break;
    case 'table':if(model.tableModes?.includes('ask-x'))list('函数表格',[item('Auto',tableForm),item('Ask-x',askTableForm)]);else tableForm();break;
    case 'stat':statOptions();break;
    case 'matrix':matrixOptions();break;
    case 'vector':vectorOptions();break;
    default:functions();
  }
}
function catalogMenu(){
  if(state.mode==='spreadsheet'){list('数据表格',['Sum','Mean','Min','Max'].map(name=>item(name+'(',()=>{showSpreadsheet();sheetPanel.insert('='+name+'(');})));return;}
  // CW separates commands/functions from application tools.
  if(['matrix','vector','base'].includes(state.mode))modeOptions();else functions();
}
function toolsMenu(){
  if(state.mode==='spreadsheet'){sheetTools();return;}
  if(['calc','complex'].includes(state.mode))list('工具',[
    item('计算历史',historyMenu),item('变量',variableMenu),
    item('代入计算',calcForm),...(model.solveLocation==='equation'?[]:[item('求解方程',solveForm)]),
  ]);else modeOptions();
}
function definitionsMenu(){
  assert(model.registeredFunctions,'此型号不支持注册函数');
  const names=calc.functionNames();
  list('函数',[...names.map(name=>item('定义 '+name+'(x)',()=>definitionForm(name))),...names.map(name=>exprItem(name+'(x)',name+'('))]);
}
function definitionForm(name){
  form('定义 '+name+'(x)',[field('expression',name+'(x)',calc.definitions[name]||'')],v=>{
    calc.define(name,v.expression);state.stack=[];showCalc();
  });
}
function formatMenu(){
  if(!state.hasAnswer)return;
  const numeric=typeof state.answer==='number';
  list('转换',[
    item('标准',()=>{state.decimal=false;state.mixedAnswer=false;state.format='Norm';state.stack=[];showCalc();persist();}),
    item('小数',()=>{state.decimal=true;state.mixedAnswer=false;state.format='Norm';state.stack=[];showCalc();persist();}),
    ...(numeric?[
      ...(Number.isSafeInteger(state.answer)&&state.answer>0&&state.answer<=1e12?[item('素因子分解',factor)]:[]),
      item('带分数',()=>dispatch('mixed')),item('工程记数法',()=>{state.stack=[];showCalc();dispatch('eng');}),item('六十进制',showDms),
    ]:[]),
  ]);
}
function degreeMenu(ineq){list(ineq?'不等式次数':'多项式次数',(model.polynomialDegrees||[2,3,4]).map(n=>item(`${n} 次`,()=>polynomialForm(n,ineq))));}
function polynomialForm(n,ineq){const fields=Array.from({length:n+1},(_,i)=>field(String.fromCharCode(97+i),`${String.fromCharCode(97+i)} · x^${n-i}`));if(ineq)fields.unshift(field('op','符号','>',{options:[['>','> 0'],['<','< 0'],['>=','≥ 0'],['<=','≤ 0']]}));form(ineq?`${n} 次不等式`:`${n} 次方程`,fields,v=>{const c=Array.from({length:n+1},(_,i)=>number(v[String.fromCharCode(97+i)]));assert(c[0]!==0,'最高次系数不能为零');if(ineq)result('解集',[['S',inequality(c,v.op)]]);else result('方程的根',calc.solvePolynomial(c).map((r,i)=>[`x${i+1}`,r]),true);},true,{kind:'polynomial',inequality:ineq});}
function systemForm(n){
  const fields=Array.from({length:n},(_,r)=>Array.from({length:n+1},(_,c)=>field('c'+r+'_'+c,'第 '+(r+1)+' 行'))).flat();
  form(n+' 元方程 · 系数与常数',fields,v=>{const rows=Array.from({length:n},(_,r)=>Array.from({length:n+1},(_,c)=>number(v['c'+r+'_'+c])));result('联立方程解',calc.solveLinearSystem(rows).map((x,i)=>[['x','y','z','t'][i],x]));},true,{kind:'system',rows:n});
}
function ratioForm(type){form(type==='left'?'A : B = X : D':'A : B = C : X',[field('a','A'),field('b','B'),field('c',type==='left'?'D':'C')],v=>result('比例结果',[['X',ratio(type,number(v.a),number(v.b),number(v.c))]]),true,{kind:'ratio',type});}
function tableResult(rows,dual=false){push();state.view='result';state.form=null;$('#screen').innerHTML=`<div class="screen-heading">函数表格<span class="screen-hint">${rows.length} 行 · ↑↓</span></div><table class="data-table"><thead><tr>${['x','f(x)',...(dual?['g(x)']:[])].map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(x=>`<td>${esc(decimal(x))}</td>`).join('')}</tr>`).join('')}</tbody></table>`;}
function tableForm(){form('函数表格',[field('f','f(x)',calc.definitions.f||''),...(model.allowDualTable===false?[]:[field('g','g(x)（可空）',calc.definitions.g||'',{optional:true})]),field('start','起始值'),field('end','终止值'),field('step','步长')],v=>{
  const g=v.g||'',tableCalc=model.registeredFunctions?new ModelCalculator(model.id,calc.save()):calc;
  if(model.registeredFunctions){tableCalc.define('f',v.f);if(g.trim())tableCalc.define('g',g);}
  const rows=tableCalc.makeTable(v.f,g,number(v.start),number(v.end),number(v.step));if(model.registeredFunctions)calc.definitions={...tableCalc.definitions};tableResult(rows,!!g.trim());
});}
function askTableForm(){form('Ask-x',[field('f','f(x)',calc.definitions.f||''),field('values','x 数值列表','',{type:'area'})],v=>{
  const candidate=new ModelCalculator(model.id,calc.save());candidate.define('f',v.f);
  const values=v.values.trim().split(/[\s,，;]+/).filter(Boolean).map(number),rows=candidate.makeAskTable(v.f,values);
  calc.definitions={...candidate.definitions};tableResult(rows);
});}
function solveForm(){
  if(model.solveLocation==='calc')return xSolve();
  if(model.solveLocation==='equation'&&state.mode!=='equation')activateMode('equation');
  form('求解方程',[field('expr','方程'),field('guess','x 初始值')],v=>{const x=calc.solve(v.expr,number(v.guess),extraScope());calc.assign('x',x,true);result('求解结果',[['x',x],['L−R',calc.evaluate(v.expr.includes('=')?v.expr.split('=').map(s=>`(${s})`).join('-'):v.expr,{...extraScope(),x})]],true);},true,'solve');
}
function xSolve(){
  assert(state.mode==='calc','SOLVE 仅可在计算模式中使用');
  const entry=$('#entry');
  if(entry){state.latex=isMathInput(entry)?entry.value:expressionToLatex(entry.value);state.expr=readInput(entry,inputContext());}
  const expression=state.expr;assert(expression.trim(),'请先输入方程，再按 SHIFT CALC');
  const parts=expression.split('=');assert(parts.length<=2,'方程格式错误');
  const source=parts.length===2?'('+parts[0]+')-('+parts[1]+')':expression;
  calc.compile(source);
  const names=new Set();math.parse(normalize(source)).traverse(node=>{if(node.isSymbolNode&&Object.hasOwn(calc.vars,node.name)&&node.name!=='Ans')names.add(node.name);});
  assert(names.size,'方程中没有可求解的变量');
  const variables=[...names].sort((a,b)=>a==='x'?-1:b==='x'?1:model.variables.indexOf(a)-model.variables.indexOf(b));
  closeGraph();state.view='x-solve';state.form=null;state.list=null;state.hasAnswer=false;state.error='';
  xSolvePanel=createXSolvePanel({host:$('#screen'),equationHTML:texRender(state.latex||expressionToLatex(expression)),variables,values:calc.vars,
    onValue:(name,input)=>{const value=number(input);calc.assign(name,value,calc.lastEvaluationApproximate);return value;},onCommit:persist,
    onSolve:variable=>{
      const root=calc.solve(expression,calc.vars[variable],extraScope(),variable);calc.assign(variable,root,true);
      result('SOLVE',[[variable,root],['L−R',calc.evaluate(source,extraScope())]],true);
      const heading=$('#screen .screen-heading');heading.classList.add('solve-result-heading');heading.innerHTML=texRender(state.latex)+'<span class="screen-hint">≈</span>';
      persist();
    }});
  status();
}
function calcForm(){if(isMathInput($('#entry'))){state.latex=$('#entry').value;state.expr=readInput($('#entry'),inputContext());}const expr=state.expr;let symbols=[];try{math.parse(normalize(expr)).traverse(n=>{if(n.isSymbolNode&&n.name in calc.vars&&n.name!=='Ans')symbols.push(n.name);});}catch{}symbols=[...new Set(symbols)];if(!symbols.length){execute();return;}form('代入计算',symbols.map(k=>field(k,k)),v=>{for(const k of symbols){const value=number(v[k]);calc.assign(k,value,calc.lastEvaluationApproximate,calc.lastExactResult??null);}state.answer=calc.evaluate(expr,extraScope(),state.mode==='complex');state.approximateAnswer=calc.lastEvaluationApproximate;calc.assign('Ans',state.answer,state.approximateAnswer,calc.lastExactResult??null);state.cgSimpFactor=null;state.hasAnswer=true;state.expr=expr;state.stack=[];showCalc();});}
function calculus(type){const configs={integral:['定积分',[field('expr','f(x)'),field('a','下限'),field('b','上限')],v=>calc.integrate(v.expr,number(v.a),number(v.b))],derivative:['数值微分',[field('expr','f(x)'),field('x','x')],v=>calc.differentiate(v.expr,number(v.x))],sigma:['求和 Σ',[field('expr','f(x)'),field('a','起始整数'),field('b','终止整数')],v=>calc.sequence(v.expr,number(v.a),number(v.b))],product:['求积 Π',[field('expr','f(x)'),field('a','起始整数'),field('b','终止整数')],v=>calc.sequence(v.expr,number(v.a),number(v.b),true)]};const [title,fields,fn]=configs[type];form(title,fields,v=>{const a=fn(v);setAnswer(a,['integral','derivative'].includes(type));result(title,[['结果',a]],['integral','derivative'].includes(type));},true,type);}
const statModels=[['single','1 变量'],['linear','y = a + bx'],['quadratic','y = a + bx + cx²'],['log','y = a + b ln(x)'],['exp','y = a·e^(bx)'],['abexp','y = a·b^x'],['power','y = a·x^b'],['inverse','y = a + b/x']];
function statOptions(){list('统计',[
 item('输入数据 / 计算统计量',()=>statDataForm()),
 item('查看统计结果',()=>{assert(state.statResult,'请先输入数据');result('统计结果',Object.entries(state.statResult).map(([k,v])=>[k,v,['a','b','c','r'].includes(k)]));}),
 item('回归预测',()=>form('回归预测',[field('x','x')],v=>{const q=state.statResult;assert(q&&'a'in q,'请先完成回归');result('回归预测',[['ŷ',regressionValue(q,state.regression,number(v.x))]],true);} ))
 ,...(state.statsRows.length?[item('编辑已保存数据',()=>statDataForm(6,null,true,false,true))]:[])
]);}
function statDataForm(rows=6,snapshot=null,save=true,frequency=false,restore=false){
  if(restore&&state.statsRows.length)rows=Math.max(rows,state.statsRows.length);
  const fields=[field('model','类型',state.regression,{options:statModels}),...Array.from({length:rows},(_,r)=>['x','y','f'].map(k=>field(k+r,k==='f'?'频数':k,'',{optional:true}))).flat()];
  if(snapshot){for(const f of fields)if(snapshot[f.name])Object.assign(f,snapshot[f.name]);}
  if(restore)for(let r=0;r<state.statsRows.length;r++)for(const [i,k]of ['x','y','f'].entries())fields.find(f=>f.name===k+r).value=String(state.statsRows[r][i]);
  if(restore)frequency=state.frequency;
  form('统计数据',fields,v=>{const data=[],paired=v.model!=='single',useFrequency=state.form.layout.frequency;for(let r=0;r<rows;r++){
    if(!v['x'+r]&&(!paired||!v['y'+r])&&(!useFrequency||!v['f'+r]))continue;
    assert(v['x'+r]&&(v.model==='single'||v['y'+r]),'请填写完整数据行');
    data.push([number(v['x'+r]),paired?number(v['y'+r]):0,useFrequency&&v['f'+r]?number(v['f'+r]):1]);
  }calc.checkStatisticsData(data,v.model!=='single',state.form.layout.frequency);const out=statistics(data,v.model);state.regression=v.model;state.statResult=out;state.statsRows=data;state.frequency=state.form.layout.frequency;result('统计结果',Object.entries(out).map(([k,x])=>[k,Number.isNaN(x)?'—':x,['a','b','c','r'].includes(k)]));},save,{kind:'stats',rows,frequency});
}
function refreshStatColumns(){if(state.form?.layout?.kind!=='stats')return;const paired=$('#param-0').value!=='single',frequency=$('#frequency-toggle').checked;state.form.layout.frequency=frequency;document.querySelectorAll('[data-stat-y]').forEach(el=>el.classList.toggle('unused',!paired));document.querySelectorAll('[data-stat-f]').forEach(el=>el.classList.toggle('unused',!frequency));const capacity=calc.statisticsCapacity(paired,frequency);$('#parameters [data-grid-action=add]').disabled=state.form.layout.rows>=capacity;if(model.statisticsCells){let label=$('#stat-capacity');if(!label){label=document.createElement('span');label.id='stat-capacity';$('#parameters .grid-actions').append(label);}label.textContent='最多 '+capacity+' 行';}}
function resizeStatRows(delta){if(state.form?.layout?.kind!=='stats')return;const limit=calc.statisticsCapacity($('#param-0').value!=='single',state.form.layout.frequency);if(delta>0&&state.form.layout.rows>=limit)return;formValues();const snapshot=Object.fromEntries(state.form.fields.map(f=>[f.name,{...f}]));snapshot.model.value=$('#param-0').value;statDataForm(Math.max(1,state.form.layout.rows+delta),snapshot,false,state.form.layout.frequency);}

function matrixForm(name,rows,cols){
  const fields=Array.from({length:rows},(_,r)=>Array.from({length:cols},(_,c)=>field('c'+r+'_'+c,'第 '+(r+1)+' 行'))).flat();
  form('矩阵 '+name.at(-1),fields,v=>{state.matrices[name]=Array.from({length:rows},(_,r)=>Array.from({length:cols},(_,c)=>number(v['c'+r+'_'+c])));showCalc();insert(name);},true,{kind:'matrix',rows,cols,symbol:name.at(-1)});
}
function matrixDimensions(name){if(model.family==='cg'){form(name,[field('rows','Rows','2'),field('cols','Columns','2')],v=>{const rows=number(v.rows),cols=number(v.cols);assert(Number.isInteger(rows)&&Number.isInteger(cols)&&rows>=1&&cols>=1&&rows<=999&&cols<=999,'Matrix dimensions: 1–999');assert(rows*cols<=model.matrixCells,'矩阵内存不足');matrixForm(name,rows,cols);});return;}list('矩阵行数',Array.from({length:model.matrixMax||4},(_,i)=>i+1).map(rows=>item(rows+' 行',()=>list('矩阵列数',Array.from({length:model.matrixMax||4},(_,i)=>i+1).map(cols=>item(cols+' 列',()=>matrixForm(name,rows,cols)))))));}
function mathTemplate(label,latex){return item(label,()=>{showCalc();insertIntoMath($('#entry'),latex);},latex.replaceAll('#?',String.raw`\square`));}
function operationForm(title,fn,scope,binary=false,notation=''){
  const fields=[field('a',scope==='matrix'?'矩阵':'向量','',{context:inputContext(scope)}),...(binary?[field('b','向量','',{context:inputContext(scope)})]:[])];
  form(title,fields,v=>{const expression=fn+'('+v.a+(binary?','+v.b:'')+')',value=calc.evaluate(expression,extraScope());setAnswer(value,calc.lastEvaluationApproximate);if(scope==='matrix')state.MatAns=value;else state.VctAns=value;matrixResult(title,value);},true,binary?{kind:'binary',notation}:{kind:'unary'});
}
function matrixOptions(){list('矩阵',[
 item('定义 / 编辑矩阵',()=>list('矩阵变量',(model.matrixNames||['MatA','MatB','MatC','MatD']).map(name=>item('矩阵 '+name.at(-1),()=>matrixDimensions(name))))),
 item('矩阵运算',()=>showCalc()),
 ...(model.matrixNames||['MatA','MatB','MatC','MatD']).map(name=>item('矩阵 '+name.at(-1),()=>{showCalc();insert(name);})),
 mathTemplate('行列式',String.raw`\left|#?\right|`),mathTemplate('逆矩阵','{#?}^{-1}'),mathTemplate('转置矩阵',String.raw`{#?}^{\mathsf{T}}`),
 item('简化行阶梯形',()=>operationForm('简化行阶梯形','rref','matrix')),
 item('单位矩阵',()=>form('单位矩阵',[field('n','阶数')],v=>matrixResult('单位矩阵',extraScope().identity(number(v.n)))))
]);}
function vectorForm(name,n){form('向量 '+(model.vectorLabels?.[name]||name.at(-1)),Array.from({length:n},(_,i)=>field('c'+i,['x','y','z'][i])),v=>{state.vectors[name]=Array.from({length:n},(_,i)=>number(v['c'+i]));showCalc();insert(name);},true,{kind:'vector',rows:1,cols:n,symbol:model.vectorLabels?.[name]||name.at(-1)});}
function vectorOptions(){list('向量',[
 item('定义 / 编辑向量',()=>list('向量变量',(model.vectorNames||['VctA','VctB','VctC','VctD']).map(name=>item('向量 '+(model.vectorLabels?.[name]||name.at(-1)),()=>list('向量维数',(model.vectorDimensions||[2,3]).map(n=>item(n+' 维',()=>vectorForm(name,n)))))))),
 item('向量运算',()=>showCalc()),...(model.vectorNames||['VctA','VctB','VctC','VctD']).map(name=>item('向量 '+(model.vectorLabels?.[name]||name.at(-1)),()=>{showCalc();insert(name);})),
 item('数量积',()=>operationForm('数量积','dot','vector',true,'dot')),item('向量积',()=>operationForm('向量积','cross','vector',true,'cross')),
 item('向量的模',()=>operationForm('向量的模','norm','vector')),item('向量夹角',()=>operationForm('向量夹角','angleBetween','vector',true,'angle')),
 item('单位向量',()=>operationForm('单位向量','unitVector','vector'))
]);}

function functions(){list('函数目录',[
 item('三角 / 双曲函数',()=>list('三角与双曲',['sin','cos','tan','asin','acos','atan','sinh','cosh','tanh','asinh','acosh','atanh'].map(f=>exprItem(f,`${f}(`)))),
 item('数值积分 / 微分 / Σ / Π',()=>list('微积分',[item('定积分',()=>calculus('integral'),String.raw`\int_{\square}^{\square}\square\,dx`),item('微分',()=>calculus('derivative'),String.raw`\left.\frac{d}{dx}\square\right|_{x=\square}`),item('求和',()=>calculus('sigma'),String.raw`\sum_{x=\square}^{\square}\square`),item('求积',()=>calculus('product'),String.raw`\prod_{x=\square}^{\square}\square`)])),
 item('整数 / 随机 / 排列组合',()=>list('整数与组合',[exprItem('绝对值','abs('),exprItem('阶乘','!'),item('排列',()=>binaryForm('nPr')),item('组合',()=>binaryForm('nCr')),item('最大公约数',()=>binaryForm('gcd')),item('最小公倍数',()=>binaryForm('lcm')),item('整数部分',()=>scalarForm('整数部分','Int')),item('向下取整',()=>scalarForm('向下取整','Intg')),item('四舍五入',()=>scalarForm('四舍五入','Rnd')),item('随机数',()=>{showCalc();insert(String(Math.random()));}),item('随机整数',()=>binaryForm('RanInt')),item('素因子分解',factor)])),
 item('坐标 / 角度 / 度分秒',()=>list('坐标与角度',[item('直角坐标转极坐标',()=>binaryForm('Pol')),item('极坐标转直角坐标',()=>binaryForm('Rec')),item('输入度分秒',dmsForm),item('结果 → 度分秒',showDms),item('按度输入',()=>scalarForm('按度输入','deg')),item('按弧度输入',()=>scalarForm('按弧度输入','rad')),item('按梯度输入',()=>scalarForm('按梯度输入','gra'))])),
 ...(model.constants?[item('科学常数',constantMenu)]:[]),item('公制换算',conversionMenu),item('变量 / 存储器',variableMenu),item('计算历史',historyMenu),
 ...(state.mode==='complex'?[item('复数函数',()=>list('复数',[item('共轭复数',()=>scalarForm('共轭复数','conj')),exprItem('复数的模','abs('),item('辐角',()=>scalarForm('辐角','arg')),item('实部',()=>scalarForm('实部','re')),item('虚部',()=>scalarForm('虚部','im')),item('极坐标输入',()=>binaryForm('angle')),item('结果 → r∠θ',()=>{const a=state.hasAnswer?state.answer:calc.evaluate(state.expr,{},true);result('极坐标',[['r',math.abs(a)],['θ',math.arg(a)/calc.factor()]]);})]))]:[])
 ]);}
function binaryForm(fn){
 const titles={Pol:'直角坐标转极坐标',Rec:'极坐标转直角坐标',angle:'极坐标输入',RanInt:'随机整数',nPr:'排列',nCr:'组合',gcd:'最大公约数',lcm:'最小公倍数'};
 const labels={Pol:['x','y'],Rec:['r','θ'],angle:['r','θ'],RanInt:['下限','上限'],nPr:['n','r'],nCr:['n','r']}[fn]||['a','b'];
 form(titles[fn]||fn,[field('a',labels[0]),field('b',labels[1])],v=>{const value=calc.evaluate(fn+'('+number(v.a)+','+number(v.b)+')',extraScope(),state.mode==='complex');setAnswer(value,calc.lastEvaluationApproximate);result(titles[fn]||fn,[['结果',value]]);},true,{kind:'binary',notation:fn==='nPr'?'perm':fn==='nCr'?'comb':''});
}
function scalarForm(title,fn){form(title,[field('a','x')],v=>{const value=calc.evaluate(fn+'('+v.a+')',extraScope(),state.mode==='complex');setAnswer(value,calc.lastEvaluationApproximate);result(title,[['结果',value]]);},true,{kind:'unary'});}
function dmsForm(){form('度分秒输入',[field('d','度'),field('m','分'),field('s','秒')],v=>{const d=number(v.d),m=number(v.m),sec=number(v.s);assert(m>=0&&m<60&&sec>=0&&sec<60,'分、秒须在 0–60 之间');const value=calc.evaluate('dms('+d+','+m+','+sec+')');setAnswer(value,calc.lastEvaluationApproximate);result('度分秒',[['角度',d+'° '+m+'′ '+sec+'″'],['结果',value]]);},true,'dms');}
function showDms(){const x=state.hasAnswer?state.answer:number(state.expr);assert(typeof x==='number');const a=Math.abs(x),d=Math.floor(a),m=Math.floor((a-d)*60),s=Number(((a-d-m/60)*3600).toFixed(6));result('度分秒',[['结果',`${x<0?'−':''}${d}° ${m}′ ${s}″`]]);}
function factor(){const v=state.hasAnswer?state.answer:number(state.expr);const tex=factorize(v).map(([p,k])=>k===1?String(p):`${p}^{${k}}`).join(String.raw`\times`)||'1';result('素因子分解',[[String(v),{tex}]]);}
function variableMenu(){list('变量 / 存储器',[item('STO · 存储结果',storeMenu),item('RCL · 调用变量',()=>recallMenu()),item('变量列表',()=>result('变量',Object.entries(calc.vars).map(([k,v])=>[k,v,calc.approximateVariables.has(k)])))]);}
function storeMenu(){const v=state.hasAnswer?state.answer:number(state.expr),exact=model.family==='cg'?(state.hasAnswer?calc.exactAnswer:calc.lastExactResult):null;list('STO → 变量',model.variables.map(k=>item(`${k} = ${decimal(calc.vars[k])}`,()=>{calc.assign(k,v,state.hasAnswer?state.approximateAnswer:calc.lastEvaluationApproximate,exact);persist();showCalc();status();})));}
function recallMenu(){list('RCL · 变量',[...model.variables,'Ans'].map(k=>exprItem(`${k} = ${decimal(calc.vars[k])}`,k)));}
function constantMenu(){
  const entries=constantsFor(model);
  const choices=rows=>rows.map(([symbol,name,value,unit])=>item(`${symbol} · ${name} ${unit}`,()=>{showCalc();insert(`(${value})`);}));
  if(model.family==='cw')list('科学常数',cwConstantGroups.map(([name,symbols])=>item(name,()=>list(name,choices(symbols.map(symbol=>entries.find(row=>row[0]===symbol)))))));
  else list('科学常数',choices(entries));
}
function conversionMenu(){list('公制换算',conversions.map(c=>item(c.label,()=>form(c.label,[field('value',c.from)],v=>{const x=c.convert(number(v.value));assert(Number.isFinite(x));setAnswer(x,calc.lastEvaluationApproximate);result(c.label,[[c.to,x]],calc.lastEvaluationApproximate);} ))));}
function historyMenu(){list('计算历史',state.history.slice().reverse().map(h=>item(`${h.expr} = ${h.answer}`,()=>{state.mode=h.mode;setExpr(h.expr);})));}
function setup(){if(model.family==='cg'&&graphPanel?.setup){graphPanel.setup();return;}if(model.family==='cg'&&appPanel?.setup){appPanel.setup();return;}if(model.family==='cg'&&appPanel?.handleAction?.('setup'))return;if(model.family==='cg'){showCGSetup();return;}list('设置',[item('角度单位',()=>list('角度单位',['Deg','Rad','Gra'].map((a,i)=>item(['度（D）','弧度（R）','梯度（G）'][i],()=>{calc.angle=a;persist();status();if(state.mode==='graph'&&model.graphing)showGraph();else showCalc();})))),item('输入/输出',()=>list('输出格式',[item('数学结果（分数 / 根式）',()=>{state.decimal=false;persist();showCalc();}),item('小数结果',()=>{state.decimal=true;persist();showCalc();})])),item('显示格式',()=>list('显示格式',[item('Norm',()=>{state.format='Norm';persist();showCalc();}),...['Fix','Sci'].map(f=>item(f,()=>form(f,[field('n',f==='Fix'?'小数位 0–9':'有效位 1–10')],v=>{const n=Number(v.n);assert(Number.isInteger(n)&&n>=(f==='Fix'?0:1)&&n<=(f==='Fix'?9:10),'位数超出范围');state.format=f;state.digits=n;persist();showCalc();})))])),item('语言 / Language',languageMenu),item('展开 / 收起屏幕',toggleExpand),item('切换型号',showModelPicker),item('复位',resetMenu)]);}
function resetMenu(){list('复位',[item('清除变量',()=>{for(const k in calc.vars)calc.assign(k,0);persist();state.hasAnswer=false;showCalc();}),item('恢复设置',()=>{calc.angle='Deg';state.decimal=false;state.format='Norm';persist();showCalc();}),item('全部初始化',()=>list('全部初始化？',[item('是 · 清除本软件数据',resetCurrentProfile),item('取消',back)]))]);}
function toggleExpand(){document.body.classList.toggle('expanded');fitModel();}
function navigate(action){
 if(state.view==='menu'||state.view==='list'){const len=state.view==='menu'?menuModes().length:state.list.items.length;if(!len)return;const columns=model.nativeMenu||['x','ex'].includes(model.family)?4:3;const step=state.view==='menu'?(action==='up'?-columns:action==='down'?columns:action==='left'?-1:1):(action==='up'||action==='left'?-1:1);state.selected=(state.selected+step+len)%len;highlight();return;}
 if(state.view==='result'){$('#screen').scrollBy({top:action==='up'?-35:action==='down'?35:0,left:action==='left'?-50:action==='right'?50:0});return;}
 const el=document.activeElement;
 if(isMathInput(el)){el.executeCommand({up:'moveUp',down:'moveDown',left:'moveLeft',right:'moveRight'}[action]);return;}
 if(state.view==='form'){const els=formControls(),i=els.indexOf(el);if(action==='up'||action==='down')els[Math.max(0,Math.min(els.length-1,i+(action==='up'?-1:1)))]?.focus();return;}
 if(action==='up'||action==='down'){state.historyIndex=Math.max(0,Math.min(state.history.length-1,(state.historyIndex<0?state.history.length:state.historyIndex)+(action==='up'?-1:1)));const h=state.history[state.historyIndex];if(h){state.expr=h.expr;state.hasAnswer=false;state.error='';showCalc();}}
 else if(el?.id==='entry'){const pos=Math.max(0,Math.min(el.value.length,el.selectionStart+(action==='left'?-1:1)));el.setSelectionRange(pos,pos);}
}
function dispatch(action){
  try{
  if(cgCaptureDialog?.handleAction(action))return;
  if(cgCalculationNotice?.handleAction(action))return;
  if(cgNativeMenu?.handleAction?.(action))return;
  $('#capability-notice')?.remove();
  if(!action.startsWith('ti-multi:'))tiMultiTap.reset();
  if(model.family==='cg'&&state.view==='calc'&&['calc','complex'].includes(state.mode)&&!appPanel){if(action==='options'){cgNativeOptions();return;}if(action==='variables'){cgNativeOptions('variables');return;}}
  if(model.family==='cg'&&action==='options'&&graphPanel?.options){graphPanel.options();return;}
  if(model.family==='cg'&&state.mode==='base'&&['options','variables'].includes(action))return;
  if(model.family==='cg'&&state.cgExam?.active&&(action==='on'||state.off&&action==='cg-clear-on')){const powered=powerOnCGExam({...state,calculator:calc.save()});if(!powered.cgExam?.active){importCGProfile(powered);return;}}
  if(state.off&&!['on','cg-clear-on'].includes(action))return;
  if(state.mode==='base'&&state.view==='calc'&&Object.hasOwn(model.baseKeys||{},action)){state.base=model.baseKeys[action];showCalc();persist();return;}
  if(state.view==='menu'&&/^\d$/.test(action)){chooseMode(action==='0'?9:Number(action)-1);return;}
  if(state.view==='list'&&/^[1-9]$/.test(action)){const index=Number(action)-1;if(index<state.list.items.length){state.selected=index;execute();}return;}
  if(tiPanel&&tiPanel.handleAction(action))return;
  if(xSolvePanel&&xSolvePanel.handleAction(action))return;
  if(qrPanel&&qrPanel.handleAction(action))return;
  if(appPanel?.captureKey?.(action))return;
  if(appPanel&&!['menu','models','language','setup','help','off','on','shift','alpha','undo'].includes(action)&&appPanel.handleAction?.(action))return;
  if(model.family==='ti'&&tiExtensions?.handleAction(action))return;
  if(action==='ex-qr'){showQR();return;}
  if(model.family==='cg'&&handleCGAction(action))return;
  if($('#ti-stat-tabs')&&['left','right'].includes(action)){tiStats(action==='right'?'distr':'stat');return;}
  if(sheetPanel&&state.view==='spreadsheet'&&sheetPanel.handleAction(action))return;
  if(sheetPanel&&state.view==='spreadsheet'&&!['shift','on','off','menu','models','language','tools','catalog','options','setup','help','page-up','page-down'].includes(action)){unavailable(action);return;}
  if(action.startsWith('unimplemented:')){unavailable(action.slice(14));return;}
  if(action.startsWith('ti-multi:')){tiMultiTap.tap(action.slice(9));return;}
  if(action.startsWith('mode:')){activateMode(action.slice(5));return;}
  if(/^cg-f[1-6]$/.test(action)){if(graphPanel)graphPanel.softKey(Number(action.slice(-1)));else cgFunctionKey(Number(action.slice(-1)));return;}
  if(action.startsWith('graph-')&&model.graphing){if(!graphPanel)showGraph();graphPanel[action.slice(6)]?.();return;}

  if(action==='shift'){state.shift=!state.shift;state.alpha=false;status();return;}
  if(action==='alpha'){state.alpha=!state.alpha;state.alphaLock=false;state.shift=false;status();return;}
  switch(action){
    case 'run':activateMode('calc');break;
    case 'ti-mode':tiMode();break;
    case 'ti-quit':tiReturn();break;
    case 'ti-data':activateMode('stat');statDataForm();break;
    case 'ti-stats':case 'ti-stat-tab-stat':tiStats();break;
    case 'ti-stat-tab-distr':tiStats('distr');break;
    case 'ti-polynomial':state.mode='equation';degreeMenu(false);break;
    case 'ti-system':state.mode='equation';list('未知数个数',model.linearSizes.map(n=>item(String(n),()=>systemForm(n))));break;
    case 'ti-complex':activateMode('complex');break;
    case 'ti-base':tiMode();break;
    case 'ti-random':list('random',[item('rand',()=>{showCalc();insert('Ran()');}),item('randint',()=>binaryForm('RanInt'))]);break;
    case 'ti-clearvar':list('clear var',model.variables.map(k=>item(k,()=>{calc.assign(k,0);persist();showCalc();})));break;
    case 'ti-fraction-decimal':dispatch('sd');break;
    case 'cg-clear-on':state.off=false;if(graphPanel)graphPanel.edit();else dispatch('clear');status();break;
    case 'language':languageMenu();break;case 'models':showModelPicker();break;case 'back':back();break;case 'menu':menu();break;case 'setup':setup();break;case 'help':$('#help').showModal();break;case 'options':if(state.mode==='spreadsheet'&&model.spreadsheet)sheetTools();else modeOptions();break;
    case 'cw-log':insert('log10(');break;
    case 'polar-angle':insert('polar-angle');break;
    case 'page-up':case 'page-down':{const direction=action==='page-up'?-1:1;if(state.view==='menu'&&model.family==='cw'){state.selected=Math.max(0,Math.min(modes.length-1,state.selected+6*direction));highlight();}else $('#screen').scrollBy({top:direction*$('#screen').clientHeight});break;}
    case 'catalog':catalogMenu();break;case 'tools':toolsMenu();break;case 'format':formatMenu();break;case 'definitions':definitionsMenu();break;case 'variables':variableMenu();break;
    case 'clear':if(state.view!=='calc'){state.stack=[];showCalc();}else setExpr('');break;
    case 'delete':{const el=document.activeElement;if(isMathInput(el)){el.executeCommand('deleteBackward');el.dispatchEvent(new Event('input',{bubbles:true}));break;}if(el?.matches('#screen input,#screen textarea')){if(el.id==='entry')remember();let a=el.selectionStart,b=el.selectionEnd;if(a===b)a=Math.max(0,a-1);el.setRangeText('',a,b,'end');el.dispatchEvent(new Event('input',{bubbles:true}));}break;}
    case 'insert':state.overwrite=!state.overwrite;$('#format-ind').textContent=state.overwrite?'OVR':'INS';break;
    case 'on':sheet=null;distributionParameters={};distributionRows=[];state.off=false;status();initialView();break;case 'off':sheet=null;closeGraph();distributionParameters={};distributionRows=[];state.off=true;persist();status();break;
    case 'execute':if(graphPanel)graphPanel.execute();else execute();break;case 'approx':state.decimal=true;execute();break;
    case 'up':case 'down':case 'left':case 'right':if(graphPanel){const handled=graphPanel.handleKey({key:'Arrow'+action[0].toUpperCase()+action.slice(1)});if(!handled){const el=document.activeElement;if(isMathInput(el))el.executeCommand({up:'moveUp',down:'moveDown',left:'moveLeft',right:'moveRight'}[action]);}}else navigate(action);break;
    case 'sd':state.decimal=!state.decimal;state.eng=null;state.mixedAnswer=model.family==='cg'?null:false;persist();renderAnswer();document.querySelectorAll('[data-result-number]').forEach(el=>{const v=state.displayValues[Number(el.dataset.resultNumber)];el.innerHTML=resultValueHTML(v,Number(el.dataset.resultNumber));});status();break;
    case 'mixed':{if(!state.hasAnswer){insert('mixed-input');break;}assert(typeof state.answer==='number');const mixed=state.mixedAnswer??(model.family==='cg'&&state.cgWorkspace.system.fracResult==='ab/c');state.mixedAnswer=!state.approximateAnswer&&!mixed;state.decimal=state.approximateAnswer;state.eng=null;state.stack=[];showCalc();persist();break;}
    case 'eng':case 'engback':assert(typeof state.answer==='number'&&state.hasAnswer);state.eng=(state.eng===null?(state.answer===0?0:Math.floor(Math.log10(Math.abs(state.answer))/3)*3):state.eng)+(action==='engback'?3:state.eng===null?0:-3);renderAnswer();break;
    case 'calc':calcForm();break;case 'solve':solveForm();break;
    case 'integral':case 'derivative':case 'sigma':case 'product':calculus(action);break;
    case 'constants':constantMenu();break;case 'conversions':conversionMenu();break;case 'reset':resetMenu();break;
    case 'store':storeMenu();break;case 'recall':recallMenu();break;
    case 'mplus':case 'mminus':{const v=state.hasAnswer?state.answer:number(state.expr);assert(typeof v==='number');calc.assign('M',calc.vars.M+(action==='mplus'?1:-1)*v,state.approximateAnswer||calc.approximateVariables.has('M'));persist();status();break;}
    case 'Ran()':insert(String(Math.random()));break;case 'Rnd(':scalarForm('四舍五入','Rnd');break;case 'factor':factor();break;case 'dms':dmsForm();break;case 'perm':binaryForm('nPr');break;case 'comb':binaryForm('nCr');break;case 'pol':binaryForm('Pol');break;case 'rec':binaryForm('Rec');break;case 'ranint':binaryForm('RanInt');break;
    case 'frac':insert('frac');break;case 'mixed-input':insert('mixed-input');break;case 'root':insert('root');break;
    case 'undo':{if(graphPanel?.undo?.())break;const target=document.activeElement;if(target===cgLinearElement&&cgLinearEditor)cgLinearEditor.undo();else if(isMathInput(target))target.executeCommand('undo');else if(!appPanel?.undo?.())textUndo.undo();break;}
    default:insert(action);
  }
  }catch(e){if(state.view==='calc'){state.error=e.message;renderAnswer();}else{const error=$('#form-error');if(error)error.textContent=e.message;else result('错误',[['提示',e.message]]);}}
}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.action==="cover"){uncover();return;}if(b.dataset.modelChoice){selectModel(b.dataset.modelChoice);return;}if(b.hasAttribute('data-picker-language')){setLanguage(state.language==='en'?'zh':'en');return;}if(b.hasAttribute('data-picker-close')){$('#model-picker').close();return;}if(b.id==='help-close'){$('#help').close();return;}if(b.dataset.gridAction){resizeStatRows(b.dataset.gridAction==='add'?1:-1);return;}if(b.dataset.mode!==undefined){chooseMode(Number(b.dataset.mode));return;}if(b.dataset.list!==undefined){state.selected=Number(b.dataset.list);execute();return;}if(b.dataset.action){if(state.view==='menu'&&model.menuShortcuts==='classwiz'&&/^[ABC]$/.test(b.dataset.alpha||'')){chooseMode('123456789ABC'.indexOf(b.dataset.alpha));return;}if(model.baseKeys&&state.mode==='base'&&state.view==='calc'&&state.base===16&&!state.shift&&/^[A-F]$/.test(b.dataset.alpha||'')){state.alpha=false;status();insert(b.dataset.alpha);return;}const a=state.shift&&b.dataset.shift?b.dataset.shift:state.alpha&&b.dataset.alpha?b.dataset.alpha:b.dataset.action;if(!['shift','alpha'].includes(a)){state.shift=false;state.alpha=!!state.alphaLock;status();}dispatch(a);}});
// Keep the caret when clicking calculator keys, while Tab still reaches every key.
document.addEventListener('pointerdown',e=>{if(e.target.closest('[data-action]:not([data-action="cover"]),#screen'))coverReveal?.finish();if(e.target.closest('[data-action]'))e.preventDefault();});
const cgHeldKeys=new Set();
document.addEventListener('click',event=>{if(model.family==='cg'&&state.cgExam?.active&&state.alpha&&event.target.closest('[data-action="-"]')){event.preventDefault();event.stopImmediatePropagation();state.alpha=false;showCGExamClock();status();}},true);
document.addEventListener('pointerdown',event=>{if(model.family!=='cg')return;const button=event.target.closest('[data-action]');if(!button)return;cgHeldKeys.add(button.dataset.action);if(state.off&&button.dataset.action==='cg-clear-on'&&cgHeldKeys.has('cos(')&&cgHeldKeys.has('7'))showCGExamEntry();});
document.addEventListener('pointerup',event=>{const action=event.target.closest('[data-action]')?.dataset.action;if(action)cgHeldKeys.delete(action);});
window.addEventListener('keydown',event=>{if(model.family!=='cg')return;if(state.cgExam?.active&&state.alpha&&event.key==='-'){event.preventDefault();event.stopImmediatePropagation();state.alpha=false;showCGExamClock();status();return;}const action=event.key.toLowerCase()==='c'?'cos(':event.key==='7'?'7':event.key==='Enter'?'cg-clear-on':null;if(action)cgHeldKeys.add(action);if(state.off&&cgHeldKeys.has('cos(')&&cgHeldKeys.has('7')&&cgHeldKeys.has('cg-clear-on')){event.preventDefault();event.stopImmediatePropagation();showCGExamEntry();}},true);
window.addEventListener('keyup',event=>{const action=event.key.toLowerCase()==='c'?'cos(':event.key==='7'?'7':event.key==='Enter'?'cg-clear-on':null;if(action)cgHeldKeys.delete(action);},true);
window.addEventListener('blur',()=>cgHeldKeys.clear());
document.addEventListener('input',e=>{if(e.target.id==='entry'&&!isMathInput(e.target)&&e.target!==cgLinearElement){state.expr=e.target.value;state.hasAnswer=false;state.error='';state.eng=null;renderPreview();renderAnswer();}});
window.addEventListener('keydown',e=>{
  if($('#model-picker')?.open){if(e.key==='F12'){e.preventDefault();setLanguage(state.language==='en'?'zh':'en');}return;}
  if(!['Shift','Control','Alt','Meta'].includes(e.key))coverReveal?.finish();
  if($('#help').open)return;
  if(e.isComposing)return;
  if(document.querySelector('dialog[open]:not(#help):not(#model-picker)'))return;
  if(cgNativeMenu?.handleKey?.(e)){e.preventDefault();e.stopImmediatePropagation();return;}
  if(xSolvePanel){const action={ArrowUp:'up',ArrowDown:'down',Enter:'execute','=':'execute'}[e.key];if(action){e.preventDefault();e.stopImmediatePropagation();xSolvePanel.handleAction(action);return;}}
  if(tiPanel){const action={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',Enter:'execute',Escape:'back'}[e.key];if(action){e.preventDefault();e.stopImmediatePropagation();tiPanel.handleAction(action);return;}}
  if(qrPanel){const action={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',Enter:'execute',Escape:'back'}[e.key];if(action&&qrPanel.handleAction(action)){e.preventDefault();e.stopImmediatePropagation();return;}}
  if(appPanel){if(appPanel.handleKey?.(e)){e.preventDefault();e.stopImmediatePropagation();return;}if(!/^F\d+$/.test(e.key)&&e.key!=='Home')return;}
  if(document.activeElement===cgLinearElement&&cgLinearEditor&&(e.ctrlKey||e.metaKey)&&['z','y'].includes(e.key.toLowerCase())){e.preventDefault();e.stopImmediatePropagation();if(e.key.toLowerCase()==='y'||e.shiftKey)cgLinearEditor.redo();else cgLinearEditor.undo();return;}
  if(completion.handleKey(e))return;
  if(sheetPanel&&state.view==='spreadsheet'){if(sheetPanel.handleKey(e)){e.preventDefault();e.stopImmediatePropagation();return;}if(!/^F\d+$/.test(e.key)&&e.key!=='Home')return;}
  if(graphPanel&&state.view==='graph'){if(graphPanel.handleKey(e)){e.preventDefault();e.stopImmediatePropagation();return;}if(!/^F\d+$/.test(e.key)&&e.key!=='Home'&&!(e.ctrlKey||e.metaKey))return;}
  const mathTarget=isMathInput(document.activeElement);
  const equationInput=state.form?.layout==='solve'&&document.activeElement.dataset.name==='expr';
  if(document.activeElement.tagName==='BUTTON'&&e.key===' ')return;
  if(mathTarget&&(/^F\d+$/.test(e.key)||['Home','Enter','Escape'].includes(e.key)||(e.key==='='&&!equationInput)||(e.shiftKey&&e.key==='Delete')))e.stopImmediatePropagation();
  if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();e.stopImmediatePropagation();if(state.view==='form')submitForm();else execute();return;}
  if(mathTarget&&(e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='a'){e.preventDefault();e.stopImmediatePropagation();document.activeElement.executeCommand('selectAll');return;}
  if(mathTarget&&(e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='c'&&state.hasAnswer&&state.view==='calc'){const ranges=$('#entry').selection.ranges;if(ranges.every(([a,b])=>a===b)){e.preventDefault();e.stopImmediatePropagation();navigator.clipboard.writeText(formatted(state.answer,calc.exactAnswer)).catch(()=>{});return;}}
  if(mathTarget&&(e.ctrlKey||e.metaKey))return;
  if(e.ctrlKey||e.metaKey){if(e.key.toLowerCase()==='z'&&state.view==='calc'){e.preventDefault();const v=state.undo.pop();if(v!==undefined){state.expr=v;state.hasAnswer=false;state.error='';showCalc();}}if(e.key.toLowerCase()==='c'&&state.hasAnswer&&!window.getSelection()?.toString()&&!$('#entry')?.value.substring($('#entry').selectionStart,$('#entry').selectionEnd)){e.preventDefault();navigator.clipboard.writeText(formatted(state.answer,calc.exactAnswer)).catch(()=>{});}return;}
  const shortcut=shortcutAction(model,e,state.shift,state.alpha);
  if(shortcut==='toggle-language'){e.preventDefault();setLanguage(state.language==='en'?'zh':'en');return;}if(shortcut==='expand'){e.preventDefault();toggleExpand();return;}if(shortcut){e.preventDefault();if(!['shift','alpha'].includes(shortcut)){state.shift=false;state.alpha=!!state.alphaLock;status();}dispatch(shortcut);return;}
  if(e.shiftKey&&e.key==='Delete'){e.preventDefault();dispatch('clear');return;}
  if(e.key==='Escape'){e.preventDefault();state.shift=false;state.alpha=false;status();if(state.view==='calc'){if(state.error){state.error='';renderAnswer();}else dispatch('clear');}else back();return;}
  if(e.key==='Enter'&&e.shiftKey&&document.activeElement.tagName==='TEXTAREA')return;
  if(e.key==='Enter'||e.key==='='&&!equationInput){e.preventDefault();dispatch('execute');return;}
  if(state.view==='menu'&&model.menuShortcuts==='classwiz'&&/^[abc]$/i.test(e.key)){e.preventDefault();chooseMode('123456789ABC'.indexOf(e.key.toUpperCase()));return;}
  if(state.view==='menu'&&model.spreadsheet&&/^[ab]$/i.test(e.key)){e.preventDefault();chooseMode(e.key.toLowerCase()==='a'?10:11);return;}
  if(state.view==='menu'&&model.nativeMenu&&/^[1-9a-z]$/i.test(e.key)){const index=model.nativeMenu.findIndex(row=>row[1]===e.key.toUpperCase());if(index>=0){e.preventDefault();chooseMode(index);}return;}
  if((state.view==='menu'||state.view==='list')&&/^\d$/.test(e.key)){e.preventDefault();if(state.view==='menu')chooseMode(e.key==='0'?9:Number(e.key)-1);else{const i=Number(e.key)-1;if(i>=0&&i<Math.min(9,state.list.items.length)){state.selected=i;execute();}}return;}
  if(state.view==='form'&&document.activeElement.tagName==='SELECT'&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))return;
  if(mathTarget&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))return;
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){if(state.view==='form'&&['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();dispatch(e.key.replace('Arrow','').toLowerCase());return;}
  if(state.shift||state.alpha){const action=modifiedKeyAction(model,e.key,state.shift?'shift':'alpha');if(action){e.preventDefault();state.shift=false;state.alpha=!!state.alphaLock;status();dispatch(action);return;}}
  if(state.off){if(e.key==='o'){e.preventDefault();dispatch('on');}return;}
  if(mathTarget){if(state.view==='calc'&&state.hasAnswer&&e.key.length===1&&!e.altKey){const mf=$('#entry');mf.value=/^[+*/^-]/.test(e.key)?'\\mathrm{Ans}':'';mf.position=mf.lastOffset;state.hasAnswer=false;state.error='';renderAnswer();}return;}
  if(state.view==='calc'&&e.key.length===1&&!e.altKey){
    if(document.activeElement.id!=='entry'){e.preventDefault();insert(e.key);return;}
    if(state.hasAnswer){e.preventDefault();insert(e.key);return;}
    if(state.overwrite&&document.activeElement.selectionStart===document.activeElement.selectionEnd&&document.activeElement.selectionStart<document.activeElement.value.length){e.preventDefault();const el=document.activeElement;el.setSelectionRange(el.selectionStart,el.selectionEnd+1);insert(e.key);}else remember();
  }
},true);
window.addEventListener('beforeunload',persist);
let lastInteraction=Date.now();
document.addEventListener('pointerdown',()=>{lastInteraction=Date.now();},true);
window.addEventListener('keydown',()=>{lastInteraction=Date.now();},true);
const powerOffTimer=setInterval(()=>{const minutes=model.family==='cg'?(state.cgExam?.active?60:Number(state.cgWorkspace?.system?.autoPowerOff??10)):10;if(minutes>0&&!state.off&&(!appPanel?.isBusy?.()||state.mode==='geometry')&&Date.now()-lastInteraction>=minutes*60000)dispatch('off');},1000);
window.addEventListener('beforeunload',()=>clearInterval(powerOffTimer));
// Preload provides OS languages and bounded own-app capture/profile storage.
window.addEventListener('resize',fitModel);
bindModelExtensions();initialView();
if(bootProfile.cgExam?.active&&!bootPowered.cgExam?.active)persist();
showStorageWarning();
if(!store.data.activeModel)showModelPicker();
else uncover();
