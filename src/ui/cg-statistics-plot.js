import {cgDataRows,cgSummary,cgDistribution} from '../engine/cg-statistics.js';
const text=value=>Number.isFinite(value)?Number(value.toPrecision(8)).toString():String(value);
const isFinitePoint=point=>point&&Number.isFinite(point.x)&&Number.isFinite(point.y);
const rgb=(color,alpha)=>color+Math.round(alpha*255).toString(16).padStart(2,'0');

export function prepareCGStatisticalLayer(saved,config,type,fit=null,index=0){
  const paired=['Scatter','xyLine','Regression'].includes(type),effective=type==='Bar'?{...config,xList:config.barLists?.[0]??config.xList,freqList:null}:config,rows=cgDataRows({...saved,...effective},paired).filter(row=>row[2]>0),summary=cgSummary(rows,paired,saved.quartile);
  const layer={label:'GPH'+(index+1),color:config.color||saved.colors[config.xList]||'#2563eb',marker:config.marker||'dot',type,summary,points:[],curve:[],bars:[],fit};
  if(paired){layer.points=rows.map(([x,y,w])=>({x,y,w}));if(fit){const min=Math.min(...layer.points.map(p=>p.x)),max=Math.max(...layer.points.map(p=>p.x));layer.curve=Array.from({length:300},(_,i)=>{const x=min+(max-min)*i/299;return {x,y:fit.predict(x)};}).filter(isFinitePoint);}}
  else if(type==='NPPlot'){const sorted=rows.slice().sort((a,b)=>a[0]-b[0]);let total=0;layer.points=sorted.map(([x,,w])=>{const p=(total+w/2)/summary.n;total+=w;return {x:cgDistribution('normal','inverse',{p}),y:x,w};});}
  else if(type==='Hist'||type==='Broken'){
    const start=config.histogramStart??summary.min,binWidth=config.histogramWidth??Math.max((summary.max-summary.min)/Math.ceil(Math.sqrt(rows.length)),1),count=Math.max(1,Math.floor((summary.max-start)/binWidth)+1);if(count>1000)throw Error('Too many histogram bins');
    const bins=Array.from({length:count},(_,i)=>({x:start+i*binWidth,y:0,width:binWidth}));for(const [x,,w]of rows){const bin=Math.floor((x-start)/binWidth);if(bin>=0&&bin<count)bins[bin].y+=w;}
    if(type==='Hist'){layer.bars=bins;layer.points=bins.flatMap(bin=>[{x:bin.x,y:0},{x:bin.x+bin.width,y:bin.y}]);}else layer.points=bins.map(bin=>({x:bin.x+bin.width/2,y:bin.y}));
  }else if(type==='Bar'){
    const indices=config.barLists?.length?config.barLists:[config.xList],lists=indices.map(i=>saved.lists[i]);if(!lists[0]?.length||lists.some(list=>!list||list.length!==lists[0].length))throw Error('Dimension ERROR: bar lists must have equal nonzero lengths');
    if(lists.some(list=>!list.every(Number.isFinite)))throw Error('Domain ERROR: bar graphs require real list elements');
    layer.barSeries=indices.map((list,j)=>({list,color:config.barColors?.[j]||(j===0?layer.color:saved.colors[list])}));
    layer.bars=lists.flatMap((values,j)=>values.map((y,i)=>{const point={x:i+1,y,traceText:'List '+(indices[j]+1)+'['+(i+1)+']='+text(y)};return {x:i+1-.4,y,width:.8,category:i+1,series:j,color:layer.barSeries[j].color,point};}));
    layer.points=layer.bars.map(bar=>bar.point).concat({x:.5,y:0},{x:lists[0].length+.5,y:0});
  }else if(type==='Pie'){
    layer.points=rows.map(([x,,w],i)=>({x:i+1,y:x*w,label:String(i+1)}));
    if(type==='Pie'&&(layer.points.some(p=>p.y<0)||layer.points.reduce((s,p)=>s+p.y,0)<=0))throw Error('Pie values must be nonnegative with positive sum');
  }else if(type==='MedBox'){
    const spread=1.5*(summary.Q3-summary.Q1),regular=config.outliers?rows.filter(r=>r[0]>=summary.Q1-spread&&r[0]<=summary.Q3+spread):rows;
    layer.box={...summary,min:Math.min(...regular.map(r=>r[0])),max:Math.max(...regular.map(r=>r[0])),outliers:config.outliers?rows.filter(r=>r[0]<summary.Q1-spread||r[0]>summary.Q3+spread).map(r=>r[0]):[]};
    layer.points=[['min',summary.min],['Q1',summary.Q1],['Med',summary.median],['Q3',summary.Q3],['max',summary.max]].map(([name,x])=>({x,y:index+1,name}));
  }else if(type==='N-Dist'){
    if(!(summary.sd>0))throw Error('Normal curve requires positive sample SD');
    layer.curve=Array.from({length:300},(_,i)=>{const x=summary.mean-4*summary.sd+8*summary.sd*i/299;return {x,y:cgDistribution('normal','pdf',{x,mu:summary.mean,sigma:summary.sd})};});layer.points=layer.curve.concat({x:summary.mean,y:0});
  }else throw Error('Unknown statistical graph type');
  return layer;
}
function quantile(kind,p,parameters,fallback){try{const q=cgDistribution(kind,'inverse',{...parameters,p});return Number.isFinite(q)?q:fallback;}catch{return fallback;}}
function distributionLayer(descriptor,window){
  const {kind,parameters:p,operation,value}=descriptor,discrete=['binomial','poisson','geometric','hypergeometric'].includes(kind);let min,max;
  if(kind==='normal'){min=(p.mu??0)-4*(p.sigma??1);max=(p.mu??0)+4*(p.sigma??1);}
  else if(kind==='t'){max=Math.min(1000,Math.max(4,quantile(kind,.995,p,10)));min=-max;}
  else if(kind==='chi2'){min=0;max=Math.max(1,Math.min(1e6,quantile(kind,.995,p,p.df*3)));}
  else if(kind==='F'){min=0;max=Math.min(30,Math.max(3,quantile(kind,.99,p,10)));}
  else if(kind==='binomial'){const mean=p.n*p.probability,sd=Math.sqrt(p.n*p.probability*(1-p.probability));min=Math.max(0,Math.floor(mean-5*sd));max=Math.min(p.n,Math.ceil(mean+5*sd));}
  else if(kind==='poisson'){min=Math.max(0,Math.floor(p.lambda-5*Math.sqrt(p.lambda)));max=Math.ceil(p.lambda+5*Math.sqrt(p.lambda));}
  else if(kind==='geometric'){min=1;max=Math.min(10000,quantile(kind,.995,p,20));}
  else {min=Math.max(0,p.draws-(p.population-p.successes));max=Math.min(p.draws,p.successes);}
  if(window){min=window.xmin;max=window.xmax;}if(!(min<max)){min-=.5;max+=.5;}
  let xs;if(discrete){const count=Math.min(501,Math.max(2,Math.ceil(max)-Math.floor(min)+1));xs=[...new Set(Array.from({length:count},(_,i)=>Math.round(min+(max-min)*i/(count-1))))];}else xs=Array.from({length:501},(_,i)=>min+(max-min)*i/500);
  const points=xs.map(x=>{const y=cgDistribution(kind,'pdf',{...p,x});return Number.isFinite(y)?{x,y}:null;});
  const intervals=descriptor.intervals||(operation==='cdf'?[[p.lower??-Infinity,p.upper??p.x]]:operation==='inverse'?[[-Infinity,value]]:[]);
  return {label:descriptor.title||kind,color:'#245cc8',type:discrete?'ProbabilityMass':'Density',points,curve:[],bars:[],discrete,intervals,marker:descriptor.marker??(operation==='pdf'?p.x:operation==='inverse'?value:null),descriptor,xrange:{min,max}};
}

export function renderCGStatisticsPlot({canvas,readout,saved,options}){
  const width=canvas.width,height=canvas.height,margin=24,ctx=canvas.getContext('2d');let layers;
  if(options.distribution)layers=[distributionLayer(options.distribution,options.window)];
  else if(options.multiple){const enabled=saved.graphs.map((g,i)=>({g,i})).filter(({g})=>g.enabled);if(!enabled.length)throw Error('Select at least one statistical graph');layers=enabled.map(({g,i})=>prepareCGStatisticalLayer(saved,g,g.type,null,i));}
  else {const config=options.config||(options.fit?{xList:saved.xList,yList:saved.yList,freqList:saved.freqList,color:saved.colors[saved.xList]}:saved.graphs[saved.graphSelection]);layers=[prepareCGStatisticalLayer(saved,config,options.type||config.type,options.fit,saved.graphSelection)];}
  if(layers.some(layer=>layer.type==='Bar')&&!layers.every(layer=>layer.type==='Bar'))throw Error('Condition ERROR: bar graphs cannot be mixed with other graph types');
  const pie=layers.filter(layer=>layer.type==='Pie');if(pie.length&&pie.length!==layers.length)throw Error('Pie and Cartesian graphs need separate displays');
  const all=layers.flatMap(layer=>layer.points.concat(layer.curve)).filter(isFinitePoint);if(!all.length)throw Error('No finite graph values');
  let xmin=Math.min(...all.map(p=>p.x)),xmax=Math.max(...all.map(p=>p.x)),ymin=Math.min(...all.map(p=>p.y)),ymax=Math.max(...all.map(p=>p.y));
  if(layers.every(layer=>layer.type==='MedBox')){ymin=0;ymax=layers.length+1;}
  if(options.distribution){xmin=layers[0].xrange.min;xmax=layers[0].xrange.max;ymin=0;ymax=Math.max(...all.map(p=>p.y))*1.1||1;}
  const dx=xmax-xmin||Math.max(1,Math.abs(xmin)*.1),dy=ymax-ymin||Math.max(1,Math.abs(ymin)*.1);if(!options.distribution){xmin-=dx*.08;xmax+=dx*.08;ymin-=dy*.1;ymax+=dy*.1;}
  if(options.window){const w=options.window;if(![w.xmin,w.xmax,w.ymin,w.ymax].every(Number.isFinite)||w.xmin>=w.xmax||w.ymin>=w.ymax)throw Error('Invalid view window');({xmin,xmax,ymin,ymax}=w);}
  const X=x=>margin+(x-xmin)/(xmax-xmin)*(width-margin-7),Y=y=>height-margin-(y-ymin)/(ymax-ymin)*(height-margin-8);
  ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);ctx.strokeStyle='#aab0b8';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(margin,6);ctx.lineTo(margin,height-margin);ctx.lineTo(width-4,height-margin);ctx.stroke();ctx.fillStyle='#434a55';ctx.font='11px Arial';ctx.fillText(text(xmin),margin,height-5);ctx.textAlign='right';ctx.fillText(text(xmax),width-5,height-5);ctx.textAlign='left';
  function line(points,color){ctx.strokeStyle=color;ctx.lineWidth=1.8;ctx.beginPath();let connected=false;for(const p of points){if(!isFinitePoint(p)){connected=false;continue;}if(connected)ctx.lineTo(X(p.x),Y(p.y));else ctx.moveTo(X(p.x),Y(p.y));connected=true;}ctx.stroke();}
  const tracePoints=[];ctx.save();ctx.beginPath();ctx.rect(pie.length?0:margin,pie.length?0:5,pie.length?width:width-margin-4,pie.length?height:height-margin-5);ctx.clip();
  let barSeriesOffset=0;const barSeriesCount=layers.reduce((sum,layer)=>sum+(layer.barSeries?.length||0),0);
  layers.forEach((layer,index)=>{
    const color=layer.color;ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=1.8;
    if(layer.type==='Pie'){
      const total=layer.points.reduce((s,p)=>s+p.y,0),radius=Math.min(height*.35,(width/layers.length)*.4),cx=(index+.5)*width/layers.length,cy=height/2;let angle=-Math.PI/2;
      layer.points.forEach((point,i)=>{const end=angle+point.y/total*Math.PI*2;ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,radius,angle,end);ctx.closePath();ctx.fillStyle=saved.colors[i%26];ctx.fill();ctx.strokeStyle='#fff';ctx.stroke();const middle=(angle+end)/2;point.pixel={x:cx+Math.cos(middle)*radius*.65,y:cy+Math.sin(middle)*radius*.65};point.traceText='Category '+(i+1)+': '+text(point.y)+' ('+text(point.y/total*100)+'%)';angle=end;});ctx.fillStyle=color;ctx.fillText(layer.label,cx-radius,cy-radius-4);
    }else if(layer.type==='MedBox'){
      const box=layer.box,mid=layers.every(l=>l.type==='MedBox')?Y(index+1):height-margin-(index+.5)/layers.length*(height-margin-8),half=Math.min(14,(height-margin-8)/layers.length*.24);
      layer.traceY=ymin+(height-margin-mid)/(height-margin-8)*(ymax-ymin);ctx.strokeStyle=color;ctx.beginPath();ctx.moveTo(X(box.min),mid);ctx.lineTo(X(box.max),mid);for(const x of [box.min,box.max]){ctx.moveTo(X(x),mid-6);ctx.lineTo(X(x),mid+6);}ctx.stroke();ctx.fillStyle='#fff';ctx.fillRect(X(box.Q1),mid-half,X(box.Q3)-X(box.Q1),2*half);ctx.strokeRect(X(box.Q1),mid-half,X(box.Q3)-X(box.Q1),2*half);ctx.beginPath();ctx.moveTo(X(box.median),mid-half);ctx.lineTo(X(box.median),mid+half);ctx.stroke();ctx.fillStyle=color;for(const x of box.outliers){ctx.beginPath();ctx.arc(X(x),mid,2.5,0,2*Math.PI);ctx.fill();}
    }else if(layer.descriptor){
      const inside=x=>layer.intervals.some(([lo,hi])=>x>=lo&&x<=hi);ctx.fillStyle=rgb(color,.23);
      if(layer.discrete){for(const point of layer.points.filter(isFinitePoint)){if(inside(point.x)){ctx.fillRect(X(point.x)-Math.max(2,(X(point.x+1)-X(point.x))*.35),Y(point.y),Math.max(4,(X(point.x+1)-X(point.x))*.7),Y(0)-Y(point.y));}ctx.strokeStyle=color;ctx.beginPath();ctx.moveTo(X(point.x),Y(0));ctx.lineTo(X(point.x),Y(point.y));ctx.stroke();}}
      else {let segment=[];const paint=()=>{if(!segment.length)return;ctx.beginPath();ctx.moveTo(X(segment[0].x),Y(0));for(const p of segment)ctx.lineTo(X(p.x),Y(p.y));ctx.lineTo(X(segment.at(-1).x),Y(0));ctx.closePath();ctx.fill();segment=[];};for(const point of layer.points){if(isFinitePoint(point)&&inside(point.x))segment.push(point);else paint();}paint();line(layer.points,color);}
      if(Number.isFinite(layer.marker)){ctx.strokeStyle='#bf2828';ctx.setLineDash([3,2]);ctx.beginPath();ctx.moveTo(X(layer.marker),5);ctx.lineTo(X(layer.marker),height-margin);ctx.stroke();ctx.setLineDash([]);}
    }else if(layer.bars.length){for(const bar of layer.bars){const barWidth=layer.type==='Bar'?.8/barSeriesCount:bar.width,bx=layer.type==='Bar'?bar.category-.4+barWidth*(barSeriesOffset+bar.series):bar.x,barColor=bar.color||color;ctx.fillStyle=rgb(barColor,.45);const y0=Y(0);ctx.fillRect(X(bx),Math.min(y0,Y(bar.y)),Math.max(1,X(bx+barWidth)-X(bx)-1),Math.abs(Y(bar.y)-y0));ctx.strokeStyle=barColor;ctx.strokeRect(X(bx),Math.min(y0,Y(bar.y)),Math.max(1,X(bx+barWidth)-X(bx)-1),Math.abs(Y(bar.y)-y0));if(bar.point)bar.point.pixel={x:X(bx+barWidth/2),y:Y(bar.y)};}barSeriesOffset+=layer.barSeries?.length||0;}
    else {if(layer.type==='N-Dist')line(layer.curve,color);else {if(layer.type==='xyLine'||layer.type==='Broken')line(layer.points,color);ctx.fillStyle=color;for(const p of layer.points){if(!isFinitePoint(p))continue;ctx.beginPath();if(layer.marker==='square')ctx.fillRect(X(p.x)-2.5,Y(p.y)-2.5,5,5);else if(layer.marker==='cross'){ctx.strokeStyle=color;ctx.moveTo(X(p.x)-3,Y(p.y)-3);ctx.lineTo(X(p.x)+3,Y(p.y)+3);ctx.moveTo(X(p.x)+3,Y(p.y)-3);ctx.lineTo(X(p.x)-3,Y(p.y)+3);ctx.stroke();}else {ctx.arc(X(p.x),Y(p.y),2.4,0,2*Math.PI);ctx.fill();}}}if(layer.fit)line(layer.curve,'#c93a2e');}
    for(const point of layer.points.filter(isFinitePoint))tracePoints.push({...point,...(layer.traceY!==undefined?{y:layer.traceY}:{}),layer:index,label:layer.label});
  });
  ctx.restore();
  ctx.save();ctx.beginPath();ctx.rect(margin,5,width-margin-4,height-margin-5);ctx.clip();ctx.strokeStyle='#121212';ctx.fillStyle='#121212';ctx.font='13px Arial';for(const item of saved.sketches||[]){ctx.beginPath();if(item.kind==='point'){ctx.arc(X(item.x),Y(item.y),2.5,0,2*Math.PI);ctx.fill();}else if(item.kind==='line'){ctx.moveTo(X(item.x),Y(item.y));ctx.lineTo(X(item.x2),Y(item.y2));ctx.stroke();}else if(item.kind==='circle'){ctx.ellipse(X(item.x),Y(item.y),Math.abs(X(item.x+item.r)-X(item.x)),Math.abs(Y(item.y+item.r)-Y(item.y)),0,0,2*Math.PI);ctx.stroke();}else ctx.fillText(item.text,X(item.x),Y(item.y));}ctx.restore();
  layers.forEach((layer,i)=>{ctx.fillStyle=layer.color;ctx.font='10px Arial';ctx.fillText(layer.label,margin+70*i,13);});
  const base=ctx.getImageData(0,0,width,height),state={bounds:{xmin,xmax,ymin,ymax},points:tracePoints,index:0,layers:layers.length,trace(index){if(!tracePoints.length)return;this.index=(index+tracePoints.length)%tracePoints.length;const p=tracePoints[this.index],screen=p.pixel||{x:X(p.x),y:Y(p.y)};ctx.putImageData(base,0,0);ctx.strokeStyle='#111';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(screen.x-5,screen.y);ctx.lineTo(screen.x+5,screen.y);ctx.moveTo(screen.x,screen.y-5);ctx.lineTo(screen.x,screen.y+5);ctx.stroke();readout.textContent=p.label+' '+(p.traceText|| (p.name?p.name+'='+text(p.x):'x='+text(p.x)+'  y='+text(p.y)));},layer(delta){if(!tracePoints.length)return;const current=tracePoints[this.index],next=(current.layer+delta+layers.length)%layers.length,candidates=tracePoints.map((p,i)=>({p,i})).filter(({p})=>p.layer===next);if(candidates.length){const best=candidates.reduce((a,b)=>Math.abs(a.p.x-current.x)<Math.abs(b.p.x-current.x)?a:b);this.trace(best.i);}},pointer(clientX,clientY){const bounds=canvas.getBoundingClientRect(),x=xmin+((clientX-bounds.left)/bounds.width*width-margin)/(width-margin-7)*(xmax-xmin);if(tracePoints.length){const sx=(clientX-bounds.left)/bounds.width*width,sy=(clientY-bounds.top)/bounds.height*height,distance=p=>p.pixel?Math.hypot(p.pixel.x-sx,p.pixel.y-sy):Math.abs(p.x-x);let best=0;for(let i=1;i<tracePoints.length;i++)if(distance(tracePoints[i])<distance(tracePoints[best]))best=i;this.trace(best);}}};
  const distribution=layers[0].descriptor;readout.textContent=distribution?(distribution.label||distribution.operation.toUpperCase())+' = '+text(distribution.value):layers.length>1?layers.map(layer=>layer.label+': '+layer.type).join('  '):'n='+layers[0].summary.n+'  x̄='+text(layers[0].summary.mean)+'  sx='+text(layers[0].summary.sd);
  return state;
}
