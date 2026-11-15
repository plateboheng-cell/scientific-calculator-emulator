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
const lcdGrid='M7 1h22v14H7zM9 3v2h18V3zm0 4v2h4V7zm6 0v2h5V7zm7 0v2h5V7zM9 11v2h4v-2zm6 0v2h5v-2zm7 0v2h5v-2z';
const lcdDrawings={
  calc:'<path d="M5 2l5 5m0-5L5 7" fill="none" stroke="currentColor" stroke-width="2"/><path d="M17 1h3v2h-3zm-3 3h9v2h-9zm3 3h3v2h-3zm-5 1h2v2h3v2h-3v3h-2v-3H9v-2h3zm8 3h11v2H20z"/>',
  stat:'<path class="cw-lcd-mid" d="M7 1h2v12h22v2H7z"/><path d="M11 13V6h5v7zm7 0V1h5v12zm7 0V8h5v5z"/><path class="cw-lcd-light" d="M12 8h2v5h-2zm7-5h2v10h-2zm7 7h2v3h-2z"/>',
  distribution:'<path class="cw-lcd-mid" d="M4 13h29v2H4z"/><path class="cw-lcd-light" d="M8 13v-2h3V8h2V5h2V3h3v10zM19 3h2v2h2v4h2v2h3v2h-9z"/><path d="M5 11h4v-1h2V7h2V4h2V2h3V1h2v1h2v2h2v3h2v3h2v1h3v2h-4v-1h-2v-2h-1V8h-2V5h-2V3h-2v10h-2V4h-1v2h-2v4h-2v2H9v1H5z"/>',
  spreadsheet:'<path class="cw-lcd-mid" fill-rule="evenodd" d="'+lcdGrid+'"/><path d="M8 2h20v3H8zM8 6h4v8H8z"/>',
  table:'<path class="cw-lcd-mid" fill-rule="evenodd" d="M7 1h22v14H7zm2 2v2h18V3zm0 4v6h8V7zm10 0v6h8V7z"/><path d="M10 8h5v1h-3v2h3v1h-5zm10 0h5v4h-5zm1 1v2h3V9z" fill-rule="evenodd"/>',
  equation:'<path class="cw-lcd-light" d="M1 13h34v2H1z"/><text x="18" y="12">XY=0</text>',
  inequality:'<path class="cw-lcd-light" d="M1 13h34v2H1z"/><text x="18" y="12">XY&gt;0</text>',
  complex:'<path fill-rule="evenodd" d="M5 1h26v14H5zm2 2v10h22V3z"/><path class="cw-lcd-mid" d="M18 3h11v10H18z"/><path d="M11 5h2v2h-2zm0 3h2v3h2v1h-5v-1h1z"/><path d="M20 11h2V9h2V7h2V5h2v2h-2v2h-2v2h-2v1h-2z" fill="var(--lcd)"/>',
  base:'<path class="cw-lcd-light" d="M2 13h8v-1h8v-2h8V8h8v2h-7v2h-8v2h-8v1H2z"/><text class="cw-lcd-icon-small" x="4" y="12">2</text><text class="cw-lcd-icon-small" x="12" y="10">8</text><text class="cw-lcd-icon-small" x="21" y="8">10</text><text class="cw-lcd-icon-small" x="30" y="7">16</text>',
  matrix:'<path class="cw-lcd-mid" d="M7 1h4v2H9v10h2v2H7zm18 0h4v14h-4v-2h2V3h-2z"/><path fill-rule="evenodd" d="M12 2h5v5h-5zm7 0h5v5h-5zM12 9h5v5h-5zm7 0h5v5h-5zm-6-6v3h3V3zm7 0v3h3V3zm-7 7v3h3v-3zm7 0v3h3v-3z"/>',
  vector:'<path class="cw-lcd-mid" d="M12 3h2V1h2v2h2v3h-2v5h7V9h2v2h2v2h-2v2h-2v-2H14V6h-2z"/><path d="M15 11h2V9h2V7h2V5h-2V3h6v6h-2V7h-2v2h-2v2h-2v2h-2z"/>',
  ratio:'<path class="cw-lcd-light" d="M0 12h36v2H0z"/><path fill-rule="evenodd" d="M4 3h10v9H4zm2 2v5h6V5zM22 3h10v9H22zm2 2v5h6V5zM17 5h2v2h-2zm0 4h2v2h-2z"/>',
};
function homeIcon(mode,native){
  return native
    ? '<svg class="cw-lcd-home-icon" viewBox="0 0 36 16" shape-rendering="crispEdges" aria-hidden="true">'+(lcdDrawings[mode]||'')+'</svg>'
    : '<svg viewBox="0 0 34 30" aria-hidden="true">'+(drawings[mode]||'')+'</svg>';
}
export function cwHomeHTML(modes,selected,native=false){
  const page=Math.floor(selected/6);
  return `<div class="mode-grid cw-home-grid" aria-label="主屏幕">${modes.map((mode,i)=>`<button class="mode-tile ${i===selected?'selected':''}" data-mode="${i}" ${Math.floor(i/6)===page?'':'hidden'} aria-label="${esc(labels[mode[3]])}"><span class="symbol">${homeIcon(mode[3],native)}</span><span class="cw-home-label">${esc(labels[mode[3]])}</span></button>`).join('')}</div><div class="cw-home-scroll" aria-hidden="true"><i style="top:${page*50}%"></i></div>`;
}
export function updateCwHomePage(host,selected){
  const page=Math.floor(selected/6);
  host.querySelectorAll('.cw-home-grid .mode-tile').forEach((tile,i)=>{tile.hidden=Math.floor(i/6)!==page;});
  const indicator=host.querySelector('.cw-home-scroll i');if(indicator)indicator.style.top=page*50+'%';
}
