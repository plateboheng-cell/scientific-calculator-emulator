import {assert, math, normalize, validateValue} from './calculator.js';

const analysis = new Set(['integral','diff','sum']);
const abscissas = [0.9914553711208126,0.9491079123427585,0.8648644233597691,0.7415311855993945,0.5860872354676911,0.4058451513773972,0.2077849550078985];
const kronrod = [0.02293532201052922,0.06309209262997855,0.1047900103222502,0.1406532597155259,0.1690047266392679,0.1903505780647854,0.2044329400752989,0.2094821410847278];
const gauss = [0.1294849661688697,0.2797053914892767,0.3818300505051189,0.4179591836734694];

export function cwRemainder(left,right) {
  assert(typeof left==='number' && typeof right==='number' && right!==0,'数学错误');
  const quotient = Math.trunc(left/right);
  const remainder = left%right;
  if (left>=0 && right>0 && Number.isSafeInteger(quotient) && remainder>=0) return {value:quotient,remainder};
  return {value:left/right,remainder:null};
}

export function prepareCWAnalysis(source) {
  if (!/\b(?:integral|diff|sum)\s*\(/.test(source)) return source;
  return math.parse(normalize(source)).transform(node => {
    if (!node.isFunctionNode || !analysis.has(node.fn.name)) return node;
    const [body,...args] = node.args;
    assert(body,'语法错误');
    if (body.isConstantNode && typeof body.value === 'string') return node;
    return new math.FunctionNode(node.fn,[new math.ConstantNode(body.toString()),...args]);
  }).toString();
}

function sampler(calculator, source, extra) {
  assert(typeof source==='string' && !/\b(?:integral|diff|sum)\s*\(/.test(source),'语法错误');
  const code = calculator.compile(source);
  const scope = calculator.scope(extra);
  let count = 0;
  return x => {
    assert(++count <= 60000,'超时');
    scope.x = x;
    const value = code.evaluate(scope);
    assert(typeof value === 'number' && Number.isFinite(value),'数学错误');
    return value;
  };
}

export function cwIntegral(calculator, source, lower, upper, tolerance, extra) {
  assert([lower,upper,tolerance].every(Number.isFinite) && tolerance >= 1e-22,'自变量错');
  const f = sampler(calculator,source,extra);
  if (lower === upper) return 0;
  function visit(a,b,eps,depth) {
    const half = (b-a)/2, center = a+half, midpoint = f(center);
    let fine = kronrod[7]*midpoint, coarse = gauss[3]*midpoint;
    for (let i=0;i<abscissas.length;i++) {
      const distance = half*abscissas[i];
      const pair = f(center-distance)+f(center+distance);
      fine += kronrod[i]*pair;
      if (i%2===1) coarse += gauss[(i-1)/2]*pair;
    }
    const result = half*fine;
    if (Math.abs(half*(fine-coarse)) <= Math.max(eps,8*Number.EPSILON*Math.abs(result))) return result;
    assert(depth>0 && center!==a && center!==b,'超时');
    return visit(a,center,eps/2,depth-1)+visit(center,b,eps/2,depth-1);
  }
  const value = visit(lower,upper,tolerance,22);
  validateValue(value,false);
  return value;
}

export function cwDerivative(calculator, source, point, tolerance, extra) {
  assert(Number.isFinite(point) && Number.isFinite(tolerance) && tolerance >= 1e-22,'自变量错');
  const f = sampler(calculator,source,extra);
  const step = Math.pow(Number.EPSILON,1/5)*Math.max(1,Math.abs(point));
  const estimate = h => (8*(f(point+h)-f(point-h))-(f(point+2*h)-f(point-2*h)))/(12*h);
  const coarse = estimate(step), fine = estimate(step/2);
  const value = Math.abs(coarse-fine) <= Math.max(tolerance,Math.abs(fine)*1e-9) ? fine+(fine-coarse)/15 : coarse;
  validateValue(value,false);
  return value;
}
