import test from 'node:test';
import assert from 'node:assert/strict';
import {MODELS, getModel} from '../src/models/registry.js';
import {ModelCalculator} from '../src/engine/model-calculator.js';
import {math} from '../src/engine/calculator.js';

const near = (actual, expected, tolerance = 1e-10) => assert.ok(
  Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected)),
  `${actual} differs from ${expected}`,
);

// These tests check the implemented desktop subset, not hardware certification.
for (const id of ['cnx', 'cncw']) {
  test(`${id}: arithmetic, fractions and angle units use the shared engine`, () => {
    const calc = new ModelCalculator(id);
    assert.equal(calc.calculate('2+3*4'), 14);
    assert.equal(calc.calculate('Ans/2'), 7);
    near(calc.evaluate('1/2+1/3'), 5/6);
    near(calc.evaluate('sqrt(2)^2'), 2);
    near(calc.evaluate('sin(30)+cos(60)'), 1);
    calc.angle = 'Rad';
    near(calc.evaluate('sin(pi/6)'), .5);
    calc.angle = 'Gra';
    near(calc.evaluate('asin(1)'), 100);
  });

  test(`${id}: complex, matrix and vector calculations keep their result types`, () => {
    const calc = new ModelCalculator(id);
    const result = calc.evaluate('(1+2i)*(3-4i)', {}, true);
    assert.equal(result.re, 11);
    assert.equal(result.im, 2);
    assert.throws(() => calc.evaluate('sqrt(-1)'), /复数模式/);
    assert.equal(calc.evaluate('det(MatA)', {MatA:[[1,2],[3,4]]}), -2);
    const inverse = calc.evaluate('inv(MatA)', {MatA:[[2,0],[0,4]]});
    const entries = math.isMatrix(inverse) ? inverse.toArray() : inverse;
    assert.deepEqual(entries.map(row => row.length), [2,2]);
    entries.flat().forEach((value, index) => near(value, [.5,0,0,.25][index]));
    assert.equal(calc.evaluate('dot(VctA,VctB)', {VctA:[1,2,3], VctB:[4,5,6]}), 32);
  });

  test(`${id}: calculus and invalid inputs remain protected by model policy`, () => {
    const calc = new ModelCalculator(id);
    near(calc.integrate('x^2', 0, 1), 1/3);
    near(calc.differentiate('x^3', 2), 12);
    near(calc.solve('x^2=2', 1), Math.sqrt(2));
    for (const expression of ['1/0', '0/0', 'tan(90)', 'import("node:fs")', 'A=3']) {
      assert.throws(() => calc.evaluate(expression), expression);
    }
    assert.equal(calc.vars.A, 0, 'rejected assignment must not mutate variables');
  });

  test(`${id}: single-function tables accept 45 rows and reject the 46th`, () => {
    const calc = new ModelCalculator(id);
    const rows = calc.makeTable('x^2', '', 0, 44, 1);
    assert.equal(rows.length, 45);
    assert.deepEqual(rows[44], [44,1936]);
    assert.throws(() => calc.makeTable('x', '', 0, 45, 1), /45/);
    assert.throws(() => calc.makeTable('x', '', 0, 1, 0));
    assert.deepEqual(calc.makeTable('x', '', 1, 0, -.5), [[1,1],[.5,.5],[0,0]]);
  });

  test(`${id}: saved angle and supported variables restore without foreign variables`, () => {
    const calc = new ModelCalculator(id, {angle:'Rad', vars:{A:12, Ans:4, unknown:9, M:7}});
    assert.equal(calc.angle, 'Rad');
    assert.equal(calc.evaluate('A+Ans'), 16);
    assert.equal(Object.hasOwn(calc.vars, 'unknown'), false);
    assert.equal(Object.hasOwn(calc.vars, 'M'), id === 'cnx');
    const restored = new ModelCalculator(id, calc.save());
    assert.deepEqual(restored.save(), calc.save());
  });
}

test('CN X and CW expose their documented application orders and digit shortcuts', () => {
  assert.deepEqual(getModel('cnx').modes.map(mode => mode[3]), [
    'calc','complex','base','matrix','vector','stat','table','equation','inequality','ratio',
  ]);
  assert.deepEqual(getModel('cncw').modes.map(mode => mode[3]), [
    'calc','stat','table','equation','inequality','complex','base','matrix','vector','ratio',
  ]);
  for (const id of ['cnx','cncw']) {
    assert.deepEqual(getModel(id).modes.map(mode => mode[1]), ['1','2','3','4','5','6','7','8','9','0']);
  }
});

test('EX is explicitly experimental, unknown models are rejected and definitions stay immutable', () => {
  const ex = MODELS.find(model => model.id === 'ex');
  assert.equal(ex.status, 'experimental');
  assert.equal(ex.selectable, true);
  assert.equal(new ModelCalculator('ex').model.id, 'ex');
  assert.throws(() => new ModelCalculator('missing'), RangeError);
  assert.throws(() => getModel('cncw').variables.push('M'), TypeError);
  assert.throws(() => {getModel('cnx').modes[0][3] = 'stat';}, TypeError);
});

test('CN X retains independent M memory and its existing 45-row dual table extension', () => {
  const calc = new ModelCalculator('cnx');
  calc.vars.M = 7;
  assert.equal(calc.evaluate('M+1'), 8);
  assert.equal(calc.makeTable('x', 'x+1', 0, 44, 1).length, 45);
  assert.throws(() => calc.makeTable('x', 'x+1', 0, 45, 1), /45/);
  assert.throws(() => calc.define('f', 'x^2'), /不支持注册函数/);
  assert.throws(() => calc.evaluate('f(2)'));
});

test('CW has no independent M and limits dual-function tables to 30 rows', () => {
  const calc = new ModelCalculator('cncw');
  assert.throws(() => calc.evaluate('M'));
  assert.equal(calc.makeTable('x', 'x+1', 0, 29, 1).length, 30);
  assert.throws(() => calc.makeTable('x', 'x+1', 0, 30, 1), /30/);
  assert.equal(getModel('cncw').status, 'experimental');
});

test('CW registered f and g compose, use angle/variables and survive save/restore', () => {
  const calc = new ModelCalculator('cncw');
  calc.vars.A = 2;
  calc.define('f', 'A*x^2');
  calc.define('g', 'f(x)+sin(x)');
  near(calc.evaluate('g(30)'), 1800.5);
  assert.equal(calc.evaluate('f(f(2))'), 128);
  const restored = new ModelCalculator('cncw', calc.save());
  near(restored.evaluate('g(30)'), 1800.5);
  restored.vars.A = 3;
  assert.equal(restored.evaluate('f(2)'), 12, 'definitions must use current variables');
  calc.angle = 'Rad';
  near(calc.evaluate('g(pi/2)'), 2*(Math.PI/2)**2+1);
});

test('CW registered functions work in table, calculus and numerical SOLVE', () => {
  const calc = new ModelCalculator('cncw');
  calc.define('f', 'x^2');
  calc.define('g', 'f(x)+1');
  assert.deepEqual(calc.makeTable('f(x)', 'g(x)', 1, 3, 1), [[1,1,2],[2,4,5],[3,9,10]]);
  near(calc.integrate('f(x)', 0, 1), 1/3);
  near(calc.differentiate('g(x)', 2), 4);
  near(calc.solve('f(x)=2', 1), Math.sqrt(2));
});

test('CW accepts definitions singular at zero without evaluating while registering', () => {
  const calc = new ModelCalculator('cncw');
  calc.define('f', '1/x');
  near(calc.evaluate('f(2)'), .5);
  assert.throws(() => calc.evaluate('f(0)'));
});

test('CW refuses direct and mutual recursion before replacing a working definition', () => {
  const calc = new ModelCalculator('cncw');
  calc.define('f', 'x+1');
  assert.throws(() => calc.define('f', 'f (x)+1'), /循环引用错误/);
  assert.equal(calc.evaluate('f(2)'), 3);
  calc.define('g', 'f(x)*2');
  assert.throws(() => calc.define('f', 'g(x)'), /循环引用错误/);
  assert.equal(calc.evaluate('g(2)'), 6);
  assert.throws(() => calc.define('g', 'sum("f(x)",1,2)+g(x)'), /循环引用错误/);
  assert.equal(calc.evaluate('g(2)'), 6);
});

test('CW rejects cycles nested in calculus expression strings', () => {
  const calc = new ModelCalculator('cncw');
  calc.define('f', 'x+1');
  calc.define('g', 'f(x)');
  assert.throws(() => calc.define('f', 'sum("g(x)",1,2)'), /循环引用错误/);
  assert.equal(calc.evaluate('g(2)'), 3);
});

test('CW detects escaped function references inside calculus strings', () => {
  const calc = new ModelCalculator('cncw');
  calc.define('f', 'x+1');
  calc.define('g', 'f(x)');
  assert.throws(() => calc.define('f', 'sum("\\u0067(x)",1,2)'), /循环引用错误/);
  assert.equal(calc.evaluate('g(2)'), 3);
});

test('CW rejects unsafe definitions and reports undefined registrations', () => {
  const calc = new ModelCalculator('cncw');
  for (const [name, expression] of [['h','x'], ['f','A=1'], ['f','import("fs")'], ['f','x'.repeat(1501)]]) {
    assert.throws(() => calc.define(name, expression));
  }
  assert.throws(() => calc.evaluate('f(2)'), /请先定义函数/);
  calc.define('f', 'g(x)+1');
  assert.throws(() => calc.evaluate('f(2)'), /请先定义函数/);
  const restored = new ModelCalculator('cncw', {definitions:{f:'import("fs")', g:'x+2'}});
  assert.equal(restored.evaluate('g(3)'), 5);
  assert.throws(() => restored.evaluate('f(3)'), /请先定义函数/);
});

test('invalid replacement definitions leave the previous function and variables intact', () => {
  const calc = new ModelCalculator('cncw');
  calc.define('f', 'x+1');
  for (const expression of ['A=3', 'import("fs")', 'sum("A=3",1,2)', 'diff("import(\\"fs\\")",2)']) {
    assert.throws(() => calc.define('f', expression), expression);
    assert.equal(calc.evaluate('f(2)'), 3, expression);
    assert.equal(calc.vars.A, 0, 'validation must not execute assignments');
  }
});

for (const id of ['cnx','cncw']) {
  test(`${id}: numerical calculus is flagged approximate while algebra and finite sums remain natural`, () => {
    const calc = new ModelCalculator(id);
    for (const expression of ['sqrt(2)', '1/3', 'sum("x",1,3)', 'prod("x",1,3)']) {
      assert.equal(calc.isApproximate(expression), false, expression);
    }
    for (const expression of ['integral("x^2",0,1)', 'diff("x^2",2)', '1+integral("x",0,1)']) {
      assert.equal(calc.isApproximate(expression), true, expression);
    }
  });
}

test('CW approximate classification follows nested f and g after replacement and restore', () => {
  const calc = new ModelCalculator('cncw');
  calc.define('f', 'integral("x^2",0,x)');
  calc.define('g', 'f(x)+1');
  assert.equal(calc.isApproximate('g(2)'), true);
  assert.equal(new ModelCalculator('cncw', calc.save()).isApproximate('g(2)'), true);
  calc.define('f', 'x^2');
  assert.equal(calc.isApproximate('g(2)'), false);
  assert.equal(calc.evaluate('g(2)'), 5);
});

test('approximate classification detects calculus nested inside finite-sum expression strings', () => {
  const calc = new ModelCalculator('cncw');
  const expression = 'sum("diff(\\"x^2\\",x)",1,3)';
  near(calc.evaluate(expression), 12);
  assert.equal(calc.isApproximate(expression), true);
  calc.define('f', expression);
  calc.define('g', 'f(x)+1');
  assert.equal(calc.isApproximate('g(2)'), true);
});

test('runtime recursion protection also covers corrupt definitions across calculus scopes', () => {
  const calc = new ModelCalculator('cncw');
  // Simulate externally corrupted memory bypassing the registration API.
  calc.definitions = {f:'sum("g(x)",1,2)',g:'f(x)'};
  assert.throws(() => calc.evaluate('f(2)'), /循环引用错误/);
  calc.define('f', 'x+1');
  assert.equal(calc.evaluate('g(2)'), 3, 'a rejected recursive call must unwind its call stack');
});

for (const id of ['cnx','cncw']) {
  test(`${id}: approximate calculus provenance follows Ans and explicitly stored variables`, () => {
    const calc = new ModelCalculator(id);
    near(calc.calculate('integral("x^2",0,1)'), 1/3);
    assert.equal(calc.lastEvaluationApproximate, true);
    near(calc.calculate('Ans*3'), 1);
    assert.equal(calc.lastEvaluationApproximate, true, 'arithmetic must retain numerical provenance');
    calc.assign('A', calc.vars.Ans, calc.lastEvaluationApproximate);
    near(calc.evaluate('A+1/3'), 4/3);
    assert.equal(calc.lastEvaluationApproximate, true);
    assert.equal(calc.isApproximate('A'), true);
    assert.equal(calc.isApproximate('B'), false, 'unrelated variables must remain exact');
  });

  test(`${id}: new exact calculations and assignments clear only their own approximation flags`, () => {
    const calc = new ModelCalculator(id);
    calc.assign('A', 1/3, true);
    calc.calculate('diff("x^3",2)');
    assert.equal(calc.isApproximate('Ans'), true);
    near(calc.calculate('1/3'), 1/3);
    assert.equal(calc.lastEvaluationApproximate, false);
    assert.equal(calc.isApproximate('Ans'), false);
    assert.equal(calc.isApproximate('A'), true, 'clearing Ans must not erase another variable flag');
    calc.assign('A', 1/3);
    assert.equal(calc.isApproximate('A'), false);
    near(calc.evaluate('A'), 1/3);
    assert.equal(calc.lastEvaluationApproximate, false);
  });

  test(`${id}: failed assignment preserves both the old value and its approximation provenance`, () => {
    const calc = new ModelCalculator(id);
    calc.assign('A', 7, true);
    assert.throws(() => calc.assign('A', Infinity));
    assert.throws(() => calc.assign('unknown', 8, true), /变量或函数未定义/);
    assert.equal(calc.vars.A, 7);
    assert.equal(calc.isApproximate('A'), true);
    assert.equal(Object.hasOwn(calc.vars, 'unknown'), false);
  });
}

test('CW registered functions follow current approximate variable provenance', () => {
  const calc = new ModelCalculator('cncw');
  calc.assign('A', 1/3, true);
  calc.define('f', 'A*x');
  calc.define('g', 'f(x)+1');
  near(calc.evaluate('g(3)'), 2);
  assert.equal(calc.lastEvaluationApproximate, true);
  calc.assign('A', 1/3, false);
  near(calc.evaluate('g(3)'), 2);
  assert.equal(calc.lastEvaluationApproximate, false, 'function flags must not be cached after variable replacement');
});

test('model-aware assignments retain CN X M provenance and reject CW M entirely', () => {
  const cnx = new ModelCalculator('cnx');
  cnx.assign('M', 2/3, true);
  near(cnx.evaluate('M'), 2/3);
  assert.equal(cnx.lastEvaluationApproximate, true);
  cnx.assign('M', 2);
  assert.equal(cnx.isApproximate('M'), false);
  const cw = new ModelCalculator('cncw');
  assert.throws(() => cw.assign('M', 2/3, true), /变量或函数未定义/);
  assert.equal(Object.hasOwn(cw.vars, 'M'), false);
  assert.equal(cw.approximateVariables.has('M'), false);
});
