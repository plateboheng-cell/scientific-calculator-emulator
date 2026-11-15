import {assert} from '../engine/calculator.js';
import {describeStatistics, statistics} from '../engine/modes.js';
import {CW_STAT_SYMBOLS, cwRegressionCoefficients, cwStatisticsScope} from '../engine/cw-statistics.js';
import {createCWGrid, createCWResultList} from './cw-screens.js';
import {esc} from './html.js';

const regressions = [
  ['linear','y=ax+b'],['quadratic','y=ax²+bx+c'],['log','y=a+b·ln(x)'],['exp','y=a·e^(bx)'],
  ['abexp','y=a·b^x'],['power','y=a·x^b'],['inverse','y=a+b/x'],
];
const singleResults = ['x̄','Σx','Σx²','σx²','σx','sx²','sx','n','min','Q1','Med','Q3','max'];
const pairedResults = ['x̄','Σx','Σx²','σx²','σx','sx²','sx','ȳ','Σy','Σy²','σy²','σy','sy²','sy','n','Σxy','Σx³','Σx²y','Σx⁴','min','max','minY','maxY'];
const valueLabel = {min:'min(x)',max:'max(x)',minY:'min(y)',maxY:'max(y)'};

export function openCWStatistics(ctx) {
  const {profile,list,item,persist} = ctx;
  function choose(paired) {
    if (paired !== (profile.regression !== 'single')) {
      profile.statsRows = [];
      profile.regression = paired ? 'linear' : 'single';
    }
    profile.cwStat = null;
    persist();
    openEditor(ctx,paired);
  }
  list('统计',[item('单变量统计',() => choose(false)),item('双变量统计',() => choose(true))],profile.regression === 'single' ? 0 : 1);
}

function openEditor(ctx, paired, save = true) {
  const {calculator,profile,list,item,submenu,choices,screen,readNumber,format,persist,store,back,rewind,closeMenu,calculation} = ctx;
  const frequency = profile.frequency;
  const fields = [0,...(paired ? [1] : []),...(frequency ? [2] : [])];
  const capacity = calculator.statisticsCapacity(paired,frequency);
  let grid;

  function samples() {
    calculator.checkStatisticsData(profile.statsRows,paired,frequency);
    return profile.statsRows.map(([x,y,f]) => [x,y,frequency?f:1]);
  }
  function results(label, entries, fromCalculation = false) {
    screen(createCWResultList({label,entries,renderValue:value => esc(typeof value === 'number' && Number.isFinite(value) ? format(value) : '—'),
      onBack:fromCalculation?back:() => rewind(grid),
    }));
  }
  function descriptive(fromCalculation = false) {
    const summary = describeStatistics(samples(),paired);
    const values = (paired ? pairedResults : singleResults).map(label => [valueLabel[label] ?? label,summary[label]]);
    results(paired?'双变量结果':'单变量结果',values,fromCalculation);
  }
  function regressionResult(kind, fromCalculation = false) {
    const fit = statistics(samples(),kind);
    results('回归计算结果',Object.entries(cwRegressionCoefficients(fit,kind)),fromCalculation);
  }
  function regressionMenu(run) {
    list('选择回归类型',regressions.map(([kind,label]) => item(label, () => run(kind))));
  }

  function enterCalculation(kind) {
    const data = samples();
    const summary = describeStatistics(data,paired);
    const fit = paired ? statistics(data,kind) : null;
    profile.regression = kind;
    profile.cwStat = {
      scope:cwStatisticsScope(summary,fit,kind),
      back:() => rewind(grid),
      tools() {
        list('工具',[
          item('编辑数据',() => rewind(grid)),
          item(paired?'双变量结果':'单变量结果',() => { closeMenu(); descriptive(true); }),
          ...(paired ? [item('回归计算结果',() => { closeMenu(); regressionResult(kind,true); }),submenu('选择回归类型',() => regressionMenu(enterCalculation))] : []),
        ]);
      },
      catalog(onInsert,common) {
        const command = key => {
          const {name,label,kind} = CW_STAT_SYMBOLS[key];
          return item(valueLabel[label]??label, () => onInsert(name + (kind === 'call' ? '(' : '')));
        };
        const group = (title,keys) => submenu(title, () => list(title,keys.map(command)));
        list('目录',[submenu('统计', () => list('统计',[
          group('求和',paired ? ['SumX','SumX2','SumY','SumY2','SumXY','SumX3','SumX2Y','SumX4'] : ['SumX','SumX2']),
          group('均值/方差/标准差/...',['MeanX','PopVarX','PopX','SampleVarX','SampleX',...(paired?['MeanY','PopVarY','PopY','SampleVarY','SampleY']:[]),'Count']),
          group(paired?'最小值/最大值':'最小值/最大值/四分位数',paired?['MinX','MaxX','MinY','MaxY']:['MinX','Q1','Median','Q3','MaxX']),
          paired ? group('回归',kind==='quadratic'?['A','B','C','EstimateX1','EstimateX2','EstimateY']:['A','B','RCoef','EstimateX','EstimateY']) : group('正态分布',['P','Q','R','T']),
        ])),...common]);
      },
    };
    persist();
    calculation();
  }

  function computeMenu() {
    assert(profile.statsRows.length,'请先输入数据');
    list('统计结果',[
      item(paired?'双变量结果':'单变量结果',() => descriptive()),
      ...(paired ? [submenu('回归计算结果',() => regressionMenu(regressionResult))] : []),
      paired ? submenu('统计计算',() => regressionMenu(enterCalculation)) : item('统计计算',() => enterCalculation('single')),
    ]);
  }
  function tools(position) {
    list('工具',[
      submenu('频数',() => choices('频数',[['开',true],['关',false]],profile.frequency,value => {
        if (profile.frequency !== value) { profile.frequency = value; profile.statsRows = []; }
      })),
      submenu('编辑',() => list('编辑',[
        item('插入行',() => {
          assert(profile.statsRows.length < capacity,'统计行数超出型号限制');
          profile.statsRows.splice(position.row,0,[0,0,1]);
          persist();rewind(grid);
        }),
        item('全部删除',() => { profile.statsRows = []; persist();rewind(grid); }),
      ])),
      submenu('排序',() => list('排序',fields.flatMap(field => [1,-1].map(direction => item(
        ['x','y','Freq'][field]+(direction===1?'升序':'降序'), () => {
          profile.statsRows.sort((a,b) => direction * (a[field] - b[field]));
          persist();rewind(grid);position.select(0,position.column);
        },
      ))))),
    ]);
  }

  grid = createCWGrid({
    label:paired?'双变量统计':'单变量统计',columns:fields.map(index => ['x','y','Freq'][index]),minRows:4,readNumber,format,
    rows() {
      const rows = profile.statsRows.map(row => fields.map(index => row[index]));
      if (rows.length < capacity) rows.push([]);
      return rows;
    },
    onCommit(row,column,value) {
      const field = fields[column];
      if (field === 2) assert(Number.isInteger(value) && value > 0,'数据或频数错误');
      const sample = profile.statsRows[row] ?? [0,0,1];
      sample[field] = value;
      profile.statsRows[row] = sample;
      persist();
    },
    onCommand(action,position) {
      if (action === 'execute') { computeMenu(); return true; }
      if (action === 'tools' || action === 'options') { tools(position); return true; }
      if (action === 'back') { back(); return true; }
      if (action === 'delete') { profile.statsRows.splice(position.row,1); persist();position.refresh(); return true; }
      if (action === 'variables') { if (typeof position.value === 'number') store(position.value); return true; }
      return false;
    },
  });
  const mount = grid.mount;
  grid.mount = host => {
    if (profile.frequency !== frequency) openEditor(ctx,paired,false);
    else mount(host);
  };
  screen(grid,save);
}
