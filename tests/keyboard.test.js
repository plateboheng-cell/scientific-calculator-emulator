import test from 'node:test';
import assert from 'node:assert/strict';
import {getModel} from '../src/models/registry.js';
import {shortcutAction, modifiedKeyAction} from '../src/keyboard/mapping.js';
test('CN CW documented SHIFT 7 inserts pi',()=>{
  assert.equal(modifiedKeyAction(getModel('cncw'),'7','shift'),'pi');
});

const shortcut = (id, key, shiftKey = false, latchedShift = false) =>
  shortcutAction(getModel(id), {key, shiftKey}, latchedShift);

for (const id of ['cnx','cncw']) {
  test(`${id}: navigation/settings/language desktop shortcuts are reachable`, () => {
    for (const [key, action] of [['F1','help'], ['F2','shift'], ['F4','menu'], ['Home','menu'], ['F10','expand'], ['F11','setup'], ['F12','toggle-language'], ['Insert','insert']]) {
      assert.equal(shortcut(id, key), action, key);
    }
    assert.equal(shortcut(id, 'F4', true), 'setup');
    assert.equal(shortcut(id, 'F4', false, true), 'setup');
    assert.equal(shortcut(id, 'F13'), undefined);
    assert.equal(shortcut(id, 'a'), undefined, 'ordinary formula input is not intercepted');
  });

  test(`${id}: SHIFT keys produce mathematical input instead of visible legends`, () => {
    const model = getModel(id);
    assert.equal(modifiedKeyAction(model, 'sin', 'shift'), 'asin(');
    assert.equal(modifiedKeyAction(model, 'SIN', 'shift'), 'asin(');
    assert.equal(modifiedKeyAction(model, 'sin(', 'shift'), 'asin(');
    assert.equal(modifiedKeyAction(model, '√', 'shift'), id==='cncw'?'root':'cbrt(');
    assert.equal(modifiedKeyAction(model, 'x²', 'shift'), id==='cncw'?'cw-log':'^3');
    assert.equal(modifiedKeyAction(model, 'AC', 'shift'), 'off');
    assert.equal(modifiedKeyAction(model, 'DEL', 'shift'), 'insert');
    assert.equal(modifiedKeyAction(model, 'nonexistent', 'shift'), undefined);
  });

  test(`${id}: every digit and execute key has a real dispatch action`, () => {
    const digits = getModel(id).keyboard.digits;
    for (let number = 0; number <= 9; number++) assert.ok(digits.some(key => key[0] === String(number) && key[1] === String(number)));
    for (const action of ['execute','delete','clear','*','/','+','-','*10^',id==='cncw'?'format':'Ans']) assert.ok(digits.some(key => key[1] === action), action);
    if(id==='cncw')assert.ok(digits.some(key=>key[1]==='format'&&key[3]==='Ans'));
  });
}

test('CN X desktop shortcuts preserve ALPHA, OPTN, CALC, SOLVE and S⇔D', () => {
  assert.equal(modifiedKeyAction(getModel('cnx'),'(−)','shift'),'log10(');
  assert.equal(shortcutAction(getModel('cnx'),{key:'F6'},false,true),'=');
  for (const [key, plain, shifted] of [['F3','alpha','alpha'],['F5','options','options'],['F6','calc','solve'],['F7','constants','constants'],['F9','sd','mixed']]) {
    assert.equal(shortcut('cnx', key), plain);
    assert.equal(shortcut('cnx', key, true), shifted);
    assert.equal(shortcut('cnx', key, false, true), shifted);
  }
  assert.equal(modifiedKeyAction(getModel('cnx'), '(−)', 'alpha'), 'A');
  assert.equal(modifiedKeyAction(getModel('cnx'), 'M+', 'alpha'), 'M');
  assert.equal(modifiedKeyAction(getModel('cnx'), '7', 'shift'), 'constants');
});

test('CW desktop shortcuts open Variables, Catalog, Tools, Definitions and Format', () => {
  for (const [key, plain, shifted] of [['F3','variables','variables'],['F5','catalog','tools'],['F6','definitions','solve'],['F9','format','sd']]) {
    assert.equal(shortcut('cncw', key), plain);
    assert.equal(shortcut('cncw', key, true), shifted);
    assert.equal(shortcut('cncw', key, false, true), shifted);
  }
  assert.equal(shortcut('cncw', 'F7'), 'constants', 'Desktop F7 opens the independently verified CW 2018 catalog');
});

test('CW physical layout exposes dedicated menus and omits CN X-only keys', () => {
  const keyboard = getModel('cncw').keyboard;
  const keys = [...keyboard.science, ...keyboard.digits, ...keyboard.controls.left, ...keyboard.controls.right];
  const actions = keys.map(key => key[1]);
  for (const action of ['variables','definitions','catalog','tools','format','menu','back','setup']) assert.ok(actions.includes(action), action);
  for (const action of ['alpha','calc','mplus','mminus','sd','constants']) assert.equal(actions.includes(action), false, action);
  assert.equal(keys.some(key => key[4] || key[5]), false, 'CW must not inherit ALPHA legends');
  assert.ok(keys.some(key => key[0] === 'HOME' && key[1] === 'menu'));
  assert.ok(keys.some(key => key[0] === 'EXE' && key[1] === 'execute'));
});
