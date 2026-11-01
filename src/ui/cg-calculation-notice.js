import './cg-calculation-notice.css';
/** Native numerical warnings require EXE acknowledgement before editing. */
export function createCGCalculationNotice({parent=document.body,message,onClose=()=>{}}){
  const abort=new AbortController(),{signal}=abort,dialog=document.createElement('dialog');let closed=false,returnFocus=null;
  dialog.id='cg-calculation-notice';dialog.className='cg-calculation-notice';dialog.setAttribute('role','alertdialog');dialog.setAttribute('aria-label','Calculation');
  const form=document.createElement('form'),text=document.createElement('p'),button=document.createElement('button');text.textContent=message;button.type='submit';button.textContent='EXE';form.append(text,button);dialog.append(form);
  function focus(){const active=document.activeElement;if(active?.matches?.('input,textarea,math-field')&&!dialog.contains(active))returnFocus=active;button.focus();}
  function close(){if(closed)return;closed=true;abort.abort();dialog.close();dialog.remove();if(returnFocus?.isConnected&&!returnFocus.closest('[hidden]'))returnFocus.focus();onClose();}
  form.addEventListener('submit',event=>{event.preventDefault();close();},{signal});dialog.addEventListener('cancel',event=>{event.preventDefault();close();},{signal});
  dialog.addEventListener('keydown',event=>{if(['Enter','Escape'].includes(event.key)){event.preventDefault();event.stopPropagation();close();}},{signal});
  const position=()=>{const rect=parent.querySelector('#screen')?.getBoundingClientRect();if(!rect)return;dialog.style.width=Math.min(270,rect.width-12)+'px';const box=dialog.getBoundingClientRect();dialog.style.left=rect.left+(rect.width-box.width)/2+'px';dialog.style.top=rect.top+Math.max(4,(rect.height-box.height)/2)+'px';};
  parent.append(dialog);dialog.show();position();window.addEventListener('resize',position,{signal});focus();
  return {close,focus,handleAction(action){if(closed)return false;if(['menu','models','off','on'].includes(action)){close();return false;}if(action==='cg-capture')return false;if(['execute','back','cg-quit','clear','cg-clear-on'].includes(action))close();return true;}};
}
