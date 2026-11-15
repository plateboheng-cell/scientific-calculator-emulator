import {assert, math, normalize} from '../engine/calculator.js';
import {cwInequalityResult, cwLinearSolution, cwNewton, cwPolynomialSolution} from '../engine/cw-equations.js';
import {inequalityIntervals, ratio} from '../engine/modes.js';
import {cwComplexHTML} from './cw-number-display.js';
import {createCWFields, createCWGrid, createCWPages, createCWResultList} from './cw-screens.js';
import {esc} from './html.js';

const variables = ['x','y','z','t'];
const polynomialNames = ['ax²+bx+c','ax³+bx²+cx+d','ax⁴+bx³+cx²+dx+e'];
const comparisons = [['>','>'],['<','<'],['>=','≥'],['<=','≤']];

export function openCWEquation(ctx) {
  const {profile, list, item, submenu} = ctx;
  if (profile.mode === 'ratio') {
    list('比例',[item('A:B=X:D',() => coefficientEditor(ctx, 'ratio', 3, 'left')),item('A:B=C:X',() => coefficientEditor(ctx, 'ratio', 3, 'right'))]);
    return;
  }
  const degreeMenu = inequality => list(inequality ? '不等式次数' : '多项式次数', polynomialNames.map((name, index) => {
    const degree = index + 2;
    const open = () => {
      if (inequality) list(name, comparisons.map(([operation, symbol]) => item(`${name}${symbol}0`, () => coefficientEditor(ctx, 'inequality', degree, operation))));
      else coefficientEditor(ctx, 'polynomial', degree);
    };
    return inequality ? submenu(name, open) : item(name, open);
  }));
  if (profile.mode === 'inequality') { degreeMenu(true); return; }
  list('方程', [
    submenu('线性方程组', () => list('未知数个数', [2,3,4].map(size => item(`${size}个未知数`, () => coefficientEditor(ctx, 'system', size))))),
    submenu('多项式方程', () => degreeMenu(false)),
    item('求解方程', () => openCWSolver(ctx)),
  ]);
}

function coefficientEditor(ctx, kind, size, operation) {
  const {profile, list, item, submenu, choices, back, screen, readNumber, format, store} = ctx;
  const system = kind === 'system', polynomial = kind === 'polynomial', isRatio = kind === 'ratio';
  const label = system ? '线性方程组' : polynomial ? '多项式方程' : isRatio ? '比例' : '不等式';
  const equation = isRatio ? operation === 'left' ? 'A:B=X:D' : 'A:B=C:X' : system ? '' : polynomialNames[size - 2];
  const rows = Array.from({length: system ? size : 1}, () => Array(isRatio ? 3 : size + 1).fill(0));
  const verifyAvailable = (system || polynomial) && size === 2;
  const verifyToggle = () => item(profile.cwVerify ? '运算验证关闭' : '运算验证开启', () => {
    profile.cwVerify = !profile.cwVerify;
    back();
  });
  const rootsSetting = () => submenu('复数根', () => choices('复数根', [['开',true],['关',false]], profile.cwSettings.complexRoots, value => {
    profile.cwSettings.complexRoots = value;
  }));
  const solve = () => {
    if (profile.cwVerify && (system || polynomial)) {
      if (!verifyAvailable) { showMessage(ctx, '运算验证不可用'); return; }
      const solved = system ? cwLinearSolution(rows) : cwPolynomialSolution(rows[0], profile.cwSettings.complexRoots);
      verifyEquation(ctx, kind, solved);
      return;
    }
    if (system || polynomial) {
      showSolutions(ctx, kind, system ? cwLinearSolution(rows) : cwPolynomialSolution(rows[0], profile.cwSettings.complexRoots), size);
      return;
    }
    if (isRatio) {
      const value = ratio(operation, ...rows[0]);
      assert(Number.isFinite(value) && Math.abs(value) < 1e100, '数学错误');
      showPages(ctx, label, [{label:'X=',value}]);
      return;
    }
    const intervals = inequalityIntervals(rows[0], operation);
    showPages(ctx, label, [{label:'x',value:cwInequalityResult(intervals, format)}]);
  };
  screen(createCWGrid({
    label, title: equation, layout: system ? 'system' : isRatio ? 'ratio' : 'coefficients',
    columns: rows[0].map(() => ''), rows: () => rows, readNumber, format, advance: 'across',
    suffix: (_, index) => {
      if (isRatio) return [' :',' =', ''][index];
      if (index === size) return system ? '' : (polynomial ? '=' : comparisons.find(([op]) => op === operation)[1]) + '0';
      if (system) return variables[index] + (index === size - 1 ? '=' : '+');
      const power = size - index;
      return 'x' + ['', '', '²', '³', '⁴'][power] + '+';
    },
    onCommit(row, column, value) { rows[row][column] = value; },
    onCommand(action, grid) {
      if (action === 'execute') { solve(); return true; }
      if (action === 'clear') {
        for (const row of rows) row.fill(0);
        if (isRatio) back();
        else { grid.refresh(); grid.select(0,0); }
        return true;
      }
      if (action === 'back') { back(); return true; }
      if (action === 'variables') { store(grid.value); return true; }
      if (action === 'tools' && (system || polynomial)) {
        const entries = [...(polynomial ? [rootsSetting()] : []), ...(verifyAvailable || profile.cwVerify ? [verifyToggle()] : [])];
        if (entries.length) list('工具', entries);
        return true;
      }
      return false;
    },
  }));
}

function showMessage(ctx, message) {
  showPages(ctx, message, [{label:'', value:message}]);
}

function showPages(ctx, label, pages, onFinish = ctx.back) {
  const {calculator, profile, screen, renderValue, renderTex, store, list, item, back} = ctx;
  const coordinateFormats=new Map();
  screen(createCWPages({label, pages, onFinish,
    renderValue(value, page) {
      const natural = page.tex && profile.format === 'Norm' && profile.cwSettings.inputOutput === 'math';
      if(math.isComplex(value)){
        const polar=coordinateFormats.get(page)??profile.cwSettings.polar;
        return cwComplexHTML(value,calculator,profile,renderTex,{polar,naturalTex:page.tex});
      }
      if (natural) return renderTex(page.tex);
      return renderValue(value);
    },
    onCommand(action, page) {
      if (action === 'variables' && (typeof page.value === 'number' || math.isComplex(page.value))) { store(page.value); return true; }
      if (action === 'format' && math.isComplex(page.value)) {
        const change = value => { coordinateFormats.set(page,value);back(); };
        list('格式',[item('代数形式(a+bi)',() => change(false)),item('极坐标形式(r∠θ)',() => change(true))]);
        return true;
      }
      return false;
    },
  }));
}

function showSolutions(ctx, kind, solution, size) {
  if (kind === 'system') {
    if (solution.kind !== 'unique') { showMessage(ctx, solution.kind === 'none' ? '无解' : '无数解'); return; }
    showPages(ctx, '线性方程组', solution.roots.map((value, index) => ({label: `${variables[index]}=`, value})));
    return;
  }
  if (solution.noRealRoots) { showMessage(ctx, '无实根'); return; }
  const pages = solution.roots.map((root, index) => ({...root, label: `x${['₁','₂','₃','₄'][index]}=`}));
  for (const extreme of solution.extrema) {
    for (const coordinate of ['x','y']) pages.push({label: `${extreme.type} ${coordinate}=`, value: extreme[coordinate]});
  }
  if (size === 3 && !solution.extrema.length) pages.push({label:'', value:'无极值'});
  showPages(ctx, '多项式方程', pages);
}

function verifyEquation(ctx, kind, solution) {
  const {item, submenu, list, screen, back, readNumber, rewind} = ctx;
  const editor = ctx.profile.cwScreen;
  const returnToEditor = () => rewind(editor);
  const answer = correct => {
    const items = [item('返回方程', returnToEditor),item('确认解', () => {
      returnToEditor(); showSolutions(ctx, kind, solution, 2);
    })];
    list(correct ? 'True' : 'False', items, 0, true);
  };
  const fields = (title, names, verify) => screen(createCWFields({title, fields:names.map(name => [name,name,'0']),readNumber,onRun: values => answer(verify(Object.values(values))),onBack:back}));
  const same = (x,y) => Math.abs(x-y) <= 1e-10 * Math.max(1,Math.abs(x),Math.abs(y));
  if (kind === 'system') {
    list('答案', [
      submenu('输入解', () => fields('输入解',['x','y'], values => solution.kind === 'unique' && values.every((value,index) => same(value,solution.roots[index])))),
      item('无解', () => answer(solution.kind === 'none')),
      item('无数解', () => answer(solution.kind === 'infinite')),
    ]);
    return;
  }
  const expected = [...new Set(solution.roots.map(root => root.value).filter(value => typeof value === 'number'))].sort((a,b) => a-b);
  list('答案', [
    submenu('解', () => list('解数', [0,1,2].map(count => item(count ? `${count}个解` : '无实根', () => {
      if (!count) { answer(!expected.length); return; }
      fields('输入解', ['x₁','x₂'].slice(0,count), values => count === expected.length && values.sort((a,b) => a-b).every((value,index) => same(value,expected[index])));
    })))),
    ...['最大值','最小值'].map(type => submenu(type, () => fields(type,['x','y'], ([x,y]) => solution.extrema.some(point => point.type === type && same(x,point.x) && same(y,point.y))))),
  ]);
}

export function openCWSolver(ctx) {
  const {calculator, profile, list, item, submenu, screen, readNumber, format, back, persist, editor, rewind} = ctx;
  if (profile.cwVerify) { showMessage(ctx, '运算验证不可用'); return; }
  editor('求解方程', 'expr', profile.cwSolverExpression ?? '', expression => {
    assert(!/\bRan(?:Int)?\s*\(/.test(expression),'语法错误');
    const parts = expression.split('=');
    assert(parts.length <= 2 && parts.every(part => part.trim()), '语法错误');
    const residual = parts.length === 2 ? `(${parts[0]})-(${parts[1]})` : expression;
    calculator.compile(residual);
    const symbols = new Set();
    math.parse(normalize(residual)).traverse(node => {
      if (node.isSymbolNode && calculator.model.variables.includes(node.name)) symbols.add(node.name);
    });
    assert(symbols.size,'变量错误');
    profile.cwSolverExpression = expression;
    const names = calculator.model.variables.filter(name => symbols.has(name));
    const expressionFrame = profile.form;
    const solveFor = name => {
      const evaluate = value => {
        const result = calculator.evaluate(residual, {[name]:value});
        assert(typeof result === 'number', '数学错误');
        return result;
      };
      function solve(guess) {
        const outcome = cwNewton(evaluate, guess);
        if (!outcome.converged) {
          list('求解方程', [item('继续', () => { back(); solve(outcome.x); }),item('退出', back)], 0, `${name}=${format(outcome.x)}  L−R=${format(outcome.residual)}`);
          return;
        }
        calculator.assign(name,outcome.x,true);
        persist();
        screen(createCWResultList({label:'求解结果', title:expression, entries:[[name,outcome.x],['L−R',outcome.residual]],
          renderValue:value => esc(format(value)),
          onBack: () => rewind(expressionFrame),
          onCommand(action) {
            if (action === 'back') { back(); back(); return true; }
            if (action === 'variables') { ctx.store(outcome.x,true); return true; }
            return false;
          },
        }));
      }
      const fields = [[name,name,String(profile.cwSolverGuesses?.[name] ?? calculator.vars[name])]];
      screen(createCWFields({title:'输入初始值', fields, readNumber, onBack:back, onRun: values => {
        const start = values[name];
        (profile.cwSolverGuesses ??= {})[name] = start;
        solve(start);
      }}));
    };
    list('求解目标',names.map(name => submenu(name, () => solveFor(name))),Math.max(0,names.indexOf('x')));
  });
}
