// CN X manual pp.35–36: retain the equation entered in Calculate, edit each
// variable's value, then highlight the variable to solve. Values use linear entry.
export function createXSolvePanel({host,equationHTML,variables,values,onValue,onSolve,onCommit}){
  const abort=new AbortController(),signal=abort.signal;
  let active=0,choosing=false;
  host.innerHTML='<div class="screen-heading">SOLVE</div><div class="solve-equation" data-user-content></div><div class="solve-variables" tabindex="0"></div><div class="solve-hint"></div><button type="button" class="solve-run">= 求解</button><div id="form-error" role="alert"></div>';
  host.querySelector('.solve-equation').innerHTML=equationHTML;
  const container=host.querySelector('.solve-variables'),inputs=[];
  for(const name of variables){
    const row=document.createElement('label');row.className='solve-variable';
    const symbol=document.createElement('span');symbol.textContent=name+'=';
    const input=document.createElement('input');input.type='text';input.autocomplete='off';input.spellcheck=false;input.value=String(values[name]);input.dataset.solveVariable=name;input.setAttribute('aria-label',name);
    input.addEventListener('focus',()=>{active=inputs.indexOf(input);choosing=false;paint();},{signal});
    row.append(symbol,input);container.append(row);inputs.push(input);
  }
  function paint(){
    inputs.forEach((input,i)=>input.closest('label').classList.toggle('selected',i===active));
    host.querySelector('.solve-hint').textContent=choosing?'↑↓ 选择求解变量，按 = 求解':'输入变量值，按 = 确认';
    inputs[active]?.closest('label').scrollIntoView({block:'nearest'});
  }
  function safely(run){try{host.querySelector('#form-error').textContent='';run();}catch(e){host.querySelector('#form-error').textContent=e.message;}}
  function commit(i){const value=onValue(variables[i],inputs[i].value);inputs[i].value=String(value);onCommit?.();}
  function solve(){safely(()=>{inputs.forEach((_,i)=>commit(i));onSolve(variables[active]);});}
  function focus(i){active=Math.max(0,Math.min(inputs.length-1,i));inputs[active].focus();inputs[active].select();paint();}
  function handleAction(action){
    if(action==='execute'){
      if(choosing){solve();return true;}
      safely(()=>{commit(active);if(active<inputs.length-1)focus(active+1);else if(inputs.length===1)solve();else{choosing=true;container.focus();paint();}});return true;
    }
    if(action==='up'||action==='down'){
      if(choosing){active=Math.max(0,Math.min(inputs.length-1,active+(action==='up'?-1:1)));paint();}
      else focus(active+(action==='up'?-1:1));return true;
    }
    return false;
  }
  host.querySelector('.solve-run').addEventListener('click',solve,{signal});
  paint();focus(0);
  return {handleAction,destroy:()=>abort.abort()};
}
