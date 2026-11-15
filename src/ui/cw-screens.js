import {esc} from './html.js';
import {cwDataKeyText, deleteInputCharacter, moveInputCaret} from './cw-data-entry.js';

const navigation = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  PageUp: 'page-up', PageDown: 'page-down', Enter: 'execute', Escape: 'back',
  Delete: 'delete', Backspace: 'delete',
};
const clamp = (value, max) => Math.max(0, Math.min(value, max));

function makeScreen(className, label) {
  const root = document.createElement('div');
  root.className = `cw-app-screen ${className}`;
  root.setAttribute('aria-label', label);
  root.tabIndex = -1;
  return root;
}

function displayText(value, format) {
  return value == null || typeof value === 'string' ? value ?? '' : format(value);
}

export function createCWGrid({
  label, columns, rows, readNumber, format, title = '', layout = 'list',
  rowNumbers = layout === 'list', minRows = 0, canEdit = () => true,
  advance = 'down', prefix, suffix, emptyMessage, onCommit, onCommand,
}) {
  const root = makeScreen(`cw-cell-screen cw-cell-${layout}`, label);
  root.innerHTML = `${title ? `<div class="cw-cell-title">${esc(title)}</div>` : ''}
    <div class="cw-cell-viewport"><table></table></div>
    <div class="cw-cell-message"></div>
    <input id="cw-grid-entry" aria-label="单元格内容" autocomplete="off" spellcheck="false">
    <div class="cw-data-error" role="alert"></div>`;
  const table = root.querySelector('table');
  const input = root.querySelector('input');
  const error = root.querySelector('[role="alert"]');
  const message = root.querySelector('.cw-cell-message');
  let row = 0, column = 0, editing = false, visible = [];

  function context() {
    return {row, column, editing, value: visible[row]?.[column], refresh, select, edit};
  }

  function paint() {
    const value = visible[row]?.[column];
    table.querySelector('.selected')?.classList.remove('selected');
    const selected = table.querySelector(`[data-cw-cell="${row},${column}"]`);
    selected?.classList.add('selected');
    selected?.scrollIntoView({block: 'nearest', inline: 'nearest'});
    root.classList.toggle('editing', editing);
    if (!editing) {
      input.readOnly = !canEdit(row, column);
      input.value = displayText(value, format);
      message.textContent = value == null ? emptyMessage?.() ?? '' : '';
      input.focus({preventScroll: true});
      input.select();
    }
  }

  function refresh() {
    visible = rows();
    row = clamp(row, visible.length - 1);
    column = clamp(column, columns.length - 1);
    const headings = columns.some(Boolean) ? `<thead><tr>${rowNumbers ? '<th></th>' : ''}${columns.map(name => `<th scope="col">${esc(name)}</th>`).join('')}</tr></thead>` : '';
    const cells = Array.from({length: Math.max(minRows, visible.length)}, (_, i) => {
      const numbers = rowNumbers ? `<th scope="row">${i + 1}</th>` : '';
      const entries = columns.map((_, j) => {
        const value = displayText(visible[i]?.[j], format);
        const tail = suffix?.(i, j) ?? '';
        const data = i < visible.length ? `data-cw-cell="${i},${j}" aria-label="${esc(`${i + 1},${j + 1}`)}"` : 'disabled';
        return `<td><div class="cw-cell-pair"><button type="button" ${data} title="${esc(value)}">${esc((prefix?.(i,j)??'')+value)}</button>${tail ? `<span>${esc(tail)}</span>` : ''}</div></td>`;
      }).join('');
      return `<tr>${numbers}${entries}</tr>`;
    }).join('');
    table.innerHTML = headings + `<tbody>${cells}</tbody>`;
    paint();
  }

  function select(nextRow, nextColumn = column) {
    row = clamp(nextRow, visible.length - 1);
    column = clamp(nextColumn, columns.length - 1);
    editing = false;
    error.textContent = '';
    paint();
  }

  function edit(clear = false) {
    if (!canEdit(row,column)) return;
    editing = true;
    root.classList.add('editing');
    if (clear) input.value = '';
    input.focus({preventScroll:true});
    input.setSelectionRange(input.value.length,input.value.length);
  }

  function insert(text,start=input.selectionStart,end=input.selectionEnd) {
    input.focus({preventScroll:true});
    input.setRangeText(text,start,end,'end');
    input.dispatchEvent(new Event('input'));
  }

  function commit() {
    const value = readNumber(input.value);
    const next = onCommit(row, column, value, context());
    editing = false;
    error.textContent = '';
    if (next !== false) {
      if (advance === 'across') {
        const index = clamp(row * columns.length + column + 1, visible.length * columns.length - 1);
        row = Math.floor(index / columns.length);
        column = index % columns.length;
      } else if (advance === 'down') row++;
    }
    if (root.isConnected) refresh();
  }

  function handleAction(action) {
    try {
      if (editing) {
        if (action === 'execute' || action === 'approx') { commit(); return true; }
        if (action === 'back' || action === 'clear') { select(row); return true; }
        if (action === 'left' || action === 'right') { moveInputCaret(input, action === 'left' ? -1 : 1); return true; }
        if (action === 'delete') { deleteInputCharacter(input); return true; }
        if (['up','down','page-up','page-down'].includes(action)) return true;
      } else {
        if (onCommand?.(action === 'approx' ? 'execute' : action, context())) return true;
        if (action === 'left' || action === 'right') { select(row, column + (action === 'left' ? -1 : 1)); return true; }
        if (['up','down','page-up','page-down'].includes(action)) {
          const amount = action.startsWith('page') ? 4 : 1;
          select(row + (action.endsWith('up') ? -amount : amount));
          return true;
        }
      }
      const text = cwDataKeyText(action);
      if (text === null || !canEdit(row, column)) return false;
      if (!editing) input.value = '';
      insert(text);
      return true;
    } catch (failure) { error.textContent = failure.message; return true; }
  }

  input.addEventListener('input', () => {
    editing = true;
    root.classList.add('editing');
    error.textContent = '';
  });
  table.addEventListener('click', event => {
    const cell = event.target.closest('[data-cw-cell]');
    if (cell) select(...cell.dataset.cwCell.split(',').map(Number));
  });
  return {
    mount(host) { host.replaceChildren(root); refresh(); if (editing) input.focus({preventScroll: true}); },
    handleAction,
    captureInsertion() {
      if(!canEdit(row,column))return null;
      const start=input.selectionStart,end=input.selectionEnd;
      return text=>insert(text,start,end);
    },
    handleKey(event) {
      if (navigation[event.key]) return handleAction(navigation[event.key]);
      if (!editing && ['+','-','*','/','^'].includes(event.key)) {
        try { return onCommand?.(event.key, context()) ?? false; }
        catch (failure) { error.textContent = failure.message; return true; }
      }
      return false;
    },
  };
}

export function createCWFields({title, fields, readNumber, onRun, onBack, onCommand, runLabel = '执行'}) {
  const root = makeScreen('cw-field-screen', title);
  root.innerHTML = `<div class="cw-dist-type">${esc(title)}</div><form>
    ${fields.map(([name, label, value]) => `<label class="cw-dist-param">${esc(label)}<span>:</span><input data-name="${esc(name)}" aria-label="${esc(label)}" value="${esc(value)}" autocomplete="off" spellcheck="false"></label>`).join('')}
    <button type="submit" class="run-button"><span aria-hidden="true">▶</span>${esc(runLabel)}</button>
    <div class="cw-data-error" role="alert"></div></form>`;
  const form = root.querySelector('form');
  const controls = Array.from(form.elements);
  const last = controls.length - 1;
  const error = form.querySelector('[role="alert"]');
  let selected = 0;

  function focus(index) {
    selected = clamp(index, last);
    const control = controls[selected];
    control.focus({preventScroll: true});
    control.scrollIntoView({block: 'nearest'});
    if (selected < last) control.select();
  }
  function run() {
    error.textContent = '';
    const values = Object.fromEntries(controls.slice(0, last).map(input => [input.dataset.name, readNumber(input.value)]));
    onRun(values);
  }
  function safely(callback) {
    try { callback(); }
    catch (failure) { error.textContent = failure.message; }
  }
  function handleAction(action) {
    const input = selected < last ? controls[selected] : null;
    if (action === 'back' || action === 'clear') { onBack(); return true; }
    if (action === 'execute' || action === 'approx') {
      safely(() => {
        if (!input) run();
        else { input.value = String(readNumber(input.value)); error.textContent = ''; focus(selected + 1); }
      });
      return true;
    }
    if (action === 'up' || action === 'down') { focus(selected + (action === 'up' ? -1 : 1)); return true; }
    if (onCommand?.(action)) return true;
    if (!input) return false;
    if (action === 'delete') { deleteInputCharacter(input); return true; }
    if (action === 'left' || action === 'right') { moveInputCaret(input, action === 'left' ? -1 : 1); return true; }
    const text = cwDataKeyText(action);
    if (text === null) return false;
    input.setRangeText(text, input.selectionStart, input.selectionEnd, 'end');
    error.textContent = '';
    return true;
  }
  form.addEventListener('focusin', event => {
    const index = controls.indexOf(event.target);
    if (index < 0) return;
    selected = index;
    form.querySelector('.selected')?.classList.remove('selected');
    (selected === last ? event.target : event.target.parentElement).classList.add('selected');
  });
  form.addEventListener('input', () => { error.textContent = ''; });
  form.addEventListener('submit', event => { event.preventDefault(); safely(run); });
  return {
    mount(host) { host.replaceChildren(root); focus(selected); },
    handleAction,
    handleKey: event => !!navigation[event.key] && handleAction(navigation[event.key]),
  };
}

export function createCWPages({label, pages, renderValue, onFinish, onCommand}) {
  const root = makeScreen('cw-page-screen', label);
  let index = 0;
  function render() {
    const page = pages[index];
    const arrows = `${index ? '▴' : ''}${index < pages.length - 1 ? '▾' : ''}`;
    root.dataset.cwPage = String(index);
    root.innerHTML = `<div class="cw-page-title">${esc(page.label)}<span aria-hidden="true">${arrows}</span></div>
      <output data-cw-result>${renderValue(page.value, page)}</output>`;
    root.focus({preventScroll: true});
  }
  function handleAction(action) {
    if (onCommand?.(action, pages[index], render)) return true;
    if (action === 'clear' || (action === 'back' && index === 0)) { onFinish(); return true; }
    if (['back','up','page-up'].includes(action)) index = clamp(index - 1, pages.length - 1);
    else if (action === 'execute' || action === 'approx') {
      if (index === pages.length - 1) { onFinish(); return true; }
      index++;
    } else if (action === 'down' || action === 'page-down') index = clamp(index + 1, pages.length - 1);
    else return false;
    render();
    return true;
  }
  return {
    mount(host) { host.replaceChildren(root); render(); },
    handleAction,
    handleKey: event => !!navigation[event.key] && handleAction(navigation[event.key]),
  };
}

export function createCWResultList({label, entries, renderValue, onBack, onCommand, title = ''}) {
  const root = makeScreen('cw-values-screen', label);
  const list = document.createElement('div');
  list.className = 'cw-values-list';
  if (title) {
    const header = document.createElement('div');
    header.className = 'cw-values-title';
    header.textContent = title;
    root.append(header);
  }
  list.innerHTML = entries.map(([name, value]) => `<div class="cw-values-row"><span>${esc(name)}</span><output data-cw-value="${esc(name)}">${renderValue(value)}</output></div>`).join('');
  root.append(list);
  function handleAction(action) {
    if (onCommand?.(action)) return true;
    if (['execute','approx','clear','back'].includes(action)) { onBack(); return true; }
    if (['up','down','page-up','page-down'].includes(action)) {
      const distance = action.startsWith('page') ? list.clientHeight : list.firstElementChild?.offsetHeight ?? 16;
      list.scrollTop += action.endsWith('up') ? -distance : distance;
      return true;
    }
    return false;
  }
  return {
    mount(host) { host.replaceChildren(root); root.focus({preventScroll: true}); },
    handleAction,
    handleKey: event => !!navigation[event.key] && handleAction(navigation[event.key]),
  };
}
