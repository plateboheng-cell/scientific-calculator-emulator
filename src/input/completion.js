import {completionMatches,readMathPrefix} from './completion-catalog.js';
import {esc} from '../ui/html.js';

export function createCompletionController(getContext){
  const popup=document.createElement('div');popup.id='math-completions';popup.className='math-completions';popup.hidden=true;
  document.body.append(popup);
  let field=null,prefix=null,matches=[],selected=0,explicit=false,completing=false,composing=false,dismissed=null;
  const isField=element=>element?.tagName==='MATH-FIELD'&&element.closest('#screen')&&!element.readOnly;
  function close(){popup.hidden=true;if(field){field.setAttribute('aria-expanded','false');field.removeAttribute('aria-activedescendant');}field=null;matches=[];prefix=null;explicit=false;}
  function dismiss(){const active=document.activeElement;if(isField(active))dismissed={field:active,value:active.value};close();}
  function position(){
    if(!field?.isConnected){close();return;}
    const rect=field.getElementInfo(field.position)?.bounds||field.getBoundingClientRect();
    const width=Math.min(335,innerWidth-16);popup.style.width=width+'px';popup.style.left=Math.max(8,Math.min(innerWidth-width-8,rect.left))+'px';
    const height=popup.offsetHeight;popup.style.top=Math.max(8,rect.bottom+height+10>innerHeight?rect.top-height-5:rect.bottom+5)+'px';
  }
  function render(){
    const language=getContext().language||'zh',english=language==='en';
    popup.innerHTML='<div role="listbox" id="math-completion-list" aria-label="'+(english?'Math completions':'数学补全')+'">'+matches.map((entry,i)=>'<button type="button" role="option" tabindex="-1" id="math-option-'+i+'" data-completion="'+i+'" aria-selected="'+(selected===i)+'"><span class="completion-signature">'+esc(entry.signature)+'</span><span class="completion-description">'+esc(english?entry.en:entry.zh)+'</span></button>').join('')+'</div><div class="completion-hint">'+(english?'Tab complete · ↑↓ select · Esc close':'Tab 补全 · ↑↓ 选择 · Esc 关闭')+'</div>';
    popup.hidden=false;field.setAttribute('aria-autocomplete','list');field.setAttribute('aria-controls','math-completion-list');field.setAttribute('aria-expanded','true');field.setAttribute('aria-activedescendant','math-option-'+selected);position();
    popup.querySelector('[aria-selected=true]')?.scrollIntoView({block:'nearest'});
  }
  function refresh(force=false,fromInput=false){
    if(completing||composing)return;
    const active=document.activeElement,context=getContext();
    if(force||(fromInput&&dismissed?.value!==active?.value))dismissed=null;
    if(dismissed?.field===active&&dismissed.value===active.value){close();return;}
    if(!isField(active)||context.enabled===false){close();return;}
    const next=readMathPrefix(active);if(!next){close();return;}
    const candidates=completionMatches(next.text,context,{explicit:force});
    if(!candidates.length){close();return;}
    field=active;prefix=next;matches=candidates;selected=0;explicit=force;render();
  }
  function accept(index=selected){
    if(!field?.isConnected||document.activeElement!==field)return close();
    const current=readMathPrefix(field);
    if(!current||current.start!==prefix.start||current.end!==prefix.end||current.text!==prefix.text)return close();
    const entry=matches[index],target=field;if(!entry)return;
    completing=true;
    try{target.selection={ranges:[[prefix.start,prefix.end]],direction:'forward'};target.insert(entry.latex,{format:'latex',insertionMode:'replaceSelection',selectionMode:'placeholder'});target.dispatchEvent(new Event('input',{bubbles:true}));}
    finally{completing=false;close();}
  }
  function handleKey(event){
    if(event.isComposing||composing)return false;
    const active=document.activeElement;if(!isField(active)){close();return false;}
    if((event.ctrlKey||event.metaKey)&&event.code==='Space'){event.preventDefault();event.stopImmediatePropagation();refresh(true);return true;}
    if(event.key==='Tab'&&!event.shiftKey&&!event.ctrlKey&&!event.metaKey&&!event.altKey){if(popup.hidden)refresh();if(!popup.hidden){event.preventDefault();event.stopImmediatePropagation();accept();return true;}}
    if(!popup.hidden){
      if(event.key==='ArrowUp'||event.key==='ArrowDown'){event.preventDefault();event.stopImmediatePropagation();selected=(selected+(event.key==='ArrowUp'?-1:1)+matches.length)%matches.length;render();return true;}
      if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();dismiss();return true;}
      if(event.key==='Enter'||event.key==='Tab'||/^F\d+$/.test(event.key)||['ArrowLeft','ArrowRight','Home','End'].includes(event.key))dismiss();
    }
    return false;
  }
  document.addEventListener('input',event=>{if(isField(event.target))refresh(explicit,true);},true);
  document.addEventListener('selection-change',()=>{if(!completing){if(explicit&&document.activeElement===field)refresh(true);else refresh();}},true);
  document.addEventListener('compositionstart',()=>{composing=true;close();},true);
  document.addEventListener('compositionend',()=>{composing=false;},true);
  document.addEventListener('focusin',event=>{if(event.target!==field)close();});
  document.addEventListener('pointerdown',event=>{if(popup.contains(event.target)){event.preventDefault();return;}if(event.target!==field)dismiss();},true);
  popup.addEventListener('click',event=>{const option=event.target.closest('[data-completion]');if(option)accept(Number(option.dataset.completion));});
  window.addEventListener('resize',()=>{if(!popup.hidden)position();});
  return {handleKey,close};
}
