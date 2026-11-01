import {sampleGraphRelations,validateGraphWindow} from '../engine/graph.js';
import {generateRecursion,graphTable,dynamicFrames} from '../engine/cg-workspace.js';
import {encodeProgramPicture,decodeProgramPicture,sanitizeProgramPictureBanks,storeProgramPicture} from '../engine/cg-program-pictures.js';
import {sanitizeCGStatistics} from '../engine/cg-statistics.js';
import {renderCGStatisticsPlot} from './cg-statistics-plot.js';
import {math} from '../engine/calculator.js';

export function disposeCGProgramGraphics(session){if(session?.timer!==undefined&&session.timer!==null){(session.clearTimer||clearInterval)(session.timer);session.timer=null;}}

// Commands are typed data emitted by the BASIC interpreter, never JavaScript.
// Rendering in the program panel avoids destroying a running program to open GRAPH.
export function renderCGProgramGraphics(calculator,commands,{graph={},lists=[],workspace={},document:doc=globalThis.document,session={},onCoordinate,setTimer=setInterval,clearTimer=clearInterval}={}){
  if(!Array.isArray(commands)||!commands.length)return null;
  const canvas=session.canvas||doc.createElement('canvas');if(!session.canvas){canvas.width=384;canvas.height=216;canvas.className='cg-program-graphics';canvas.setAttribute('aria-label','Program graph output');session.canvas=canvas;}
  const context=canvas.getContext('2d');let window=session.window||{xmin:-10,xmax:10,ymin:-10,ymax:10,...graph.window},parameter=session.parameter||graph.parameter||{},axes=session.axes??true,grid=session.grid??false,labels=session.labels??false,coordinates=session.coordinates??false,drawn=session.drawn??false,lastPlots=session.lastPlots||[],plotMargin=session.plotMargin||0;
  const pictures=session.pictures||new Map(),captures=session.captures||new Map();
  const banks=session.banks||sanitizeProgramPictureBanks(workspace.programImageBanks);session.banks=banks;
  const X=x=>plotMargin+(x-window.xmin)/(window.xmax-window.xmin)*(canvas.width-(plotMargin?plotMargin+7:0)),Y=y=>canvas.height-plotMargin-(y-window.ymin)/(window.ymax-window.ymin)*(canvas.height-(plotMargin?plotMargin+8:0));
  const clear=()=>{context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.strokeStyle='#888';context.lineWidth=1;context.beginPath();if(grid){for(let k=1;k<10;k++){context.moveTo(k*canvas.width/10,0);context.lineTo(k*canvas.width/10,canvas.height);context.moveTo(0,k*canvas.height/10);context.lineTo(canvas.width,k*canvas.height/10);}}if(axes){if(window.xmin<0&&window.xmax>0){context.moveTo(X(0),0);context.lineTo(X(0),canvas.height);}if(window.ymin<0&&window.ymax>0){context.moveTo(0,Y(0));context.lineTo(canvas.width,Y(0));}}context.stroke();if(labels){context.fillStyle='#000';context.font='12px monospace';context.fillText('X',canvas.width-12,Math.max(12,Math.min(canvas.height-2,Y(0))));context.fillText('Y',Math.max(2,Math.min(canvas.width-12,X(0))),12);}};
  const stroke=(points,color='#0000c0')=>{context.strokeStyle=color;context.lineWidth=1.5;context.beginPath();let previous=null;for(const point of points){if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.y)){previous=null;continue;}const x=X(point.x),y=Y(point.y);if(previous&&Math.abs(y-previous.y)<canvas.height*3)context.lineTo(x,y);else context.moveTo(x,y);previous={x,y};}context.stroke();drawn=true;};
  const point=(x,y,on=true)=>{context.fillStyle=on?'#0000c0':'#fff';context.fillRect(Math.round(X(x))-1,Math.round(Y(y))-1,3,3);drawn=true;};
  const proxy=(variables,angle)=>{variables=Object.fromEntries(Object.entries(variables).map(([key,value])=>[key,value&&typeof value==='object'&&Number.isFinite(value.re)&&Number.isFinite(value.im)?math.complex(value.re,value.im):value]));const local=Object.assign(Object.create(calculator),{angle:angle||calculator.angle,graphMemory:{...(calculator.graphMemory||graph),window:{...window},parameter:{...parameter}}});return {model:local.model,angle:local.angle,vars:{...local.vars,...variables},factor:()=>local.factor(),compile:expression=>local.compile(expression),scope:extra=>local.scope({...variables,...extra}),evaluate:(expression,extra)=>local.evaluate(expression,{...variables,...extra}),differentiate:(expression,x)=>local.differentiate(expression,x,variables)};};
  const relation=(expression,type='y',variables={},angle)=>{
    const match=/^Y(\d+)$/i.exec(expression),source=match?graph.expressions?.[Number(match[1])-1]:expression;if(!source)throw Error('图形函数尚未定义');
    const data=sampleGraphRelations(proxy(variables,angle),[{expression:source,type,enabled:true}],{...window,samples:300},parameter);
    for(const curve of data.curves)for(const segment of curve.segments)stroke(segment);
  };
  const number=(value,fallback,calc=calculator)=>{if(value===undefined||value===null||value===''){if(fallback!==undefined)return fallback;throw Error('图形设置缺少数值');}const n=typeof value==='number'?value:calc.evaluate(String(value));if(!Number.isFinite(n))throw Error('图形设置须为实数');return n;};
  const recursionRows=calc=>{const r=workspace.recursion;if(!r||![r.a,r.b,r.c].some(value=>String(value||'').trim()))throw Error('请先在 Recursion 应用保存公式');return generateRecursion(calc,{type:r.type||'first',expressions:[r.a||'',r.b||'',r.c||''],initial:{n:number(r.n0,0,calc),...Object.fromEntries(['a0','a1','b0','b1','c0','c1'].map(key=>[key,number(r[key],0,calc)]))},start:number(r.start,0,calc),end:number(r.end,10,calc),step:number(r.step,1,calc)});};
  const series=(points,scatter,color)=>{if(scatter){for(const p of points)if(p)point(p.x,p.y);}else stroke(points,color);};
  canvas.onpointermove=event=>{if(!session.coordinates){onCoordinate?.('');return;}const rect=canvas.getBoundingClientRect(),x=window.xmin+(event.clientX-rect.left)/rect.width*(window.xmax-window.xmin),y=window.ymax-(event.clientY-rect.top)/rect.height*(window.ymax-window.ymin);const text='X='+Number(x.toPrecision(8))+'  Y='+Number(y.toPrecision(8));canvas.dataset.coordinates=text;onCoordinate?.(text);};
  if(!session.initialized)clear();
  for(const command of commands.slice(session.lastIndex||0)){const kind=String(command.kind||'').toLowerCase(),a=command.args||[],variables=command.variables||{};
    if(command.view){window=validateGraphWindow(command.view.window);parameter={...command.view.parameter};}
    if(kind==='clrgraph'){plotMargin=0;clear();drawn=true;lastPlots=[];}
    else if(kind==='viewwindow'){plotMargin=0;window=validateGraphWindow({xmin:a[0],xmax:a[1],ymin:a[3],ymax:a[4]});if(a.length===9)parameter={min:a[6],max:a[7],step:Math.sign(a[7]-a[6])*Math.abs(a[8])};clear();}
    else if(kind==='axeson'||kind==='axesoff'){axes=kind==='axeson';clear();}
    else if(kind==='gridon'||kind==='gridoff'){grid=kind==='gridon';clear();}
    else if(kind==='labelon'||kind==='labeloff'){labels=kind==='labelon';}
    else if(kind==='coordon'||kind==='coordoff'){coordinates=kind==='coordon';}
    else if(kind==='bg-none'){clear();drawn=true;}
    else if(kind==='graph')relation(command.expression,command.type,variables,command.angle);
    else if(kind==='drawgraph'){
      const expressions=graph.expressions||[];for(let i=0;i<expressions.length;i++)if(expressions[i]&&graph.enabled?.[i]!==false){
        const type=graph.types?.[i]||'y',data=sampleGraphRelations(proxy(variables,command.angle),[{expression:expressions[i],expression2:graph.expressions2?.[i]||'',type,enabled:true}],{...window,samples:300},parameter);
        for(const curve of data.curves)for(const segment of curve.segments)stroke(segment,['#0000c0','#c00000','#008800','#a000a0'][i%4]);
      }
    }else if(kind==='drawr-con'||kind==='drawr-plt'||kind==='drawr-phase'||kind==='drawweb'){
      const rows=recursionRows(proxy(variables,command.angle));
      if(kind==='drawweb'){stroke([{x:window.xmin,y:window.xmin},{x:window.xmax,y:window.xmax}],'#777');for(let i=0;i<rows.length-1;i++)if(Number.isFinite(rows[i].a)&&Number.isFinite(rows[i+1].a)){const x=rows[i].a,y=rows[i+1].a;stroke([{x,y:x},{x,y},{x:y,y}]);}}
      else if(kind==='drawr-phase'){const points=rows.filter(r=>Number.isFinite(r.a)&&Number.isFinite(r.b)).map(r=>({x:r.a,y:r.b}));if(!points.length)throw Error('相位图需要 a(n) 和 b(n)');series(points,false);}
      else for(const [i,key]of ['a','b','c'].entries())series(rows.filter(r=>Number.isFinite(r[key])).map(r=>({x:r.n,y:r[key]})),kind==='drawr-plt',['#0000c0','#c00000','#008800'][i]);
    }else if(kind==='drawftg-con'||kind==='drawftg-plt'){
      const settings=workspace.table||{},indices=(graph.expressions||[]).map((s,i)=>s&&graph.enabled?.[i]!==false?i:-1).filter(i=>i>=0);if(!indices.length)throw Error('请先在 Table 或 Graph 应用保存函数');
      const expressions=indices.map(i=>graph.expressions[i]),calc=proxy(variables,command.angle),table=graphTable(calc,expressions,number(settings.start,-5,calc),number(settings.end,5,calc),number(settings.step,1,calc),{variables:indices.map(i=>String(graph.types?.[i]||'y').startsWith('x')?'y':['polar','parametric'].includes(graph.types?.[i])?'parameter':'x')});
      expressions.forEach((_,i)=>series(table.map(r=>r.values[i]===null?null:{x:r.x,y:r.values[i]}),kind==='drawftg-plt',['#0000c0','#c00000','#008800'][i%3]));
    }else if(kind==='drawdyna'){
      const settings=workspace.dynamic;if(!settings?.expression?.trim())throw Error('请先在 Dynamic Graph 应用保存公式');disposeCGProgramGraphics(session);
      const frames=dynamicFrames(proxy(variables,command.angle),{expression:settings.expression,parameter:settings.parameter||'A',start:number(settings.start),end:number(settings.end),step:number(settings.step),xmin:number(settings.xmin,window.xmin),xmax:number(settings.xmax,window.xmax),samples:200});let index=0;
      const paint=()=>{clear();stroke(frames[index].points);context.font='12px monospace';context.fillStyle='#000';context.fillText(frames[index].parameter+'='+frames[index].value,4,14);canvas.dataset.dynamicFrame=String(index);canvas.dataset.dynamicValue=String(frames[index].value);};paint();
      session.clearTimer=clearTimer;if(frames.length>1)session.timer=setTimer(()=>{if(index+1>=frames.length){disposeCGProgramGraphics(session);return;}index++;paint();},Math.max(20,Math.min(2000,number(settings.interval,250))));
    }else if(kind==='plot'||kind==='ploton'||kind==='plotoff'||kind==='plotchg'){point(a[0],a[1],kind!=='plotoff');lastPlots.push({x:a[0],y:a[1]});lastPlots=lastPlots.slice(-2);}
    else if(kind==='f-line'||kind==='line'){if(a.length===4)stroke([{x:a[0],y:a[1]},{x:a[2],y:a[3]}]);else if(lastPlots.length===2)stroke(lastPlots);}
    else if(kind==='circle'){const points=[];for(let i=0;i<=180;i++){const t=i*Math.PI/90;points.push({x:a[0]+a[2]*Math.cos(t),y:a[1]+a[2]*Math.sin(t)});}stroke(points);}
    else if(kind==='vertical')stroke([{x:a[0],y:window.ymin},{x:a[0],y:window.ymax}]);
    else if(kind==='horizontal'||kind==='horz')stroke([{x:window.xmin,y:a[0]},{x:window.xmax,y:a[0]}]);
    else if(kind==='text'){context.font='12px monospace';context.fillStyle='#000';context.fillText(String(a[2]),a[1],a[0]+10);drawn=true;}
    else if(kind==='pxlon'||kind==='pxloff'||kind==='pxlchg'){context.fillStyle=kind==='pxloff'?'#fff':'#0000c0';context.fillRect(a[1]-1,a[0]-1,1,1);drawn=true;}
    else if(kind==='tangent'||kind==='normal'){
      const match=/^Y(\d+)$/i.exec(command.expression),expression=match?graph.expressions?.[Number(match[1])-1]:command.expression,x=a[0],calc=proxy(variables,command.angle),y=calc.evaluate(expression,{x}),derivative=calc.differentiate(expression,x);
      if(kind==='normal'&&Math.abs(derivative)<1e-14)stroke([{x,y:window.ymin},{x,y:window.ymax}]);else{const slope=kind==='normal'?-1/derivative:derivative;stroke([{x:window.xmin,y:y+slope*(window.xmin-x)},{x:window.xmax,y:y+slope*(window.xmax-x)}]);}
    }else if(kind==='inverse')relation(command.expression,'x',variables,command.angle);
    else if(kind==='drawstat'){
      if(workspace.statistics){const saved=sanitizeCGStatistics({...workspace.statistics,lists}),readout={textContent:''},plot=renderCGStatisticsPlot({canvas,readout,saved,options:{multiple:true,...(!saved.autoWindow&&saved.graphWindow?{window:saved.graphWindow}:{})}});window=plot.bounds;plotMargin=24;onCoordinate?.(readout.textContent);canvas.dataset.statLayers=String(plot.layers);canvas.dataset.statTypes=saved.graphs.filter(g=>g.enabled).map(g=>g.type).join(',');drawn=true;}
      else{const xs=lists[0]||[],ys=lists[1]||[];for(let i=0;i<Math.min(xs.length,ys.length);i++)point(xs[i],ys[i]);}
    }else if(kind==='stopict'||kind==='stocapt'){
      const slot=Number(a[0]);if(!Number.isInteger(slot)||slot<1||slot>20)throw Error('图片存储编号须为 1–20');const bank=kind==='stopict'?'pict':'capture';
      storeProgramPicture(banks,bank,slot,encodeProgramPicture(context.getImageData(0,0,canvas.width,canvas.height)));workspace.programImageBanks=banks;if(bank==='pict'){delete workspace.pictureWindows?.[slot];delete workspace.graphPictureMeta?.[slot];}session.banksDirty=true;
      const copy=doc.createElement('canvas');copy.width=canvas.width;copy.height=canvas.height;copy.getContext('2d').drawImage(canvas,0,0);(kind==='stopict'?pictures:captures).set(slot,copy);
    }else if(kind==='rclpict'||kind==='rclcapt'){
      const slot=Number(a[0]);if(!Number.isInteger(slot)||slot<1||slot>20)throw Error('图片存储编号须为 1–20');const memory=kind==='rclpict'?pictures:captures,bank=kind==='rclpict'?'pict':'capture';let picture=memory.get(slot);
      if(!picture){const stored=banks[bank][String(slot)];if(!stored)throw Error('图片存储区尚未定义');const decoded=decodeProgramPicture(stored);picture=doc.createElement('canvas');picture.width=decoded.width;picture.height=decoded.height;const target=picture.getContext('2d'),image=target.createImageData(decoded.width,decoded.height);image.data.set(decoded.data);target.putImageData(image,0,0);memory.set(slot,picture);}
      context.drawImage(picture,0,0,canvas.width,canvas.height);drawn=true;
    }
  }
  Object.assign(session,{window,parameter,axes,grid,labels,coordinates,drawn,lastPlots,plotMargin,pictures,captures,initialized:true,lastIndex:commands.length});canvas.dataset.commands=String(commands.length);return drawn?canvas:null;
}
