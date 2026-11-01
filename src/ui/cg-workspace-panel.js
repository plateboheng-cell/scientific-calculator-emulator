import './cg-workspace.css';
import {CGSpreadsheet,CG_SHEET_CAPACITY,cgRange,shiftCGReferences,generateRecursion,graphTable,dynamicFrames,conicSamples} from '../engine/cg-workspace.js';
import {createCGShell,cgForm,cgValues,cgTable,drawCGPlot,downloadCGData,parseCGCSV,encodeCGCSV,esc} from './cg-ui.js';
import {decimal} from '../engine/calculator.js';
import {createCGSpreadsheetPanel} from './cg-spreadsheet-panel.js';

const titles={eactivity:'eActivity',spreadsheet:'Spreadsheet',dynamic:'Dynamic Graph',recursion:'Recursion',conic:'Conic Graphs',table:'Table'};
const addressPosition=address=>{const m=/^([A-Z])([1-9]\d{0,2})$/.exec(String(address).toUpperCase());if(!m)throw Error('Cell range: A1:Z999');return {col:m[1].charCodeAt(0)-65,row:+m[2]-1};};
const addressName=(col,row)=>{if(col<0||col>25||row<0||row>998)throw Error('Cell range: A1:Z999');return String.fromCharCode(65+col)+(row+1);};

export function createCGWorkspacePanel({host,calculator,data={},graph={},matrices={},vectors={},mode,onChange=()=>{},onBack=()=>{},onGraph=()=>{}}){
  if(!titles[mode])throw Error('Unknown workspace mode: '+mode);
  if(!data||typeof data!=='object'||Array.isArray(data))data={};
  if(mode==='spreadsheet')return createCGSpreadsheetPanel({host,calculator,data,graph,matrices,vectors,onChange,onBack});
  if(!data[mode]||typeof data[mode]!=='object'||Array.isArray(data[mode]))data[mode]={};
  if(mode==='eactivity')data.activities=(Array.isArray(data.activities)?data.activities:[]).slice(0,50).filter(file=>file&&typeof file==='object').map(file=>({name:String(file.name||'Activity').slice(0,80),lines:(Array.isArray(file.lines)?file.lines:[]).slice(0,1000).filter(line=>line&&typeof line==='object').map(line=>({type:['Text','Formula','Graph','Table'].includes(line.type)?line.type:'Text',value:String(line.value??'').slice(0,10000),...(typeof line.answer==='string'?{answer:line.answer.slice(0,10000)}:{})}))}));
  if(mode==='spreadsheet'&&data.spreadsheetStyle){const style=data.spreadsheetStyle;data.spreadsheetStyle={...(Number.isInteger(style.decimals)&&style.decimals>=0&&style.decimals<=14?{decimals:style.decimals}:{}),operator:['>','<','='].includes(style.operator)?style.operator:'none',threshold:Number.isFinite(style.threshold)?style.threshold:0};}
  graph.expressions??=Array(20).fill('');graph.enabled??=Array(20).fill(true);graph.expressions2??=Array(20).fill('');graph.types??=Array(20).fill('y');
  const shell=createCGShell(host,titles[mode]),{body,root,signal}=shell;
  let view='edit',rows=[],frames=[],frame=0,timer=null,sheet=null,clipboard=data.sheetClipboard||null,activity=Number(data.activitySelected)||0,plotWindow=null,editingCell=false;
  let ephemeralActivity=new Map(),graphInput='',tracing=false,traceIndex=0,traceSeries=0,plotted=[];
  const fieldUndo=new WeakMap(),fieldRedo=new WeakMap(),sheetUndo=[],sheetRedo=[];let overwrite=false;
  const save=()=>onChange(data);
  const safe=fn=>{try{shell.error('');const value=fn();if(value?.catch)value.catch(error=>shell.error(error.message));return value;}catch(error){shell.error(error.message);return false;}};
  const soft=(labels,run)=>shell.soft(labels,n=>safe(()=>run(n)));
  const real=(value,label='Value')=>{if(!String(value).trim())throw Error('Enter '+label);const result=calculator.evaluate(String(value));if(typeof result!=='number'||!Number.isFinite(result))throw Error(label+' must be a finite real number');return result;};
  function subtitle(text=''){root.querySelector('[data-cg-subtitle]').textContent=(overwrite?'OVR · ':'')+text;}
  function rememberField(field){if(!field||!['INPUT','TEXTAREA'].includes(field.tagName)||field.type==='file')return;const history=fieldUndo.get(field)||[];history.push({value:field.value,start:field.selectionStart,end:field.selectionEnd});if(history.length>60)history.shift();fieldUndo.set(field,history);fieldRedo.set(field,[]);}
  function rememberSheet(before){if(JSON.stringify(before.cells)===JSON.stringify(sheet.cells))return;sheetUndo.push(before);if(sheetUndo.length>20)sheetUndo.shift();sheetRedo.length=0;}
  function undo(redo=false){
    const field=activeInput(),from=(redo?fieldRedo:fieldUndo).get(field),to=redo?fieldUndo:fieldRedo;
    if(from?.length){const next=from.pop(),other=to.get(field)||[];other.push({value:field.value,start:field.selectionStart,end:field.selectionEnd});to.set(field,other);field.value=next.value;field.focus();field.setSelectionRange(next.start??field.value.length,next.end??field.value.length);field.dispatchEvent(new Event('input',{bubbles:true}));return true;}
    const stack=redo?sheetRedo:sheetUndo,target=redo?sheetUndo:sheetRedo;
    if(mode==='spreadsheet'&&sheet&&stack.length){target.push(sheet.serialize());sheet=new CGSpreadsheet(calculator,stack.pop());saveSheet();sheetView(true);return true;}
    shell.error(redo?'Nothing to redo':'Nothing to undo');return true;
  }
  root.addEventListener('beforeinput',event=>{const field=event.target;if(!field.matches('input:not([type=file]),textarea'))return;rememberField(field);if(overwrite&&event.inputType==='insertText'&&event.data&&field.selectionStart===field.selectionEnd)field.setSelectionRange(field.selectionStart,Math.min(field.value.length,field.selectionStart+event.data.length));},{signal});
  function stop(){if(timer)clearInterval(timer);timer=null;if(mode==='dynamic'&&view==='graph'){const button=root.querySelector('[data-cg-soft="1"]');if(button)button.textContent='PLAY';}}
  function redraw(){stop();shell.error('');subtitle();if(mode==='spreadsheet')sheetView();else if(mode==='eactivity')activityView();else edit();}
  function form(fields,values,run){body.innerHTML=cgForm(fields,values);body.querySelector('form').addEventListener('submit',event=>{event.preventDefault();safe(run);},{signal});body.querySelector('input,select,textarea')?.focus();}
  function edit(){
    stop();view='edit';subtitle();let fields=[],values=data[mode]||{};
    if(mode==='dynamic')fields=[['expression','Y=','text',''],['parameter','Parameter','text','A'],['start','Start','number',-2],['end','End','number',2],['step','Step','number',1],['xmin','Xmin','number',-10],['xmax','Xmax','number',10],['interval','Frame ms','number',250]];
    if(mode==='recursion')fields=[['type','Type','select','first',[['explicit','a(n)'],['first','a(n+1)'],['second','a(n+2)']]],['a','a expression','text',''],['b','b optional','text',''],['c','c optional','text',''],['n0','Initial n','number',0],['a0','a0','number',1],['a1','a1','number',1],['b0','b0','number',0],['b1','b1','number',1],['c0','c0','number',0],['c1','c1','number',1],['start','Start n','number',0],['end','End n','number',10],['step','Step','number',1]];
    if(mode==='conic')fields=[['type','Curve','select','circle',[['circle','Circle'],['ellipse','Ellipse'],['hyperbola','Hyperbola'],['parabola','Parabola']]],['orientation','Axis','select','horizontal',[['horizontal','Horizontal'],['vertical','Vertical']]],['h','Center h','number',0],['k','Center k','number',0],['r','Radius r','number',3],['a','a','number',3],['b','b','number',2],['p','p','number',1],['extent','Plot range','number',10]];
    if(mode==='table'){const parametric=graph.types[0]==='parametric',polar=graph.types[0]==='polar',variableX=String(graph.types[0]).startsWith('x');values={...values,f:graph.expressions[0]||'',g:(parametric?graph.expressions2[0]:graph.expressions[1])||''};fields=[['f',parametric?'X1(T)=':polar?'r1(θ)=':variableX?'X1(y)=':'Y1=','text',''],['g',parametric?'Y1(T)=':'Y2= optional','text',''],['start','Start','number',graph.parameter?.min??-5],['end','End','number',graph.parameter?.max??5],['step','Step','number',1]];}
    form(fields,values,()=>generate('table'));
    body.querySelector('form').addEventListener('input',()=>{data[mode]=cgValues(body);save();},{signal});
    if(mode==='recursion')body.insertAdjacentHTML('beforeend','<p class="cg-workspace-note">First order: a,b,c are terms at n. Second order: a0,b0,c0 are terms at n; a1,b1,c1 are terms at n+1.</p>');
    if(mode==='table')body.insertAdjacentHTML('beforeend','<p class="cg-workspace-note">All enabled Graph functions are included. Editing Y1/Y2 also changes the Graph list.</p>');
    soft(['EXE','GRAPH','TABLE','EXAMPLE','CLEAR','EXIT'],n=>{if(n<=3)generate(n===2?'graph':'table');else if(n===4)example();else if(n===5){body.querySelectorAll('input').forEach(input=>{if(['expression','a','b','c','f','g'].includes(input.name))input.value='';});data[mode]=cgValues(body);save();}else onBack();});
  }
  function example(){
    data[mode]=mode==='dynamic'?{expression:'A*x^2',parameter:'A',start:-2,end:2,step:1,xmin:-5,xmax:5,interval:250}:mode==='recursion'?{type:'second',a:'a1+a0',b:'',c:'',n0:0,a0:0,a1:1,b0:0,b1:1,c0:0,c1:1,start:0,end:12,step:1}:mode==='conic'?{type:'ellipse',orientation:'horizontal',h:0,k:0,r:3,a:4,b:2,p:1,extent:10}:{f:'x^2',g:'2*x+1',start:-3,end:3,step:1};
    if(mode==='table'){graph.expressions[0]=data[mode].f;graph.expressions[1]=data[mode].g;graph.types[0]='y';graph.types[1]='y';graph.expressions2[0]='';graph.expressions2[1]='';graph.enabled[0]=true;graph.enabled[1]=true;}save();edit();
  }
  function generate(target='table'){
    const values=cgValues(body);data[mode]=values;save();
    if(mode==='table'){
      graph.expressions[0]=values.f;if(graph.types[0]==='parametric')graph.expressions2[0]=values.g;else graph.expressions[1]=values.g;
      const active=[],relations=[];
      for(const [i,expression]of graph.expressions.entries()){
        if(!String(expression).trim()||graph.enabled[i]===false)continue;const type=graph.types[i]||'y',column=active.length;
        if(type==='parametric'){if(!String(graph.expressions2[i]).trim())throw Error('Enter Y'+(i+1)+'(T)');active.push({expression,label:'X'+(i+1)+'(T)',variable:'T'},{expression:graph.expressions2[i],label:'Y'+(i+1)+'(T)',variable:'T'});relations.push({slot:i,type,column,column2:column+1});}
        else {const variable=type==='polar'?'theta':type.startsWith('x')?'y':'x',label=type==='polar'?'r'+(i+1)+'(θ)':type.startsWith('x')?'X'+(i+1)+'(y)':'Y'+(i+1);active.push({expression,label,variable});relations.push({slot:i,type,column});}
      }
      rows=graphTable(calculator,active.map(item=>item.expression),real(values.start,'Start'),real(values.end,'End'),real(values.step,'Step'),{variables:active.map(item=>item.variable)});
      data.tableExpressions=active.map(item=>item.expression);data.tableColumns=active.map(item=>item.label);data.tableRelations=relations;data.tableArgument=active.every(item=>item.variable==='T')?'T':active.every(item=>item.variable==='theta')?'θ':active.every(item=>item.variable==='y')?'y':active.every(item=>item.variable==='x')?'x':'x / T / θ / y';save();
      if(target==='graph')chart();else tableView();
    }else if(mode==='recursion'){
      const initial=Object.fromEntries(['a0','a1','b0','b1','c0','c1'].map(key=>[key,real(values[key],key)]));initial.n=real(values.n0,'Initial n');
      rows=generateRecursion(calculator,{type:values.type,expressions:[values.a,values.b,values.c],initial,start:real(values.start,'Start'),end:real(values.end,'End'),step:real(values.step,'Step')});
      if(target==='graph')chart();else tableView();
    }else if(mode==='conic'){
      const settings=Object.fromEntries(Object.entries(values).map(([key,value])=>[key,['type','orientation'].includes(key)?value:real(value,key)]));
      const conic=conicSamples(settings,{extent:settings.extent,samples:480});data.conic=settings;data.conicInfo={equation:conic.equation,center:conic.center,vertices:conic.vertices,foci:conic.foci,directrix:conic.directrix,asymptotes:conic.asymptotes};
      frames=[{segments:conic.segments}];save();if(target==='table')conicInfo();else chart();
    }else if(mode==='dynamic'){
      const interval=real(values.interval,'Frame ms');if(interval<50||interval>5000)throw Error('Frame interval: 50–5000 ms');
      const settings={...values,start:real(values.start,'Start'),end:real(values.end,'End'),step:real(values.step,'Step'),xmin:real(values.xmin,'Xmin'),xmax:real(values.xmax,'Xmax'),interval};
      frames=dynamicFrames(calculator,{...settings,samples:300});data.dynamic=settings;save();
      frame=Math.max(0,Math.min(frames.length-1,Number(data.dynamicFrame)||0));plotWindow=null;chart();
    }
  }
  function tableView(){
    stop();view='table';subtitle(rows.length+' rows');
    body.innerHTML=mode==='recursion'?cgTable(['n','a(n)','b(n)','c(n)'],rows.map(row=>[row.n,row.a,row.b,row.c])):cgTable([data.tableArgument||'x',...(data.tableColumns||[])],rows.map(row=>[row.x,...row.values.map((value,i)=>value??(row.errors[i]?'ERROR':''))]));
    soft(['EDIT','GRAPH','SUM','CSV','TOP','EXIT'],n=>{if(n===1)edit();else if(n===2)chart();else if(n===3){const sums=mode==='recursion'?['a','b','c'].map(key=>rows.reduce((s,row)=>s+(row[key]??0),0)):(data.tableExpressions||[]).map((_,i)=>rows.reduce((s,row)=>s+(row.values[i]??0),0));shell.error('Σ = '+sums.map(value=>decimal(value)).join(', '));}else if(n===4){const values=mode==='recursion'?[['n','a(n)','b(n)','c(n)'],...rows.map(row=>[row.n,row.a,row.b,row.c])]:[['x',...data.tableColumns],...rows.map(row=>[row.x,...row.values])];downloadCGData(mode+'.csv',encodeCGCSV(values),'text/csv');}else if(n===5)body.scrollTop=0;else onBack();});
  }
  function conicInfo(){
    view='info';const info=data.conicInfo;
    body.innerHTML='<pre>'+esc(info.equation)+'\n'+esc(JSON.stringify({center:info.center,vertices:info.vertices,foci:info.foci,directrix:info.directrix,asymptotes:info.asymptotes},null,2))+'</pre>';
    soft(['EDIT','GRAPH','INFO','COPY','PNG','EXIT'],n=>{if(n===1)edit();else if(n===2)chart();else if(n===3)conicInfo();else if(n===4)navigator.clipboard?.writeText(info.equation).catch(()=>shell.error('Copy unavailable'));else if(n===5){chart();capture();}else onBack();});
  }
  function chart(){
    view='graph';graphInput='';tracing=false;traceIndex=0;traceSeries=0;subtitle();body.innerHTML='<div class="cg-chart"><canvas width="384" height="216" aria-label="'+esc(titles[mode])+' plot"></canvas></div><div class="cg-readout"></div>';
    soft(mode==='dynamic'?['PLAY','PREV','NEXT','EDIT','PNG','EXIT']:['EDIT','TABLE',mode==='conic'?'INFO':'TRACE','GRAPH','PNG','EXIT'],n=>{
      if(mode==='dynamic'){if(n===1){if(timer)pause();else {const milliseconds=Number(data.dynamic.interval)||250;timer=setInterval(()=>{frame=(frame+1)%frames.length;paint();},milliseconds);root.querySelector('[data-cg-soft="1"]').textContent='STOP';}}else if(n===2||n===3){pause();frame=(frame+(n===2?-1:1)+frames.length)%frames.length;data.dynamicFrame=frame;save();paint();}else if(n===4)edit();else if(n===5)capture();else onBack();}
      else if(n===1)edit();else if(n===2){if(mode==='conic')conicInfo();else tableView();}else if(n===3){if(mode==='conic')conicInfo();else {tracing=!tracing;paint();}}else if(n===4){if(mode==='table')onGraph();else paint();}else if(n===5)capture();else onBack();
    });paint();
  }
  function pause(){stop();data.dynamicFrame=frame;save();}
  function paint(){
    const canvas=body.querySelector('canvas');if(!canvas)return;let bounds;
    if(mode==='dynamic'){
      if(!plotWindow){let lo=Infinity,hi=-Infinity;for(const item of frames)for(const p of item.points)if(p&&Number.isFinite(p.y)){lo=Math.min(lo,p.y);hi=Math.max(hi,p.y);}if(!Number.isFinite(lo)){lo=-10;hi=10;}if(lo===hi){lo-=1;hi+=1;}const pad=(hi-lo)*.08;plotWindow={xmin:Number(data.dynamic.xmin),xmax:Number(data.dynamic.xmax),ymin:lo-pad,ymax:hi+pad};}
      drawCGPlot(canvas,[frames[frame].points],plotWindow);body.querySelector('.cg-readout').textContent=frames[frame].parameter+' = '+decimal(frames[frame].value)+'   '+(frame+1)+'/'+frames.length;
    }else if(mode==='conic'){drawCGPlot(canvas,frames[0].segments);body.querySelector('.cg-readout').textContent=data.conicInfo.equation;}
    else if(mode==='recursion'){plotted=['a','b','c'].filter(key=>rows.some(row=>Number.isFinite(row[key]))).map(key=>({label:key+'(n)',points:rows.map(row=>Number.isFinite(row[key])?{x:row.n,y:row[key],argument:row.n}:null)}));bounds=drawCGPlot(canvas,plotted);}
    else {plotted=(data.tableRelations||data.tableExpressions.map((_,column)=>({slot:column,type:'y',column}))).map(relation=>({label:data.tableColumns[relation.column],color:['#0000ff','#ff0000','#00aa00','#ff00ff','#000000','#0000ff'][relation.slot%6],points:rows.map(row=>{
      const value=row.values[relation.column];if(!Number.isFinite(value))return null;
      if(relation.type==='parametric'){const y=row.values[relation.column2];return Number.isFinite(y)?{x:value,y,argument:row.x}:null;}
      if(relation.type==='polar'){const angle=row.x*calculator.factor();return {x:value*Math.cos(angle),y:value*Math.sin(angle),argument:row.x};}
      return relation.type.startsWith('x')?{x:value,y:row.x,argument:row.x}:{x:row.x,y:value,argument:row.x};
    })}));bounds=drawCGPlot(canvas,plotted);}
    if(bounds){
      const series=plotted[traceSeries];if(tracing&&series){if(!series.points[traceIndex])traceIndex=Math.max(0,series.points.findIndex(Boolean));const point=series.points[traceIndex];
        if(point){const ctx=canvas.getContext('2d'),x=(point.x-bounds.xmin)/(bounds.xmax-bounds.xmin)*canvas.width,y=canvas.height-(point.y-bounds.ymin)/(bounds.ymax-bounds.ymin)*canvas.height;ctx.save();ctx.strokeStyle='#111';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x-5,y);ctx.lineTo(x+5,y);ctx.moveTo(x,y-5);ctx.lineTo(x,y+5);ctx.arc(x,y,3,0,2*Math.PI);ctx.stroke();ctx.restore();body.querySelector('.cg-readout').textContent=series.label+' '+(mode==='recursion'?'n':data.tableArgument||'x')+'='+decimal(point.argument)+' x='+decimal(point.x)+' y='+decimal(point.y);}
        else body.querySelector('.cg-readout').textContent='No finite points';
      }else body.querySelector('.cg-readout').textContent='TRACE: arrows · value EXE';
    }
    if(graphInput)body.querySelector('.cg-readout').textContent=(mode==='dynamic'?data.dynamic.parameter:mode==='recursion'?'n':data.tableArgument||'x')+'? '+graphInput+'  EXE';
  }
  function graphMove(action){
    graphInput='';if(mode==='dynamic'){pause();frame=(frame+(['left','up'].includes(action)?-1:1)+frames.length)%frames.length;data.dynamicFrame=frame;save();}
    else if(mode==='table'||mode==='recursion'){
      tracing=true;if(['up','down'].includes(action))traceSeries=(traceSeries+(action==='up'?-1:1)+plotted.length)%Math.max(1,plotted.length);
      else {const points=plotted[traceSeries]?.points||[],direction=action==='left'?-1:1;for(let i=0;i<points.length;i++){traceIndex=(traceIndex+direction+points.length)%points.length;if(points[traceIndex])break;}}
    }paint();return true;
  }
  function graphExecute(){
    if(!graphInput){if(mode==='dynamic')root.querySelector('[data-cg-soft="1"]').click();else {tracing=!tracing;paint();}return;}
    const value=real(graphInput,'Graph coordinate');
    if(mode==='dynamic'){pause();frame=frames.reduce((best,item,i)=>Math.abs(item.value-value)<Math.abs(frames[best].value-value)?i:best,0);data.dynamicFrame=frame;save();}
    else if(mode==='table'||mode==='recursion'){const points=plotted[traceSeries]?.points||[];let closest=-1;points.forEach((point,i)=>{if(point&&(closest<0||Math.abs(point.argument-value)<Math.abs(points[closest].argument-value)))closest=i;});if(closest<0)throw Error('No finite points');traceIndex=closest;tracing=true;}
    graphInput='';paint();
  }
  function capture(){const canvas=body.querySelector('canvas');if(!canvas)return;const link=document.createElement('a');link.href=canvas.toDataURL('image/png');link.download=mode+'.png';link.click();}

  function saveSheet(){data.spreadsheet=sheet.serialize();save();}
  function sheetView(focus=false){
    view='sheet';sheet??=new CGSpreadsheet(calculator,data.spreadsheet||{});sheet.recalculate();
    const selected=addressPosition(sheet.selected),left=Math.floor(selected.col/6)*6,top=Math.floor(selected.row/10)*10;
    const columns=Array.from({length:Math.min(6,26-left)},(_,i)=>left+i),indices=Array.from({length:Math.min(10,999-top)},(_,i)=>top+i);
    subtitle(sheet.selected+' · '+sheet.usedBytes()+' B');editingCell=false;
    body.innerHTML='<div class="cg-workspace-toolbar"><input data-sheet-goto aria-label="Cell address" value="'+esc(sheet.selected)+'"><button type="button" data-ws-action="goto">GO</button><button type="button" data-ws-action="sheet-tools">TOOLS</button></div><table class="cg-sheet-table"><thead><tr><th></th>'+columns.map(col=>'<th>'+String.fromCharCode(65+col)+'</th>').join('')+'</tr></thead><tbody>'+indices.map(row=>'<tr><th>'+(row+1)+'</th>'+columns.map(col=>{
      const key=addressName(col,row),cell=sheet.values[key],value=cell?.error?'ERROR':cell?.value??'',style=data.spreadsheetStyle||{},formatted=typeof value==='number'?style.decimals===undefined?Number(value.toPrecision(10)):value.toFixed(style.decimals):value;
      const conditional=typeof value==='number'&&((style.operator==='>'&&value>style.threshold)||(style.operator==='<'&&value<style.threshold)||(style.operator==='='&&value===style.threshold));
      return '<td class="'+(sheet.selected===key?'selected ':'')+(typeof value==='string'&&!cell?.error?'text-cell ':'')+(conditional?'conditional':'')+'"><button type="button" data-sheet-cell="'+key+'" aria-label="Cell '+key+'" title="'+esc(cell?.error||sheet.source(key))+'">'+esc(formatted)+'</button></td>';
    }).join('')+'</tr>').join('')+'</tbody></table><label>'+esc(sheet.selected)+'<input data-sheet-editor aria-label="Cell contents" value="'+esc(sheet.source(sheet.selected))+'"></label>';
    const input=body.querySelector('[data-sheet-editor]');input.addEventListener('input',()=>{editingCell=true;},{signal});input.addEventListener('pointerdown',()=>{editingCell=true;},{signal});
    soft(['SET','EDIT','COPY','PASTE','TOOLS','EXIT'],n=>{if(n===1)commitCell();else if(n===2){input.focus();input.select();editingCell=true;}else if(n===3)copyCells(sheet.selected);else if(n===4)pasteCells();else if(n===5)sheetTools();else onBack();});
    if(focus){input.focus();input.select();}
  }
  function commitCell(advance=true){const before=sheet.serialize();sheet.set(sheet.selected,body.querySelector('[data-sheet-editor]').value);rememberSheet(before);if(advance){const p=addressPosition(sheet.selected);sheet.selected=addressName(p.col,Math.min(998,p.row+1));}saveSheet();sheetView(true);}
  function copyCells(range,cut=false){const cells={};for(const key of cgRange(range))if(Object.hasOwn(sheet.cells,key))cells[key]=sheet.cells[key];clipboard={range,cells,cut};data.sheetClipboard=clipboard;save();shell.error((cut?'Cut ':'Copied ')+range);}
  function pasteCells(){
    if(!clipboard)throw Error('Copy cells first');const origin=addressPosition(cgRange(clipboard.range)[0]),destination=addressPosition(sheet.selected),next={...sheet.cells};
    if(clipboard.cut)for(const key of cgRange(clipboard.range))delete next[key];
    for(const key of cgRange(clipboard.range)){const p=addressPosition(key),target=addressName(destination.col+p.col-origin.col,destination.row+p.row-origin.row),source=clipboard.cells[key];if(source)next[target]=!clipboard.cut&&source.startsWith('=')?shiftCGReferences(source,destination.col-origin.col,destination.row-origin.row):source;else delete next[target];}
    sheet.checkMemory(next);const before=sheet.serialize();sheet=new CGSpreadsheet(calculator,{cells:next,selected:sheet.selected});rememberSheet(before);sheet.recalculate();saveSheet();sheetView(true);
  }
  function sheetTools(){
    view='sheet-tools';form([['range','Range','text',sheet.selected+':'+sheet.selected],['expression','Formula / value','text',''],['destination','Copy to','text',sheet.selected]],{},()=>sheetTool('fill'));
    body.insertAdjacentHTML('beforeend','<div class="cg-workspace-toolbar"><button type="button" data-ws-action="sheet-csv">CSV</button><button type="button" data-ws-action="sheet-import">IMPORT</button><button type="button" data-ws-action="sheet-sort">SORT</button><button type="button" data-ws-action="sheet-format">FORMAT</button><button type="button" data-ws-action="sheet-stats">STATS</button></div><p class="cg-workspace-note">Text begins with a quote. CellIf, CellSum and text functions are accepted in formulas. Working cell storage: '+sheet.usedBytes()+' / '+CG_SHEET_CAPACITY+' B.</p><input type="file" data-sheet-import accept=".csv,text/csv" hidden>');
    soft(['FILL','COPY','CUT','PASTE','FORMAT','BACK'],n=>{const action=['fill','copy','cut','paste','format','back'][n-1];sheetTool(action);});
    body.querySelector('[data-sheet-import]').addEventListener('change',event=>safe(async()=>{
      const file=event.target.files[0];if(!file)return;const csv=parseCGCSV(await file.text());if(signal.aborted)return;if(csv.length>999||csv.some(row=>row.length>26))throw Error('CSV exceeds 26 columns or 999 rows');
      const cells={};for(let row=0;row<csv.length;row++)for(let col=0;col<csv[row].length;col++){const value=csv[row][col],source=value.trim();if(value.length>1500)throw Error('Cell expression too long');if(source)cells[addressName(col,row)]=source.startsWith('=')||source.startsWith("'")||/^[-+]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(source)?source:JSON.stringify(value);}
      const imported=new CGSpreadsheet(calculator,{cells,selected:'A1'});if(imported.usedBytes()>CG_SHEET_CAPACITY)throw Error('Spreadsheet exceeds 30 KB');const before=sheet.serialize();sheet=imported;rememberSheet(before);sheet.recalculate();saveSheet();sheetView(true);
    }),{signal});
  }
  function exportSheet(){
    const keys=Object.keys(sheet.cells),lastRow=Math.max(0,...keys.map(key=>addressPosition(key).row)),lastCol=Math.max(0,...keys.map(key=>addressPosition(key).col));sheet.recalculate();
    const rows=Array.from({length:lastRow+1},(_,row)=>Array.from({length:lastCol+1},(_,col)=>{const key=addressName(col,row),cell=sheet.values[key],value=cell?.error?'ERROR':cell?.value??'';return typeof value==='string'&&/^[=+@\-']/.test(value)?"'"+value:value;}));downloadCGData('spreadsheet.csv',encodeCGCSV(rows),'text/csv');
  }
  function sheetTool(action){
    if(action==='back'){sheetView(true);return;}if(action==='format'){sheetFormat();return;}if(action==='paste'){pasteCells();return;}
    const values=cgValues(body),range=values.range.toUpperCase();
    const before=sheet.serialize();
    if(action==='fill')sheet.fill(range,values.expression);
    else if(action==='copy'||action==='cut')sheet.copy(range,values.destination.toUpperCase(),action==='cut');
    else if(action==='csv'){exportSheet();return;}
    else if(action==='import'){body.querySelector('[data-sheet-import]').click();return;}
    else if(action==='sort'){sortSheet(range);return;}
    else if(action==='stats'){const numbers=cgRange(range).map(key=>sheet.values[key]).filter(cell=>cell&&!cell.error&&typeof cell.value==='number').map(cell=>cell.value);if(!numbers.length)throw Error('Select numeric cells');const mean=numbers.reduce((s,x)=>s+x,0)/numbers.length;body.innerHTML=cgTable(['n','Σx','Mean','Min','Max'],[[numbers.length,numbers.reduce((s,x)=>s+x,0),mean,Math.min(...numbers),Math.max(...numbers)]]);view='sheet-info';soft(['BACK','CSV','','','','EXIT'],n=>{if(n===1)sheetTools();else if(n===2)exportSheet();else if(n===6)onBack();});return;}
    rememberSheet(before);saveSheet();sheetView(true);
  }
  function sortSheet(range){
    const keys=cgRange(range),first=addressPosition(keys[0]),last=addressPosition(keys.at(-1));sheet.recalculate();
    const records=[];for(let row=first.row;row<=last.row;row++){const key=addressName(first.col,row),value=sheet.values[key];if(value?.error)throw Error('Sort column contains errors');records.push({row,value:value?.value??0});}records.sort((a,b)=>{if(typeof a.value!==typeof b.value)return typeof a.value==='number'?-1:1;const order=a.value<b.value?-1:a.value>b.value?1:0;return order||a.row-b.row;});
    const before={...sheet.cells},next={...sheet.cells};records.forEach((record,index)=>{const targetRow=first.row+index;for(let col=first.col;col<=last.col;col++){const source=before[addressName(col,record.row)],key=addressName(col,targetRow);if(!source)delete next[key];else next[key]=source.startsWith('=')?shiftCGReferences(source,0,targetRow-record.row):source;}});
    sheet.checkMemory(next);sheet=new CGSpreadsheet(calculator,{cells:next,selected:sheet.selected});rememberSheet({cells:before,selected:sheet.selected});saveSheet();sheetView(true);
  }
  function sheetFormat(){
    view='sheet-format';form([['decimals','Decimal places','number',10],['operator','Highlight if','select','none',[['none','Off'],['>','Greater than'],['<','Less than'],['=','Equal to']]],['threshold','Threshold','number',0]],data.spreadsheetStyle||{},applySheetFormat);
    soft(['APPLY','AUTO','BACK','','','EXIT'],n=>{if(n===1)applySheetFormat();else if(n===2){data.spreadsheetStyle={};save();sheetView(true);}else if(n===3)sheetTools();else if(n===6)onBack();});
  }
  function applySheetFormat(){const values=cgValues(body),decimals=real(values.decimals,'Decimal places');if(!Number.isInteger(decimals)||decimals<0||decimals>14)throw Error('Decimal places: 0–14');data.spreadsheetStyle={decimals,operator:values.operator,threshold:real(values.threshold,'Threshold')};save();sheetView(true);}

  function activityView(){
    view='activity';data.activities??=[];activity=Math.min(Math.max(0,activity),Math.max(0,data.activities.length-1));data.activitySelected=activity;
    const file=data.activities[activity];
    root.querySelector('[data-cg-subtitle]').innerHTML='<select data-activity-select aria-label="Activity file">'+data.activities.map((item,i)=>'<option value="'+i+'"'+(i===activity?' selected':'')+'>'+esc(item.name)+'</option>').join('')+'</select>';
    body.innerHTML=file?file.lines.map((line,i)=>'<div class="cg-activity-line" data-line="'+i+'"><label>'+esc(line.type)+'<textarea data-activity-line="'+i+'" aria-label="'+esc(line.type)+' line '+(i+1)+'">'+esc(line.value)+'</textarea></label><output>'+esc(line.answer??'')+'</output><div data-line-extra></div></div>').join(''):'<p class="cg-workspace-note">Create an eActivity file to keep text, calculations, graph and table strips together.</p><button type="button" data-ws-action="activity-new">New eActivity</button>';
    soft(['CALC','NEW','ADD','FILE','DELETE','EXIT'],n=>{if(n===1)calculateActivity();else if(n===2)newActivity();else if(n===3)activityAdd();else if(n===4)activityFiles();else if(n===5)deleteActivityLine();else onBack();});
    body.querySelectorAll('[data-activity-line]').forEach(field=>field.addEventListener('input',()=>{const line=file.lines[+field.dataset.activityLine];line.value=field.value.slice(0,10000);delete line.answer;ephemeralActivity.delete(+field.dataset.activityLine);const holder=field.closest('.cg-activity-line');holder.querySelector('output').textContent='';holder.querySelector('[data-line-extra]').replaceChildren();save();},{signal}));
    root.querySelector('[data-activity-select]')?.addEventListener('change',event=>{activity=+event.target.value;data.activitySelected=activity;ephemeralActivity.clear();save();activityView();},{signal});
    for(const [index,result]of ephemeralActivity){const target=body.querySelector('[data-line="'+index+'"] [data-line-extra]');if(!target)continue;if(result.kind==='graph'){target.innerHTML='<canvas width="384" height="216" aria-label="Activity graph"></canvas>';drawCGPlot(target.querySelector('canvas'),[{points:result.rows.map(row=>row.values[0]===null?null:{x:row.x,y:row.values[0]})}]);}else target.innerHTML=cgTable(['x','f(x)'],result.rows.map(row=>[row.x,row.values[0]??'ERROR']));}
  }
  function newActivity(){data.activities??=[];if(data.activities.length>=50)throw Error('Maximum 50 eActivity files');data.activities.push({name:'Activity '+(data.activities.length+1),lines:[{type:'Text',value:''},{type:'Formula',value:''}]});activity=data.activities.length-1;data.activitySelected=activity;ephemeralActivity.clear();save();activityView();}
  function activityAdd(){
    if(!data.activities[activity]){newActivity();return;}view='activity-add';body.innerHTML='<p class="cg-workspace-note">Choose a strip. Graph/Table use x from −5 to 5; edit the expression in the strip.</p>';
    soft(['TEXT','MATH','GRAPH','TABLE','BACK','EXIT'],n=>{if(n<=4){const file=data.activities[activity];if(file.lines.length>=1000)throw Error('Maximum 1000 strips');file.lines.push({type:['Text','Formula','Graph','Table'][n-1],value:''});save();activityView();body.querySelector('[data-activity-line="'+(file.lines.length-1)+'"]')?.focus();}else if(n===5)activityView();else onBack();});
  }
  function calculateActivity(){
    const file=data.activities[activity];if(!file)return;ephemeralActivity.clear();
    for(const [index,line]of file.lines.entries())if(line.type!=='Text'&&line.value.trim()){
      try{if(line.type==='Formula')line.answer=decimal(calculator.evaluate(line.value));else {const values=graphTable(calculator,[line.value],-5,5,line.type==='Graph'?.05:1);ephemeralActivity.set(index,{kind:line.type==='Graph'?'graph':'table',rows:values});line.answer=line.type;}}catch(error){line.answer=error.message;}
    }save();activityView();
  }
  function deleteActivityLine(){const file=data.activities[activity],field=document.activeElement;if(!file||!field?.matches('[data-activity-line]')){shell.error('Select a strip first');return;}const index=+field.dataset.activityLine;file.lines.splice(index,1);ephemeralActivity.clear();save();activityView();}
  function activityFiles(){
    view='activity-files';const file=data.activities[activity];form([['name','File name','text',file?.name||'Activity']],{},()=>activityTool('save'));
    body.insertAdjacentHTML('beforeend','<p class="cg-workspace-note">Export/import uses the simulator JSON format.</p><input type="file" data-activity-import accept=".json,application/json" hidden>');
    soft(['SAVE','EXPORT','IMPORT','DELETE','BACK','EXIT'],n=>activityTool(['save','export','import','delete','back','exit'][n-1]));
    body.querySelector('[data-activity-import]').addEventListener('change',event=>safe(async()=>{const file=event.target.files[0];if(!file)return;if(file.size>1000000)throw Error('eActivity file too large');const value=JSON.parse(await file.text());if(signal.aborted)return;if(!Array.isArray(value.lines)||value.lines.length>1000)throw Error('Invalid eActivity file');if(data.activities.length>=50)throw Error('Maximum 50 eActivity files');data.activities.push({name:String(value.name||file.name).slice(0,80),lines:value.lines.map(line=>({type:['Text','Formula','Graph','Table'].includes(line.type)?line.type:'Text',value:String(line.value??'').slice(0,10000)}))});activity=data.activities.length-1;data.activitySelected=activity;ephemeralActivity.clear();save();activityView();}),{signal});
  }
  function activityTool(action){
    const file=data.activities[activity];
    if(action==='save'){if(file)file.name=cgValues(body).name.trim().slice(0,80)||'Activity';save();activityView();}
    else if(action==='export'&&file)downloadCGData(file.name+'.json',file);
    else if(action==='import')body.querySelector('[data-activity-import]').click();
    else if(action==='delete'&&file){view='activity-confirm';body.innerHTML='<p>Delete '+esc(file.name)+'?</p>';soft(['YES','','','','','NO'],n=>{if(n===1){data.activities.splice(activity,1);activity=Math.max(0,activity-1);data.activitySelected=activity;ephemeralActivity.clear();save();activityView();}else if(n===6)activityFiles();});}
    else if(action==='back')activityView();else if(action==='exit')onBack();
  }

  function activeInput(){const focused=document.activeElement;if(root.contains(focused)&&['INPUT','TEXTAREA'].includes(focused.tagName)&&focused.type!=='file')return focused;return mode==='spreadsheet'&&view==='sheet'?body.querySelector('[data-sheet-editor]'):body.querySelector('input,textarea');}
  function insert(text){
    if(view==='graph'){
      if(!['table','recursion','dynamic'].includes(mode)){shell.error('Use EDIT to change the curve');return true;}
      const token=text==='*10^'?'e':String(text);if(!/^[0-9eE.+\-]+$/.test(token)||graphInput.length+token.length>40){shell.error('Enter a numeric graph coordinate, then EXE');return true;}
      if(mode==='dynamic')pause();graphInput+=token;shell.error('');paint();return true;
    }
    const field=activeInput();if(!field)return false;field.focus();rememberField(field);if(view==='sheet'&&field.matches('[data-sheet-editor]')&&!editingCell){field.value='';editingCell=true;}const start=field.selectionStart??field.value.length,end=field.selectionEnd??start;field.setRangeText(text,start,overwrite&&start===end?Math.min(field.value.length,start+text.length):end,'end');field.dispatchEvent(new Event('input',{bubbles:true}));return true;
  }
  function moveSheet(action){if(editingCell)commitCell(false);const p=addressPosition(sheet.selected);sheet.selected=addressName(Math.max(0,Math.min(25,p.col+(action==='left'?-1:action==='right'?1:0))),Math.max(0,Math.min(998,p.row+(action==='up'?-1:action==='down'?1:0))));saveSheet();sheetView(true);}
  function handleAction(action){
    if(/^cg-f[1-6]$/.test(action)){root.querySelector('[data-cg-soft="'+action.slice(-1)+'"]')?.click();return true;}
    if(action==='undo')return undo();if(action==='redo')return undo(true);
    if(action==='insert'){overwrite=!overwrite;root.dataset.inputMode=overwrite?'overwrite':'insert';subtitle(view==='sheet'?sheet.selected:'');return true;}
    if(action==='cg-clip'){if(view==='sheet')copyCells(sheet.selected);else {const field=activeInput();if(field){field.focus();field.select();data.clipboardText=field.value;save();shell.error('Copied text');}}return true;}
    if(action==='cg-paste'){if(view==='sheet'&&clipboard){safe(pasteCells);return true;}if(typeof data.clipboardText==='string')return insert(data.clipboardText);return false;}
    if(action==='cg-newline'){const field=activeInput();if(field?.tagName==='TEXTAREA')return insert('\n');return handleAction('execute');}
    if(action==='back'){if(['edit','sheet','activity'].includes(view))onBack();else redraw();return true;}
    if(action==='execute'||action==='approx'){
      safe(()=>{if(view==='graph')graphExecute();else if(view==='edit')generate('table');else if(view==='sheet'){const field=document.activeElement;if(field?.matches('[data-sheet-goto]'))gotoCell();else commitCell();}else if(view==='activity')calculateActivity();else if(view==='sheet-tools')sheetTool('fill');else if(view==='sheet-format')applySheetFormat();else if(view==='activity-files')activityTool('save');});return true;
    }
    if(['cg-clear-on','clear'].includes(action)){shell.error('');if(view==='graph'){graphInput='';paint();return true;}const field=activeInput();if(field){rememberField(field);if(view==='sheet'&&field.matches('[data-sheet-editor]')){editingCell=true;field.value='';}else field.value='';field.dispatchEvent(new Event('input',{bubbles:true}));}return true;}
    if(['options','tools'].includes(action)){if(mode==='spreadsheet')sheetTools();else if(mode==='eactivity')activityFiles();else edit();return true;}
    if(['format','cg-format'].includes(action)&&mode==='spreadsheet'){sheetFormat();return true;}
    if(action==='delete'){if(view==='graph'){graphInput=graphInput.slice(0,-1);paint();return true;}const field=activeInput();if(field){field.focus();rememberField(field);const start=field.selectionStart??0,end=field.selectionEnd??start;field.setRangeText('',start===end?Math.max(0,start-1):start,end,'end');field.dispatchEvent(new Event('input',{bubbles:true}));return true;}}
    if(['left','right','up','down'].includes(action)){
      if(['table','info','sheet-info'].includes(view)){body.scrollBy({top:action==='up'?-36:action==='down'?36:0,left:action==='left'?-60:action==='right'?60:0});return true;}
      if(view==='graph')return graphMove(action);
      if(view==='sheet'){safe(()=>moveSheet(action));return true;}
      const fields=[...body.querySelectorAll('input,textarea,select')],field=document.activeElement;if(['up','down'].includes(action)){const index=fields.indexOf(field),next=fields[Math.max(0,Math.min(fields.length-1,index+(action==='up'?-1:1)))];next?.focus();if(next?.select)next.select();return true;}if(field&&root.contains(field)&&field.setSelectionRange){const position=Math.max(0,Math.min(field.value.length,(field.selectionStart??0)+(action==='left'?-1:1)));field.setSelectionRange(position,position);return true;}
    }
    const blocked=['menu','models','help','setup','language','off','on','shift','alpha','variables','catalog'];if(blocked.includes(action))return false;
    const token={frac:'/',root:'nthRoot(',pi:'pi','^2':'^2',negative:'-',Ans:'Ans',space:' ','cg-space':' ','cg-strings':'"','cg-equals':'=',mixed:'/', 'mixed-input':'/'}[action]??action;
    const literal=/^[0-9A-Za-z .,+*/^(){}\[\]=_"'\-]$/.test(token)||/^\^(?:\d+|\(-?\d+\))$/.test(token)||/^[A-Za-z][A-Za-z0-9]*\((?:\))?$/.test(token)||token==='*10^'||['frac','root','pi','negative','Ans','space','cg-space','cg-strings','cg-equals','mixed','mixed-input'].includes(action);
    if(token.length<=80&&literal)return insert(token);return false;
  }
  function gotoCell(){const field=body.querySelector('[data-sheet-goto]'),key=field.value.toUpperCase().replaceAll('$','');sheet.source(key);sheet.selected=key;saveSheet();sheetView(true);}
  root.addEventListener('click',event=>{const cell=event.target.closest('[data-sheet-cell]');if(cell){safe(()=>{if(editingCell)commitCell(false);sheet.selected=cell.dataset.sheetCell;saveSheet();sheetView(true);});return;}const control=event.target.closest('[data-ws-action]');if(!control)return;safe(()=>{const action=control.dataset.wsAction;if(action==='goto')gotoCell();else if(action==='sheet-tools')sheetTools();else if(action.startsWith('sheet-'))sheetTool(action.slice(6));else if(action==='activity-new')newActivity();});},{signal});
  redraw();
  return {insert,handleAction,undo:()=>undo(),redo:()=>undo(true),handleKey(event){if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z')return undo(event.shiftKey);if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='y')return undo(true);if(/^F\d+$/.test(event.key)||event.key==='Home')return false;if(event.key==='Escape')return handleAction('back');if(view==='graph'){
      if(/^Arrow(Up|Down|Left|Right)$/.test(event.key))return handleAction(event.key.slice(5).toLowerCase());if(event.key==='Enter')return handleAction('execute');if(event.key==='Backspace'||event.key==='Delete')return handleAction('delete');if(event.key.length===1&&!event.ctrlKey&&!event.metaKey&&!event.altKey)return insert(event.key);
    }if(event.key==='Enter'&&event.target?.tagName!=='BUTTON'){if(event.target?.tagName==='TEXTAREA'&&!event.ctrlKey&&!event.metaKey)return false;return handleAction('execute');}if(view==='sheet'&&['ArrowUp','ArrowDown'].includes(event.key)){safe(()=>moveSheet(event.key==='ArrowUp'?'up':'down'));return true;}if(['table','info','sheet-info'].includes(view)&&/^Arrow(Up|Down|Left|Right)$/.test(event.key))return handleAction(event.key.slice(5).toLowerCase());return false;},focus(){activeInput()?.focus();},destroy(){stop();shell.destroy();}};
}
