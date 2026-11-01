import {cwKeyboardHTML} from './cw-keyboard.js';
import {esc} from './html.js';
const nav=`<div class="nav physical-nav" aria-label="方向键"><button class="up" data-action="up" aria-label="上">▲</button><button class="left" data-action="left" aria-label="左">◀</button><button class="right" data-action="right" aria-label="右">▶</button><button class="down" data-action="down" aria-label="下">▼</button></div>`;
export function physicalKeyboardHTML(model,keyHTML){
  if(['x','ex'].includes(model.family)){
    const side=keys=>keys.map((key,i)=>{
      let html=keyHTML(key,'small'+(i<2?' classwiz-round':''));
      if(i<2)html=html.replace('<div class="secondary">','<span class="classwiz-control-caption">'+esc(key[0])+(key[2]?'<small>'+esc(key[2])+'</small>':'')+'</span><div class="secondary">');
      return html;
    }).join('');
    return `<div class="physical-keyboard physical-classwiz"><div class="classwiz-controls"><div class="side-controls">${side(model.keyboard.controls.left)}</div>${nav.replace('physical-nav','classwiz-nav')}<div class="side-controls">${side(model.keyboard.controls.right)}</div></div><div class="classwiz-science">${model.keyboard.science.map(key=>keyHTML(key)).join('')}</div><div class="classwiz-digits">${model.keyboard.digits.map((key,i)=>keyHTML(key,['delete','clear'].includes(key[1])?'blue':i===17||i===18?'compact':'')).join('')}</div></div>`;
  }
  if(model.family==='cw'&&model.keyboard.physicalLayout)return cwKeyboardHTML(model.keyboard.physicalLayout,keyHTML);
  if(model.family==='cg'&&model.keyboard.functionKeys){
    const keys=model.keyboard;
    return `<div class="physical-keyboard physical-cg"><div class="physical-function-keys">${keys.functionKeys.map(key=>keyHTML(key,'physical-function')).join('')}</div><div class="physical-cg-control"><div class="physical-cg-left">${keys.controlRows.flat().map(key=>keyHTML(key,'small')).join('')}</div>${nav}</div><div class="physical-cg-science">${keys.science.map(key=>keyHTML(key)).join('')}</div><div class="physical-cg-digits">${keys.digits.map(key=>keyHTML(key,['delete','cg-clear-on'].includes(key[1])?'blue':'')).join('')}</div></div>`;
  }
  const layout=model.keyboard.physicalLayout;
  if(model.family==='ti'&&layout){
    return `<div class="physical-keyboard physical-ti"><div class="physical-ti-control"><div class="physical-ti-left">${layout.topRows.flat().map(key=>keyHTML(key,'small')).join('')}</div>${nav}</div><div class="physical-ti-main">${layout.rows.flat().map(key=>keyHTML(key,/^\d$/.test(key[0])?'numeric':'')).join('')}</div></div>`;
  }
  return '';
}
