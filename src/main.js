import './style.css';
import katex from 'katex';
import { Calculator, math, assert, decimal, exactTex, factorize, normalize } from './engine/calculator.js';
import { polynomialRoots, linearSystem, inequality, statistics, table, ratio, baseCalculate, baseFormat, rref } from './engine/modes.js';
import { constants, conversions } from './engine/catalog.js';
import { scienceKeys, digitKeys, modes } from './keys.js';
import { createLocalizer } from './i18n.js';
import { createMathInput, isMathInput, readInput, insertIntoMath, keyLatex, setMathLanguage } from './math-input.js';
import { expressionToLatex } from './engine/notation.js';
import { formulaLayout } from './templates.js';

const $=s=>document.querySelector(s), esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let saved={};try{saved=JSON.parse(localStorage.getItem('cnx-v1')||'{}');}catch{}
const calc=new Calculator(saved.calculator), state={mode:'calc',view:'calc',shift:false,alpha:false,off:false,expr:'',latex:'',answer:0,hasAnswer:false,decimal:saved.decimal??false,format:saved.format??'Norm',digits:saved.digits??10,history:Array.isArray(saved.history)?saved.history.slice(-100):[],historyIndex:-1,base:10,matrices:saved.matrices||{},vectors:saved.vectors||{},form:null,list:null,selected:0,stack:[],undo:[],eng:null,pending:[],statsRows:saved.statsRows||'',regression:saved.regression||'single',language:saved.language==='en'?'en':'zh',menuSelections:saved.menuSelections||{}};
function persist(){try{localStorage.setItem('cnx-v1',JSON.stringify({calculator:calc.save(),decimal:state.decimal,format:state.format,digits:state.digits,history:state.history.slice(-100),matrices:state.matrices,vectors:state.vectors,statsRows:state.statsRows,regression:state.regression,language:state.language,menuSelections:state.menuSelections}));}catch{}}
const keyHTML=(k,kind='')=>`<div class="key-wrap ${kind}"><div class="secondary"><span class="shift">${esc(k[2]||'')}</span><span class="alpha">${esc(k[4]||'')}</span></div><button class="key" type="button" data-action="${esc(k[1])}" data-shift="${esc(k[3]||'')}" data-alpha="${esc(k[5]||'')}" title="${esc(k[0])}${k[2]?` · SHIFT ${esc(k[2])}`:''}${k[4]?` · ALPHA ${esc(k[4])}`:''}" aria-label="${esc(k[0])}">${esc(k[0])}</button></div>`;
$('#app').innerHTML=`<section class="calculator" aria-label="CNX 科学计算器"><div class="brand-row"><span class="brand">CNX</span><div class="solar" aria-hidden="true"></div></div><div class="model-row"><span class="model">fx-991CN X</span><span class="classwiz">SCIENTIFIC</span></div><div class="screen-rim"><div class="status"><span id="shift-ind" class="muted">S</span><span id="alpha-ind" class="muted">A</span><span id="memory-ind" class="muted">M</span><span id="angle-ind">D</span><span id="format-ind">Math</span><span id="mode-label">计算</span></div><section class="lcd" id="screen" aria-label="计算器屏幕"></section></div><div class="controls"><div class="side-controls">${keyHTML(['SHIFT','shift'],'small shift-key')}${keyHTML(['ALPHA','alpha'],'small alpha-key')}${keyHTML(['OPTN','options'],'small')}${keyHTML(['CALC','calc','SOLVE','solve'],'small')}</div><div class="nav" aria-label="方向键"><button class="up" data-action="up" aria-label="上">▲</button><button class="left" data-action="left" aria-label="左">◀</button><button class="right" data-action="right" aria-label="右">▶</button><button class="down" data-action="down" aria-label="下">▼</button></div><div class="side-controls">${keyHTML(['MENU','menu','设置','setup'],'small')}${keyHTML(['ON','on'],'small')}${keyHTML(['∫','integral','d/dx','derivative'],'small')}${keyHTML(['x','x','Σ','sigma'],'small')}</div></div><div class="science">${scienceKeys.map(k=>keyHTML(k)).join('')}</div><div class="digits">${digitKeys.map((k,i)=>keyHTML(k,['delete','clear'].includes(k[1])?'blue':i===17||i===18?'compact':'')).join('')}</div><div class="foot"><button class="help-button" data-action="language" aria-label="语言 / Language">中文 / English</button><button class="help-button" data-action="help">F1 键盘帮助</button></div></section><dialog id="help"><button id="help-close">关闭 Esc</button><h2>键盘操作</h2><table><tbody>${[['F1','帮助'],['F2 / F3','SHIFT / ALPHA（按一次后再按目标键）'],['F4 / Home','主菜单；数字 1–9、0 选择十种模式'],['F5','当前模式选项 / 函数目录'],['F6 / Shift+F6','CALC / SOLVE'],['F7 / F8','科学常数 / 单位换算'],['F9 / Shift+F9','S⇔D / 带分数'],['F10 / F11','展开屏幕 / 设置'],['F12','切换界面语言'],['Enter / =','计算；参数页面下一项，最后一项提交'],['Escape / Shift+Delete','返回 / 清空算式（AC）'],['Backspace / Delete','删除左边 / 右边字符'],['↑ ↓ / ← →','菜单选择；算式内 ↑↓ 调用历史，←→ 移动光标'],['Tab / Shift+Tab','切换输入框或按键'],['Ctrl+Z / Ctrl+C / Ctrl+V','撤销输入 / 复制选择内容或结果 / 粘贴算式']].map(([a,b])=>`<tr><td><kbd>${a}</kbd></td><td>${b}</td></tr>`).join('')}</tbody></table><h3>公式输入</h3><p>按分数、根号、乘方等按键插入数学模板，在公式空位中填写。方向键移动公式光标，Tab 切换空位；Enter 进入下一项，最后一项 Enter 计算，Ctrl+Enter 可直接计算。</p><h3>数据输入</h3><p>矩阵、向量、方程和统计数据按单元格填写。所有空位起始为空，返回编辑会保留本人输入的内容。</p></dialog>`;
const localizer=createLocalizer($('#app'),state.language);setMathLanguage(state.language);
function setLanguage(language){state.language=language;setMathLanguage(language);status();localizer.setLanguage(language);persist();}
function languageMenu(){list('语言 / Language',[item('中文',()=>{state.selected=0;highlight();setLanguage('zh');}),item('English',()=>{state.selected=1;highlight();setLanguage('en');})],true,state.language==='en'?1:0);}

function status(){ $('#shift-ind').classList.toggle('muted',!state.shift);$('#alpha-ind').classList.toggle('muted',!state.alpha);$('#memory-ind').classList.toggle('muted',!calc.vars.M);$('#angle-ind').textContent=calc.angle==='Deg'?'D':calc.angle==='Rad'?'R':'G';$('#format-ind').textContent=state.format==='Norm'?(state.decimal?'Decimal':'Math'):state.format;$('#mode-label').textContent=modes.find(m=>m[3]===state.mode)?.[0]||'计算';$('.calculator').classList.toggle('off',state.off);}
function texRender(tex){try{return katex.renderToString(tex,{throwOnError:false,output:'htmlAndMathml',trust:false});}catch{return esc(tex);}}
function formatted(v){if(typeof v==='number'&&state.format==='Fix')return v.toFixed(state.digits);if(typeof v==='number'&&state.format==='Sci')return v.toExponential(Math.max(0,state.digits-1));return decimal(v);}
function valueHTML(v){if(v&&typeof v==='object'&&typeof v.tex==='string')return texRender(v.tex);return state.decimal||state.format!=='Norm'?esc(formatted(v)):texRender(exactTex(v));}
function extraScope(){return {...state.matrices,...state.vectors,MatAns:state.MatAns||[[0]],VctAns:state.VctAns||[0,0],rref,unitVector:v=>math.divide(v,math.norm(v)),angleBetween:(a,b)=>{const n=math.norm(a)*math.norm(b);assert(n>0);return Math.acos(Math.max(-1,Math.min(1,math.dot(a,b)/n)))/calc.factor();},identity:n=>{assert(Number.isInteger(n)&&n>=1&&n<=4);return math.identity(n);}};}
function showCalc(focus=true){
  state.view='calc';state.form=null;state.list=null;
  $('#screen').innerHTML='<div id="expression-host"></div><div class="answer" id="answer" aria-live="polite"></div>';
  let entry;
  if(state.mode==='base'){
    entry=document.createElement('input');entry.id='entry';entry.className='entry';entry.value=state.expr;entry.setAttribute('aria-label','算式');
    entry.addEventListener('input',()=>{state.expr=entry.value;state.hasAnswer=false;state.error='';renderAnswer();});
  }else{
    entry=createMathInput({id:'entry',label:'算式',value:state.latex||expressionToLatex(state.expr),latex:true,onInput:mf=>{
      state.latex=mf.value;try{state.expr=readInput(mf,{mode:state.mode});state.parseError='';}catch(e){state.expr='';state.parseError=e.message;}
      state.hasAnswer=false;state.error='';state.eng=null;renderAnswer();
    },onMove:direction=>{if(direction==='upward'||direction==='downward'){historyStep(direction==='upward'?-1:1);return true;}return false;}});
    entry.className='entry';state.latex=entry.value;
  }
  entry.addEventListener('mount',()=>{if(focus&&$('#entry')===entry&&document.activeElement===document.body)focusEntry();},{once:true});
  $('#expression-host').append(entry);renderAnswer();if(focus){focusEntry();requestAnimationFrame(()=>{if($('#entry')===entry&&document.activeElement===document.body)focusEntry();});}status();
}
function renderPreview(){if(!$('#preview'))return;try{let expr=state.expr;if(!expr){$('#preview').innerHTML='';return;}$('#preview').innerHTML=texRender(math.parse(normalize(expr)).toTex({parenthesis:'auto',implicit:'hide'}));}catch{$('#preview').textContent='';}}
function renderAnswer(){const el=$('#answer');if(!el)return;el.classList.remove('error');if(state.error){el.textContent=state.error;el.classList.add('error');return;}el.innerHTML=state.hasAnswer?(state.eng!==null&&typeof state.answer==='number'?texRender(`${decimal(state.answer/10**state.eng)}\\times10^{${state.eng}}`):state.mode==='base'?esc(baseFormat(state.answer,state.base)):valueHTML(state.answer)):'';}
function focusEntry(){const el=$('#entry');if(el){el.focus();if(isMathInput(el))el.position=el.lastOffset;else el.setSelectionRange(el.value.length,el.value.length);}}
function historyStep(step){state.historyIndex=Math.max(0,Math.min(state.history.length-1,(state.historyIndex<0?state.history.length:state.historyIndex)+step));const h=state.history[state.historyIndex];if(h){state.expr=h.expr;state.latex=h.latex||expressionToLatex(h.expr);state.hasAnswer=false;state.error='';showCalc();}}
function remember(){state.undo.push(state.expr);if(state.undo.length>100)state.undo.shift();}
function insert(text,caret=null){
  let el=document.activeElement;
  if(!el?.matches('#screen input,#screen textarea,#screen math-field')){if(state.view!=='calc')showCalc();el=$('#entry');}
  if(!el)return;
  if(isMathInput(el)){
    if(el.id==='entry'&&state.hasAnswer){el.value=/^[+*/^-]/.test(text)?'\\mathrm{Ans}':'';state.hasAnswer=false;state.error='';}
    const latex=keyLatex[text]||(/^[A-Za-z]+\($/.test(text)?'\\operatorname{'+text.slice(0,-1)+'}\\left(#?\\right)':expressionToLatex(text));
    insertIntoMath(el,latex);return;
  }
  if(el.id==='entry'&&state.hasAnswer){el.value=/^[+*/^-]/.test(text)?'Ans':'';state.hasAnswer=false;state.error='';el.setSelectionRange(el.value.length,el.value.length);}
  if(el.id==='entry')remember();const start=el.selectionStart??el.value.length,end=el.selectionEnd??start;el.setRangeText(text,start,end,'end');if(caret!==null)el.setSelectionRange(start+caret,start+caret);el.focus();el.dispatchEvent(new Event('input',{bubbles:true}));
}
function setExpr(s){remember();state.expr=s;state.latex=expressionToLatex(s);state.hasAnswer=false;state.error='';state.pending=[];showCalc();}
function execute(){
  if(state.view==='menu'){chooseMode(state.selected);return;}if(state.view==='list'){rememberMenuSelection();state.list.items[state.selected]?.run();return;}if(state.view==='form'){formNext();return;}if(state.view==='result'){back();return;}
  try{
    if(isMathInput($('#entry'))){state.latex=$('#entry').value;state.expr=readInput($('#entry'),{mode:state.mode});}
    if(state.pending.length)state.expr=state.pending.shift();else {const chunks=state.expr.split(':').filter(Boolean);if(chunks.length>1){state.expr=chunks.shift();state.pending=chunks;}}
    assert(state.expr.trim(),'请输入算式');
    // Like a handheld calculator, complete trailing open parentheses at execution.
    if(state.mode!=='base'){let depth=0,quote='';for(const ch of state.expr){if(ch==='"'||ch==="'"){quote=quote===ch?'':quote||ch;}if(!quote){if(ch==='(')depth++;else if(ch===')')depth--;}}if(depth>0)state.expr+=')'.repeat(depth);}
    let v;if(state.mode==='base')v=baseCalculate(state.expr,state.base);else v=calc.evaluate(state.expr,extraScope(),state.mode==='complex');
    calc.vars.Ans=v;state.answer=v;state.hasAnswer=true;state.error='';state.eng=null;
    if(state.mode==='matrix')state.MatAns=v;if(state.mode==='vector')state.VctAns=v;
    state.history.push({expr:state.expr,latex:state.latex,answer:decimal(v),mode:state.mode});state.history=state.history.slice(-100);state.historyIndex=state.history.length;persist();showCalc();
  }catch(e){state.error=e.message||'数学错误';state.hasAnswer=false;renderAnswer();}
}
function rememberMenuSelection(){if(state.view==='list'&&state.list)state.menuSelections[`${state.mode}:${state.list.title}`]=state.selected;}
function push(){rememberMenuSelection();if(state.view==='form'&&$('#parameters')){const values=formValues();state.form.fields.forEach(f=>f.value=values[f.name]);}state.stack.push({view:state.view,form:state.form,list:state.list,selected:state.selected});if(state.stack.length>20)state.stack.shift();}
function back(){state.error='';const prev=state.stack.pop();if(!prev){showCalc();return;}if(prev.view==='list')list(prev.list.title,prev.list.items,false,prev.selected);else if(prev.view==='menu')menu(false,prev.selected);else if(prev.view==='form')form(prev.form.title,prev.form.fields,prev.form.submit,false,prev.form.layout);else showCalc();}
function menu(save=true,selected=null){if(save)push();selected??=Math.max(0,modes.findIndex(m=>m[3]===state.mode));state.view='menu';state.selected=selected;state.list=null;state.form=null;$('#screen').innerHTML=`<div class="mode-grid">${modes.map((m,i)=>`<button class="mode-tile ${i===selected?'selected':''}" data-mode="${i}"><span class="symbol">${esc(m[2])}</span><span><small>${m[1]}</small> ${m[0]}</span></button>`).join('')}</div>`;highlight();}
function chooseMode(index){state.selected=index;state.mode=modes[index][3];state.stack=[];state.hasAnswer=false;state.error='';state.expr='';state.latex='';status();if(['calc','complex'].includes(state.mode))showCalc();else modeOptions();}
function list(title,items,save=true,selected=null){if(save)push();selected??=state.menuSelections[`${state.mode}:${title}`]??0;selected=Math.max(0,Math.min(items.length-1,selected));state.view='list';state.list={title,items};state.form=null;state.selected=selected;$('#screen').innerHTML=`<div class="screen-heading">${esc(title)}<span class="screen-hint">↑↓ = · Esc 返回</span></div><div>${items.map((item,i)=>`<button class="list-item ${i===selected?'selected':''}" data-list="${i}"><span class="idx">${i<9?i+1:''}</span>${esc(item.label)}${item.formula?`<span class="menu-formula">${texRender(item.formula)}</span>`:''}</button>`).join('')}</div>`;highlight();}
function highlight(){rememberMenuSelection();const sel=state.view==='menu'?'.mode-tile':'.list-item';document.querySelectorAll(sel).forEach((el,i)=>el.classList.toggle('selected',i===state.selected));$('#screen .selected')?.scrollIntoView({block:'nearest'});}
function form(title,fields,submit,save=true,layout=null){
  if(save)push();state.view='form';state.form={title,fields,submit,layout};state.list=null;
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
function formValues(strict=false){const out={};state.form.fields.forEach((f,i)=>{const el=$('#param-'+i);if(isMathInput(el))f.latex=el.value;try{out[f.name]=readInput(el,f.context||{});}catch(e){if(strict)throw e;out[f.name]='';}});return out;}
function formNext(){const els=formControls(),index=els.indexOf(document.activeElement);if(state.form?.layout?.kind==='stats'&&document.activeElement.dataset.name?.startsWith('x')&&!document.activeElement.value){submitForm();return;}if(index>=0&&index<els.length-1)els[index+1].focus();else submitForm();}
function submitForm(){try{const values=formValues(true);for(const f of state.form.fields){if(!f.optional&&!f.options&&!String(values[f.name]??'').trim())throw new Error('请输入「'+f.label+'」');}state.form.fields.forEach(f=>f.value=values[f.name]);state.form.submit(values);persist();}catch(e){$('#form-error').textContent=e.message||'输入错误';}}

function result(title,rows){push();state.view='result';state.list=null;state.form=null;state.displayValues=rows.map(r=>r[1]);$('#screen').innerHTML=`<div class="screen-heading">${esc(title)}<span class="screen-hint">↑↓ 浏览 · Esc 返回</span></div><div class="result-list">${rows.map(([k,v],i)=>`<div class="result-row"><span>${esc(k)}</span><span data-result-number="${i}">${typeof v==='string'?esc(v):valueHTML(v)}</span></div>`).join('')}</div>`;$('#screen').focus();}
function matrixResult(title,v){push();state.view='result';state.list=null;state.form=null;state.displayValues=[v];$('#screen').innerHTML=`<div class="screen-heading">${esc(title)}</div><div class="result-block" data-result-number="0">${valueHTML(v)}</div>`;}
const number=v=>{const x=calc.evaluate(v,extraScope());assert(typeof x==='number','请输入实数');return x;};
const lines=v=>v.trim().split(/[\n;]+/).filter(s=>s.trim()).map(s=>s.trim().split(/[,，\s]+/).filter(Boolean).map(number));
const field=(name,label,value='',extras={})=>({name,label,value,...extras});
const item=(label,run,formula='')=>({label,run,formula});
const exprItem=(label,text,caret=null)=>item(label,()=>{showCalc();insert(text,caret);});

function modeOptions(){
  switch(state.mode){
    case 'base':list('基数 · 32 位',[[10,'十进制 DEC'],[16,'十六进制 HEX'],[2,'二进制 BIN'],[8,'八进制 OCT']].map(([b,label])=>item(label,()=>{state.base=b;showCalc();})).concat([item('逻辑运算',()=>list('逻辑运算',['AND','OR','XOR','XNOR','NOT','NEG'].map(f=>exprItem(f,`${f==='NOT'||f==='NEG'?'':' '}${f} `))))]));break;
    case 'equation':list('方程/函数',[item('联立方程（2–4 元）',()=>list('未知数个数',[2,3,4].map(n=>item(`${n} 元联立方程`,()=>systemForm(n))))),item('多项式方程（2–4 次）',()=>degreeMenu(false)),item('求解方程',()=>solveForm())]);break;
    case 'inequality':degreeMenu(true);break;
    case 'ratio':list('比例',[item('A : B = X : D',()=>ratioForm('left')),item('A : B = C : X',()=>ratioForm('right'))]);break;
    case 'table':tableForm();break;
    case 'stat':statOptions();break;
    case 'matrix':matrixOptions();break;
    case 'vector':vectorOptions();break;
    default:functions();
  }
}
function degreeMenu(ineq){list(ineq?'不等式次数':'多项式次数',[2,3,4].map(n=>item(`${n} 次`,()=>polynomialForm(n,ineq))));}
function polynomialForm(n,ineq){const fields=Array.from({length:n+1},(_,i)=>field(String.fromCharCode(97+i),`${String.fromCharCode(97+i)} · x^${n-i}`));if(ineq)fields.unshift(field('op','符号','>',{options:[['>','> 0'],['<','< 0'],['>=','≥ 0'],['<=','≤ 0']]}));form(ineq?`${n} 次不等式`:`${n} 次方程`,fields,v=>{const c=Array.from({length:n+1},(_,i)=>number(v[String.fromCharCode(97+i)]));assert(c[0]!==0,'最高次系数不能为零');if(ineq)result('解集',[['S',inequality(c,v.op)]]);else result('方程的根',polynomialRoots(c).map((r,i)=>[`x${i+1}`,r]));},true,{kind:'polynomial',inequality:ineq});}
function systemForm(n){
  const fields=Array.from({length:n},(_,r)=>Array.from({length:n+1},(_,c)=>field('c'+r+'_'+c,'第 '+(r+1)+' 行'))).flat();
  form(n+' 元方程 · 系数与常数',fields,v=>{const rows=Array.from({length:n},(_,r)=>Array.from({length:n+1},(_,c)=>number(v['c'+r+'_'+c])));result('联立方程解',linearSystem(rows).map((x,i)=>[['x','y','z','t'][i],x]));},true,{kind:'system',rows:n});
}
function ratioForm(type){form(type==='left'?'A : B = X : D':'A : B = C : X',[field('a','A'),field('b','B'),field('c',type==='left'?'D':'C')],v=>result('比例结果',[['X',ratio(type,number(v.a),number(v.b),number(v.c))]]),true,{kind:'ratio',type});}
function tableForm(){form('函数表格',[field('f','f(x)'),field('g','g(x)（可空）','',{optional:true}),field('start','起始值'),field('end','终止值'),field('step','步长')],v=>{const rows=table(calc,v.f,v.g,number(v.start),number(v.end),number(v.step));push();state.view='result';state.form=null;$('#screen').innerHTML=`<div class="screen-heading">函数表格<span class="screen-hint">${rows.length} 行 · ↑↓</span></div><table class="data-table"><thead><tr>${['x','f(x)',...(v.g.trim()?['g(x)']:[])].map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(x=>`<td>${esc(decimal(x))}</td>`).join('')}</tr>`).join('')}</tbody></table>`;});}
function solveForm(){form('求解方程',[field('expr','方程'),field('guess','x 初始值')],v=>{const x=calc.solve(v.expr,number(v.guess),extraScope());calc.vars.x=x;result('求解结果',[['x',x],['L−R',calc.evaluate(v.expr.includes('=')?v.expr.split('=').map(s=>`(${s})`).join('-'):v.expr,{...extraScope(),x})]]);},true,'solve');}
function calcForm(){if(isMathInput($('#entry'))){state.latex=$('#entry').value;state.expr=readInput($('#entry'),{mode:state.mode});}const expr=state.expr;let symbols=[];try{math.parse(normalize(expr)).traverse(n=>{if(n.isSymbolNode&&n.name in calc.vars&&n.name!=='Ans')symbols.push(n.name);});}catch{}symbols=[...new Set(symbols)];if(!symbols.length){execute();return;}form('代入计算',symbols.map(k=>field(k,k)),v=>{for(const k of symbols)calc.vars[k]=number(v[k]);state.answer=calc.evaluate(expr,extraScope(),state.mode==='complex');calc.vars.Ans=state.answer;state.hasAnswer=true;state.expr=expr;state.stack=[];showCalc();});}
function calculus(type){const configs={integral:['定积分',[field('expr','f(x)'),field('a','下限'),field('b','上限')],v=>calc.integrate(v.expr,number(v.a),number(v.b))],derivative:['数值微分',[field('expr','f(x)'),field('x','x')],v=>calc.differentiate(v.expr,number(v.x))],sigma:['求和 Σ',[field('expr','f(x)'),field('a','起始整数'),field('b','终止整数')],v=>calc.sequence(v.expr,number(v.a),number(v.b))],product:['求积 Π',[field('expr','f(x)'),field('a','起始整数'),field('b','终止整数')],v=>calc.sequence(v.expr,number(v.a),number(v.b),true)]};const [title,fields,fn]=configs[type];form(title,fields,v=>{const a=fn(v);calc.vars.Ans=a;state.answer=a;state.hasAnswer=true;result(title,[['结果',a]]);},true,type);}
const statModels=[['single','1 变量'],['linear','y = a + bx'],['quadratic','y = a + bx + cx²'],['log','y = a + b ln(x)'],['exp','y = a·e^(bx)'],['abexp','y = a·b^x'],['power','y = a·x^b'],['inverse','y = a + b/x']];
function statOptions(){list('统计',[
 item('输入数据 / 计算统计量',()=>statDataForm()),
 item('查看统计结果',()=>{assert(state.statResult,'请先输入数据');result('统计结果',Object.entries(state.statResult));}),
 item('回归预测',()=>form('回归预测',[field('x','x')],v=>{const q=state.statResult;assert(q&&'a'in q,'请先完成回归');const x=number(v.x),m=state.regression,y=m==='quadratic'?q.a+q.b*x+q.c*x*x:m==='log'?q.a+q.b*Math.log(x):m==='exp'?q.a*Math.exp(q.b*x):m==='abexp'?q.a*q.b**x:m==='power'?q.a*x**q.b:m==='inverse'?q.a+q.b/x:q.a+q.b*x;assert(Number.isFinite(y));result('回归预测',[['ŷ',y]]);} ))
]);}
function statDataForm(rows=6,snapshot=null,save=true,frequency=false){
  const fields=[field('model','类型',state.regression,{options:statModels}),...Array.from({length:rows},(_,r)=>['x','y','f'].map(k=>field(k+r,k==='f'?'频数':k,'',{optional:true}))).flat()];
  if(snapshot)for(const f of fields)if(snapshot[f.name])Object.assign(f,snapshot[f.name]);
  form('统计数据',fields,v=>{const data=[];for(let r=0;r<rows;r++){
    if(!v['x'+r]&&!v['y'+r]&&!v['f'+r])continue;
    assert(v['x'+r]&&(v.model==='single'||v['y'+r]),'请填写完整数据行');
    data.push([number(v['x'+r]),v.model==='single'?0:number(v['y'+r]),v['f'+r]?number(v['f'+r]):1]);
  }const out=statistics(data,v.model);state.regression=v.model;state.statResult=out;result('统计结果',Object.entries(out).map(([k,x])=>[k,Number.isNaN(x)?'—':x]));},save,{kind:'stats',rows,frequency});
}
function refreshStatColumns(){if(state.form?.layout?.kind!=='stats')return;const paired=$('#param-0').value!=='single',frequency=$('#frequency-toggle').checked;state.form.layout.frequency=frequency;document.querySelectorAll('[data-stat-y]').forEach(el=>el.classList.toggle('unused',!paired));document.querySelectorAll('[data-stat-f]').forEach(el=>el.classList.toggle('unused',!frequency));}
function resizeStatRows(delta){if(state.form?.layout?.kind!=='stats')return;formValues();const snapshot=Object.fromEntries(state.form.fields.map(f=>[f.name,{...f}]));snapshot.model.value=$('#param-0').value;statDataForm(Math.max(1,Math.min(100,state.form.layout.rows+delta)),snapshot,false,state.form.layout.frequency);}

function matrixForm(name,rows,cols){
  const fields=Array.from({length:rows},(_,r)=>Array.from({length:cols},(_,c)=>field('c'+r+'_'+c,'第 '+(r+1)+' 行'))).flat();
  form('矩阵 '+name.at(-1),fields,v=>{state.matrices[name]=Array.from({length:rows},(_,r)=>Array.from({length:cols},(_,c)=>number(v['c'+r+'_'+c])));showCalc();insert(name);},true,{kind:'matrix',rows,cols,symbol:name.at(-1)});
}
function matrixDimensions(name){list('矩阵行数',[1,2,3,4].map(rows=>item(rows+' 行',()=>list('矩阵列数',[1,2,3,4].map(cols=>item(cols+' 列',()=>matrixForm(name,rows,cols)))))));}
function mathTemplate(label,latex){return item(label,()=>{showCalc();insertIntoMath($('#entry'),latex);},latex.replaceAll('#?',String.raw`\square`));}
function operationForm(title,fn,scope,binary=false,notation=''){
  const fields=[field('a',scope==='matrix'?'矩阵':'向量','',{context:{mode:scope}}),...(binary?[field('b','向量','',{context:{mode:scope}})]:[])];
  form(title,fields,v=>{const expression=fn+'('+v.a+(binary?','+v.b:'')+')',value=calc.evaluate(expression,extraScope());state.answer=value;state.hasAnswer=true;calc.vars.Ans=value;if(scope==='matrix')state.MatAns=value;else state.VctAns=value;matrixResult(title,value);},true,binary?{kind:'binary',notation}:{kind:'unary'});
}
function matrixOptions(){list('矩阵',[
 item('定义 / 编辑矩阵',()=>list('矩阵变量',['MatA','MatB','MatC','MatD'].map(name=>item('矩阵 '+name.at(-1),()=>matrixDimensions(name))))),
 item('矩阵运算',()=>showCalc()),
 ...['MatA','MatB','MatC','MatD'].map(name=>item('矩阵 '+name.at(-1),()=>{showCalc();insert(name);})),
 mathTemplate('行列式',String.raw`\left|#?\right|`),mathTemplate('逆矩阵','{#?}^{-1}'),mathTemplate('转置矩阵',String.raw`{#?}^{\mathsf{T}}`),
 item('简化行阶梯形',()=>operationForm('简化行阶梯形','rref','matrix')),
 item('单位矩阵',()=>form('单位矩阵',[field('n','阶数')],v=>matrixResult('单位矩阵',extraScope().identity(number(v.n)))))
]);}
function vectorForm(name,n){form('向量 '+name.at(-1),Array.from({length:n},(_,i)=>field('c'+i,['x','y','z'][i])),v=>{state.vectors[name]=Array.from({length:n},(_,i)=>number(v['c'+i]));showCalc();insert(name);},true,{kind:'vector',rows:1,cols:n,symbol:name.at(-1)});}
function vectorOptions(){list('向量',[
 item('定义 / 编辑向量',()=>list('向量变量',['VctA','VctB','VctC','VctD'].map(name=>item('向量 '+name.at(-1),()=>list('向量维数',[2,3].map(n=>item(n+' 维',()=>vectorForm(name,n)))))))),
 item('向量运算',()=>showCalc()),...['VctA','VctB','VctC','VctD'].map(name=>item('向量 '+name.at(-1),()=>{showCalc();insert(name);})),
 item('数量积',()=>operationForm('数量积','dot','vector',true,'dot')),item('向量积',()=>operationForm('向量积','cross','vector',true,'cross')),
 item('向量的模',()=>operationForm('向量的模','norm','vector')),item('向量夹角',()=>operationForm('向量夹角','angleBetween','vector',true,'angle')),
 item('单位向量',()=>operationForm('单位向量','unitVector','vector'))
]);}

function functions(){list('函数目录',[
 item('三角 / 双曲函数',()=>list('三角与双曲',['sin','cos','tan','asin','acos','atan','sinh','cosh','tanh','asinh','acosh','atanh'].map(f=>exprItem(f,`${f}(`)))),
 item('数值积分 / 微分 / Σ / Π',()=>list('微积分',[item('定积分',()=>calculus('integral'),String.raw`int_{square}^{square}square,dx`),item('微分',()=>calculus('derivative'),String.raw`left.rac{d}{dx}squareight|_{x=square}`),item('求和',()=>calculus('sigma'),String.raw`sum_{x=square}^{square}square`),item('求积',()=>calculus('product'),String.raw`prod_{x=square}^{square}square`)])),
 item('整数 / 随机 / 排列组合',()=>list('整数与组合',[exprItem('绝对值','abs('),exprItem('阶乘','!'),item('排列',()=>binaryForm('nPr')),item('组合',()=>binaryForm('nCr')),item('最大公约数',()=>binaryForm('gcd')),item('最小公倍数',()=>binaryForm('lcm')),item('整数部分',()=>scalarForm('整数部分','Int')),item('向下取整',()=>scalarForm('向下取整','Intg')),item('四舍五入',()=>scalarForm('四舍五入','Rnd')),item('随机数',()=>{showCalc();insert(String(Math.random()));}),item('随机整数',()=>binaryForm('RanInt')),item('素因子分解',factor)])),
 item('坐标 / 角度 / 度分秒',()=>list('坐标与角度',[item('直角坐标转极坐标',()=>binaryForm('Pol')),item('极坐标转直角坐标',()=>binaryForm('Rec')),item('输入度分秒',dmsForm),item('结果 → 度分秒',showDms),item('按度输入',()=>scalarForm('按度输入','deg')),item('按弧度输入',()=>scalarForm('按弧度输入','rad')),item('按梯度输入',()=>scalarForm('按梯度输入','gra'))])),
 item('科学常数',constantMenu),item('公制换算',conversionMenu),item('变量 / 存储器',variableMenu),item('计算历史',historyMenu),
 ...(state.mode==='complex'?[item('复数函数',()=>list('复数',[item('共轭复数',()=>scalarForm('共轭复数','conj')),exprItem('复数的模','abs('),item('辐角',()=>scalarForm('辐角','arg')),item('实部',()=>scalarForm('实部','re')),item('虚部',()=>scalarForm('虚部','im')),item('极坐标输入',()=>binaryForm('angle')),item('结果 → r∠θ',()=>{const a=state.hasAnswer?state.answer:calc.evaluate(state.expr,{},true);result('极坐标',[['r',math.abs(a)],['θ',math.arg(a)/calc.factor()]]);})]))]:[])
 ]);}
function binaryForm(fn){
 const titles={Pol:'直角坐标转极坐标',Rec:'极坐标转直角坐标',angle:'极坐标输入',RanInt:'随机整数',nPr:'排列',nCr:'组合',gcd:'最大公约数',lcm:'最小公倍数'};
 const labels={Pol:['x','y'],Rec:['r','θ'],angle:['r','θ'],RanInt:['下限','上限'],nPr:['n','r'],nCr:['n','r']}[fn]||['a','b'];
 form(titles[fn]||fn,[field('a',labels[0]),field('b',labels[1])],v=>{const value=calc.evaluate(fn+'('+number(v.a)+','+number(v.b)+')',extraScope(),state.mode==='complex');calc.vars.Ans=value;state.answer=value;state.hasAnswer=true;result(titles[fn]||fn,[['结果',value]]);},true,{kind:'binary',notation:fn==='nPr'?'perm':fn==='nCr'?'comb':''});
}
function scalarForm(title,fn){form(title,[field('a','x')],v=>{const value=calc.evaluate(fn+'('+v.a+')',extraScope(),state.mode==='complex');state.answer=value;state.hasAnswer=true;calc.vars.Ans=value;result(title,[['结果',value]]);},true,{kind:'unary'});}
function dmsForm(){form('度分秒输入',[field('d','度'),field('m','分'),field('s','秒')],v=>{const d=number(v.d),m=number(v.m),sec=number(v.s);assert(m>=0&&m<60&&sec>=0&&sec<60,'分、秒须在 0–60 之间');const value=calc.evaluate('dms('+d+','+m+','+sec+')');state.answer=value;state.hasAnswer=true;calc.vars.Ans=value;result('度分秒',[['角度',d+'° '+m+'′ '+sec+'″'],['结果',value]]);},true,'dms');}
function showDms(){const x=state.hasAnswer?state.answer:number(state.expr);assert(typeof x==='number');const a=Math.abs(x),d=Math.floor(a),m=Math.floor((a-d)*60),s=Number(((a-d-m/60)*3600).toFixed(6));result('度分秒',[['结果',`${x<0?'−':''}${d}° ${m}′ ${s}″`]]);}
function factor(){const v=state.hasAnswer?state.answer:number(state.expr);const tex=factorize(v).map(([p,k])=>k===1?String(p):`${p}^{${k}}`).join(String.raw`\times`)||'1';result('素因子分解',[[String(v),{tex}]]);}
function variableMenu(){list('变量 / 存储器',[item('STO · 存储结果',storeMenu),item('RCL · 调用变量',()=>recallMenu()),item('变量列表',()=>result('变量',Object.entries(calc.vars).map(([k,v])=>[k,v])))]);}
function storeMenu(){const v=state.hasAnswer?state.answer:number(state.expr);list('STO → 变量',['A','B','C','D','E','F','x','y','z','M'].map(k=>item(`${k} = ${decimal(calc.vars[k])}`,()=>{calc.vars[k]=v;persist();showCalc();status();})));}
function recallMenu(){list('RCL · 变量',['A','B','C','D','E','F','x','y','z','M','Ans'].map(k=>exprItem(`${k} = ${decimal(calc.vars[k])}`,k)));}
function constantMenu(){list('科学常数',constants.map(([symbol,name,value,unit])=>item(`${symbol} · ${name} ${unit}`,()=>{showCalc();insert(`(${value})`);})));}
function conversionMenu(){list('公制换算',conversions.map(c=>item(c.label,()=>form(c.label,[field('value',c.from)],v=>{const x=c.convert(number(v.value));assert(Number.isFinite(x));state.answer=x;state.hasAnswer=true;calc.vars.Ans=x;result(c.label,[[c.to,x]]);} ))));}
function historyMenu(){list('计算历史',state.history.slice().reverse().map(h=>item(`${h.expr} = ${h.answer}`,()=>{state.mode=h.mode;setExpr(h.expr);})));}
function setup(){list('设置',[item('角度单位',()=>list('角度单位',['Deg','Rad','Gra'].map((a,i)=>item(['度（D）','弧度（R）','梯度（G）'][i],()=>{calc.angle=a;persist();status();showCalc();})))),item('输入/输出',()=>list('输出格式',[item('数学结果（分数 / 根式）',()=>{state.decimal=false;persist();showCalc();}),item('小数结果',()=>{state.decimal=true;persist();showCalc();})])),item('显示格式',()=>list('显示格式',[item('Norm',()=>{state.format='Norm';persist();showCalc();}),...['Fix','Sci'].map(f=>item(f,()=>form(f,[field('n',f==='Fix'?'小数位 0–9':'有效位 1–10')],v=>{const n=Number(v.n);assert(Number.isInteger(n)&&n>=(f==='Fix'?0:1)&&n<=(f==='Fix'?9:10),'位数超出范围');state.format=f;state.digits=n;persist();showCalc();})))])),item('语言 / Language',languageMenu),item('展开 / 收起屏幕',toggleExpand),item('复位',resetMenu)]);}
function resetMenu(){list('复位',[item('清除变量',()=>{for(const k in calc.vars)calc.vars[k]=0;persist();state.hasAnswer=false;showCalc();}),item('恢复设置',()=>{calc.angle='Deg';state.decimal=false;state.format='Norm';persist();showCalc();}),item('全部初始化',()=>list('全部初始化？',[item('是 · 清除本软件数据',()=>{localStorage.removeItem('cnx-v1');location.reload();}),item('取消',back)]))]);}
function toggleExpand(){document.body.classList.toggle('expanded');}
function navigate(action){
 if(state.view==='menu'||state.view==='list'){const len=state.view==='menu'?10:state.list.items.length;if(!len)return;const step=state.view==='menu'?(action==='up'?-3:action==='down'?3:action==='left'?-1:1):(action==='up'||action==='left'?-1:1);state.selected=(state.selected+step+len)%len;highlight();return;}
 if(state.view==='result'){$('#screen').scrollBy({top:action==='up'?-35:action==='down'?35:0,left:action==='left'?-50:action==='right'?50:0});return;}
 const el=document.activeElement;
 if(isMathInput(el)){el.executeCommand({up:'moveUp',down:'moveDown',left:'moveLeft',right:'moveRight'}[action]);return;}
 if(state.view==='form'){const els=formControls(),i=els.indexOf(el);if(action==='up'||action==='down')els[Math.max(0,Math.min(els.length-1,i+(action==='up'?-1:1)))]?.focus();return;}
 if(action==='up'||action==='down'){state.historyIndex=Math.max(0,Math.min(state.history.length-1,(state.historyIndex<0?state.history.length:state.historyIndex)+(action==='up'?-1:1)));const h=state.history[state.historyIndex];if(h){state.expr=h.expr;state.hasAnswer=false;state.error='';showCalc();}}
 else if(el?.id==='entry'){const pos=Math.max(0,Math.min(el.value.length,el.selectionStart+(action==='left'?-1:1)));el.setSelectionRange(pos,pos);}
}
function dispatch(action){
  try{
  if(state.off&&action!=='on')return;
  if(action==='shift'){state.shift=!state.shift;state.alpha=false;status();return;}
  if(action==='alpha'){state.alpha=!state.alpha;state.shift=false;status();return;}
  switch(action){
    case 'language':languageMenu();break;case 'menu':menu();break;case 'setup':setup();break;case 'help':$('#help').showModal();break;case 'options':modeOptions();break;
    case 'clear':if(state.view!=='calc'){state.stack=[];showCalc();}else setExpr('');break;
    case 'delete':{const el=document.activeElement;if(isMathInput(el)){el.executeCommand('deleteBackward');el.dispatchEvent(new Event('input',{bubbles:true}));break;}if(el?.matches('#screen input,#screen textarea')){if(el.id==='entry')remember();let a=el.selectionStart,b=el.selectionEnd;if(a===b)a=Math.max(0,a-1);el.setRangeText('',a,b,'end');el.dispatchEvent(new Event('input',{bubbles:true}));}break;}
    case 'insert':state.overwrite=!state.overwrite;$('#format-ind').textContent=state.overwrite?'OVR':'INS';break;
    case 'on':state.off=false;status();showCalc();break;case 'off':state.off=true;persist();status();break;
    case 'execute':execute();break;case 'approx':state.decimal=true;execute();break;
    case 'up':case 'down':case 'left':case 'right':navigate(action);break;
    case 'sd':state.decimal=!state.decimal;state.eng=null;persist();renderAnswer();document.querySelectorAll('[data-result-number]').forEach(el=>{const v=state.displayValues[Number(el.dataset.resultNumber)];el.innerHTML=typeof v==='string'?esc(v):valueHTML(v);});status();break;
    case 'mixed':{if(!state.hasAnswer){insert('mixed');break;}const v=state.answer;assert(typeof v==='number');const w=Math.floor(Math.abs(v)),f=Math.abs(v)-w,part=exactTex(f);const tex=f&&part.startsWith('\\frac')?`${v<0?'-':''}${w||''}${part}`:exactTex(v);result('带分数',[['结果',{tex}]]);break;}
    case 'eng':case 'engback':assert(typeof state.answer==='number'&&state.hasAnswer);state.eng=(state.eng===null?(state.answer===0?0:Math.floor(Math.log10(Math.abs(state.answer))/3)*3):state.eng)+(action==='engback'?3:state.eng===null?0:-3);renderAnswer();break;
    case 'calc':calcForm();break;case 'solve':solveForm();break;
    case 'integral':case 'derivative':case 'sigma':case 'product':calculus(action);break;
    case 'constants':constantMenu();break;case 'conversions':conversionMenu();break;case 'reset':resetMenu();break;
    case 'store':storeMenu();break;case 'recall':recallMenu();break;
    case 'mplus':case 'mminus':{const v=state.hasAnswer?state.answer:number(state.expr);assert(typeof v==='number');calc.vars.M+=(action==='mplus'?1:-1)*v;persist();status();break;}
    case 'Ran()':insert(String(Math.random()));break;case 'Rnd(':scalarForm('四舍五入','Rnd');break;case 'factor':factor();break;case 'dms':dmsForm();break;case 'perm':binaryForm('nPr');break;case 'comb':binaryForm('nCr');break;case 'pol':binaryForm('Pol');break;case 'rec':binaryForm('Rec');break;case 'ranint':binaryForm('RanInt');break;
    case 'frac':insert('frac');break;case 'root':insert('root');break;
    default:insert(action);
  }
  }catch(e){if(state.view==='calc'){state.error=e.message;renderAnswer();}else{const error=$('#form-error');if(error)error.textContent=e.message;else result('错误',[['提示',e.message]]);}}
}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.gridAction){resizeStatRows(b.dataset.gridAction==='add'?1:-1);return;}if(b.dataset.mode!==undefined){chooseMode(Number(b.dataset.mode));return;}if(b.dataset.list!==undefined){state.selected=Number(b.dataset.list);execute();return;}if(b.dataset.action){const a=state.shift&&b.dataset.shift?b.dataset.shift:state.alpha&&b.dataset.alpha?b.dataset.alpha:b.dataset.action;if(!['shift','alpha'].includes(a)){state.shift=false;state.alpha=false;status();}dispatch(a);}});
// Keep the caret when clicking calculator keys, while Tab still reaches every key.
document.addEventListener('pointerdown',e=>{if(e.target.closest('[data-action]'))e.preventDefault();});
document.addEventListener('input',e=>{if(e.target.id==='entry'&&!isMathInput(e.target)){state.expr=e.target.value;state.hasAnswer=false;state.error='';state.eng=null;renderPreview();renderAnswer();}});
$('#help-close').onclick=()=>$('#help').close();
window.addEventListener('keydown',e=>{
  if($('#help').open)return;
  if(e.isComposing)return;
  const mathTarget=isMathInput(document.activeElement);
  const equationInput=state.form?.layout==='solve'&&document.activeElement.dataset.name==='expr';
  if(document.activeElement.tagName==='BUTTON'&&e.key===' ')return;
  if(mathTarget&&(/^F\d+$/.test(e.key)||['Home','Enter','Escape'].includes(e.key)||(e.key==='='&&!equationInput)||(e.shiftKey&&e.key==='Delete')))e.stopImmediatePropagation();
  if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();e.stopImmediatePropagation();if(state.view==='form')submitForm();else execute();return;}
  if(mathTarget&&(e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='c'&&state.hasAnswer&&state.view==='calc'){const ranges=$('#entry').selection.ranges;if(ranges.every(([a,b])=>a===b)){e.preventDefault();e.stopImmediatePropagation();navigator.clipboard.writeText(formatted(state.answer)).catch(()=>{});return;}}
  if(mathTarget&&(e.ctrlKey||e.metaKey))return;
  if(e.ctrlKey||e.metaKey){if(e.key.toLowerCase()==='z'&&state.view==='calc'){e.preventDefault();const v=state.undo.pop();if(v!==undefined){state.expr=v;state.hasAnswer=false;state.error='';showCalc();}}if(e.key.toLowerCase()==='c'&&state.hasAnswer&&!window.getSelection()?.toString()&&!$('#entry')?.value.substring($('#entry').selectionStart,$('#entry').selectionEnd)){e.preventDefault();navigator.clipboard.writeText(formatted(state.answer)).catch(()=>{});}return;}
  const fn={F1:'help',F2:'shift',F3:'alpha',F4:state.shift?'setup':'menu',Home:'menu',F5:'options',F6:e.shiftKey||state.shift?'solve':'calc',F7:'constants',F8:'conversions',F9:e.shiftKey||state.shift?'mixed':'sd',F11:'setup',Insert:'insert'};
  if(e.key==='F12'){e.preventDefault();setLanguage(state.language==='en'?'zh':'en');return;}if(e.key==='F10'){e.preventDefault();toggleExpand();return;}if(fn[e.key]){e.preventDefault();const action=fn[e.key];if(!['shift','alpha'].includes(action)){state.shift=false;state.alpha=false;status();}dispatch(action);return;}
  if(e.shiftKey&&e.key==='Delete'){e.preventDefault();dispatch('clear');return;}
  if(e.key==='Escape'){e.preventDefault();state.shift=false;state.alpha=false;status();if(state.view==='calc'){if(state.error){state.error='';renderAnswer();}else dispatch('clear');}else back();return;}
  if(e.key==='Enter'&&e.shiftKey&&document.activeElement.tagName==='TEXTAREA')return;
  if(e.key==='Enter'||e.key==='='&&!equationInput){e.preventDefault();dispatch('execute');return;}
  if((state.view==='menu'||state.view==='list')&&/^\d$/.test(e.key)){e.preventDefault();if(state.view==='menu')chooseMode(e.key==='0'?9:Number(e.key)-1);else{const i=Number(e.key)-1;if(i>=0&&i<Math.min(9,state.list.items.length)){state.selected=i;execute();}}return;}
  if(state.view==='form'&&document.activeElement.tagName==='SELECT'&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))return;
  if(mathTarget&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))return;
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){if(state.view==='form'&&['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();dispatch(e.key.replace('Arrow','').toLowerCase());return;}
  if(state.shift||state.alpha){const match=[...scienceKeys,...digitKeys].find(k=>k[0].toLowerCase()===e.key.toLowerCase()||k[1]===e.key);if(match){e.preventDefault();const a=state.shift?match[3]:match[5];state.shift=false;state.alpha=false;status();if(a)dispatch(a);return;}}
  if(state.off){if(e.key==='o'){e.preventDefault();dispatch('on');}return;}
  if(mathTarget){if(state.view==='calc'&&state.hasAnswer&&e.key.length===1&&!e.altKey){const mf=$('#entry');mf.value=/^[+*/^-]/.test(e.key)?'\\mathrm{Ans}':'';mf.position=mf.lastOffset;state.hasAnswer=false;state.error='';renderAnswer();}return;}
  if(state.view==='calc'&&e.key.length===1&&!e.altKey){
    if(document.activeElement.id!=='entry'){e.preventDefault();insert(e.key);return;}
    if(state.hasAnswer){e.preventDefault();insert(e.key);return;}
    if(state.overwrite&&document.activeElement.selectionStart===document.activeElement.selectionEnd&&document.activeElement.selectionStart<document.activeElement.value.length){e.preventDefault();const el=document.activeElement;el.setSelectionRange(el.selectionStart,el.selectionEnd+1);insert(e.key);}else remember();
  }
},true);
window.addEventListener('beforeunload',persist);
// Expose no privileged bridge: UI tests exercise the same unprivileged DOM.
showCalc();
