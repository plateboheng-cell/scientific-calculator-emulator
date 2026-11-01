// TI-36X Pro guidebook pp.6–8: rows of settings, four-way navigation,
// ENTER confirms a choice, CLEAR / 2nd QUIT returns to calculation.
export function createTiMode({host,settings,angle,onChange,onQuit}){
  const abort=new AbortController();let row=0,column=0;
  const rows=[
    ['angle',['Deg','Rad','Gra'],['DEG','RAD','GRAD']],
    ['notation',['Norm','Sci','Eng'],['NORM','SCI','ENG']],
    ['decimals',[null,0,1,2,3,4,5,6,7,8,9],['FLOAT','0','1','2','3','4','5','6','7','8','9']],
    ['result',['real','rect','polar'],['REAL','a+bi','r∠θ']],
    ['base',[10,16,2,8],['DEC','HEX','BIN','OCT']],
    ['input',['classic','math'],['CLASSIC','MATHPRINT']],
  ];
  function paint(){
    host.innerHTML='<div class="ti-mode-grid" role="group" aria-label="MODE">'+rows.map(([name,values,labels],r)=>'<div class="ti-mode-row">'+values.map((v,c)=>'<button type="button" data-ti-setting="'+r+','+c+'" aria-pressed="'+((name==='angle'?angle:settings[name])===v)+'" class="'+((name==='angle'?angle:settings[name])===v?'chosen ':'')+(r===row&&c===column?'cursor':'')+'">'+labels[c]+'</button>').join('')+'</div>').join('')+'</div>';
    host.querySelector('.cursor')?.scrollIntoView({block:'nearest'});
  }
  function select(){const [name,values]=rows[row],value=values[column];if(name==='angle')angle=value;else settings[name]=value;onChange(name,value);paint();}
  function handleAction(action){
    if(action==='execute'){select();return true;}
    if(['clear','back','ti-quit'].includes(action)){onQuit();return true;}
    if(action==='up'||action==='down'){row=Math.max(0,Math.min(rows.length-1,row+(action==='up'?-1:1)));column=Math.min(column,rows[row][1].length-1);paint();return true;}
    if(action==='left'||action==='right'){column=Math.max(0,Math.min(rows[row][1].length-1,column+(action==='left'?-1:1)));paint();return true;}
    return false;
  }
  host.addEventListener('click',e=>{const b=e.target.closest('[data-ti-setting]');if(b){[row,column]=b.dataset.tiSetting.split(',').map(Number);select();}},{signal:abort.signal});
  paint();return {handleAction,destroy:()=>abort.abort()};
}
