import {esc} from './html.js';

// Original monochrome vectors, arranged like the X/EX four-column icon menu.
const icons={
  calc:'<path d="M4 9h10M9 4v10M21 9h10M5 20l8 8m0-8-8 8M21 21h10m-10 6h10"/>',
  complex:'<text x="4" y="24">i ∠</text>',base:'<text x="1" y="13">2 8</text><text x="1" y="28">10 16</text>',
  matrix:'<path d="M8 3H3v27h5m19-27h5v27h-5"/><rect x="11" y="8" width="5" height="5"/><rect x="21" y="8" width="5" height="5"/><rect x="11" y="20" width="5" height="5"/><rect x="21" y="20" width="5" height="5"/>',
  vector:'<path d="M3 20h27m-7-7 7 7-7 7M8 26V4m-5 7 5-7 5 7"/>',
  stat:'<path d="M3 29h28M7 28V16h5v12m5 0V5h5v23m5 0V11h4v17"/>',
  table:'<rect x="3" y="5" width="29" height="24"/><path d="M3 13h29M3 21h29M13 5v24"/>',
  equation:'<text x="2" y="12">x y</text><text x="2" y="28">= 0</text>',
  inequality:'<text x="2" y="23">x&gt;0</text>',ratio:'<text x="1" y="23">A:B</text>',
  distribution:'<path d="M2 29h31M3 27C11 27 10 5 17 5s6 22 15 22"/>',
  spreadsheet:'<rect x="3" y="4" width="29" height="25"/><path d="M3 12h29M3 20h29M12 4v25M22 4v25"/>',
};
const shortcut=index=>index<9?String(index+1):String.fromCharCode(65+index-9);
const startRow=selected=>Math.max(0,Math.ceil((selected-7)/4))*4;
export function classwizMenuHTML(modes,selected=0){
  const start=startRow(selected),mode=modes[selected];
  return `<div class="classwiz-menu-grid mode-grid" aria-label="主菜单">${modes.map((m,i)=>`<button type="button" class="mode-tile ${i===selected?'selected':''}" data-mode="${i}" aria-label="${esc(m[0])}" ${i>=start&&i<start+8?'':'hidden'}><svg viewBox="0 0 35 34" aria-hidden="true">${icons[m[3]]||''}</svg><span class="classwiz-menu-number">${shortcut(i)}</span></button>`).join('')}</div><div class="classwiz-menu-footer"><span data-classwiz-shortcut>${shortcut(selected)}:</span><span data-classwiz-label>${esc(mode[0])}</span><span class="classwiz-menu-page" aria-hidden="true">${start?'▴':'▾'}</span></div>`;
}
export function updateClasswizMenu(host,modes,selected){
  const start=startRow(selected);
  host.querySelectorAll('.classwiz-menu-grid .mode-tile').forEach((tile,i)=>{tile.hidden=i<start||i>=start+8;});
  host.querySelector('[data-classwiz-shortcut]').textContent=shortcut(selected)+':';
  host.querySelector('[data-classwiz-label]').textContent=modes[selected][0];
  host.querySelector('.classwiz-menu-page').textContent=start?'▴':'▾';
}
