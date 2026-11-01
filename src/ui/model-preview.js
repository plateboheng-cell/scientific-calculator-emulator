import {esc} from './html.js';
import {translate} from '../i18n.js';

// Original vectors generated from the working model's physical key data.
// No manufacturer artwork, embedded controls, made-up results or DOM IDs.
const rect=(x,y,w,h,r,fill,stroke='')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}"${stroke?` stroke="${stroke}" stroke-width="1.5"`:''}/>`;
const text=(x,y,label,size=12,fill='#e6e9e8',anchor='middle')=>`<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" text-anchor="${anchor}">${esc(label)}</text>`;
function keyHTML(key,x,y,w,h,{round=false,light=false,blue=false,language='zh'}={}) {
  const color=blue?'#527ba4':light?'#d5d9d7':'#303a3c',ink=blue?'#edf1ed':light?'#25312e':'#edf1ed';
  let html=rect(x,y+2,w,h,round?w/2:6,'#111818')+rect(x,y,w,h,round?w/2:6,color,light?'#a1aba7':'#535f5e');
  if(key[1]==='frac'&&key[0]==='□/□'){
    const cx=x+w/2,cy=y+h/2;
    html+=rect(cx-4,cy-10,8,6,0,'none',ink)+`<path d="M${cx-9} ${cy}h18" stroke="${ink}" stroke-width="1.5"/>`+rect(cx-4,cy+4,8,6,0,'none',ink);
  }else{
    const lines=translate(key[0],language).split('\n'),size=Math.min(h*.52,lines.length>1?9:15,key[0].length>5?9:16);
    lines.forEach((line,i)=>{html+=text(x+w/2,y+h/2+(i-(lines.length-1)/2)*(size+1)+size*.35,line,size,ink);});
  }
  return html;
}
function rowsHTML(keys,columns,x,y,w,h,gapX,gapY,options={}) {
  return keys.map((key,i)=>keyHTML(key,x+(i%columns)*(w+gapX),y+Math.floor(i/columns)*(h+gapY),w,h,{...options,light:options.light||(options.numericLight&&/^\d$/.test(key[0])),blue:['delete','clear','cg-clear-on'].includes(key[1])&&!options.white})).join('');
}
function navHTML(cx,cy,rx=42,ry=38){
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#c1c9c6" stroke="#646e6c" stroke-width="2"/><ellipse cx="${cx}" cy="${cy}" rx="${rx*.34}" ry="${ry*.36}" fill="#adb8b3" stroke="#858f89"/><path d="M${cx-4} ${cy-ry+12}l4-4 4 4M${cx-4} ${cy+ry-12}l4 4 4-4M${cx-rx+12} ${cy-4}l-4 4 4 4M${cx+rx-12} ${cy-4}l4 4-4 4" fill="none" stroke="#52605b" stroke-width="1.7"/>`;
}
function solarHTML(x,y,w,h){
  return rect(x,y,w,h,5,'#342824','#141b1b')+Array.from({length:3},(_,i)=>`<path d="M${x+(i+1)*w/4} ${y+2}v${h-4}" stroke="#57463d" stroke-width="1"/>`).join('');
}
function screenHTML(y,h,{color=false,white=false,lcd}={}){
  return rect(22,y,296,h,8,white?'#b5beb6':'#141e1d','#68736d')+rect(29,y+7,282,h-17,3,lcd||(color?'#e3ebef':'#c0ccb4'));
}
function classicHTML(model,language){
  const keyboard=model.keyboard;
  let content=rect(5,5,330,739,39,'#aeb1ae','#d3d8d5')+rect(11,10,318,728,35,'#272d29','#555e56');
  for(let y=20;y<729;y+=8)content+=`<path d="M17 ${y}h306" stroke="#b9c5c0" stroke-opacity=".035"/>`;
  content+=text(25,62,model.name,13,'#e1e5e1','start')+text(25,83,'ClassWiz',12,'#d06f88','start')+solarHTML(176,22,136,64)+screenHTML(104,153,{lcd:model.family==='ex'?'#c8d9cd':undefined});
  const sideHTML=(keys,x)=>keys.map((key,i)=>{
    const keyX=x+(i%2)*56;
    if(i<2){
      const cx=keyX+22.5,cy=296,labelColor=key[1]==='shift'?'#e0bf6c':key[1]==='alpha'?'#db7e98':'#cad3cb';
      return text(cx,274,translate(key[0],language),8,labelColor)+`<circle cx="${cx}" cy="${cy+2}" r="14" fill="#111b14"/><circle cx="${cx}" cy="${cy}" r="14" fill="#aeb9b0" stroke="#5c6c5e" stroke-width="1.5"/><path d="M${cx-10} ${cy-4}q10-13 20 0" stroke="#e1e9e1" stroke-width="2" fill="none"/>`;
    }
    const keyY=337+Math.floor((i-2)/2)*42;
    return keyHTML(key,keyX,keyY,45,27,{language})+(key[2]?text(keyX+22.5,keyY-5,translate(key[2],language),7,'#e0bf6c'):'');
  }).join('');
  content+=sideHTML(keyboard.controls.left,25)+sideHTML(keyboard.controls.right,211)+navHTML(170,320,52,38);
  content+=rowsHTML(keyboard.science,6,25,401,40,28,10,18,{language})+rowsHTML(keyboard.digits,5,24,552,49,33,12,13,{language,light:true});
  return {content,height:750};
}
function cwHTML(model,language){
  const white=model.appearance?.includes('white'),layout=model.keyboard.physicalLayout;
  let content=rect(5,5,330,749,34,white?'#d9dfd8':'#252f2d',white?'#a5b2a7':'#66726b');
  content+=text(29,66,model.name,12,white?'#3a4940':'#e2e7df','start')+solarHTML(166,23,146,63)+screenHTML(105,137,{white});
  const controls=[['on',0,0],['home',1,0],['setup',0,1],['back',1,1],['up',3,0],['left',2,1],['ok',3,1],['right',4,1],['shift',0,2],['variables',1,2],['definitions',2,2],['down',3,2],['catalog',4,2],['tools',5,2]];
  const labels={on:'⏻',home:'⌂',setup:'☷',back:'↶',up:'⌃',left:'‹',ok:'OK',right:'›',shift:'⇧',variables:'↔x',definitions:'f(x)',down:'⌄',catalog:'▤',tools:'•••'};
  for(const [name,col,row] of controls)content+=keyHTML([labels[name],layout.controlKeys[name][1]],28+col*49,264+row*44,32,32,{round:true,light:white,blue:name==='shift'&&!white,language});
  content+=rect(279,263,30,75,15,white?'#bdc9bf':'#3c4943','#1d2922')+text(294,288,'⌃',23,white?'#526b57':'#182a1d')+text(294,325,'⌄',23,white?'#526b57':'#182a1d');
  content+=rowsHTML(layout.scienceRows.flat(),6,24,411,37,37,14,15,{round:true,light:white,language})+rowsHTML(layout.digitRows.flat(),5,23,528,46,46,16,12,{round:true,light:white,white,language});
  return {content,height:760};
}
function cgHTML(model,language){
  const keyboard=model.keyboard;
  let content=rect(5,5,330,729,35,'#b8c0bd','#e0e4e1')+rect(10,10,320,718,32,'#1a262b','#4b5759');
  content+=text(309,45,model.name,14,'#e3e9e6','end')+screenHTML(68,217,{color:true});
  content+=rowsHTML(keyboard.functionKeys,6,27,298,33,22,18,0,{language,light:true})+rowsHTML(keyboard.controlRows.flat(),4,25,342,42,25,10,15,{language})+navHTML(276,374,34,34);
  content+=rowsHTML(keyboard.science,6,24,438,40,27,10,16,{language})+rowsHTML(keyboard.digits,5,23,540,49,31,12,13,{language,light:true});
  return {content,height:740};
}
function tiHTML(model,language){
  const layout=model.keyboard.physicalLayout;
  let content=rect(5,5,330,749,37,'#253942','#52656a');
  content+=text(170,47,model.name,23,'#e3eae6')+solarHTML(99,67,142,39)+screenHTML(129,109)+rowsHTML(layout.topRows.flat(),3,25,267,48,27,13,13,{language})+navHTML(267,304,41,31)+rowsHTML(layout.rows.flat(),5,25,378,48,30,13,19,{language,numericLight:true});
  return {content,height:760};
}

export function modelPreviewHTML(model,language='zh') {
  if(!model.keyboard)return `<span class="model-preview model-preview-planned" data-model-preview="${esc(model.id)}" aria-hidden="true" inert><span>${esc(model.name.replace(/^fx-/,'').replace(/\s/g,''))}</span></span>`;
  const drawing=model.family==='cw'?cwHTML(model,language):model.family==='cg'?cgHTML(model,language):model.family==='ti'?tiHTML(model,language):classicHTML(model,language);
  return `<span class="model-preview" data-model-preview="${esc(model.id)}" aria-hidden="true" inert><svg viewBox="0 0 340 ${drawing.height}" fill="none" focusable="false" xmlns="http://www.w3.org/2000/svg">${drawing.content}</svg></span>`;
}
