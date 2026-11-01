import {esc} from './html.js';
export {esc};

export function createCGShell(host,title){
  const abort=new AbortController();
  host.innerHTML=`<section class="cg-workspace" data-user-content><header><strong>${esc(title)}</strong><span data-cg-subtitle></span></header><div class="cg-workspace-body"></div><div class="cg-workspace-error" role="alert"></div><div class="cg-workspace-softkeys"></div></section>`;
  const root=host.firstElementChild,body=root.querySelector('.cg-workspace-body'),error=root.querySelector('.cg-workspace-error');
  return {root,body,signal:abort.signal,error(message=''){error.textContent=String(message);},soft(labels,run){const bar=root.querySelector('.cg-workspace-softkeys');bar.innerHTML=labels.map((label,i)=>`<button type="button" data-cg-soft="${i+1}">${esc(label)}</button>`).join('');bar.querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>run(Number(button.dataset.cgSoft)),{signal:abort.signal}));},destroy(){abort.abort();}};
}

export function cgForm(fields,values={}){
  return '<form>'+fields.map(field=>{
    const [key,label,type='text',fallback='',options=[]]=field,value=values[key]??fallback;
    const control=type==='select'?`<select name="${key}" aria-label="${esc(label)}">${options.map(([v,text])=>`<option value="${esc(v)}"${String(value)===String(v)?' selected':''}>${esc(text)}</option>`).join('')}</select>`:type==='textarea'?`<textarea name="${key}" aria-label="${esc(label)}">${esc(value)}</textarea>`:`<input name="${key}" aria-label="${esc(label)}" value="${esc(value)}"${type==='number'?' inputmode="decimal"':''}>`;
    return `<label><span>${esc(label)}</span>${control}</label>`;
  }).join('')+'<button type="submit" hidden>EXE</button></form>';
}
export const cgValues=body=>Object.fromEntries(new FormData(body.querySelector('form')));
export function cgTable(headers,rows){return `<table><thead><tr>${headers.map(x=>`<th>${esc(x)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(x=>`<td>${esc(typeof x==='number'?Number(x.toPrecision(10)):x??'')}</td>`).join('')}</tr>`).join('')}</tbody></table>`;}
export function downloadCGData(name,data,type='application/json'){
  const blob=new Blob([typeof data==='string'?data:JSON.stringify(data,null,2)],{type}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function drawCGPlot(canvas,series,window=null){
  let xmin=Infinity,xmax=-Infinity,ymin=Infinity,ymax=-Infinity;
  for(const item of series)for(const p of item.points||item)if(p&&Number.isFinite(p.x)&&Number.isFinite(p.y)){xmin=Math.min(xmin,p.x);xmax=Math.max(xmax,p.x);ymin=Math.min(ymin,p.y);ymax=Math.max(ymax,p.y);}
  if(window)({xmin,xmax,ymin,ymax}=window);else{if(!Number.isFinite(xmin))({xmin,xmax,ymin,ymax}={xmin:-10,xmax:10,ymin:-10,ymax:10});if(xmin===xmax){xmin-=1;xmax+=1;}if(ymin===ymax){ymin-=1;ymax+=1;}const pad=(ymax-ymin)*.08;ymin-=pad;ymax+=pad;}
  if(!(xmin<xmax&&ymin<ymax))throw Error('Invalid graph window');
  const width=canvas.width,height=canvas.height,ctx=canvas.getContext('2d'),x=v=>(v-xmin)/(xmax-xmin)*width,y=v=>height-(v-ymin)/(ymax-ymin)*height;
  ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);ctx.save();ctx.beginPath();ctx.rect(0,0,width,height);ctx.clip();ctx.strokeStyle='#777';ctx.lineWidth=1;ctx.beginPath();if(xmin<=0&&xmax>=0){ctx.moveTo(x(0),0);ctx.lineTo(x(0),height);}if(ymin<=0&&ymax>=0){ctx.moveTo(0,y(0));ctx.lineTo(width,y(0));}ctx.stroke();
  series.forEach((item,index)=>{const points=item.points||item;ctx.strokeStyle=item.color||['#00f','#e00000','#008400','#a000a0'][index%4];ctx.fillStyle=ctx.strokeStyle;ctx.lineWidth=1.5;ctx.beginPath();let previous=null;for(const point of points){if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.y)){previous=null;continue;}const px=x(point.x),py=y(point.y);if(item.scatter){ctx.moveTo(px+2,py);ctx.arc(px,py,2,0,2*Math.PI);}else if(previous&&Math.abs(py-previous.y)<height*3)ctx.lineTo(px,py);else ctx.moveTo(px,py);previous={x:px,y:py};}ctx.stroke();});ctx.restore();return {xmin,xmax,ymin,ymax};
}

// RFC4180-style CSV parsing, including quoted separators/newlines and escaped quotes.
export function parseCGCSV(text){
  if(typeof text!=='string'||text.length>1000000)throw Error('CSV is too large');
  const rows=[],row=[];let value='',quoted=false;
  for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){value+='"';i++;}else if(quoted||!value)quoted=!quoted;else value+=c;}else if(c===','&&!quoted){row.push(value);value='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(value);rows.push(row.splice(0));value='';}else value+=c;}
  if(quoted)throw Error('Unclosed CSV quote');if(value||row.length){row.push(value);rows.push(row);}return rows;
}
export function encodeCGCSV(rows){return rows.map(row=>row.map(value=>{const s=String(value??'');return /[",\r\n]/.test(s)?'"'+s.replaceAll('"','""')+'"':s;}).join(',')).join('\r\n');}
