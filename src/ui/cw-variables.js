import {formatCWValue} from '../engine/cw-settings.js';
import {createCWGrid} from './cw-screens.js';

export function openCWVariables(ctx, assignment, recall = true) {
  const {calculator,profile,screen,list,item,back,rewind,insert,readNumber,persist} = ctx;
  const names = calculator.model.variables;
  const rows = Array.from({length:Math.ceil(names.length/2)},(_,index) => names.slice(index*2,index*2+2));
  const formatProfile = {...profile, format:'Norm', cwSettings:{...profile.cwSettings,norm:1,engineering:false,decimalComma:false,digitSeparator:false}};
  let grid;
  const nameAt = (row,column) => rows[row][column];
  function leave() { rewind(grid); back(); }
  grid = createCWGrid({
    label:'变量',layout:'variables',columns:['',''],rows:() => rows.map(row => row.map(name => calculator.vars[name])),
    format:value => formatCWValue(value,calculator,formatProfile,false),
    readNumber:profile.mode==='complex'?source=>calculator.evaluate(source,{},true):readNumber,
    prefix:(row,column) => nameAt(row,column)?nameAt(row,column)+'=':'',
    canEdit:(row,column) => !!nameAt(row,column),advance:'stay',
    onCommit(row,column,value) {
      calculator.assign(nameAt(row,column),value,calculator.lastEvaluationApproximate,calculator.lastExactResult);
      persist();
    },
    onCommand(action,position) {
      if (['back','clear','variables'].includes(action)) { back(); return true; }
      const name = nameAt(position.row,position.column);
      if (action !== 'execute' || !name) return false;
      list(name,[
        ...(assignment?[item('赋值',() => { calculator.assign(name,assignment.value,assignment.approximate,assignment.exact);persist();leave(); })]:[]),
        ...(recall?[item('调用',() => { leave();insert(profile.mode==='base'?'@'+name:name); })]:[]),
        item('编辑',() => { rewind(grid);position.edit(true); }),
      ]);
      return true;
    },
  });
  screen(grid);
}
