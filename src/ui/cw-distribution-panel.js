import {distributionTypes} from '../engine/distributions.js';
import {cwExtendedDistributions} from '../engine/cw-distributions.js';
import {cwDataKeyText, deleteInputCharacter, moveInputCaret} from './cw-data-entry.js';
import {esc} from './html.js';

const LIMIT = 45;
const defaults = {x: 0, N: 1, p: .5, μ: 0, σ: 1, λ: 1, 下限: -1, 上限: 1, 区域: .5};
const clampIndex = (index, last) => Math.max(0, Math.min(index, last));

export function createCWDistributionPanel({host, session, evaluate, calculate, format, onAnswer, onStore, onExit}) {
  const root = document.createElement('div');
  root.className = 'cw-distribution';
  root.tabIndex = -1;
  let view = 'types', typeIndex = 0, method = 0, nativeIndex = 0, extended = false;
  let useList = false, row = 0, column = 0, editing = false, probabilities = null;
  let parameterNames = [], parameterIndex = 0, answer = null;
  const types=()=>extended?cwExtendedDistributions:distributionTypes;
  const currentType=()=>types()[typeIndex];
  const inputText=value=>value===Infinity?'∞':value===-Infinity?'−∞':String(value);

  function error(message = '') {
    const display = root.querySelector('#form-error');
    if (display) display.textContent = message;
  }

  function readValue(source) {
    const text = source.trim();
    if (!text) throw new Error('请输入算式');
    const unclosed = (text.match(/\(/g)?.length ?? 0) - (text.match(/\)/g)?.length ?? 0);
    return evaluate(text + ')'.repeat(Math.max(0, unclosed)));
  }

  function menuItems() {
    if (view === 'types') return types().map((type, index) => ({
      label: type.label, submenu: type.list, run() {
        typeIndex = index;
        if (type.list) {
          method = 0;
          renderMenu('method');
        } else showParameters(false);
      },
    }));
    return [
      {label: '列表', run: () => { row = column = 0; probabilities = null; renderRows(); }},
      {label: '变量', run: () => showParameters(false)},
    ];
  }

  function renderMenu(nextView) {
    view = nextView;
    const selected = view === 'types' ? typeIndex : method;
    const title = view === 'types' ? extended?'扩展分布':'分布' : currentType().label;
    root.innerHTML = `<div class="cw-dist-menu" aria-label="${esc(title)}">${menuItems().map(({label, submenu}, index) => `
      <button type="button" class="list-item${index === selected ? ' selected' : ''}" data-dist-choice="${index}">${esc(label)}${submenu ? '<span aria-hidden="true">▸</span>' : ''}</button>`).join('')}</div>`;
    root.querySelector('.selected').scrollIntoView({block: 'nearest'});
    root.focus({preventScroll: true});
  }

  function lastRow() {
    return probabilities ? session.rows.length - 1 : Math.min(session.rows.length, LIMIT - 1);
  }

  function renderRows() {
    view = 'rows';
    editing = false;
    const title = currentType().label;
    const rows = Array.from({length: lastRow() + 1}, (_, index) => {
      const result = probabilities?.[index];
      return `<tr><th scope="row">${index + 1}</th><td><button type="button" data-dist-row="${index}" data-dist-col="0">${esc(session.rows[index] === undefined ? '' : format(session.rows[index]))}</button></td><td><button type="button" data-dist-row="${index}" data-dist-col="1">${result === null ? '错误' : esc(result === undefined ? '' : format(result))}</button></td></tr>`;
    }).join('');
    root.innerHTML = `<div class="cw-dist-list">
      <div class="cw-dist-table-wrap"><table class="cw-dist-table" aria-label="列表"><thead><tr><th></th><th scope="col">x</th><th scope="col">P</th></tr></thead><tbody>${rows}</tbody></table></div>
      <div class="cw-dist-type">${esc(title)}</div></div>
      <input id="cw-dist-entry" class="cw-dist-entry" aria-label="单元格内容" autocomplete="off" spellcheck="false"><div id="form-error" class="cw-data-error" role="alert"></div>`;
    selectCell(row, column);
  }

  function selectCell(index, nextColumn) {
    row = clampIndex(index, lastRow());
    column = nextColumn;
    editing = false;
    root.querySelector('.cw-dist-table .selected')?.classList.remove('selected');
    const cell = root.querySelector(`[data-dist-row="${row}"][data-dist-col="${column}"]`);
    cell.classList.add('selected');
    cell.scrollIntoView({block: 'nearest'});
    const input = root.querySelector('#cw-dist-entry');
    const result = probabilities?.[row];
    input.value = column === 0 ? String(session.rows[row] ?? '') : result === null ? cell.textContent : result === undefined ? '' : format(result);
    input.readOnly = column === 1;
    input.classList.remove('editing');
    input.focus({preventScroll: true});
    input.select();
    error();
  }

  function markEditing(input) {
    editing = true;
    input.classList.add('editing');
    error();
  }

  function captureInsertion() {
    const rowInput=view==='rows'&&column===0;
    const input=rowInput?root.querySelector('#cw-dist-entry'):
      view==='parameters'?root.querySelector(`[data-dist-param="${parameterIndex}"]`):null;
    if(!input)return null;
    const start=input.selectionStart,end=input.selectionEnd;
    return text=>{
      if(rowInput)markEditing(input);else error();
      input.focus({preventScroll:true});
      input.setRangeText(text,start,end,'end');
    };
  }

  function editRows(action) {
    if (action === 'clear') {
      session.rows.length = 0;
      row = column = 0;
    } else if (action === 'insert') {
      if (session.rows.length === LIMIT) throw new Error('分布列表须有 1–45 项');
      session.rows.splice(row, 0, 0);
    } else {
      session.rows.splice(row, 1);
    }
    probabilities = null;
    renderRows();
  }

  function showParameters(listInput, selected = 0) {
    useList = listInput;
    view = 'parameters';
    const type = currentType();
    parameterNames = type.parameters.filter(name => !useList || name !== 'x');
    root.innerHTML = `<div class="cw-dist-type">${esc(type.label)}</div><form id="parameters">
      ${parameterNames.map((name, index) => `<label class="cw-dist-param">${esc(name)}<span>:</span><input data-name="${esc(name)}" data-dist-param="${index}" aria-label="${esc(name)}" value="${esc(inputText(session.parameters[name] ?? defaults[name]))}" autocomplete="off" spellcheck="false"></label>`).join('')}
      <button type="submit" class="run-button"><span aria-hidden="true">▶</span>执行</button><div id="form-error" class="cw-data-error" role="alert"></div></form>`;
    focusParameter(selected);
  }

  function focusParameter(index) {
    parameterIndex = clampIndex(index, parameterNames.length);
    root.querySelector('#parameters .selected')?.classList.remove('selected');
    const input = root.querySelector(`[data-dist-param="${parameterIndex}"]`);
    const target = input ?? root.querySelector('.run-button');
    (input?.parentElement ?? target).classList.add('selected');
    target.scrollIntoView({block: 'nearest'});
    target.focus({preventScroll: true});
    input?.select();
  }

  function acceptParameter(index) {
    const input = root.querySelector(`[data-dist-param="${index}"]`);
    const name = parameterNames[index];
    const bound = ['下限','上限'].includes(name) && /^([+−-]?)(?:∞|Infinity)$/i.exec(input.value.trim());
    const value = bound ? ['−','-'].includes(bound[1])?-Infinity:Infinity : readValue(input.value);
    session.parameters[name] = value;
    input.value = inputText(value);
    return value;
  }

  function run() {
    const type = currentType();
    const parameters = Object.fromEntries(parameterNames.map((name, index) => [name, acceptParameter(index)]));
    if (useList) {
      calculate(type.id, {...parameters, x: 0});
      probabilities = session.rows.map(x => {
        try { return calculate(type.id, {...parameters, x}); }
        catch { return null; }
      });
      row = column = 0;
      renderRows();
      return;
    }
    answer = calculate(type.id, parameters);
    if (Number.isFinite(answer)) onAnswer(answer);
    view = 'result';
    const label = type.id==='inverseNormal'||type.quantile?'x':'P';
    const shown = Number.isFinite(answer)?format(answer):inputText(answer);
    root.innerHTML = `<div class="cw-dist-result"><div>${label}=</div><output data-result-number="0">${esc(shown)}</output></div>`;
    root.focus({preventScroll: true});
  }

  function rowAction(action) {
    const input = root.querySelector('#cw-dist-entry');
    if (action === 'execute' || action === 'approx') {
      if (editing) {
        session.rows[row] = readValue(input.value);
        probabilities = null;
        row++;
        renderRows();
      } else if (session.rows.length) showParameters(true, probabilities ? currentType().parameters.length - 1 : 0);
      else throw new Error('分布列表须有 1–45 项');
    } else if (['up', 'down', 'page-up', 'page-down'].includes(action)) {
      if (editing) return;
      const step = action.startsWith('page') ? 4 : 1;
      selectCell(row + (action.endsWith('up') ? -step : step), column);
    } else if (action === 'left' || action === 'right') {
      const step = action === 'left' ? -1 : 1;
      if (editing) moveInputCaret(input, step);
      else selectCell(row, action === 'left' ? 0 : 1);
    } else if (action === 'delete') {
      if (editing) deleteInputCharacter(input);
      else editRows('delete');
    } else if (action === 'clear' || action === 'back') {
      if (editing) selectCell(row, column);
      else if (probabilities) showParameters(true, currentType().parameters.length - 1);
      else if (action === 'back') renderMenu('method');
    } else if (action === 'variables' && !editing) {
      const value = column === 0 ? session.rows[row] : probabilities?.[row];
      if (value != null) onStore(value, column === 1);
    } else {
      const text = cwDataKeyText(action);
      if (text !== null && !input.readOnly) {
        if (!editing) input.select();
        markEditing(input);
        input.setRangeText(text, input.selectionStart, input.selectionEnd, 'end');
      }
    }
  }

  function parameterAction(action) {
    const input = root.querySelector(`[data-dist-param="${parameterIndex}"]`);
    if (action === 'execute' || action === 'approx') {
      if (input) { acceptParameter(parameterIndex); error(); focusParameter(parameterIndex + 1); }
      else run();
    } else if (action === 'up' || action === 'down') focusParameter(parameterIndex + (action === 'up' ? -1 : 1));
    else if (action === 'back' || action === 'clear') {
      if (useList) renderRows();
      else renderMenu(currentType().list ? 'method' : 'types');
    } else if (input) {
      if (action === 'delete') deleteInputCharacter(input);
      else if (action === 'left' || action === 'right') moveInputCaret(input, action === 'left' ? -1 : 1);
      else {
        const text = cwDataKeyText(action);
        if (text !== null) input.setRangeText(text, input.selectionStart, input.selectionEnd, 'end');
      }
    }
  }

  function handleAction(action) {
    try {
      if (view === 'rows') rowAction(action);
      else if (view === 'parameters') parameterAction(action);
      else if (view === 'result') {
        if (['execute', 'approx', 'back', 'clear'].includes(action)) showParameters(false, parameterNames.length);
        else if (action === 'variables'&&Number.isFinite(answer)) onStore(answer, true);
      } else if (action==='tools'&&view==='types'&&!extended) {
        nativeIndex=typeIndex;extended=true;typeIndex=0;renderMenu('types');
      } else if (action === 'execute' || action === 'approx') menuItems()[view === 'types' ? typeIndex : method].run();
      else if (action === 'right' && view === 'types' && currentType().list) menuItems()[typeIndex].run();
      else if (action === 'back' || action === 'left') {
        if (view === 'method') renderMenu('types');
        else if (extended){extended=false;typeIndex=nativeIndex;renderMenu('types');}
        else if (action === 'back') onExit();
      } else if (['up', 'down', 'page-up', 'page-down'].includes(action)) {
        const step = action.startsWith('page') ? 4 : 1;
        const delta = action.endsWith('up') ? -step : step;
        if (view === 'types') typeIndex = clampIndex(typeIndex + delta, types().length - 1);
        else method = clampIndex(method + delta, 1);
        renderMenu(view);
      }
    } catch (failure) { error(failure.message); }
  }

  root.addEventListener('click', event => {
    const choice = event.target.closest('[data-dist-choice]');
    const cell = event.target.closest('[data-dist-row]');
    if (choice) menuItems()[Number(choice.dataset.distChoice)].run();
    if (cell) selectCell(Number(cell.dataset.distRow), Number(cell.dataset.distCol));
  });
  root.addEventListener('focusin', event => {
    if (view !== 'parameters') return;
    const {target} = event;
    if (target.matches('[data-dist-param]')) parameterIndex = Number(target.dataset.distParam);
    else if (target.matches('.run-button')) parameterIndex = parameterNames.length;
    else return;
    root.querySelector('#parameters .selected')?.classList.remove('selected');
    (target.matches('input') ? target.parentElement : target).classList.add('selected');
  });
  root.addEventListener('input', event => {
    if (view === 'rows' && event.target.id === 'cw-dist-entry') markEditing(event.target);
    else if (view === 'parameters') error();
  });
  root.addEventListener('submit', event => {
    event.preventDefault();
    try { run(); }
    catch (failure) { error(failure.message); }
  });

  return {
    mount() {
      if (!root.hasChildNodes()) {
        host.replaceChildren(root);
        renderMenu('types');
      } else {
        host.replaceChildren(root);
        if (view === 'parameters') focusParameter(parameterIndex);
        else (root.querySelector('#cw-dist-entry') ?? root).focus({preventScroll: true});
      }
    },
    handleAction,
    captureInsertion,
    handleKey(event) {
      if ((view === 'types' || view === 'method') && /^[1-9]$/.test(event.key)) {
        menuItems()[Number(event.key) - 1]?.run();
        return true;
      }
      const action = {Enter: 'execute', Escape: 'back', ArrowUp: 'up', ArrowDown: 'down', PageUp: 'page-up', PageDown: 'page-down'}[event.key];
      if (action) { handleAction(action); return true; }
      if (view === 'rows' && !editing) {
        const browse = {ArrowLeft: 'left', ArrowRight: 'right', Delete: 'delete', Backspace: 'delete'}[event.key];
        if (browse) { handleAction(browse); return true; }
      }
      if (view !== 'parameters' && view !== 'rows' && event.key === 'ArrowLeft') { handleAction('left'); return true; }
      if ((view === 'types' || view === 'method') && event.key === 'ArrowRight') { handleAction('right'); return true; }
      return false;
    },
    canEditRows: () => view === 'rows' && !editing,
    editRows(action) {
      try { editRows(action); }
      catch (failure) { error(failure.message); }
    },
  };
}
