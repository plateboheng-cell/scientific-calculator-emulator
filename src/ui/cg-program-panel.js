import {CGProgramRunner,sanitizePrograms} from '../engine/cg-program.js';
import {math} from '../engine/calculator.js';
import {sanitizeCGFinancialNative} from '../engine/cg-financial-functions.js';
import {sanitizeCGAnswers} from '../engine/cg-array-memory.js';
import {sanitizeCGStatisticalNative} from '../engine/cg-statistical-functions.js';
import {sanitizeCGFunctionMemory} from '../engine/cg-function-memory.js';
import {sanitizeCGExactState} from '../engine/cg-exact-state.js';
import {renderCGProgramGraphics,disposeCGProgramGraphics} from './cg-program-canvas.js';
import './cg-app-panels.css';

const sample={name:'SUM',source:'"N"?→N\n0→S\nFor 1→A To N\nS+A→S\nNext\nPrint "SUM",S'};
export function createCGProgramPanel({host,calculator,data={},workspace={},matrices={},vectors={},graph={},initialFormat,onChange=()=>{},onMemoryChange=()=>{},onCommand,onBack=()=>{}}){
  const abort=new AbortController(),signal=abort.signal,en=document.documentElement.lang?.startsWith('en'),say=(zh,english)=>en?english:zh;
  let saved=sanitizePrograms(data),runner=null,view='editor',raf=0,lastKey=0,graphicsSession={},tokenMenu=null,undoStack=[],lastSource='';
  if(!saved.programs.length)saved.programs=[{name:'PROGRAM',source:''}];
  host.innerHTML='<div class="cg-workbench cg-program-panel"><div class="cg-toolbar"><strong>PROGRAM</strong><select aria-label="Program" data-program-list></select></div><div class="cg-toolbar"><input class="cg-program-name" data-program-name aria-label="Program name" maxlength="20"><span class="cg-note" data-save-note></span></div><textarea class="cg-program-source" data-program-source aria-label="Program source" spellcheck="false"></textarea><div class="cg-input-prompt" data-prompt hidden><label></label><input aria-label="Program input" data-program-input><button type="button" data-continue>EXE</button></div><div class="cg-error" role="alert"></div><div class="cg-result" data-user-content aria-live="polite"></div><details><summary>'+say('指令帮助','Commands')+'</summary><p>A–Z · → / -> · ?→A · Print "text",A\nIf … : Then … : Else … : IfEnd\nFor 1→A To 10 Step 1 : Next\nWhile … : WhileEnd · Do : LpWhile …\nBreak · Lbl A : Goto A · Prog "NAME"\nReturn · Stop · ClrText · Locate x,y,value\nIsz A · Dsz A · 条件 ⇒ 语句 · ◢</p></details><div class="cg-softkeys"></div></div>';
  const list=host.querySelector('[data-program-list]'),name=host.querySelector('[data-program-name]'),source=host.querySelector('[data-program-source]'),output=host.querySelector('.cg-result'),error=host.querySelector('.cg-error'),prompt=host.querySelector('[data-prompt]'),input=host.querySelector('[data-program-input]');
  const labels=['RUN','NEW','SAVE','DELETE','EXAMPLE','EXIT'];host.querySelector('.cg-softkeys').innerHTML=labels.map((label,i)=>'<button type="button" data-function="'+(i+1)+'">'+label+'</button>').join('');
  const current=()=>saved.programs[saved.selected];
  function persist(updateUI=true){const p=current();if(p){p.name=name.value.trim()||'PROGRAM';p.source=source.value.slice(0,40000);}onChange(sanitizePrograms(saved));if(updateUI&&!signal.aborted){const note=host.querySelector('[data-save-note]');if(note)note.textContent=say('已保存','Saved');}}
  function renderList(){list.replaceChildren(...saved.programs.map((p,i)=>{const o=document.createElement('option');o.value=i;o.textContent=p.name;return o;}));list.value=saved.selected;}
  function stopRunner(){if(raf)cancelAnimationFrame(raf);raf=0;disposeCGProgramGraphics(graphicsSession);if(runner?.status==='yield'){runner.status='stopped';commitVariables(runner.snapshot());}runner=null;}
  function load(){stopRunner();renderList();name.value=current()?.name||'';source.value=current()?.source||'';lastSource=source.value;undoStack=[];graphicsSession={};prompt.hidden=true;output.textContent='';error.textContent='';view='editor';source.hidden=false;}
  function edited(){if(source.value!==lastSource){undoStack.push(lastSource);undoStack=undoStack.slice(-100);lastSource=source.value;}persist();}
  function undo(){if(view!=='editor'){error.textContent=say('先退出 RUN 再编辑程序','Exit RUN before editing');return true;}if(undoStack.length){source.value=undoStack.pop();lastSource=source.value;source.focus();source.setSelectionRange(source.value.length,source.value.length);persist();}return true;}
  function commitVariables(result){
    if(result.simplify)calculator.cgSimplify=result.simplify;
    const approximate=new Set(result.approximateVariables||[]);calculator.cgNumericalNotice=typeof result.cgNumericalNotice==='string'?result.cgNumericalNotice:null;
    for(const [key,value]of Object.entries(result.variables))if(Object.hasOwn(calculator.vars,key)&&(typeof value==='number'&&Number.isFinite(value)||math.isComplex(value)&&Number.isFinite(value.re)&&Number.isFinite(value.im)))calculator.assign(key,value,approximate.has(key),key==='Ans'?result.exactAnswer:result.exactVariables?.[key]||null);
    Object.assign(calculator,sanitizeCGExactState(result,calculator.vars));
    if(result.status==='yield')return;
    if(result.format)initialFormat={...result.format};
    calculator.angle=result.angle;calculator.functionMemory=sanitizeCGFunctionMemory(result.functionMemory);if(result.graphMemory){calculator.graphMemory=structuredClone(result.graphMemory);graph=calculator.graphMemory;}
    if(result.financialNative){const native=sanitizeCGFinancialNative(result.financialNative);calculator.financialSettings=native.settings;calculator.financialMemory=native.memory;}
    const statistical=sanitizeCGStatisticalNative(result.statisticalNative);calculator.statisticalMemory=statistical.registers;calculator.statisticalRegression=statistical.regression;calculator.nativeAnswers=sanitizeCGAnswers(result.nativeAnswers);
    workspace.strings=result.strings;workspace.statistics??={};workspace.statistics.lists=result.lists;matrices=result.matrices;vectors=result.vectors;
    onMemoryChange({lists:result.lists,matrices:result.matrices,vectors:result.vectors,nativeAnswers:result.nativeAnswers,functionMemory:result.functionMemory,graphMemory:result.graphMemory,statisticalNative:result.statisticalNative,strings:result.strings,angle:result.angle,format:result.format,financialNative:result.financialNative,simplify:result.simplify,exactAnswer:result.exactAnswer,exactVariables:result.exactVariables,approximateVariables:result.approximateVariables,cgNumericalNotice:calculator.cgNumericalNotice});
  }
  function show(result){
    commitVariables(result);output.textContent=(result.textScreen?.some(Boolean)?result.textScreen.join('\n')+'\n':'')+result.outputs.join('\n')+(result.status==='done'?'\n'+say('完成','Done'):'');
    const coordinate=document.createElement('div');coordinate.className='cg-program-coordinates';const drawingCalculator=result.graphMemory?Object.assign(Object.create(calculator),{graphMemory:result.graphMemory}):calculator,graphics=renderCGProgramGraphics(drawingCalculator,result.commands,{graph:result.graphMemory||graph,lists:result.lists,workspace,session:graphicsSession,onCoordinate:text=>{coordinate.textContent=text;}});if(graphics)output.append(graphics,coordinate);
    prompt.hidden=!['input','display'].includes(result.status);
    if(!prompt.hidden){prompt.querySelector('label').textContent=result.request.prompt;input.hidden=result.status==='display';input.value='';if(!input.hidden)input.focus();}
    view='running';source.hidden=true;output.scrollIntoView({block:'nearest'});
    if(result.status==='yield')raf=requestAnimationFrame(run);
  }
  function run(){
    try{
      if(raf)cancelAnimationFrame(raf);raf=0;error.textContent='';
      if(runner&&['input','display','yield'].includes(runner.status)){
        if(runner.status==='display')disposeCGProgramGraphics(graphicsSession);
        show(runner.run(runner.status==='input'?input.value:undefined,{instructionBudget:500}));return;
      }
      persist();stopRunner();lastKey=0;graphicsSession={};
      runner=new CGProgramRunner(calculator,current().source,{programs:saved.programs,pauseOnDisplay:true,complex:['a+bi','polar'].includes(workspace.system?.complex),complexFormat:workspace.system?.complex,format:initialFormat,lists:workspace.statistics?.lists||[],listNames:workspace.statistics?.names||[],matrices,vectors,strings:workspace.strings||[],onCommand,keyProvider:()=>lastKey});
      show(runner.run(undefined,{instructionBudget:500}));
    }catch(e){
      if(runner&&runner.status!=='input'){runner.status='error';commitVariables(runner.snapshot());disposeCGProgramGraphics(graphicsSession);prompt.hidden=true;}
      error.textContent=e.message;
    }
  }
  function create(){persist();if(saved.programs.length>=50){error.textContent=say('最多 50 个程序','Maximum 50 programs');return;}let i=1;while(saved.programs.some(p=>p.name==='PRGM'+i))i++;saved.programs.push({name:'PRGM'+i,source:''});saved.selected=saved.programs.length-1;load();persist();source.focus();}
  function remove(){if(saved.programs.length===1){saved.programs=[{name:'PROGRAM',source:''}];saved.selected=0;}else {saved.programs.splice(saved.selected,1);saved.selected=Math.max(0,saved.selected-1);}load();persist();}
  function example(){persist();let i=saved.programs.findIndex(p=>p.name===sample.name);if(i<0){if(saved.programs.length>=50)return;saved.programs.push({...sample});i=saved.programs.length-1;}saved.selected=i;load();persist();}
  const functions=[run,create,()=>{persist();renderList();},remove,example,()=>onBack()];
  list.addEventListener('change',()=>{persist();saved.selected=+list.value;load();onChange(saved);},{signal});
  source.addEventListener('input',edited,{signal});name.addEventListener('change',()=>{persist();renderList();},{signal});
  host.querySelector('.cg-softkeys').addEventListener('click',e=>{const b=e.target.closest('[data-function]');if(b)handleAction('cg-f'+b.dataset.function);},{signal});
  host.querySelector('[data-continue]').addEventListener('click',run,{signal});
  function insert(text){const field=runner?.status==='input'?input:source;if(field.hidden)return false;field.focus();const a=field.selectionStart??field.value.length,b=field.selectionEnd??a;field.setRangeText(text,a,b,'end');if(field===source)edited();return true;}
  function closeTokens(){tokenMenu?.remove();tokenMenu=null;source.focus();}
  function selectToken(){if(!tokenMenu)return;const value=tokenMenu.querySelector('select').value;closeTokens();insert(value);}
  function tokens(kind){if(view==='running'){error.textContent=say('先退出 RUN 再编辑程序','Exit RUN before editing');return;}closeTokens();const menu=document.createElement('div');menu.className='cg-toolbar cg-program-tokens';const select=document.createElement('select');select.setAttribute('aria-label','Program command');const commands=kind==='format'?['Deg','Rad','Gra','Fix ','Sci ','Norm ']:['sin(','cos(','tan(','sqrt(','abs(','Sum(','Prod(','Mean(','Med(','Min(','Max(','Dim ','Cuml(','Percent(','Delta(','Seq(','SortA(','SortD(','Fill(','Augment(','ListToMat(','MatToList(','Trn(','Det(','Identity(','StrJoin(','StrLen(','StrCmp(','StrSrc(','StrMid(','StrLeft(','StrRight(','StrInv(','StrRotate(','StrShift(','StrUpr(','StrLwr(','StrToExp(','ExpToStr(','Getkey'];for(const command of commands){const option=document.createElement('option');option.value=command;option.textContent=command;select.append(option);}const apply=document.createElement('button');apply.type='button';apply.textContent='INSERT';apply.addEventListener('click',selectToken,{signal});menu.append(select,apply);host.querySelector('.cg-program-panel').insertBefore(menu,source);tokenMenu=menu;select.focus();}
  const keyCodes={'cg-f1':79,'cg-f2':69,'cg-f3':59,'cg-f4':49,'cg-f5':39,'cg-f6':29,shift:78,alpha:77,up:28,down:37,left:38,right:27,'0':71,'1':72,'2':62,'3':52,'4':73,'5':63,'6':53,'7':74,'8':64,'9':54,'.':61,'+':42,'-':32,'*':43,'/':33,execute:31};
  function captureKey(action){if(runner?.status!=='yield'||!Object.hasOwn(keyCodes,action))return false;lastKey=keyCodes[action];return true;}
  function handleAction(action){
    if(captureKey(action))return true;
    lastKey=keyCodes[action]||0;
    if(action==='undo')return undo();
    if(action==='cg-catalog'){tokens('catalog');return true;}if(action==='cg-format'){tokens('format');return true;}
    const literal={'cg-store-arrow':'→','cg-list':'List ','cg-matrix':'Mat ','cg-open-list':'{','cg-close-list':'}','cg-open-matrix':'[','cg-close-matrix':']','cg-equals':'=','cg-space':' ','cg-strings':'"','cg-newline':'\n'};if(Object.hasOwn(literal,action))return insert(literal[action]);
    if(tokenMenu&&/^cg-f[1-6]$/.test(action)){if(action==='cg-f1')selectToken();if(action==='cg-f6')closeTokens();return true;}
    if(/^cg-f[1-6]$/.test(action)){functions[+action.slice(-1)-1]();return true;}
    if(action==='back'){if(view==='running'){stopRunner();prompt.hidden=true;source.hidden=false;view='editor';}else {persist();onBack();}return true;}
    if(action==='execute'){if(document.activeElement===source&&!runner){insert('\n');}else run();return true;}
    if(action==='clear'||action==='cg-clear-on'){if(raf)cancelAnimationFrame(raf);raf=0;disposeCGProgramGraphics(graphicsSession);if(runner){runner.status='stopped';commitVariables(runner.snapshot());runner=null;prompt.hidden=true;source.hidden=false;view='editor';}else {source.value='';edited();}return true;}
    if(action==='delete'){const field=runner?.status==='input'?input:source;field.focus();const a=field.selectionStart,b=field.selectionEnd;field.setRangeText('',a===b?Math.max(0,a-1):a,b,'end');if(field===source)edited();return true;}
    const map={negative:'-',frac:'/',sqrt:'sqrt(',root:'nthRoot(','*10^':'*10^','^2':'^2',pi:'pi',store:'→',Ans:'Ans'};
    if(Object.hasOwn(map,action)||/^[0-9A-Za-z.+*/^(),=<>-]$/.test(action)||/^[a-zA-Z]+\($/.test(action)){insert(map[action]||action);return true;}return false;
  }
  function handleKey(e){
    if(tokenMenu&&e.key==='Enter'){selectToken();return true;}if(tokenMenu&&e.key==='Escape'){closeTokens();return true;}
    const action={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',Enter:'execute',Shift:'shift',F1:'cg-f1',F2:'cg-f2',F3:'cg-f3',F4:'cg-f4',F5:'cg-f5',F6:'cg-f6'}[e.key]||e.key;lastKey=keyCodes[action]||0;
    if(runner?.status==='yield'&&e.key!=='Escape')return true;
    if(e.key==='Escape'){handleAction('back');return true;}
    if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){run();return true;}
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){persist();return true;}
    if(e.key==='Enter'&&document.activeElement===input){run();return true;}
    if(e.key==='Enter'&&runner?.status==='display'){run();return true;}
    return false;
  }
  window.addEventListener('keyup',()=>{lastKey=0;},{signal});
  load();onChange(sanitizePrograms(saved));
  return {handleAction,handleKey,insert,undo,captureKey,isBusy:()=>!!runner&&['running','yield','display','input'].includes(runner.status),focus:()=>source.focus(),destroy(){abort.abort();stopRunner();persist(false);}};
}
