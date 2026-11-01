// Native text fields are used by the CG applications; MathLive keeps its own undo.
export function createTextUndo(document){
  const histories=new WeakMap();let restoring=false;
  const editable=field=>field?.matches?.('input,textarea')&&field.closest('#screen')&&!['file','checkbox','radio','button','range'].includes(field.type);
  const snapshot=field=>({value:field.value,start:field.selectionStart,end:field.selectionEnd});
  function track(field,nativeHistory=false){
    if(!editable(field))return;const current=snapshot(field),history=histories.get(field);
    if(!history){histories.set(field,{last:current,items:[]});return;}
    if(nativeHistory){history.items=[];history.last=current;return;}
    if(!restoring&&current.value!==history.last.value){history.items.push(history.last);if(history.items.length>100)history.items.shift();}
    history.last=current;
  }
  document.addEventListener('focusin',event=>track(event.target));
  document.addEventListener('beforeinput',event=>track(event.target));
  document.addEventListener('input',event=>track(event.target,['historyUndo','historyRedo'].includes(event.inputType)));
  document.addEventListener('click',()=>track(document.activeElement));
  return {undo(){const field=document.activeElement;if(!editable(field))return false;track(field);const history=histories.get(field),previous=history?.items.pop();if(!previous)return false;restoring=true;try{field.value=previous.value;try{field.setSelectionRange(previous.start,previous.end);}catch{}field.dispatchEvent(new Event('input',{bubbles:true}));field.dispatchEvent(new Event('change',{bubbles:true}));history.last=snapshot(field);}finally{restoring=false;}return true;}};
}
