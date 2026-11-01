import {esc} from './html.js';

const labels={calc:'计算',stat:'统计',distribution:'分布',spreadsheet:'数据表格',table:'函数表格',equation:'方程',inequality:'不等式',complex:'复数',base:'基数',matrix:'矩阵',vector:'向量',ratio:'比例式'};
const drawings={
  calc:'<text x="4" y="12">+ −</text><text x="4" y="25">× ÷</text>',
  stat:'<path d="M3 25h29M6 23V14h5v9m5 0V5h5v18m5 0V10h5v13"/>',
  distribution:'<path d="M2 25h30M3 24C12 24 10 5 17 5S22 24 31 24"/>',
  spreadsheet:'<rect x="3" y="4" width="28" height="22"/><path d="M3 11h28M3 18h28M12 4v22M22 4v22M3 7h28"/>',
  table:'<rect x="3" y="4" width="28" height="22"/><path d="M3 11h28M3 18h28M12 4v22M22 4v22"/>',
  equation:'<text x="1" y="20">xy=0</text>',inequality:'<text x="1" y="20">x&gt;0</text>',
  complex:'<text x="1" y="20">a+bi</text>',base:'<text x="2" y="12">101</text><text x="2" y="25">HEX</text>',
  matrix:'<path d="M6 3H2v24h4M28 3h4v24h-4"/><text x="8" y="13">1 0</text><text x="8" y="25">0 1</text>',
  vector:'<path d="M3 15h28m-6-6 6 6-6 6"/><text x="10" y="11">v</text>',ratio:'<text x="1" y="20">A:B</text>',
};
export function cwHomeHTML(modes,selected){
  const page=Math.floor(selected/6);
  return `<div class="mode-grid cw-home-grid" aria-label="主屏幕">${modes.map((mode,i)=>`<button class="mode-tile ${i===selected?'selected':''}" data-mode="${i}" ${Math.floor(i/6)===page?'':'hidden'} aria-label="${esc(labels[mode[3]])}"><span class="symbol"><svg viewBox="0 0 34 30" aria-hidden="true">${drawings[mode[3]]||''}</svg></span><span class="cw-home-label">${esc(labels[mode[3]])}</span></button>`).join('')}</div><div class="cw-home-scroll" aria-hidden="true"><i style="top:${page*50}%"></i></div>`;
}
export function updateCwHomePage(host,selected){
  const page=Math.floor(selected/6);
  host.querySelectorAll('.cw-home-grid .mode-tile').forEach((tile,i)=>{tile.hidden=Math.floor(i/6)!==page;});
  const indicator=host.querySelector('.cw-home-scroll i');if(indicator)indicator.style.top=page*50+'%';
}
