import {esc} from './html.js';

// Original SVG geometry and CSS, not a product-photo skin or manufacturer logo.
const icon=body=>`<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
const icons={
  on:icon('<path d="M12 3v8M7 5a8 8 0 1 0 10 0"/>'),
  home:icon('<path d="m3 11 9-8 9 8M6 9v11h12V9M10 20v-7h4v7"/>'),
  setup:icon('<path d="M4 6h16M4 12h16M4 18h16M8 3v6m8 0v6m-6 0v6"/>'),
  back:icon('<path d="m9 5-5 5 5 5M4 10h11a5 5 0 0 1 0 10H7"/>'),
  shift:icon('<path d="m4 11 8-8 8 8h-5v10H9V11z"/>'),
  variables:'↔x',definitions:'f(x)',catalog:icon('<path d="M3 5q5-2 9 1 4-3 9-1v14q-5-2-9 1-4-3-9-1zM12 6v14"/>'),
  tools:'•••',up:icon('<path d="m6 15 6-6 6 6"/>'),down:icon('<path d="m6 9 6 6 6-6"/>'),
  left:icon('<path d="m15 6-6 6 6 6"/>'),right:icon('<path d="m9 6 6 6-6 6"/>'),ok:'OK',
  pageUp:icon('<path d="m6 11 6-6 6 6M6 19l6-6 6 6"/>'),pageDown:icon('<path d="m6 5 6 6 6-6M6 13l6 6 6-6"/>'),
};
export function cwKeyboardHTML(layout,keyHTML){
  const key=(name,caption='')=>{
    const data=layout.controlKeys[name];
    let html=keyHTML(data,'cw-control cw-'+name);
    html=html.replace(esc(data[0])+'</button>',(icons[name]||esc(data[0]))+'</button>');
    if(caption)html=html.replace('<div class="secondary">','<span class="cw-key-caption">'+esc(caption)+'</span><div class="secondary">');
    return html;
  };
  return `<div class="physical-keyboard physical-cw"><div class="cw-controls">${key('on','开机')}${key('home','主屏幕')}${key('setup','设置')}${key('back')}${key('up')}${key('left')}${key('ok')}${key('right')}${key('shift')}${key('variables','变量')}${key('definitions','功能')}${key('down')}${key('catalog','目录')}${key('tools','工具')}<div class="cw-page-keys">${key('pageUp')}${key('pageDown')}</div></div><div class="cw-science">${layout.scienceRows.flat().map(k=>keyHTML(k)).join('')}</div><div class="cw-digits">${layout.digitRows.flat().map(k=>keyHTML(k)).join('')}</div></div>`;
}
