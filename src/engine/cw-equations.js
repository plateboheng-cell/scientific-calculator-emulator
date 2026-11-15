import {assert, factorize, math} from './calculator.js';
import {linearSystem, polyValue, polynomialRoots, realRoots, rref} from './modes.js';

export function cwLinearSolution(rows) {
  try { return {kind: 'unique', roots: linearSystem(rows)}; }
  catch (failure) {
    if (failure.message !== '无唯一解') throw failure;
    const normalized = rows.map(row => {
      const scale = Math.max(...row.map(Math.abs));
      return scale ? row.map(value => value / scale) : row.slice();
    });
    const inconsistent = rref(normalized).some(row => row.slice(0, -1).every(value => Math.abs(value) < 1e-12) && Math.abs(row.at(-1)) >= 1e-12);
    return {kind: inconsistent ? 'none' : 'infinite', roots: []};
  }
}

function quadraticRadicals(coefficients) {
  const [a, b, c] = coefficients;
  if (!coefficients.every(value => Number.isSafeInteger(value) && Math.abs(value) <= 1e6)) return [];
  const d = b ** 2 - 4 * a * c;
  if (d === 0 || Math.abs(d) > 1e12 || d > 0 && Number.isInteger(Math.sqrt(d))) return [];
  let outside = 1, inside = 1;
  for (const [factor, count] of factorize(Math.abs(d))) {
    outside *= factor ** Math.floor(count / 2);
    if (count % 2) inside *= factor;
  }
  const common = math.gcd(math.gcd(Math.abs(b), 2 * Math.abs(a)), outside);
  const real = -b * Math.sign(a) / common;
  const denominator = 2 * Math.abs(a) / common;
  outside /= common;
  const radical = `${outside === 1 ? '' : outside}${inside === 1 ? '' : `\\sqrt{${inside}}`}${d < 0 ? 'i' : ''}`;
  const magnitude = radical || '1';
  const sign = d < 0 || a > 0 ? '+' : '-';
  return [sign, sign === '+' ? '-' : '+'].map(operator => {
    const numerator = (real || '') + (real || operator === '-' ? operator : '') + magnitude;
    return denominator === 1 ? numerator : `\\frac{${numerator}}{${denominator}}`;
  });
}

export function cwPolynomialSolution(coefficients, complexRoots = true) {
  assert(coefficients[0] !== 0, '数学错误');
  const degree = coefficients.length - 1;
  const roots = polynomialRoots(coefficients);
  if (!complexRoots && roots.some(math.isComplex)) return {roots: [], extrema: [], noRealRoots: true};
  if (degree === 2 && typeof roots[0] === 'number' && coefficients[0] > 0) roots.reverse();
  const radicals = degree === 2 ? quadraticRadicals(coefficients) : [];
  const derivative = coefficients.slice(0, -1).map((value, index) => value * (degree - index));
  const extrema = [];
  if (degree === 2 || degree === 3) {
    const stationary = realRoots(derivative);
    if (degree === 2 || stationary.length === 2) {
      const second = derivative.slice(0, -1).map((value, index) => value * (degree - 1 - index));
      for (const x of stationary) extrema.push({type: polyValue(second, x) > 0 ? '最小值' : '最大值', x, y: polyValue(coefficients, x)});
    }
  }
  return {roots: roots.map((value, index) => ({value, tex: radicals[index]})), extrema, noRealRoots: false};
}

export function cwInequalityResult(intervals, format) {
  if (!intervals.length) return '无解';
  if (intervals.length === 1 && intervals[0].l === -Infinity && intervals[0].r === Infinity) return '所有实数';
  return intervals.map(({l, r, lc, rc}) => {
    if (l === r) return `x=${format(l)}`;
    if (l === -Infinity) return `x${rc ? '≤' : '<'}${format(r)}`;
    if (r === Infinity) return `${format(l)}${lc ? '≤' : '<'}x`;
    return `${format(l)}${lc ? '≤' : '<'}x${rc ? '≤' : '<'}${format(r)}`;
  }).join(', ');
}

export function cwNewton(evaluate, guess) {
  let x = guess, residual = evaluate(x);
  for (let iteration = 0; iteration < 40; iteration++) {
    if (residual === 0) return {x, residual, converged: true};
    const h = Math.cbrt(Number.EPSILON) * Math.max(1, Math.abs(x));
    let left, right;
    try { left = evaluate(x - h); right = evaluate(x + h); }
    catch { break; }
    const derivative = (right - left) / (2 * h);
    const next = x - residual / derivative;
    if (!Number.isFinite(next) || Math.abs(next) >= 1e100) break;
    let nextResidual;
    try { nextResidual = evaluate(next); }
    catch { break; }
    const close = Math.abs(next - x) <= 1e-12 * Math.max(1, Math.abs(next));
    if (nextResidual === 0 || close && Math.abs(nextResidual) <= 1e-9 * Math.max(Math.abs(left), Math.abs(right))) {
      return {x: next, residual: nextResidual, converged: true};
    }
    if (next === x) break;
    x = next;
    residual = nextResidual;
  }
  return {x, residual, converged: false};
}
