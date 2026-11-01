import test from 'node:test';
import assert from 'node:assert/strict';
import {getModel,MODELS} from '../src/models/registry.js';
import {calculatorHTML} from '../src/ui/calculator.js';
import {classwizMenuHTML} from '../src/ui/classwiz-menu.js';
import {modelPickerHTML} from '../src/ui/model-picker.js';
import {modelPreviewHTML} from '../src/ui/model-preview.js';

test('ClassWiz menu preserves four columns and overlaps the previous row when scrolling',()=>{
  const modes=getModel('ex').modes;
  assert.equal((classwizMenuHTML(modes,0).match(/ hidden/g)||[]).length,4);
  const second=classwizMenuHTML(modes,9);
  assert.equal((second.match(/ hidden/g)||[]).length,4);
  assert.match(second,/data-classwiz-shortcut>A:</);
  const visible=[...second.matchAll(/data-mode="(\d+)"[^>]*>/g)].filter(m=>!m[0].includes('hidden')).map(m=>Number(m[1]));
  assert.deepEqual(visible,[4,5,6,7,8,9,10,11]);
});
test('X and EX have independent identity with four round controls and fifty actual keys',()=>{
  for(const id of ['cnx','ex']){
    const model=getModel(id),html=calculatorHTML(model);
    assert.ok(html.includes(model.name));assert.equal((html.match(/classwiz-round/g)||[]).length,4);
    assert.equal((html.match(/class="key"/g)||[]).length,46);assert.equal((html.match(/class="(?:up|down|left|right)"/g)||[]).length,4);
    assert.doesNotMatch(html,/Chinese edition|中文版|CASIO/);assert.match(html,/ClassWiz/);
  }
});
test('model library preview is inert vector artwork with no controls, external images or duplicate IDs',()=>{
  for(const model of MODELS){const preview=modelPreviewHTML(model,'en');assert.match(preview,/inert/);assert.match(preview,/<svg/);assert.doesNotMatch(preview,/<(?:button|input|image|script)|\bid=|\bdata-action=/);assert.ok(preview.includes(model.name));}
  for(const locale of ['en','zh']){const html=modelPickerHTML(locale,'ex'),ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);assert.equal((html.match(/data-model-choice=/g)||[]).length,MODELS.length);assert.match(html,/data-model-choice="ex"\s+aria-current="true"/);}
});
