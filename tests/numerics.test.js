import test from 'node:test';
import assert from 'node:assert/strict';
import { math, Calculator } from '../src/engine/calculator.js';
import { realRoots, polynomialRoots, linearSystem, statistics, regressionValue } from '../src/engine/modes.js';

function close(actual, expected, relative = 1e-12, absolute = 0) {
  assert.ok(Number.isFinite(actual), `Expected finite result; received ${actual}`);
  assert.ok(Math.abs(actual - expected) <= Math.max(absolute, relative * Math.abs(expected)), `${actual} ≠ ${expected}`);
}

function rootsEqual(coefficients, expected, relative = 1e-12) {
  for (const solve of [realRoots, polynomialRoots]) {
    const roots = solve(coefficients);
    assert.equal(roots.length, expected.length, `${solve.name}: unexpected root count`);
    roots.forEach((root, i) => close(root, expected[i], relative));
  }
}

test('SOLVE can target a selected variable without mutating saved variables',()=>{
  const calc=new Calculator({vars:{x:3,B:7}}),before=calc.save();
  close(calc.solve('x^2+B=0',0,{},'B'),-9);
  close(calc.solve('x^2+B=0',1,{B:-2},'x'),Math.sqrt(2));
  assert.throws(()=>calc.solve('x=1',0,{},'Ans'));
  assert.deepEqual(calc.save(),before);
});

for (const scale of [1, -1, 1e-24, -1e-24, 1e24]) {
  test(`SOLVE checks convergence independently of equation scale ${scale}`, () => {
    const calc = new Calculator({vars:{x:17,Ans:23}}), before = calc.save();
    close(calc.solve(`${scale}*(x-1)=0`, 0), 1);
    close(calc.solve(`${scale}*(x^2-2)=0`, 1), Math.sqrt(2));
    assert.throws(() => calc.solve(`${scale}*(x^2+1)=0`, 0), /无法求解/);
    assert.deepEqual(calc.save(), before);
  });
}

test('SOLVE rejects poles, asymptotic zero and constant nonzero equations', () => {
  const calc = new Calculator(); calc.angle = 'Rad';
  for (const expr of ['1e-24', '1/(x-0.12345)', 'exp(-x)', 'x^2+1e-30', '(x-1)^2+1e-24']) {
    assert.throws(() => calc.solve(expr, 0), /无法求解/, expr);
  }
  assert.throws(()=>calc.solve('x^2+1e-30',1),/无法求解/);
  assert.throws(()=>calc.solve('(x-1)^2+1e-24',0),/无法求解/);
  close(calc.solve('x-1e-20', 0), 1e-20);
  close(calc.solve('(x-3)^2', 0), 3, 1e-10);
  assert.throws(() => calc.solve('x', Infinity));
});

for (const offset of [0, 1000, 10000, 1e6]) {
  test(`quadratic regression remains accurate after x offset ${offset}`, () => {
    const rows = Array.from({length:5}, (_,i) => [offset+i, i*i, i+1]);
    const fit = statistics(rows, 'quadratic');
    close(fit.a, offset**2, 1e-12, 1e-12);
    close(fit.b, -2*offset, 1e-12, 1e-12);
    close(fit.c, 1);
    for (const [x,y] of rows) close(regressionValue(fit, 'quadratic', x), y, 1e-12, 1e-11);
  });
}

test('quadratic regression handles tiny x, frequency weights and rank deficiency', () => {
  const fit = statistics([[1e-20,1,2],[2e-20,4,1],[3e-20,9,3]], 'quadratic');
  close(fit.c, 1e40);
  close(regressionValue(fit, 'quadratic', 2.5e-20), 6.25);
  assert.throws(() => statistics([[1,2],[1,3],[2,4]], 'quadratic'), /无法回归/);
  assert.throws(() => regressionValue(fit, 'quadratic', Infinity));
});

test('quadratic preserves the two roots 1 and 1.000001', () => {
  rootsEqual([1, -2.000001, 1.000001], [1, 1.000001]);
});

test('quadratic does not treat a small nonzero discriminant as zero', () => {
  rootsEqual([1, 0, -1e-40], [-1e-20, 1e-20]);
  assert.deepEqual(realRoots([1, 0, 1e-40]), []);
  const complex = polynomialRoots([1, 0, 1e-40]);
  assert.equal(complex.length, 2);
  complex.forEach(root => close(math.abs(root), 1e-20));
  assert.ok(complex[0].im * complex[1].im < 0);
});

test('quadratic avoids cancellation when roots differ greatly in magnitude', () => {
  const roots = polynomialRoots([1, -1e16, 1]);
  close(roots[0], 1e-16);
  close(roots[1], 1e16);
});

test('cubic keeps nearby real roots instead of merging them into a stationary point', () => {
  rootsEqual([1, -4.000001, 5.000003, -2.000002], [1, 1.000001, 2]);
});

test('cubic isolation preserves a zero and both small real roots', () => {
  rootsEqual([1, 0, -1e-40, 0], [-1e-20, 0, 1e-20]);
});

test('cubic isolation retains a very small root between two ordinary roots', () => {
  rootsEqual([1, -1e-100, -1, 1e-100], [-1, 1e-100, 1]);
});

test('triple and quadruple roots retain multiplicity without spurious imaginary parts', () => {
  for (const coefficients of [[1, -3, 3, -1], [1, -4, 6, -4, 1]]) {
    assert.deepEqual(realRoots(coefficients), [1]);
    assert.deepEqual(polynomialRoots(coefficients), Array(coefficients.length - 1).fill(1));
  }
});

test('irrational repeated roots remain present in a quartic square', () => {
  const root = Math.sqrt(2);
  const real = realRoots([1, 0, -4, 0, 4]);
  assert.equal(real.length, 2);
  close(real[0], -root);
  close(real[1], root);
  const all = polynomialRoots([1, 0, -4, 0, 4]);
  assert.equal(all.length, 4);
  all.forEach((value, i) => close(value, i < 2 ? -root : root));
});

test('a near miss at a stationary point is not turned into a repeated real root', () => {
  // The two extrema have positive values. The cubic has exactly one real root;
  // ordinary double Horner evaluation rounds its local minimum to zero.
  const coefficients = [1, -1, -0.9999999999999999, 1];
  const real = realRoots(coefficients);
  assert.equal(real.length, 1);
  close(real[0], -1);
  const all = polynomialRoots(coefficients);
  assert.equal(all.length, 3);
  assert.equal(all.filter(value => math.isComplex(value) && value.im !== 0).length, 2);
});

test('polynomial inputs reject nonfinite coefficients and unsupported degree', () => {
  assert.throws(() => realRoots([1, NaN, 1]));
  assert.throws(() => polynomialRoots([1, Infinity, 1]));
  assert.throws(() => polynomialRoots([1, 0, 0, 0, 0, 1]));
  assert.throws(() => polynomialRoots([0, 0, 0]));
});

test('linear systems are invariant under independent nonzero row scaling', () => {
  const rows = [[3, 1, -1, 2], [1, 4, 1, 12], [2, -1, 5, 15]];
  const scaled = rows.map((row, i) => row.map(value => value * [1e-20, 1, 1e20][i]));
  for (const input of [rows, scaled]) linearSystem(input).forEach((value, i) => close(value, i + 1));
  const small = linearSystem([[1e-30, 2e-30, 5e-30], [3e-30, -1e-30, 1e-30]]);
  close(small[0], 1);
  close(small[1], 2);
});

test('linear systems reject singular, malformed and overflowing inputs', () => {
  for (const rows of [
    [[1, 2, 3], [2, 4, 6]],
    [[0, 0, 1], [1, 1, 2]],
    [[1, NaN, 1], [1, 1, 2]],
    [[1, 2], [2, 3]],
    [[1e-308, 0, 10], [0, 1e-308, 10]],
  ]) assert.throws(() => linearSystem(rows));
});

test('weighted linear regression and both variances remain correct at a large offset', () => {
  // Offsets [0, 1, 2] have frequencies [1, 2, 3]: variance = 5/9.
  // The exact relationship is y = 2 + 3x, with sample variance of y = 6.
  const s = statistics([[1e12, 3e12 + 2, 1], [1e12 + 1, 3e12 + 5, 2], [1e12 + 2, 3e12 + 8, 3]], 'linear');
  assert.equal(s.n, 6);
  close(s.a, 2);
  close(s.b, 3);
  close(s.r, 1);
  close(s['σx²'], 5 / 9);
  close(s['σy'], Math.sqrt(5));
  close(s.sy, Math.sqrt(6));
});

test('linear regression accepts small varying x and preserves constant y semantics', () => {
  const small = statistics([[1e-20, 3], [2e-20, 5], [3e-20, 7]], 'linear');
  close(small.a, 1);
  close(small.b, 2e20);
  close(small.r, 1);
  const constant = statistics([[1, 7], [2, 7], [3, 7]], 'linear');
  assert.equal(constant.a, 7);
  assert.equal(constant.b, 0);
  assert.equal(constant['σy'], 0);
  assert.ok(Number.isNaN(constant.r));
});

test('statistics compensated sums preserve a small value between cancelling large values', () => {
  const s = statistics([[1e16], [1], [-1e16]]);
  assert.equal(s['Σx'], 1);
  close(s['x̄'], 1 / 3);
});

test('statistics reject degenerate regression, illegal frequencies, transform domains and overflow', () => {
  assert.throws(() => statistics([[1, 2], [1, 3]], 'linear'));
  for (const rows of [[], [[1, 2, 0]], [[1, 2, 1.5]], [[NaN]], [[1, Infinity]], [[1e200]], [[1, 2, 100001]]]) {
    assert.throws(() => statistics(rows));
  }
  assert.throws(() => statistics([[0, 2], [1, 3]], 'log'));
  assert.throws(() => statistics([[1, 0], [2, 1]], 'exp'));
  assert.throws(() => statistics([[0, 2], [1, 3]], 'inverse'));
  assert.throws(() => statistics([[1], [2]], 'linear'));
});
