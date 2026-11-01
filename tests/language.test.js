import test from 'node:test';
import assert from 'node:assert/strict';
import {detectSystemLanguage, resolveLanguage, resolveLanguagePreference} from '../src/language.js';

test('Chinese language tags select Chinese across regions, scripts and case', () => {
  for (const locale of ['zh', 'zh-CN', 'zh-TW', 'zh-HK', 'zh-Hant', 'zh-Hans-CN', 'ZH_cn', '  zH_hAnT_tW  ']) {
    assert.equal(resolveLanguage(locale), 'zh', locale);
  }
});

test('non-Chinese and unavailable system languages use English', () => {
  for (const locale of ['en-US', 'en', 'ja-JP', 'de-DE', 'fr-FR', 'unknown', '', '   ', null, undefined, 42, {}, []]) {
    assert.equal(resolveLanguage(locale), 'en', String(locale));
  }
  assert.equal(resolveLanguage('zhang'), 'en', 'a prefix alone does not identify a Chinese language tag');
});

test('the first nonempty preferred language decides the UI language', () => {
  assert.equal(resolveLanguage(['en-US', 'zh-CN']), 'en');
  assert.equal(resolveLanguage(['ja-JP', 'zh-TW', 'en-US']), 'en');
  assert.equal(resolveLanguage(['zh-Hant', 'en-US']), 'zh');
  assert.equal(resolveLanguage([null, '', '  ', 'zh_CN', 'en-US']), 'zh');
  assert.equal(resolveLanguage(['unknown', 'zh-CN']), 'en');
});

test('Electron system UI languages take precedence over the Chromium locale', () => {
  assert.equal(detectSystemLanguage({cnxSystem:{languages:['zh-CN']}, navigator:{languages:['en-US'], language:'en-US'}}), 'zh');
  assert.equal(detectSystemLanguage({cnxSystem:{languages:['en-US', 'zh-CN']}, navigator:{languages:['zh-CN'], language:'zh-CN'}}), 'en');
});

test('a browser uses its preferred language list before its single language', () => {
  assert.equal(detectSystemLanguage({navigator:{languages:['zh-TW', 'en-US'], language:'en-US'}}), 'zh');
  assert.equal(detectSystemLanguage({navigator:{languages:['en-US', 'zh-CN'], language:'zh-CN'}}), 'en');
});

test('empty system language lists fall back to browser preferences', () => {
  for (const languages of [undefined, null, [], ['', '   ']]) {
    assert.equal(detectSystemLanguage({cnxSystem:{languages}, navigator:{languages:['zh-CN']}}), 'zh');
  }
});

test('a browser without a usable language list falls back to navigator.language', () => {
  for (const languages of [undefined, null, [], ['', '  ']]) {
    assert.equal(detectSystemLanguage({navigator:{languages, language:'zh-Hant'}}), 'zh');
  }
});

test('unreadable Electron language preferences fall back without aborting startup', () => {
  const environment = {navigator:{languages:['zh-CN']}};
  Object.defineProperty(environment, 'cnxSystem', {get() {throw new Error('Bridge unavailable');}});
  assert.equal(detectSystemLanguage(environment), 'zh');
  assert.equal(detectSystemLanguage({cnxSystem:{get languages() {throw new Error('Language unavailable');}}, navigator:{language:'zh-CN'}}), 'zh');
});

test('unreadable browser language lists can use the single browser language', () => {
  assert.equal(detectSystemLanguage({navigator:{get languages() {throw new Error('Blocked');}, language:'zh-CN'}}), 'zh');
});

test('missing or inaccessible language environments safely use English', () => {
  for (const environment of [null, {}, {navigator:{}}, {navigator:{language:42}}]) {
    assert.equal(detectSystemLanguage(environment), 'en');
  }
  const inaccessible = {};
  Object.defineProperty(inaccessible, 'navigator', {get() {throw new Error('Blocked');}});
  assert.equal(detectSystemLanguage(inaccessible), 'en');
});

test('valid saved language choices take precedence over a changed system language', () => {
  assert.equal(resolveLanguagePreference('zh', 'en'), 'zh');
  assert.equal(resolveLanguagePreference('en', 'zh'), 'en');
});

test('missing or invalid saved language choices use a supported fallback', () => {
  for (const saved of [undefined, null, '', 'de', 'ZH', 42, {}]) {
    assert.equal(resolveLanguagePreference(saved, 'zh'), 'zh');
    assert.equal(resolveLanguagePreference(saved, 'en'), 'en');
  }
  assert.equal(resolveLanguagePreference(undefined, 'unknown'), 'en');
});
