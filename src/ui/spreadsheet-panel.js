import {cellAddress, cellPosition, SHEET_COLUMNS, SHEET_ROWS} from '../engine/spreadsheet.js';
import {roundCWNumber} from '../engine/cw-decimal.js';
import {cwDataKeyText, deleteInputCharacter, moveInputCaret} from './cw-data-entry.js';
import {esc} from './html.js';

// Spreadsheet formulas use linear input on the handheld.
export function createSpreadsheetPanel({host, sheet, onBack, native = false, settings}) {
  const root = document.createElement('div');
  root.className = native ? 'sheet-panel cw-native-sheet' : 'sheet-panel';
  const columns = Array.from({length: SHEET_COLUMNS}, (_, column) => String.fromCharCode(65 + column));
  const rows = Array.from({length: SHEET_ROWS}, (_, row) => `<tr><th scope="row">${row + 1}</th>${columns.map(column => {
    const address = column + (row + 1);
    return `<td><button type="button" data-cell="${address}" aria-label="${address}"></button></td>`;
  }).join('')}</tr>`).join('');
  root.innerHTML = `<div class="sheet-grid-wrap"><table class="sheet-grid" aria-label="数据表格"><thead><tr><th></th>${columns.map(column => `<th scope="col">${column}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div><label class="sheet-edit"><span id="sheet-address"></span><input id="sheet-entry" aria-label="单元格内容" spellcheck="false" autocomplete="off"></label><div class="cw-sheet-capacity" hidden>扩展容量</div><div id="sheet-error" role="alert"></div>`;

  const input = root.querySelector('#sheet-entry');
  const error = root.querySelector('#sheet-error');
  const cellButtons = new Map(Array.from(root.querySelectorAll('[data-cell]'), button => [button.dataset.cell, button]));
  let editing = false, grabAddress = null, clipboard = null, fill = null;

  function focusInput(selectAll = false) {
    input.focus({preventScroll: true});
    if (selectAll) input.select();
  }

  function focusFill(index) {
    fill.index = Math.max(0, Math.min(2, index));
    const field = fill.form.elements[fill.index];
    field.focus({preventScroll: true});
    field.scrollIntoView({block: 'nearest'});
  }

  function endFill() {
    fill.form.remove();
    fill = null;
    root.classList.remove('filling');
    select(sheet.selected);
  }

  function submitFill() {
    const [expression, range] = fill.form.elements;
    try {
      if (!expression.value.trim()) throw new Error('请输入算式');
      sheet.fill(range.value.trim(), expression.value.trim(), fill.formula);
      endFill();
    } catch (failure) { fill.form.querySelector('[role="alert"]').textContent = failure.message; }
  }

  function beginFill(formula) {
    const form = document.createElement('form');
    form.className = 'cw-sheet-fill';
    form.innerHTML = `<div class="cw-dist-type">${formula ? '公式填充' : '数值填充'}</div>
      <label class="cw-dist-param">${formula ? '公式' : '数值'}<span>:</span><input data-name="expression" spellcheck="false" autocomplete="off"></label>
      <label class="cw-dist-param">范围<span>:</span><input data-name="range" spellcheck="false" autocomplete="off" value="${esc(sheet.selected + ':' + sheet.selected)}"></label>
      <button type="submit" class="run-button"><span aria-hidden="true">▶</span>确认</button><div class="cw-data-error" role="alert"></div>`;
    form.addEventListener('focusin', event => {
      const index = Array.from(form.elements).indexOf(event.target);
      if (index < 0) return;
      fill.index = index;
      form.querySelector('.selected')?.classList.remove('selected');
      (event.target.tagName === 'INPUT' ? event.target.parentElement : event.target).classList.add('selected');
    });
    form.addEventListener('submit', event => { event.preventDefault(); submitFill(); });
    fill = {form, formula, index: 0};
    const range = form.elements[1];
    range.setSelectionRange(range.value.length, range.value.length);
    root.append(form);
    root.classList.add('filling');
    focusFill(0);
  }

  function setEditing(value) {
    editing = value;
    root.classList.toggle('editing', value);
  }

  function renderSelection() {
    const address = grabAddress ?? sheet.selected;
    const selected = cellButtons.get(address);
    root.classList.toggle('grabbing', grabAddress !== null);
    root.classList.toggle('pasting', clipboard !== null);
    root.querySelector('#sheet-address').textContent = address;
    for (const [key, button] of cellButtons) {
      button.classList.toggle('selected', key === address);
      button.classList.toggle('reference-source', key === (grabAddress ? sheet.selected : clipboard?.from));
      button.setAttribute('aria-selected', String(key === address));
    }
    const {col} = cellPosition(address);
    root.querySelectorAll('thead th').forEach((header, index) => header.classList.toggle('selected', index === col + 1));
    root.querySelector('tbody th.selected')?.classList.remove('selected');
    selected.closest('tr').firstElementChild.classList.add('selected');
    selected.scrollIntoView({block: 'nearest', inline: 'nearest'});
  }

  function render() {
    if (!native) sheet.recalculate();
    root.querySelector('.cw-sheet-capacity').hidden=!sheet.extended;
    for (const [key, button] of cellButtons) {
      const cell = sheet.values[key];
      const shown=cell&&!cell.error?(cell.exact!==undefined?roundCWNumber(cell.value,'Sci',10,{kind:'cw-decimal',decimal:cell.exact}):Number(cell.value.toPrecision(10))):null;
      button.textContent = cell?.error ? '错误' : shown===null?'':String(shown);
      button.title = cell?.error || sheet.source(key);
    }
    if (!editing) input.value = settings?.showValue ? cellButtons.get(sheet.selected).textContent : sheet.source(sheet.selected);
    input.readOnly = grabAddress !== null || clipboard !== null;
    renderSelection();
  }

  function select(address) {
    error.textContent = '';
    if (grabAddress) {
      grabAddress = address;
      renderSelection();
      focusInput();
      return;
    }
    sheet.selected = address;
    setEditing(false);
    render();
    focusInput(true);
  }

  function edit() {
    if (!editing) input.value = sheet.source(sheet.selected);
    setEditing(true);
    focusInput();
    input.setSelectionRange(input.value.length, input.value.length);
  }

  function commit(advance = true) {
    try {
      sheet.set(sheet.selected, input.value);
      const {col, row} = cellPosition(sheet.selected);
      select(cellAddress(col, Math.min(SHEET_ROWS - 1, row + (advance ? 1 : 0))));
      return true;
    } catch (failure) {
      error.textContent = failure.message;
      focusInput();
      return false;
    }
  }

  function move(dx, dy) {
    const {col, row} = cellPosition(grabAddress ?? sheet.selected);
    select(cellAddress(Math.max(0, Math.min(SHEET_COLUMNS - 1, col + dx)), Math.max(0, Math.min(SHEET_ROWS - 1, row + dy))));
  }

  function insert(text) {
    if (fill) {
      const field = fill.form.elements[fill.index];
      if (field.tagName === 'INPUT') field.setRangeText(text, field.selectionStart, field.selectionEnd, 'end');
      return;
    }
    focusInput();
    if (!editing) { input.value = ''; setEditing(true); }
    error.textContent = '';
    input.setRangeText(text, input.selectionStart, input.selectionEnd, 'end');
  }

  function finishGrab(accept) {
    const reference = grabAddress;
    grabAddress = null;
    render();
    if (fill) focusFill(fill.index);
    if (accept) insert(reference);
    else if (!fill) focusInput();
  }

  function paste() {
    sheet.copy(clipboard.from, sheet.selected, clipboard.cut);
    if (clipboard.cut) clipboard = null;
    render();
    focusInput();
  }

  function handleAction(action) {
    if (fill && !grabAddress) {
      const field = fill.form.elements[fill.index];
      if (action === 'execute' || action === 'approx') {
        if (fill.index === 2) submitFill();
        else focusFill(fill.index + 1);
        return true;
      }
      if (action === 'back' || action === 'clear') { endFill(); return true; }
      if (action === 'up' || action === 'down') { focusFill(fill.index + (action === 'up' ? -1 : 1)); return true; }
      if (field.tagName !== 'INPUT') return false;
      if (action === 'delete') { deleteInputCharacter(field); return true; }
      if (action === 'left' || action === 'right') { moveInputCaret(field, action === 'left' ? -1 : 1); return true; }
      const text = cwDataKeyText(action);
      if (text === null) return false;
      insert(text);
      return true;
    }
    if (action === 'execute' || action === 'approx') {
      if (grabAddress) finishGrab(true);
      else if (clipboard) paste();
      else if (native && !editing) edit();
      else commit();
      return true;
    }
    if (['up', 'down', 'left', 'right'].includes(action)) {
      if (editing && !grabAddress) {
        if (action === 'left' || action === 'right') moveInputCaret(input, action === 'left' ? -1 : 1);
        else if (!native && commit(false)) move(0, action === 'up' ? -1 : 1);
      } else move(action === 'left' ? -1 : action === 'right' ? 1 : 0, action === 'up' ? -1 : action === 'down' ? 1 : 0);
      return true;
    }
    if (native && (action === 'page-up' || action === 'page-down')) {
      if (!editing || grabAddress) move(0, action === 'page-up' ? -4 : 4);
      return true;
    }
    if (action === 'clear' || action === 'back') {
      if (grabAddress) finishGrab(false);
      else if (clipboard || editing || action === 'clear') {
        clipboard = null;
        select(sheet.selected);
      } else onBack();
      return true;
    }
    if (action === 'delete') {
      if (grabAddress || clipboard) return true;
      if (editing) deleteInputCharacter(input);
      else { sheet.set(sheet.selected, ''); render(); }
      focusInput();
      return true;
    }
    const text = cwDataKeyText(action);
    if (text === null || grabAddress || clipboard) return false;
    insert(text);
    return true;
  }

  input.addEventListener('input', () => { setEditing(true); error.textContent = ''; });
  input.addEventListener('pointerdown', event => {
    if (input.readOnly) return;
    if (native && !editing) { event.preventDefault(); edit(); }
    else setEditing(true);
  });
  root.querySelector('.sheet-grid').addEventListener('click', event => {
    const button = event.target.closest('[data-cell]');
    if (button) select(button.dataset.cell);
  });

  return {
    mount() {
      host.replaceChildren(root);
      render();
      if (fill && !grabAddress) focusFill(fill.index);
      else focusInput(!editing);
    },
    handleAction(action) {
      try { return handleAction(action); }
      catch (failure) { error.textContent = failure.message; return true; }
    },
    handleKey(event) {
      if (event.ctrlKey || event.metaKey || event.altKey) return false;
      const action = {Enter: 'execute', Escape: 'back', ArrowUp: 'up', ArrowDown: 'down', PageUp: 'page-up', PageDown: 'page-down'}[event.key];
      if (action) return this.handleAction(action);
      if ((!editing && !fill) || grabAddress) {
        const browse = {ArrowLeft: 'left', ArrowRight: 'right', Delete: 'delete', Backspace: 'delete'}[event.key];
        if (browse) return this.handleAction(browse);
      }
      if (!editing && !fill && event.key.length === 1 && !clipboard) focusInput(true);
      return false;
    },
    edit, insert, beginFill,
    beginGrab() {
      if (fill?.index === 2) return;
      if (!fill && !editing) { input.value = ''; setEditing(true); }
      grabAddress = sheet.selected;
      render();
      focusInput();
    },
    beginPaste(cut) {
      setEditing(false);
      clipboard = {from: sheet.selected, cut};
      render();
      focusInput();
    },
    isEditing: () => editing || fill !== null || clipboard !== null,
    resetSelection() { clipboard = null; grabAddress = null; select(sheet.selected); },
    remaining: () => sheet.capacity - sheet.usedBytes(),
  };
}
