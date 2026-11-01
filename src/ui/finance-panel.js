import {simpleInterest,solveTVM,investment,amortization,convertInterest,costSellMargin,dateDays,dateAdd,depreciation,bond,bondYield,breakEven} from '../engine/finance.js';
import {createCGFinancialScope,snapshotCGFinancialNative} from '../engine/cg-financial-functions.js';
import './cg-app-panels.css';

const num=(key,label,value)=>({key,label,value});
const select=(key,label,value,options)=>({key,label,value,options});
const text=(key,label,value)=>({key,label,value,text:true});
const sections={
  simple:{name:'Simple interest / 单利',fields:[num('n','Days / 天数',365),num('rate','I% / 年利率',5),num('pv','PV / 现值',-1000),select('days','Date mode / 年基数','365',['365','360'])],calculate:p=>simpleInterest(p)},
  tvm:{name:'Compound / 复利 TVM',fields:[select('target','Solve / 求解','pmt',['pmt','pv','fv','n','rate']),num('n','n / 期数',360),num('rate','I% / 年利率',6),num('pv','PV / 现值',100000),num('pmt','PMT / 付款额',0),num('fv','FV / 终值',0),num('py','P/Y / 每年付款',12),num('cy','C/Y / 每年复利',12),select('payment','Payment / 付款时点','END',['END','BEGIN'])],calculate:p=>({[p.target.toUpperCase()]:solveTVM(p.target,{...p,begin:p.payment==='BEGIN'})})},
  cash:{name:'Cash flow / 现金流',fields:[num('rate','I% / 每期利率',10),text('flows','CF₀, CF₁, …','-10000,3000,4200,6800')],calculate:p=>investment({rate:p.rate,values:p.flows.split(/[,;\s]+/).filter(Boolean).map(x=>{const value=Number(x);if(!Number.isFinite(value))throw new Error('现金流须为数值');return value;})})},
  amort:{name:'Amortization / 摊销',fields:[num('n','n / 总期数',360),num('rate','I% / 年利率',6),num('pv','PV / 贷款现值',100000),num('pmt','PMT / 付款额',-599.5505251527569),num('py','P/Y / 每年付款',12),num('cy','C/Y / 每年复利',12),num('first','PM1 / 起始期',1),num('last','PM2 / 结束期',12),select('payment','Payment / 付款时点','END',['END','BEGIN'])],calculate:p=>amortization({...p,begin:p.payment==='BEGIN'})},
  convert:{name:'Conversion / 利率换算',fields:[select('target','Solve / 求解','effective',['effective','nominal']),num('rate','I% / 输入利率',12),num('n','n / 每年复利次数',12)],calculate:p=>({[p.target==='effective'?'EFF%':'APR%']:convertInterest(p)})},
  margin:{name:'Cost Sell Margin / 毛利',fields:[select('target','Solve / 求解','margin',['margin','cost','sell']),num('cost','Cost / 成本',80),num('sell','Sell / 售价',100),num('margin','Margin% / 毛利率',20)],calculate:p=>({[p.target.toUpperCase()]:costSellMargin(p.target,p)})},
  date:{name:'Days & dates / 日期',fields:[select('target','Solve / 求解','days',['days','end','start']),text('d1','d1 / 起始日期','2026-01-01'),text('d2','d2 / 结束日期','2027-01-01'),num('n','n / 加减天数',30),select('days','Date mode / 年基数','365',['365','360'])],calculate:p=>p.target==='days'?{DAYS:dateDays(p.d1,p.d2,+p.days)}:{DATE:dateAdd(p.target==='end'?p.d1:p.d2,p.target==='end'?p.n:-p.n)}},
  deprec:{name:'Depreciation / 折旧',fields:[select('method','Method / 方法','SL',['SL','FP','SYD','DB']),num('n','n / 使用年限',5),num('pv','PV / 原值',10000),num('fv','FV / 残值',1000),num('rate','I% / 折旧率或因子',200),num('months','Y−1 / 首年月份',12)],calculate:p=>({rows:depreciation(p)})},
  bond:{name:'Bond / 债券',fields:[select('target','Solve / 求解','price',['price','yield']),text('settlement','d1 / 交割日期','2026-01-01'),text('maturity','d2 / 到期日期','2031-01-01'),num('redemption','RDV / 赎回价格',100),num('coupon','CPN% / 票息率',5),num('yieldRate','YLD% / 收益率',6),num('price','PRC / 购债价格',-95.73489858161209),select('frequency','Periods/YR / 年票息','2',['1','2']),select('days','Date mode / 年基数','365',['365','360'])],calculate:p=>p.target==='price'?bond({...p,frequency:+p.frequency,days:+p.days}):{'YLD%':bondYield({...p,frequency:+p.frequency,days:+p.days},p.price)}},
  breakEven:{name:'Break-even / 盈亏平衡',fields:[num('fixed','Fixed / 固定成本',10000),num('price','Price / 销售单价',50),num('variable','Variable / 单位变动成本',30),num('profit','Profit / 目标利润',0)],calculate:p=>breakEven(p)},
};
const format=value=>typeof value==='number'?Number(value.toPrecision(11)).toString():String(value);
export function createFinancePanel({host,calculator,data={},onChange=()=>{},onBack=()=>{}}){
  const abort=new AbortController(),signal=abort.signal,en=document.documentElement.lang?.startsWith('en'),say=(zh,english)=>en?english:zh;
  data=data&&typeof data==='object'?data:{};
  let section=Object.hasOwn(sections,data.section)?data.section:'tvm',saved={},result=null,view='result',rendering=false;
  for(const [key,spec]of Object.entries(sections)){const values=data.values?.[key];if(values&&typeof values==='object')saved[key]=Object.fromEntries(spec.fields.filter(field=>Object.hasOwn(values,field.key)&&['string','number'].includes(typeof values[field.key])).map(field=>[field.key,String(values[field.key]).slice(0,10000)]));}
  host.innerHTML='<div class="cg-workbench cg-finance-panel"><div class="cg-toolbar"><strong>FINANCIAL</strong><select aria-label="Financial calculation" data-section></select></div><div class="cg-finance-form"></div><p class="cg-note">'+say('现金流：流入为正，流出为负。I% 输入百分数。','Cash inflow + / outflow −. Enter rates as percentages.')+'</p><div class="cg-error" role="alert"></div><div class="cg-result" aria-live="polite" data-user-content></div><div class="cg-softkeys"></div></div>';
  const selector=host.querySelector('[data-section]'),form=host.querySelector('.cg-finance-form'),output=host.querySelector('.cg-result'),error=host.querySelector('.cg-error');
  for(const [key,spec] of Object.entries(sections)){const o=document.createElement('option');o.value=key;o.textContent=en?spec.name.split(' / ')[0]:spec.name;selector.append(o);}selector.value=section;
  const labels=['CALC','EXAMPLE','TABLE','GRAPH','CLEAR','EXIT'];host.querySelector('.cg-softkeys').innerHTML=labels.map((label,i)=>'<button type="button" data-function="'+(i+1)+'">'+label+'</button>').join('');
  function shareNative(values){
    if(!calculator)return;const native=snapshotCGFinancialNative(calculator),settings={...native.settings};
    if(['365','360'].includes(values.days))settings.days=Number(values.days);
    if(['END','BEGIN'].includes(values.payment))settings.begin=values.payment==='BEGIN';
    if(['1','2'].includes(values.frequency))settings.frequency=Number(values.frequency);
    calculator.financialSettings=settings;
    if(['tvm','amort'].includes(section)){
      const memory={...native.memory};
      for(const key of ['n','rate','pv','pmt','fv','py','cy'])if(Object.hasOwn(values,key)&&String(values[key]).trim()!==''){
        const value=Number(values[key]);if(Number.isFinite(value)&&Math.abs(value)<1e100&&(!['py','cy'].includes(key)||value>0))memory[key]=value;
      }
      calculator.financialMemory=memory;
    }
  }
  function nativeValues(){
    if(!calculator)return {};const native=snapshotCGFinancialNative(calculator),values={};
    if(['simple','date','bond'].includes(section))values.days=String(native.settings.days);
    if(['tvm','amort'].includes(section)){values.payment=native.settings.begin?'BEGIN':'END';for(const [key,value]of Object.entries(native.memory))values[key]=String(value);}
    if(section==='bond')values.frequency=String(native.settings.frequency);
    return values;
  }
  function persist(){if(rendering)return;saved[section]=Object.fromEntries([...form.querySelectorAll('[data-value]')].map(el=>[el.dataset.value,el.value]));shareNative(saved[section]);onChange({section,values:structuredClone(saved)});}
  function renderForm(fromNative=true){
    rendering=true;
    if(fromNative)saved[section]={...saved[section],...nativeValues()};
    form.replaceChildren();for(const field of sections[section].fields){
      const row=document.createElement('label');row.className='cg-finance-field';const label=document.createElement('span');label.textContent=en?field.label.split(' / ')[0]:field.label;
      const input=document.createElement(field.options?'select':'input');input.dataset.value=field.key;input.setAttribute('aria-label',field.label);if(field.options)for(const value of field.options){const o=document.createElement('option');o.value=value;o.textContent=value;input.append(o);}else {input.type='text';input.inputMode=field.text?'text':'decimal';input.autocomplete='off';input.spellcheck=false;}
      input.value=String(saved[section]?.[field.key]??(field.options?field.value:''));input.addEventListener('input',()=>{persist();error.textContent='';},{signal});input.addEventListener('change',persist,{signal});row.append(label,input);form.append(row);
    }
    result=null;output.textContent='';error.textContent='';rendering=false;persist();
  }
  function parameters(){const p={},selected=form.querySelector('[data-value="target"]')?.value,method=form.querySelector('[data-value="method"]')?.value;for(const field of sections[section].fields){const value=form.querySelector('[data-value="'+field.key+'"]').value.trim();const unused=(['tvm','margin'].includes(section)&&field.key===selected)||(section==='date'&&field.key==='n'&&selected==='days')||(section==='bond'&&field.key===(selected==='price'?'price':'yieldRate'))||(section==='deprec'&&field.key==='rate'&&['SL','SYD'].includes(method));if(field.text||field.options)p[field.key]=value;else {if(!value&&!unused)throw new Error(say('请填写 '+field.label,'Enter '+field.key));p[field.key]=value?Number(value):0;if(!Number.isFinite(p[field.key]))throw new Error(say('请输入数值：'+field.label,'Invalid number: '+field.key));}}return p;}
  function showTable(rows){
    if(!rows?.length)return;const keys=Object.keys(rows[0]),table=document.createElement('table');table.className='cg-data-table';const head=document.createElement('tr');keys.forEach(key=>{const th=document.createElement('th');th.textContent=key;head.append(th);});table.append(head);for(const row of rows){const tr=document.createElement('tr');keys.forEach(key=>{const td=document.createElement('td');td.textContent=format(row[key]);tr.append(td);});table.append(tr);}output.append(table);
  }
  function chart(){
    const rows=result?.rows;let values=rows?.map(r=>r.DEP??r.BAL);if(!values&&section==='cash'){values=parameters().flows.split(/[,;\s]+/).filter(Boolean).map(Number);}if(!values)values=Object.values(result||{}).filter(x=>typeof x==='number');if(!values.length)return;
    values=values.filter(Number.isFinite);const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('cg-chart');svg.setAttribute('viewBox','0 0 300 110');svg.setAttribute('role','img');svg.setAttribute('aria-label',say('计算结果图表','Calculation result chart'));const max=Math.max(...values.map(Math.abs),1e-12),hasNegative=values.some(x=>x<0),zero=hasNegative?55:95,scale=(hasNegative?45:85)/max,w=280/values.length;
    const line=document.createElementNS(svg.namespaceURI,'line');for(const [k,v]of Object.entries({x1:10,y1:zero,x2:290,y2:zero,stroke:'#8a98ab'}))line.setAttribute(k,v);svg.append(line);
    values.forEach((value,i)=>{const rect=document.createElementNS(svg.namespaceURI,'rect');for(const [k,v]of Object.entries({x:10+i*w,y:value>=0?zero-value*scale:zero,width:Math.max(.5,w*.8),height:Math.max(.5,Math.abs(value)*scale),fill:value>=0?'#315ec4':'#ac3a34'}))rect.setAttribute(k,v);const title=document.createElementNS(svg.namespaceURI,'title');title.textContent=(i+1)+': '+format(value);rect.append(title);svg.append(rect);});output.append(svg);
  }
  function show(){
    output.replaceChildren();if(!result)return;
    const summary=Object.entries(result).filter(([key,value])=>key!=='rows'&&key!=='roots').map(([key,value])=>key+' = '+(value===null?say('无解 / 未收回','No solution / not recovered'):format(value))).join('\n');
    if(summary){const p=document.createElement('div');p.textContent=summary;output.append(p);}
    if(result.roots?.length>1){const note=document.createElement('div');note.textContent=say('多重 IRR：','Multiple IRRs: ')+result.roots.map(format).join(', ');output.append(note);}
    if(view==='graph')chart();else if(result.rows)showTable(result.rows);
    output.scrollIntoView({block:'nearest'});
  }
  function calculate(){try{persist();error.textContent='';const p=parameters();
    if(calculator&&section==='tvm'){
      const names={n:'Cmpd_n',rate:'Cmpd_I',pv:'Cmpd_PV',pmt:'Cmpd_PMT',fv:'Cmpd_FV'},keys={n:['rate','pv','pmt','fv'],rate:['n','pv','pmt','fv'],pv:['n','rate','pmt','fv'],pmt:['n','rate','pv','fv'],fv:['n','rate','pv','pmt']};
      const value=createCGFinancialScope(calculator)[names[p.target]](...keys[p.target].map(key=>p[key]),p.py,p.cy);result={[p.target.toUpperCase()]:value};
      form.querySelector('[data-value="'+p.target+'"]').value=String(value);persist();
    }else {if(section==='date'&&p.target!=='days'&&p.days==='360')throw new Error(say('360 日期模式不支持日期加减','Date offsets require365-day mode'));result=sections[section].calculate(p);}
    show();
  }catch(e){error.textContent=e.message;output.textContent='';}}
  function example(){saved[section]=Object.fromEntries(sections[section].fields.map(field=>[field.key,String(field.value)]));renderForm(false);}
  const functions=[calculate,example,()=>{view='result';if(!result)calculate();else show();},()=>{view='graph';if(!result)calculate();else show();},()=>{result=null;output.textContent='';error.textContent='';},()=>onBack()];
  selector.addEventListener('change',()=>{persist();section=selector.value;view='result';renderForm();},{signal});
  host.querySelector('.cg-softkeys').addEventListener('click',e=>{const b=e.target.closest('[data-function]');if(b)functions[+b.dataset.function-1]();},{signal});
  function insert(text){let field=document.activeElement;if(!form.contains(field)||field.tagName!=='INPUT')field=form.querySelector('input');if(!field)return false;field.focus();const a=field.selectionStart??field.value.length,b=field.selectionEnd??a;field.setRangeText(text,a,b,'end');persist();return true;}
  function handleAction(action){
    if(/^cg-f[1-6]$/.test(action)){functions[+action.slice(-1)-1]();return true;}
    if(action==='execute'||action==='approx'){calculate();return true;}
    if(action==='back'){persist();onBack();return true;}
    if(action==='up'||action==='down'){const fields=[selector,...form.querySelectorAll('input,select')],index=fields.indexOf(document.activeElement),target=fields[Math.max(0,Math.min(fields.length-1,index+(action==='up'?-1:1)))];target.focus();if(target.tagName==='INPUT')target.select();return true;}
    if(action==='clear'||action==='cg-clear-on'){const field=document.activeElement;if(form.contains(field)&&field.tagName==='INPUT'){field.value='';persist();}else {result=null;output.textContent='';error.textContent='';}return true;}
    if(action==='delete'){const field=document.activeElement;if(form.contains(field)&&field.tagName==='INPUT'){const a=field.selectionStart,b=field.selectionEnd;field.setRangeText('',a===b?Math.max(0,a-1):a,b,'end');persist();}return true;}
    if(/^[0-9.,-]$/.test(action)||action==='negative'){insert(action==='negative'?'-':action);return true;}return false;
  }
  function handleKey(e){if(e.key==='Escape'){handleAction('back');return true;}if(e.key==='Enter'){calculate();return true;}return false;}
  // Migrate only absent native TVM registers from an earlier simulator profile.
  // Existing native values always win over stale form snapshots after a program.
  if(calculator&&saved.tvm){const native=snapshotCGFinancialNative(calculator),memory={...native.memory};for(const key of ['n','rate','pv','pmt','fv','py','cy'])if(!Object.hasOwn(memory,key)&&String(saved.tvm[key]??'').trim()!==''){const value=Number(saved.tvm[key]);if(Number.isFinite(value)&&Math.abs(value)<1e100&&(!['py','cy'].includes(key)||value>0))memory[key]=value;}calculator.financialMemory=memory;}
  renderForm();return {handleAction,handleKey,insert,focus:()=>selector.focus(),destroy(){persist();abort.abort();}};
}
