import {ensureCGSetupState,getCGSetupPreferences,getCGSetupRows,cgSetupRowValue,applyCGSetupChoice} from '../engine/cg-setup-state.js';
import './cg-setup-panel.css';

/** Native row selection and physical F-key choices; host retains the input view. */
export function createCGSetupPanel({host,calculator,profile,mode=profile?.mode||'calc',onChange=()=>{},onBack=()=>{}}){
  const abort=new AbortController(),{signal}=abort;let selected=0,rows=[],digitMode=null,closed=false;
  ensureCGSetupState(calculator,profile);
  host.innerHTML='<section class="cg-setup-panel" tabindex="0"><header><strong>SET UP</strong><span data-setup-mode></span></header><div class="cg-setup-rows" role="listbox" aria-label="Setup settings"></div><div class="cg-setup-error" role="alert"></div><div class="cg-setup-limit"></div><div class="cg-setup-softkeys"></div><div class="cg-setup-dialog" hidden><div><strong data-setup-prompt></strong><input data-setup-digit inputmode="numeric" maxlength="1" aria-label="Display digit"><small>EXE: confirm · EXIT: cancel</small></div></div></section>';
  const root=host.firstElementChild,$=selector=>root.querySelector(selector),body=$('.cg-setup-rows'),error=$('.cg-setup-error'),bar=$('.cg-setup-softkeys'),dialog=$('.cg-setup-dialog'),digit=$('[data-setup-digit]');
  const safe=fn=>{try{error.textContent='';return fn();}catch(e){error.textContent=e.message;return false;}};
  const notify=()=>{const accepted=onChange(profile);if(accepted===false)error.textContent='Memory Full — settings remain in memory.';};
  function softKeys(){const choices=rows[selected]?.choices||[];bar.replaceChildren(...Array.from({length:6},(_,index)=>{const button=document.createElement('button');button.type='button';button.dataset.setupSoft=index+1;button.textContent=digitMode?'':choices[index]?.label||'';button.disabled=digitMode||!choices[index];button.addEventListener('click',()=>safe(()=>choose(index)),{signal});return button;}));}
  function render(key=rows[selected]?.key){
    rows=getCGSetupRows(calculator,profile,mode);const same=rows.findIndex(row=>row.key===key);selected=same>=0?same:Math.max(0,Math.min(rows.length-1,selected));const prefs=getCGSetupPreferences(calculator,profile);
    $('[data-setup-mode]').textContent=mode==='financial'?'FINANCIAL':mode==='program'?'PROGRAM':prefs.mode==='Comp'?'':prefs.mode;
    body.replaceChildren(...rows.map((row,index)=>{const button=document.createElement('button');button.type='button';button.dataset.setupRow=row.key;button.classList.toggle('selected',index===selected);button.setAttribute('role','option');button.setAttribute('aria-selected',String(index===selected));const label=document.createElement('span');label.textContent=row.label;const value=document.createElement('span');value.dataset.setupValue=row.key;value.textContent=':'+cgSetupRowValue(row,prefs);button.append(label,value);button.addEventListener('click',()=>{selected=index;render(row.key);root.focus();},{signal});return button;}));
    if(!rows.length){const note=document.createElement('p');note.textContent='No implemented SET UP rows for this mode.';body.append(note);}
    $('.cg-setup-limit').textContent='';
    softKeys();body.querySelector('.selected')?.scrollIntoView({block:'nearest'});
  }
  function choose(index){if(digitMode||closed)return;const row=rows[selected],choice=row?.choices[index];if(!choice)return;
    if(row.key==='display'&&['Fix','Sci'].includes(choice.value)){digitMode=choice.value;$('[data-setup-prompt]').textContent=choice.value+' (0–9)?';digit.value='';dialog.hidden=false;softKeys();digit.focus();return;}
    applyCGSetupChoice(calculator,profile,row.key,choice.value,{mode});notify();render(row.key);root.focus();
  }
  function confirmDigit(){if(!digitMode)return;if(!/^\d$/.test(digit.value))throw Error('Choose one digit0–9');const format=digitMode;applyCGSetupChoice(calculator,profile,'display',format,{mode,digit:Number(digit.value)});digitMode=null;dialog.hidden=true;notify();render('display');root.focus();}
  function cancelDigit(){digitMode=null;dialog.hidden=true;error.textContent='';render('display');root.focus();}
  function close(){if(closed)return;closed=true;onBack();}
  function move(delta){if(digitMode)return;selected=Math.max(0,Math.min(rows.length-1,selected+delta));render(rows[selected]?.key);root.focus();}
  function insert(text){if(closed)return false;if(digitMode&&/^\d$/.test(text)){digit.value=text;digit.focus();}return true;}
  function handleAction(action){if(closed)return false;
    if(['menu','models','language','off','on','help','shift','alpha','cg-alpha-lock','cg-capture'].includes(action))return false;
    if(action==='back'||action==='cg-quit'){if(digitMode)cancelDigit();else close();return true;}
    if(/^cg-f[1-6]$/.test(action)){safe(()=>choose(Number(action.slice(-1))-1));return true;}
    if(action==='up'||action==='down'){move(action==='up'?-1:1);return true;}
    if(action==='left'||action==='right'||action==='setup')return true;
    if(action==='execute'){safe(confirmDigit);return true;}
    if(action==='delete'||action==='clear'||action==='cg-clear-on'){if(digitMode)digit.value='';return true;}
    if(/^\d$/.test(action))return insert(action);
    return true;
  }
  function handleKey(event){if(closed)return false;if(event.key==='Escape')return handleAction('back');if(event.key==='Enter')return handleAction('execute');if(event.key==='ArrowUp')return handleAction('up');if(event.key==='ArrowDown')return handleAction('down');if(event.key==='ArrowLeft'||event.key==='ArrowRight')return true;if(/^F[1-6]$/.test(event.key))return handleAction('cg-f'+event.key.slice(1));if(/^\d$/.test(event.key))return insert(event.key);if(event.key==='Backspace'||event.key==='Delete')return handleAction('delete');return false;}
  digit.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();event.stopPropagation();safe(confirmDigit);}else if(event.key==='Escape'){event.preventDefault();event.stopPropagation();cancelDigit();}},{signal});
  render();root.focus();
  return {handleAction,handleKey,insert,focus:()=>digitMode?digit.focus():root.focus(),destroy(){closed=true;abort.abort();}};
}
