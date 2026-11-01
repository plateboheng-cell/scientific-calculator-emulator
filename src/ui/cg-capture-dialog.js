import './cg-capture-dialog.css';
/** The native CAPTURE prompt overlays the current app without destroying it. */
export function createCGCaptureDialog({parent=document.body,onStore,onClose=()=>{}}){
  const abort=new AbortController(),{signal}=abort,dialog=document.createElement('dialog');let closed=false;
  dialog.id='cg-capture-dialog';dialog.className='cg-capture-dialog';
  dialog.innerHTML='<form><strong>CAPTURE</strong><label>Capture No.?<input name="capture" aria-label="Capture number" inputmode="numeric" value="1" maxlength="2"></label><div role="alert" data-capture-error></div><button type="submit">EXE</button><button type="button" data-capture-cancel>EXIT</button></form>';
  const input=dialog.querySelector('input'),error=dialog.querySelector('[data-capture-error]');
  function close(){if(closed)return;closed=true;abort.abort();dialog.close();dialog.remove();onClose();}
  function save(){try{const number=Number(input.value);if(!/^\d{1,2}$/.test(input.value)||!Number.isInteger(number)||number<1||number>20)throw Error('Capture number: 1–20');if(onStore(number)===false)throw Error('Memory ERROR');close();}catch(e){error.textContent=e.message;input.focus();}}
  dialog.querySelector('form').addEventListener('submit',event=>{event.preventDefault();save();},{signal});
  dialog.querySelector('[data-capture-cancel]').addEventListener('click',close,{signal});
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();},{signal});
  dialog.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();close();}},{signal});
  const position=()=>{const anchor=parent.querySelector('#screen')?.getBoundingClientRect();if(!anchor)return;dialog.style.width=Math.min(260,anchor.width-12)+'px';dialog.style.maxHeight=anchor.height-8+'px';const box=dialog.getBoundingClientRect();dialog.style.left=anchor.left+(anchor.width-box.width)/2+'px';dialog.style.top=anchor.top+Math.max(4,(anchor.height-box.height)/2)+'px';};
  // Calculator keys stay active outside this LCD popup.
  parent.append(dialog);dialog.show();position();window.addEventListener('resize',position,{signal});input.focus();input.select();
  return {close,handleAction(action){if(closed)return false;if(['menu','models','off','on'].includes(action)){close();return false;}if(['back','cg-quit'].includes(action)){close();return true;}if(action==='execute'){save();return true;}if(action==='delete'){const start=input.selectionStart??0,end=input.selectionEnd??start;input.setRangeText('',start===end?Math.max(0,start-1):start,end,'end');return true;}if(['clear','cg-clear-on'].includes(action)){input.value='';return true;}if(/^\d$/.test(action)){input.setRangeText(action,input.selectionStart??input.value.length,input.selectionEnd??input.value.length,'end');input.focus();}return true;}};
}
