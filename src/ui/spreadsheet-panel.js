import {cellAddress,cellPosition,SHEET_CAPACITY} from '../engine/spreadsheet.js';

// The grid uses plain text because handheld spreadsheet formulas use linear input.
export function createSpreadsheetPanel({host,sheet,onBack}){
  let editing=false;
  host.innerHTML='<div class="sheet-panel"><div class="sheet-grid-wrap"><table class="sheet-grid" aria-label="数据表格"><thead><tr><th></th>'+['A','B','C','D','E'].map(c=>'<th>'+c+'</th>').join('')+'</tr></thead><tbody>'+Array.from({length:45},(_,row)=>'<tr><th>'+(row+1)+'</th>'+Array.from({length:5},(_,col)=>{const a=cellAddress(col,row);return '<td><button type="button" data-cell="'+a+'" aria-label="'+a+'"></button></td>';}).join('')+'</tr>').join('')+'</tbody></table></div><label class="sheet-edit"><span id="sheet-address"></span><input id="sheet-entry" aria-label="单元格内容" spellcheck="false" autocomplete="off"></label><div id="sheet-error" role="alert"></div></div>';
  const input=host.querySelector('#sheet-entry'),error=host.querySelector('#sheet-error');
  function render(){
    sheet.recalculate();
    host.querySelectorAll('[data-cell]').forEach(button=>{
      const key=button.dataset.cell,cell=sheet.values[key];button.textContent=cell?.error?'错误':cell?Number(cell.value.toPrecision(10)).toString():'';
      button.classList.toggle('selected',key===sheet.selected);button.title=cell?.error||sheet.source(key);button.setAttribute('aria-selected',String(key===sheet.selected));
    });
    host.querySelector('#sheet-address').textContent=sheet.selected;
    input.value=sheet.source(sheet.selected);editing=false;
    host.querySelector('.sheet-grid button.selected')?.scrollIntoView({block:'nearest'});
  }
  function select(address){sheet.selected=address;error.textContent='';render();host.querySelector('[data-cell="'+address+'"]').scrollIntoView({block:'nearest'});input.focus();input.select();}
  function commit(advance=true){
    try {sheet.set(sheet.selected,input.value);error.textContent='';editing=false;if(advance){const p=cellPosition(sheet.selected);sheet.selected=cellAddress(p.col,Math.min(44,p.row+1));}render();input.focus();input.select();return true;}
    catch(e){error.textContent=e.message;input.focus();return false;}
  }
  function move(dx,dy){const p=cellPosition(sheet.selected);select(cellAddress(Math.max(0,Math.min(4,p.col+dx)),Math.max(0,Math.min(44,p.row+dy))));}
  input.addEventListener('input',()=>{editing=true;error.textContent='';});
  input.addEventListener('pointerdown',()=>{editing=true;});
  host.querySelector('.sheet-grid').addEventListener('click',e=>{const b=e.target.closest('[data-cell]');if(b)select(b.dataset.cell);});
  function insert(text){input.focus();if(!editing){input.value='';editing=true;}const a=input.selectionStart??input.value.length,b=input.selectionEnd??a;input.setRangeText(text,a,b,'end');}
  function handleAction(action){
    if(['execute','approx'].includes(action)){commit();return true;}
    if(['up','down','left','right'].includes(action)){if(editing&&['left','right'].includes(action)){const p=Math.max(0,Math.min(input.value.length,input.selectionStart+(action==='left'?-1:1)));input.focus();input.setSelectionRange(p,p);}else {if(editing&&!commit(false))return true;move(action==='left'?-1:action==='right'?1:0,action==='up'?-1:action==='down'?1:0);}return true;}
    if(action==='clear'){error.textContent='';render();input.focus();input.select();return true;}
    if(action==='delete'){if(editing){const a=input.selectionStart,b=input.selectionEnd;input.setRangeText('',a===b?Math.max(0,a-1):a,b,'end');}else {sheet.set(sheet.selected,'');render();}input.focus();return true;}
    if(action==='back'){if(editing){render();input.focus();input.select();}else onBack();return true;}
    const special={negative:'-',frac:'/',root:'nthRoot(',sqrt:'sqrt(',log_a:'log(', 'log(':'log(', 'cw-log':'log(', '^2':'^2','*10^':'*10^', 'Ans':'Ans', pi:'pi','mixed':'/'};
    if(/^[0-9A-Fxyz.+*/^()=,-]$/.test(action)||Object.hasOwn(special,action)||/^[a-zA-Z]+\($/.test(action)){insert(special[action]||action);return true;}
    return false;
  }
  function handleKey(e){
    if(e.ctrlKey||e.metaKey)return false;
    if(e.key==='Enter'){commit();return true;}
    if(e.key==='Escape'){handleAction('back');return true;}
    if(e.key.startsWith('Arrow')&&(!editing||['ArrowUp','ArrowDown'].includes(e.key))){handleAction(e.key.slice(5).toLowerCase());return true;}
    if(!editing&&['Backspace','Delete'].includes(e.key)){handleAction('delete');return true;}
    if(!editing&&e.key.length===1){input.value='';editing=true;input.focus();}
    return false;
  }
  render();input.focus();input.select();
  return {handleAction,handleKey,insert,edit(){editing=true;input.focus();input.setSelectionRange(input.value.length,input.value.length);},focus:()=>input.focus(),destroy(){},
    remaining:()=>SHEET_CAPACITY-sheet.usedBytes(),
  };
}
