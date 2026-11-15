import {CW_INFIX_TEXT} from '../engine/cw-operators.js';

const linearKeys = {
  negative: '-', frac: '/', root: 'nthRoot(', mixed: '/', 'mixed-input': '/',
  'cw-log': 'log(',
  integral: 'integral(', derivative: 'diff(', sigma: 'sum(', dms: '°',
  ...CW_INFIX_TEXT,
};

export function cwDataKeyText(action) {
  if (Object.hasOwn(linearKeys, action)) return linearKeys[action];
  if (/^[0-9A-Fxyz.+*/^()=,-]$|^[a-zA-Z]+\($/.test(action)) return action;
  if (['^2', '^(-1)', '*10^', 'Ans', 'pi', 'e'].includes(action)) return action;
  return null;
}

export function moveInputCaret(input, step) {
  const start = input.selectionStart;
  const end = input.selectionEnd;
  const position = start === end ? start + step : step < 0 ? start : end;
  const next = Math.max(0, Math.min(input.value.length, position));
  input.setSelectionRange(next, next);
}

export function deleteInputCharacter(input) {
  const start = input.selectionStart;
  const end = input.selectionEnd;
  input.setRangeText('', start === end ? Math.max(0, start - 1) : start, end, 'end');
}
