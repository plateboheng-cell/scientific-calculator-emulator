import {MODELS} from '../models/registry.js';
import {APP_NAME} from '../brand.js';
import {esc} from './html.js';
import {modelPreviewHTML} from './model-preview.js';

export function modelPickerHTML(language, activeModel) {
  const en=language==='en',locale=en?'en':'zh';
  const statuses=en?{available:'Available',experimental:'Experimental',planned:'Planned'}:{available:'可用',experimental:'实验性',planned:'计划中'};
  const ready=MODELS.filter(model=>model.selectable).length;
  return `<dialog id="model-picker" aria-labelledby="picker-title" aria-describedby="picker-intro picker-data-note" data-user-content>
    <div class="picker-top"><span class="picker-brand"><span class="picker-brand-symbol" aria-hidden="true">∑</span><span class="picker-brand-name">${esc(APP_NAME)}</span></span><button type="button" data-picker-language aria-label="${en?'Switch interface language to Chinese':'切换界面语言为英文'}"><span aria-hidden="true">◎</span> ${en?'中文':'English'}</button></div>
    <header class="picker-heading"><p class="picker-eyebrow">${en?'YOUR CALCULATOR LIBRARY':'你的计算器收藏'}</p><h1 id="picker-title">${en?'Choose your calculator':'选择你的计算器'}</h1><p class="picker-intro" id="picker-intro">${en?'Familiar keys. A workspace of your own.':'熟悉的按键，专属的计算空间。'}</p><div class="picker-library-meta"><span><i aria-hidden="true"></i>${en?'Works entirely offline':'完全离线运行'}</span><span>${ready} ${en?'selectable models':'款可选型号'}</span></div></header>
    <div class="model-cards">${MODELS.map(model=>{
      const current=model.id===activeModel;
      return `<button type="button" class="model-card${current?' is-current':''}" data-model-choice="${esc(model.id)}" ${model.selectable?'':'disabled'}${current?' aria-current="true"':''}>
        <span class="model-card-visual">${modelPreviewHTML(model,locale)}${current?`<span class="model-active-dot" aria-hidden="true">✓</span>`:''}</span>
        <span class="model-card-details"><span class="model-card-top"><span class="model-maker">${esc(model.brand||'Casio')}</span><span class="model-status ${esc(model.status)}">${esc(statuses[model.status]||model.status)}</span></span><strong class="model-card-name">${esc(model.name)}</strong><span class="model-summary">${esc(model.summary[locale])}</span><span class="model-coverage">${esc(model.coverage[locale])}</span><span class="model-card-bottom">${current?`<span class="current-model">${en?'Current model':'当前型号'}</span>`:`<span class="model-open-label">${model.selectable?(en?'Use this model':'使用此型号'):(en?'Not yet available':'尚未开放')}</span>`}${model.selectable?'<span class="model-open-arrow" aria-hidden="true">↗</span>':''}</span></span>
      </button>`;
    }).join('')}</div>
    <footer class="picker-footer"><p class="picker-note" id="picker-data-note"><span class="picker-note-icon" aria-hidden="true">◈</span><span>${en?'Each model keeps its own history, variables and settings. Language is shared. Unsubmitted input is cleared when switching.':'各型号独立保存历史、变量和设置，语言共用。切换时清除未提交的输入。'}</span></p>${activeModel?`<button class="picker-cancel" type="button" data-picker-close>${en?'Return to calculator':'返回计算器'}<span aria-hidden="true">↵</span></button>`:''}</footer>
  </dialog>`;
}
