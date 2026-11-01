import test from 'node:test';
import assert from 'node:assert/strict';
import {translate} from '../src/i18n.js';
import {getModel} from '../src/models/registry.js';
import {calculatorHTML} from '../src/ui/calculator.js';
import {modelPickerHTML} from '../src/ui/model-picker.js';

const hasHan = text => /\p{Script=Han}/u.test(text);

test('Chinese UI text remains intact and mathematical/user text is not translated', () => {
  assert.equal(translate('选择你的计算器', 'zh'), '选择你的计算器');
  for (const text of ['2+sin(pi/6)', 'fx-991CN CW', 'f(x)=x^2', 'A=3', 'MatA', '  1/3  ']) {
    assert.equal(translate(text, 'en'), text);
  }
});

test('mode names and accessible navigation labels have specific English translations', () => {
  for (const [source, expected] of [
    ['计算','Calculate'], ['统计','Statistics'], ['方程/函数','Equation/Function'],
    ['计算器屏幕','Calculator display'], ['方向键','Navigation'], ['设置','Settings'],
    ['语言 / Language','Language'], ['矩阵行数','Matrix rows'],
  ]) assert.equal(translate(source, 'en'), expected, source);
});

test('dynamic parameter and error messages translate completely', () => {
  for (const [source, expected] of [
    ['2 元联立方程','2 unknowns'], ['4 次不等式','Degree 4 inequality'],
    ['第 3 行','Row 3'], ['定义 MatA（最大 4×4）','Define MatA (up to 4×4)'],
    ['请输入「起始值」','Enter Start'], ['  数学错误  ','  Math error  '],
  ]) assert.equal(translate(source, 'en'), expected, source);
});

test('model selector shows translated status, current model and the experimental EX preview', () => {
  const english = modelPickerHTML('en', 'cncw');
  assert.match(english, /Choose your calculator/);
  assert.match(english, /Experimental/);
  assert.match(english, /Current model/);
  assert.match(english, /data-model-choice="ex"/);
  assert.doesNotMatch(english, /data-model-choice="ex" disabled/);
  assert.match(english, /data-model-preview="ex"/);
  assert.match(english, /Return to calculator/);
  assert.equal(hasHan(english.replace('中文','')), false, 'only the language toggle should contain Chinese');
  const chinese = modelPickerHTML('zh', null);
  assert.match(chinese, /选择你的计算器/);
  assert.match(chinese, /实验性/);
  assert.doesNotMatch(chinese, /data-picker-close/);
});

test('model-specific key labels and switching controls are translated', () => {
  for (const source of ['切换型号','返回','函数','目录','工具','转换']) {
    const translated = translate(source, 'en');
    assert.equal(hasHan(translated), false, `${source} still contains untranslated UI text`);
    assert.notEqual(translated, source);
  }
  for (const id of ['cnx','cncw']) {
    const html = calculatorHTML(getModel(id));
    assert.match(html, new RegExp(getModel(id).name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
    assert.match(html, /data-action="models"/);
    // Localize each text node independently, as createLocalizer does in the UI.
    for (const text of html.split(/<[^>]+>/g).filter(hasHan)) {
      if (text === '中文 / English') continue; // Deliberately bilingual language toggle.
      assert.equal(hasHan(translate(text, 'en')), false, `${id} has untranslated text: ${text}`);
    }
  }
});

test('function-registration and persistence warnings have English text', () => {
  for (const source of [
    '此型号不支持注册函数','循环引用错误','请先定义函数',
    '无法读取已保存的数据','无法保存设置：请检查可用存储空间','表格最多 30 行',
  ]) assert.equal(hasHan(translate(source, 'en')), false, source);
});
