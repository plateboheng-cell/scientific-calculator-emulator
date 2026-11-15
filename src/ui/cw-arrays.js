import {createCWGrid} from './cw-screens.js';

const namesFor = prefix => ['A','B','C','D'].map(letter => prefix+letter);
const chained = ['+','-','*','/','^','^2','^(-1)'];

function arrayMode(profile) {
  const matrix = profile.mode === 'matrix';
  return {matrix, label:matrix?'矩阵':'向量', prefix:matrix?'Mat':'Vct', bank:matrix?profile.matrices:profile.vectors};
}

export function cwArrayCatalog(ctx,onInsert,common) {
  const {profile,list,item,submenu} = ctx;
  const {matrix,label,prefix} = arrayMode(profile);
  const token = (name,source) => item(name,() => onInsert(source));
  const commands = matrix ? [
    ['行列式','det('],['转置矩阵','transpose('],['单位矩阵','identity('],['绝对值','abs('],
  ] : [
    ['内积','CWVectorDot'],['向量角度','angleBetween('],['单位化','unitVector('],['绝对值','norm('],
  ];
  list('目录',[submenu(label,() => list(label,[
    ...[...namesFor(prefix),prefix+'Ans'].map(name => token(name,name)),
    ...commands.map(([name,source]) => token(name,source)),
  ])),...common]);
}

export function cwArrayVariables(ctx) {
  const {profile,list,submenu,item,choices,back,persist} = ctx;
  const {matrix,label,prefix,bank} = arrayMode(profile);
  function dimensions(name) {
    let rows = matrix?2:1, columns = 2;
    const sizes = count => Array.from({length:count},(_,index) => index+1);
    const rowCount = {
      ...submenu('行数',() => choices('行数',sizes(4).map(n => [`${n}行`,n]),rows,value => {rows=value;})),
      get label(){return `行数:${rows}`;},
    };
    const dimension = {
      ...submenu(matrix?'列数':'维数',() => choices(matrix?'列数':'维数',(matrix?sizes(4):[2,3]).map(n => [`${n}${matrix?'列':'维'}`,n]),columns,value => {columns=value;})),
      get label(){return `${matrix?'列数':'维数'}:${columns}`;},
    };
    list(matrix?'矩阵行列数?':'向量维数?',[
      ...(matrix?[rowCount]:[]),dimension,item('确认',() => {
        const data=Array.from({length:rows},() => Array(columns).fill(0));
        bank[name]=matrix?data:data[0];
        persist(); openEditor(ctx,name,bank[name]);
      }),
    ],0,true);
  }
  const entries = namesFor(prefix).map(name => {
    const value = bank[name];
    const size = value ? matrix ? `${value.length}×${value[0].length}` : String(value.length) : '无';
    return item(`${name}:${size}`, () => {
      if (!value) { dimensions(name); return; }
      list(name,[submenu('新建',() => dimensions(name)),item('编辑',() => openEditor(ctx,name,value))]);
    });
  });
  list(label+'变量',entries);
}

function openEditor(ctx, name, value, readOnly = false) {
  const {profile,screen,readNumber,format,store,list,item,submenu,calculation,insert,persist} = ctx;
  const {matrix,label,prefix,bank} = arrayMode(profile);
  const rows = matrix ? value : [value];
  function assign() {
    list('赋值',namesFor(prefix).map(target => item(target,() => {
      bank[target] = matrix?rows.map(row => row.slice()):rows[0].slice();
      persist();openEditor(ctx,target,bank[target]);
    })));
  }
  screen(createCWGrid({
    label:name, title:name+'=',layout:'matrix',columns:rows[0].map(() => ''),rows:() => rows,
    readNumber,format,advance:'across',canEdit:() => !readOnly,
    onCommit(row,column,value) { rows[row][column]=value;persist(); },
    onCommand(action,position) {
      if (readOnly && (chained.includes(action) || action==='CWVectorDot')) {
        calculation(true,true);insert(name);insert(action);return true;
      }
      if (['execute','back','clear'].includes(action)) { calculation(action==='clear',true); return true; }
      if (action === 'variables') { store(position.value); return true; }
      if (action === 'tools' || action === 'options') {
        list('工具',[submenu('定义'+label,() => cwArrayVariables(ctx)),submenu('赋值',assign)]);
        return true;
      }
      return false;
    },
  }));
}

export function showCWArrayResult(ctx, value) {
  const {prefix} = arrayMode(ctx.profile);
  openEditor(ctx,prefix+'Ans',value,true);
}
