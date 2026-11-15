import {assert, math} from '../engine/calculator.js';
import {createCWFields, createCWGrid, createCWPages} from './cw-screens.js';

const defaultRange = {start:1, end:5, step:1};
const namesFor = type => type === 'fg' ? ['f','g'] : [type];
const makeRow = x => ({x, f:null, g:null, guesses:{}});

export function openCWTable(ctx, save = true) {
  const {calculator, profile, list, item, submenu, choices, screen, editor, readNumber, format, back, home, store, persist, rewind, renderValue} = ctx;
  const data = profile.cwTable ??= {range:{...defaultRange}, rows:[]};
  const names = namesFor(profile.cwSettings.tableType);
  const capacity = names.length === 2 ? 30 : 45;
  let grid;

  function calculateCell(name, x) {
    if (x == null || !calculator.definitions[name]) return null;
    try {
      const value = calculator.evaluate(`${name}(x)`, {x});
      assert(typeof value === 'number');
      return value;
    } catch { return '错误'; }
  }

  function recalculate(row, only) {
    for (const name of only ? [only] : names) row[name] = calculateCell(name, row.x);
  }

  function define(name) {
    editor(`定义${name}(x)`, name, calculator.definitions[name] ?? '', expression => {
      calculator.define(name, expression);
      for (const row of data.rows) {
        row.guesses[name] = null;
        recalculate(row, name);
      }
      persist();
      rewind(grid);
    });
  }

  function defineMenu() {
    list('定义f(x)/g(x)', ['f','g'].map(name => item(`定义${name}(x)`, () => define(name))));
  }

  function rangeMenu() {
    screen(createCWFields({title:'表格范围', fields:[['start','开始值',data.range.start],['end','终止值',data.range.end],['step','步长',data.range.step]],readNumber,onBack:back,
      onRun(range) {
        const {start,end,step} = range;
        assert(step > 0 && start <= end,'范围错误');
        const count = Math.floor((end-start)/step + 1e-10) + 1;
        assert(count > 0 && count <= capacity,'范围错误');
        assert(names.some(name => calculator.definitions[name]),'未定义');
        const rows = Array.from({length:count}, (_, i) => {
          const row = makeRow(Number((start + i * step).toPrecision(14)));
          recalculate(row);
          return row;
        });
        data.rows = rows;
        data.range = range;
        calculator.assign('x', rows.at(-1).x);
        persist();
        rewind(grid);
      },
    }));
  }

  function editMenu(position) {
    list('编辑', [
      item('插入行', () => {
        assert(data.rows.length < capacity,'范围错误');
        data.rows.splice(position.row,0,makeRow(null));
        rewind(grid);
      }),
      item('全部删除', () => { data.rows = []; rewind(grid); }),
      ...(profile.cwVerify ? [item('删除f/g列', () => {
        for (const row of data.rows) row.guesses = {};
        rewind(grid);
      })] : []),
    ]);
  }

  function tools(position) {
    list('工具', [
      submenu('表格类型', () => choices('表格类型',[['f(x),g(x)','fg'],['f(x)','f'],['g(x)','g']],profile.cwSettings.tableType, type => {
        if (type !== profile.cwSettings.tableType) {
          profile.cwSettings.tableType = type;
          data.rows = [];
        }
      })),
      submenu('定义f(x)/g(x)', defineMenu), item('表格范围', rangeMenu),
      submenu('编辑', () => editMenu(position)),
      item('重新计算', () => { for (const row of data.rows) recalculate(row); rewind(grid); }),
      item(profile.cwVerify ? '运算验证关闭' : '运算验证开启', () => {
        profile.cwVerify = !profile.cwVerify;
        for (const row of data.rows) { row.guesses = {}; if (!profile.cwVerify) recalculate(row); }
        rewind(grid);
      }),
    ]);
  }

  function setX(index, value) {
    assert(index < capacity,'范围错误');
    const row = makeRow(value);
    recalculate(row);
    data.rows[index] = row;
  }

  function verify(index, column, value) {
    const row = data.rows[index];
    const name = names[column-1];
    const expected = calculateCell(name,row.x);
    assert(typeof expected === 'number','未定义');
    const correct = math.equal(expected,value);
    if (correct) row.guesses[name] = value;
    screen(createCWPages({label:'运算验证',pages:[{label:'',value:correct?'True':'False'}],renderValue,
      onFinish() {
        back();
        if (correct) grid.handleAction('down');
      },
      onCommand(action) {
        if (action === 'variables' && correct) { store(value); return true; }
        return false;
      },
    }));
  }

  grid = createCWGrid({
    label:'函数表格',columns:['x',...names.map(name => `${name}(x)`)],minRows:4,format,readNumber,
    rows() {
      const view = data.rows.map(row => [row.x,...names.map(name => profile.cwVerify ? row.guesses[name] : row[name])]);
      if (view.length < capacity) view.push([]);
      return view;
    },
    canEdit(row,column) { return column === 0 || profile.cwVerify && data.rows[row]?.x != null; },
    emptyMessage() {
      const missing = names.filter(name => !calculator.definitions[name]);
      return missing.length ? `${missing.map(name => `${name}(x)`).join(',')}：无` : '';
    },
    onCommit(row,column,value) {
      if (column === 0) { setX(row,value); return; }
      verify(row,column,value);
      return false;
    },
    onCommand(action, position) {
      if (action === 'tools' || action === 'options') { tools(position); return true; }
      if (action === 'definitions') { defineMenu(); return true; }
      if (action === 'variables') {
        if (typeof position.value === 'number') store(position.value);
        return true;
      }
      if (action === 'delete') { data.rows.splice(position.row,1); position.refresh(); return true; }
      if (action === 'back') { home(); return true; }
      if (['execute','+','-'].includes(action) && position.column === 0 && data.rows[position.row-1]?.x != null) {
        const value = data.rows[position.row-1].x + (action === '-' ? -data.range.step : data.range.step);
        setX(position.row,Number(value.toPrecision(14)));
        position.refresh(); position.select(position.row+1);
        return true;
      }
      return false;
    },
  });
  const mount = grid.mount;
  grid.mount = host => {
    if (profile.cwSettings.tableType !== names.join('')) openCWTable(ctx,false);
    else mount(host);
  };
  screen(grid,save);
}
