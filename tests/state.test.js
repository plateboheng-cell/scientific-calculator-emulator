import test from 'node:test';
import assert from 'node:assert/strict';
import {AppStore, STORAGE_KEY, LEGACY_KEY, createSession, sanitizeProfile} from '../src/state/store.js';
import {ModelCalculator} from '../src/engine/model-calculator.js';

function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {data, getItem:key => data.get(key) ?? null, setItem:(key, value) => data.set(key, value)};
}

test('first run has no chosen model and creates no implicit calculator data', () => {
  const storage = memoryStorage();
  const store = new AppStore(storage);
  assert.equal(store.data.activeModel, null);
  assert.equal(store.data.language, 'zh');
  assert.deepEqual(store.data.profiles, {});
  assert.equal(storage.data.size, 0);
});

test('first run uses the detected language without implicitly writing a model or profile', () => {
  for (const language of ['zh', 'en']) {
    const storage = memoryStorage();
    const store = new AppStore(storage, language);
    assert.equal(store.data.language, language);
    assert.equal(store.data.activeModel, null);
    assert.deepEqual(store.data.profiles, {});
    assert.equal(storage.data.size, 0);
  }
});

test('reopening honors a saved manual language choice when the system language changes', () => {
  for (const [saved, system] of [['zh','en'], ['en','zh']]) {
    const storage = memoryStorage();
    const store = new AppStore(storage, system);
    store.saveProfile('cnx', new ModelCalculator('cnx'), createSession({}, saved));
    const reopened = new AppStore(storage, system);
    assert.equal(reopened.data.language, saved);
    assert.equal(JSON.parse(storage.getItem(STORAGE_KEY)).language, saved);
  }
});

test('current saves without a valid language use the detected language and retain model data', () => {
  for (const language of [undefined, null, 'unsupported']) {
    const store = new AppStore(memoryStorage({[STORAGE_KEY]:JSON.stringify({version:2,language,activeModel:'cncw',profiles:{cncw:{calculator:{vars:{A:7}}}}})}), 'en');
    assert.equal(store.data.language, 'en');
    assert.equal(store.data.activeModel, 'cncw');
    assert.equal(store.profile('cncw').calculator.vars.A, 7);
  }
});

test('legacy migration preserves saved language ahead of detected language', () => {
  for (const [saved, system] of [['zh','en'], ['en','zh']]) {
    const store = new AppStore(memoryStorage({[LEGACY_KEY]:JSON.stringify({language:saved,calculator:{vars:{A:5}}})}), system);
    assert.equal(store.data.language, saved);
    assert.equal(store.profile('cnx').calculator.vars.A, 5);
  }
});

test('legacy migration without a valid language uses and persists the detected language', () => {
  for (const language of [undefined, null, 'unsupported']) {
    const original = JSON.stringify({language,calculator:{vars:{A:5}}});
    const storage = memoryStorage({[LEGACY_KEY]:original});
    const store = new AppStore(storage, 'en');
    assert.equal(store.data.language, 'en');
    assert.equal(store.profile('cnx').calculator.vars.A, 5);
    assert.equal(JSON.parse(storage.getItem(STORAGE_KEY)).language, 'en');
    assert.equal(storage.getItem(LEGACY_KEY), original);
  }
});

test('unreadable saves recover with the detected language and preserve the original data', () => {
  for (const key of [STORAGE_KEY, LEGACY_KEY]) {
    const storage = memoryStorage({[key]:'{broken'});
    const store = new AppStore(storage, 'en');
    assert.equal(store.data.language, 'en');
    assert.ok(store.warning);
    assert.equal(store.data.activeModel, null);
    assert.equal(storage.getItem(key), '{broken');
  }
});

test('switching and reopening preserves separate history, variables, mode and angle', () => {
  const storage = memoryStorage();
  const store = new AppStore(storage);
  const cnx = new ModelCalculator('cnx');
  cnx.vars.A = 7;
  cnx.vars.M = 9;
  cnx.angle = 'Rad';
  const cnxState = createSession({}, 'en');
  cnxState.mode = 'matrix';
  cnxState.history = [{expr:'A+1', latex:'A+1', answer:'8', mode:'calc'}];
  cnxState.matrices = {MatA:[[1,2],[3,4]]};
  assert.equal(store.saveProfile('cnx', cnx, cnxState), true);
  assert.equal(store.select('cncw'), true);

  const cw = new ModelCalculator('cncw');
  cw.vars.A = 3;
  cw.define('f', 'x^2');
  const cwState = createSession({}, 'en');
  cwState.mode = 'table';
  cwState.history = [{expr:'f(2)', latex:'f(2)', answer:'4', mode:'calc'}];
  assert.equal(store.saveProfile('cncw', cw, cwState), true);
  const reopened = new AppStore(storage);
  assert.equal(reopened.data.activeModel, 'cncw');
  assert.equal(reopened.data.language, 'en');
  assert.equal(reopened.profile('cnx').mode, 'matrix');
  assert.equal(reopened.profile('cnx').calculator.angle, 'Rad');
  assert.equal(reopened.profile('cnx').calculator.vars.A, 7);
  assert.equal(reopened.profile('cnx').calculator.vars.M, 9);
  assert.deepEqual(reopened.profile('cnx').matrices.MatA, [[1,2],[3,4]]);
  assert.equal(reopened.profile('cncw').calculator.vars.A, 3);
  assert.equal(reopened.profile('cncw').mode, 'table');
  assert.equal(new ModelCalculator('cncw', reopened.profile('cncw').calculator).evaluate('f(3)'), 9);
  assert.notDeepEqual(reopened.profile('cnx').history, reopened.profile('cncw').history);
});

test('switching session discards unfinished input, modifiers, undo and modal navigation', () => {
  const session = createSession({mode:'complex', history:[{expr:'1+i', latex:'1+i', answer:'1+i', mode:'complex'}]}, 'en');
  assert.equal(session.mode, 'complex');
  assert.equal(session.language, 'en');
  assert.equal(session.expr, '');
  assert.equal(session.latex, '');
  assert.equal(session.hasAnswer, false);
  assert.equal(session.shift, false);
  assert.equal(session.alpha, false);
  assert.deepEqual(session.undo, []);
  assert.deepEqual(session.stack, []);
  assert.equal(session.form, null);
  assert.equal(session.history.length, 1);
});

test('legacy cnx-v1 migrates only to CN X and retains the original key', () => {
  const original = JSON.stringify({language:'en', calculator:{angle:'Gra', vars:{A:11,M:4}}, mode:'vector', history:[{expr:'2+2', latex:'2+2', answer:'4', mode:'calc'}]});
  const storage = memoryStorage({[LEGACY_KEY]:original});
  const store = new AppStore(storage);
  assert.equal(store.warning, '');
  assert.equal(store.data.activeModel, 'cnx');
  assert.equal(store.data.language, 'en');
  assert.equal(store.profile('cnx').calculator.angle, 'Gra');
  assert.equal(store.profile('cnx').calculator.vars.M, 4);
  assert.equal(store.profile('cnx').mode, 'vector');
  assert.deepEqual(store.profile('cncw').history, []);
  assert.equal(storage.getItem(LEGACY_KEY), original);
  assert.equal(JSON.parse(storage.getItem(STORAGE_KEY)).version, 2);
});

test('a current v2 save takes precedence over legacy data', () => {
  const storage = memoryStorage({
    [STORAGE_KEY]:JSON.stringify({version:2,activeModel:'cncw',language:'zh',profiles:{cncw:{calculator:{vars:{A:8}}}}}),
    [LEGACY_KEY]:JSON.stringify({language:'en',calculator:{vars:{A:99}}}),
  });
  const store = new AppStore(storage);
  assert.equal(store.data.activeModel, 'cncw');
  assert.equal(store.data.language, 'zh');
  assert.equal(store.profile('cncw').calculator.vars.A, 8);
  assert.equal(store.profile('cnx').calculator.vars.A, undefined);
});

for (const [label, value] of [['corrupt JSON','{broken'], ['future version','{"version":3}'], ['null document','null']]) {
  test(`storage recovers from ${label} and reports the failure`, () => {
    const storage = memoryStorage({[STORAGE_KEY]:value});
    const store = new AppStore(storage);
    assert.ok(store.warning);
    assert.equal(store.data.activeModel, null);
    assert.deepEqual(store.profile('cnx').history, []);
    assert.equal(storage.getItem(STORAGE_KEY), value, 'reading must not overwrite unreadable data');
  });
}

test('unknown saved model IDs cannot become active or create profiles', () => {
  const store = new AppStore(memoryStorage({[STORAGE_KEY]:JSON.stringify({version:2,activeModel:'not-a-model',language:'unexpected',profiles:{'not-a-model':{mode:'stat'},invalid:{mode:'matrix'},cnx:{mode:'calc'}}})}));
  assert.equal(store.data.activeModel, null);
  assert.equal(store.data.language, 'zh');
  assert.deepEqual(Object.keys(store.data.profiles), ['cnx']);
  assert.throws(() => store.select('not-a-model'), RangeError);
  assert.throws(() => store.profile('unknown'), RangeError);
  assert.throws(() => store.resetProfile('unknown'), RangeError);
});

test('sanitizing damaged profile data rejects invalid dimensions, variables and nonfinite values', () => {
  const profile = sanitizeProfile({
    calculator:{angle:'Bogus',vars:{A:2,B:Infinity,C:NaN,evil:4,Ans:3},definitions:{f:'x+1',h:'x'}},
    mode:'invalid', format:'invalid', digits:-1,
    matrices:{MatA:[[1,2],[3,4]],MatB:[[1],[2,3]],MatC:[[Infinity]],Wrong:[[1]]},
    vectors:{VctA:[1,2],VctB:[1,NaN],VctC:[1],Wrong:[1,2,3]},
    statsRows:[[1,2,1],[1,2,0],[1,2,.5],[NaN,1,2],[2,3,4]],
    regression:'invalid',menuSelections:{good:1,negative:-1,fraction:.5,tooLarge:200},
  });
  assert.deepEqual(profile.calculator.vars, {A:2,Ans:3});
  assert.deepEqual(profile.calculator.definitions, {f:'x+1'});
  assert.equal(profile.calculator.angle, 'Deg');
  assert.equal(profile.mode, 'calc');
  assert.equal(profile.format, 'Norm');
  assert.equal(profile.digits, 10);
  assert.deepEqual(profile.matrices, {MatA:[[1,2],[3,4]]});
  assert.deepEqual(profile.vectors, {VctA:[1,2]});
  assert.deepEqual(profile.statsRows, [[1,2,1],[2,3,4]]);
  assert.deepEqual(profile.menuSelections, {good:1});
  assert.equal(profile.regression, 'single');
});

test('history is limited to the most recent 100 complete supported entries', () => {
  const entries = Array.from({length:110}, (_,i) => ({expr:String(i),latex:String(i),answer:String(i*2),mode:'calc'}));
  const profile = sanitizeProfile({history:[{expr:'bad',answer:'1',mode:'unknown'}, ...entries, {expr:'x'.repeat(3001),answer:'1',mode:'calc'}]});
  assert.equal(profile.history.length, 100);
  assert.equal(profile.history[0].expr, '10');
  assert.equal(profile.history.at(-1).expr, '109');
});

test('Fix uses 0–9 decimal places and Sci uses 1–10 significant digits', () => {
  assert.equal(sanitizeProfile({format:'Fix',digits:0}).digits, 0);
  assert.equal(sanitizeProfile({format:'Fix',digits:9}).digits, 9);
  assert.equal(sanitizeProfile({format:'Fix',digits:10}).digits, 9);
  assert.equal(sanitizeProfile({format:'Sci',digits:1}).digits, 1);
  assert.equal(sanitizeProfile({format:'Sci',digits:10}).digits, 10);
  assert.equal(sanitizeProfile({format:'Sci',digits:0}).digits, 10);
});

test('saved profile excludes unfinished formula input and transient UI state', () => {
  const storage = memoryStorage();
  const store = new AppStore(storage);
  const session = createSession();
  Object.assign(session, {expr:'A+unfinished',latex:'\\frac{A}{}',shift:true,alpha:true,form:{title:'Draft'},stack:[{title:'Draft'}],undo:['sensitive draft']});
  store.saveProfile('cnx', new ModelCalculator('cnx'), session);
  const persisted = JSON.parse(storage.getItem(STORAGE_KEY)).profiles.cnx;
  for (const key of ['expr','latex','shift','alpha','form','stack','undo']) assert.equal(Object.hasOwn(persisted,key), false, key);
  assert.equal(JSON.stringify(persisted).includes('unfinished'), false);
});

test('profile snapshots and sessions do not retain mutable matrix, vector or statistics aliases', () => {
  const source = {matrices:{MatA:[[1,2],[3,4]]}, vectors:{VctA:[1,2]}, statsRows:[[1,2,3]]};
  const profile = sanitizeProfile(source);
  const session = createSession(profile);
  source.matrices.MatA[0][0] = 99;
  source.vectors.VctA[0] = 99;
  source.statsRows[0][0] = 99;
  assert.deepEqual(profile.matrices.MatA, [[1,2],[3,4]]);
  assert.deepEqual(profile.vectors.VctA, [1,2]);
  assert.deepEqual(profile.statsRows, [[1,2,3]]);
  session.matrices.MatA[0][0] = 88;
  session.vectors.VctA[0] = 88;
  session.statsRows[0][0] = 88;
  assert.deepEqual(profile.matrices.MatA, [[1,2],[3,4]]);
  assert.deepEqual(profile.vectors.VctA, [1,2]);
  assert.deepEqual(profile.statsRows, [[1,2,3]]);
});

test('resetting one model preserves the other profile and shared language', () => {
  const store = new AppStore(memoryStorage());
  const cnx = new ModelCalculator('cnx');
  cnx.vars.A = 3;
  const cw = new ModelCalculator('cncw');
  cw.vars.A = 8;
  cw.define('f', 'x+1');
  store.saveProfile('cnx', cnx, createSession({}, 'en'));
  store.saveProfile('cncw', cw, createSession({}, 'en'));
  store.select('cncw');
  store.resetProfile('cnx');
  assert.deepEqual(store.profile('cnx').calculator.vars, {});
  assert.equal(store.profile('cncw').calculator.vars.A, 8);
  assert.deepEqual(store.profile('cncw').calculator.definitions, {f:'x+1'});
  assert.equal(store.data.language, 'en');
  assert.equal(store.data.activeModel, 'cncw');
});

test('quota failures return false, retain usable in-memory data and report a warning', () => {
  let exhausted = true;
  const storage = memoryStorage();
  const write = storage.setItem;
  storage.setItem = (key, value) => {if (exhausted) throw new Error('QuotaExceededError'); write(key, value);};
  const store = new AppStore(storage);
  assert.equal(store.select('cncw'), false);
  assert.equal(store.data.activeModel, 'cncw');
  assert.ok(store.warning);
  const calc = new ModelCalculator('cncw');
  calc.vars.A = 9;
  assert.equal(store.saveProfile('cncw', calc, createSession({}, 'en')), false);
  assert.equal(store.profile('cncw').calculator.vars.A, 9);
  exhausted = false;
  assert.equal(store.write(), true);
  assert.equal(store.warning, '');
  const reopened = new AppStore(storage);
  assert.equal(reopened.profile('cncw').calculator.vars.A, 9);
  assert.equal(reopened.data.activeModel, 'cncw');
  assert.equal(reopened.data.language, 'en');
});

test('blocked storage access is recoverable and cannot abort startup', () => {
  const store = new AppStore({getItem() {throw new Error('SecurityError');}, setItem() {throw new Error('SecurityError');}});
  assert.ok(store.warning);
  assert.equal(store.data.activeModel, null);
  assert.equal(store.select('cnx'), false);
  assert.ok(store.warning);
});

test('numerical provenance survives storage/restart and stays independent per model', () => {
  const storage = memoryStorage();
  const store = new AppStore(storage);
  const cnx = new ModelCalculator('cnx');
  cnx.calculate('integral("x^2",0,1)');
  cnx.assign('A', cnx.vars.Ans, cnx.lastEvaluationApproximate);
  cnx.assign('M', .25, true);
  store.saveProfile('cnx', cnx, createSession());
  const cw = new ModelCalculator('cncw');
  cw.assign('A', 1/3);
  cw.calculate('A');
  store.saveProfile('cncw', cw, createSession());
  const reopened = new AppStore(storage);
  const restoredX = new ModelCalculator('cnx', reopened.profile('cnx').calculator);
  const restoredCW = new ModelCalculator('cncw', reopened.profile('cncw').calculator);
  assert.equal(restoredX.isApproximate('Ans+A+M'), true);
  assert.ok(Math.abs(restoredX.evaluate('A')-1/3)<1e-10);
  assert.equal(restoredX.lastEvaluationApproximate, true);
  assert.equal(restoredCW.isApproximate('Ans+A'), false);
  assert.equal(Object.hasOwn(restoredCW.vars, 'M'), false);
  reopened.resetProfile('cnx');
  assert.deepEqual(reopened.profile('cnx').calculator.approximateVariables, []);
  assert.equal(new ModelCalculator('cncw', reopened.profile('cncw').calculator).isApproximate('A'), false);
});

test('legacy saves default to exact provenance and damaged tags cannot create variables', () => {
  const migrated = new AppStore(memoryStorage({[LEGACY_KEY]:JSON.stringify({calculator:{vars:{A:1/3}}})}));
  const legacy = new ModelCalculator('cnx', migrated.profile('cnx').calculator);
  assert.equal(legacy.isApproximate('A'), false);
  const profile = sanitizeProfile({calculator:{vars:{A:2,M:3},approximateVariables:['A','M','Ans','missing',null,7]}});
  assert.deepEqual(profile.calculator.approximateVariables, ['A','M','Ans']);
  const cw = new ModelCalculator('cncw', profile.calculator);
  assert.equal(cw.isApproximate('A'), true);
  assert.equal(cw.approximateVariables.has('M'), false);
  assert.equal(cw.approximateVariables.has('missing'), false);
  assert.equal(Object.hasOwn(cw.vars, 'missing'), false);
});
