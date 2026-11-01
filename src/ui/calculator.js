import {physicalKeyboardHTML} from './physical-keyboard.js';
import {APP_NAME} from '../brand.js';
import {esc} from './html.js';
import {keySymbolHTML,shiftKeySymbolHTML} from './key-symbols.js';
export function keyHTML(k,kind=''){
  const symbol=keySymbolHTML(k),label=symbol?'分数':k[0];
  const secondary=`<span class="shift">${shiftKeySymbolHTML(k)||esc(k[2]||'')}</span><span class="alpha">${esc(k[4]||'')}</span>${k[6]?`<span class="base-legend">${esc(k[6])}</span>`:''}`;
  const title=esc(label)+(k[2]?' · SHIFT '+esc(k[2]):'')+(k[4]?' · ALPHA '+esc(k[4]):'')+(k[6]?' · Base-N '+esc(k[6]):'');
  return `<div class="key-wrap ${kind}"><div class="secondary">${secondary}</div><button class="key" type="button" data-action="${esc(k[1])}" data-shift="${esc(k[3]||'')}" data-alpha="${esc(k[5]||'')}" title="${title}" aria-label="${esc(label)}">${symbol||esc(k[0])}</button></div>`;
}

export function calculatorHTML(model) {
return `<section class="calculator model-${model.family} ${model.appearance||''}" aria-label="${esc(APP_NAME)}">${modelHeaderHTML(model)}<div class="screen-rim"><div class="status"><span id="shift-ind" class="muted">S</span><span id="alpha-ind" class="muted">A</span><span id="memory-ind" class="muted">M</span><span id="angle-ind">D</span><span id="format-ind">Math</span><span id="mode-label">计算</span></div><section class="lcd" id="screen" aria-label="计算器屏幕"></section></div>${keyboardHTML(model)}<div class="foot">${model.family==='ti'?'<button class="help-button" data-action="menu">应用菜单</button>':''}<button class="help-button" data-action="models">切换型号</button><button class="help-button" data-action="cover" title="重播揭盖动画">揭盖</button><button class="help-button" data-action="language" aria-label="语言 / Language">中文 / English</button><button class="help-button" data-action="help">${model.graphing?'键盘帮助':'F1 键盘帮助'}</button></div></section><dialog id="help"><button id="help-close">关闭 Esc</button><h2>键盘操作</h2><table><tbody>${helpRows(model).map(([a,b])=>`<tr><td><kbd>${a}</kbd></td><td>${b}</td></tr>`).join('')}</tbody></table><h3>公式输入</h3><p>按分数、根号、乘方等按键插入数学模板，在公式空位中填写。方向键移动公式光标，Tab 切换空位；Enter 进入下一项，最后一项 Enter 计算，Ctrl+Enter 可直接计算。</p><p class="completion-help">输入函数前缀后按 Tab 补全；↑↓ 选择，Esc 关闭；Ctrl+Space 查看候选。无候选时 Tab 保持公式空位导航。</p><h3>数据输入</h3><p>矩阵、向量、方程和统计数据按单元格填写。所有空位起始为空，返回编辑会保留本人输入的内容。</p></dialog>`;
}

function helpRows(model){
if(model.family==='ti')return [['F1','帮助'],['F2 / F3','2nd / 变量'],['F4 / Home','主菜单'],['F5','当前模式选项 / 函数目录'],['F6 / Shift+F6','函数 / 求解'],['F9 / Shift+F9','S⇔D / 带分数'],['F11 / F12','设置 / 切换界面语言'],['Enter','计算；参数页面下一项，最后一项提交']];
if(model.graphing)return [['F1–F6','屏幕下方对应软菜单'],['Shift+F1 / Shift+F2','坐标追踪 / 图形缩放'],['Shift+F3 / Shift+F5','图形视窗 / 图形分析'],['F6','关系列表：绘图'],['Enter','登记函数并移到下一项'],['F7 / Home','键盘帮助 / 主菜单'],['← → / ↑ ↓','追踪坐标 / 切换曲线'],['F11 / F12','设置 / 切换界面语言']];
return [['F1','帮助'],['F2 / F3',['cw','ti'].includes(model.family)?'SHIFT / 变量':'SHIFT / ALPHA（按一次后再按目标键）'],['F4 / Home',model.menuShortcuts==='classwiz'?'主菜单；数字/字母或方向键、= 选择应用':model.modes.length>10?'主菜单；方向键与 OK 选择十二种应用':'主菜单；数字 1–9、0 选择十种模式'],[['cw','ti'].includes(model.family)?'F5 / Shift+F5':'F5',['cw','ti'].includes(model.family)?'目录 / 工具':'当前模式选项 / 函数目录'],['F6 / Shift+F6',['cw','ti'].includes(model.family)?'函数 / 求解':'CALC / SOLVE'],[model.constants?'F7 / F8':'F8',model.constants?'科学常数 / 单位换算':'单位换算'],['F9 / Shift+F9',['cw','ti'].includes(model.family)?'转换 / 标准与小数':'S⇔D / 带分数'],['F10 / F11','展开屏幕 / 设置'],['F12','切换界面语言'],['Enter / =','计算；参数页面下一项，最后一项提交'],['Escape / Shift+Delete','返回 / 清空算式（AC）'],['Backspace / Delete','删除左边 / 右边字符'],['↑ ↓ / ← →','菜单选择；算式内 ↑↓ 调用历史，←→ 移动光标'],['Tab / Shift+Tab','切换输入框或按键'],['Ctrl+Z / Ctrl+C / Ctrl+V','撤销输入 / 复制选择内容或结果 / 粘贴算式']];
}

function keyboardHTML(model){return physicalKeyboardHTML(model,keyHTML)||`<div class="controls"><div class="side-controls">${model.keyboard.controls.left.map(k=>keyHTML(k,'small')).join('')}</div><div class="nav" aria-label="方向键"><button class="up" data-action="up" aria-label="上">▲</button><button class="left" data-action="left" aria-label="左">◀</button><button class="right" data-action="right" aria-label="右">▶</button><button class="down" data-action="down" aria-label="下">▼</button></div><div class="side-controls">${model.keyboard.controls.right.map(k=>keyHTML(k,'small')).join('')}</div></div><div class="science">${model.keyboard.science.map(k=>keyHTML(k)).join('')}</div><div class="digits">${model.keyboard.digits.map((k,i)=>keyHTML(k,['delete','clear'].includes(k[1])?'blue':i===17||i===18?'compact':'')).join('')}</div>`;}

function modelHeaderHTML(model){
  if(['x','ex'].includes(model.family))return `<div class="classwiz-model-header"><div class="classwiz-identity"><span class="classwiz-project-mark" aria-hidden="true"></span><span class="model">${esc(model.name)}</span><span class="classwiz-wordmark">ClassWiz</span></div><div class="solar" aria-hidden="true"></div></div>`;
  if(model.family==='cw')return `<div class="cw-model-header"><div><span class="cw-project-mark" aria-hidden="true"></span><span class="model">${esc(model.name)}</span></div><div class="solar" aria-hidden="true"></div></div>`;
  if(model.family==='cg')return `<div class="cg-model-mark"><span class="model">fx-CG50</span></div>`;
  if(model.family==='ti')return `<div class="ti-model-mark"><span class="model">TI-36XPro</span><div class="solar" aria-hidden="true"></div></div>`;
  return `<div class="brand-row"><span class="brand" aria-hidden="true"></span><div class="solar" aria-hidden="true"></div></div><div class="model-row"><span class="model">${esc(model.name)}</span><span class="classwiz">${model.graphing?'COLOR GRAPH':'SCIENTIFIC'}</span></div>`;
}
