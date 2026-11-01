import {createCGShell,cgTable} from './cg-ui.js';
import './cg-exam.css';
import {cgExamElapsed} from '../state/cg-exam.js';
export function createCGExamPanel({host,exam,onEnter,onBack}){
  const shell=createCGShell(host,'Examination Mode');let phase=0;
  function render(){
    shell.body.innerHTML=phase===0?'<p>Enter Examination Mode?</p><p>User data will be backed up and inaccessible during this session.</p>':phase===1?'<p>eActivity, Program, Memory, E-CON4, add-ins, vector commands and data transfer will be disabled.</p><p>Exit restores the previous user data and deletes data created in this session.</p>':'<p>Examination Mode</p><p>Press EXIT to start.</p>';
    shell.soft(phase===0?['Yes','','','','','No']:phase===1?['','CONT','','','','']:['','','','','','EXIT'],index=>{if(phase===0){if(index===1){phase=1;render();}else if(index===6)onBack();}else if(phase===1&&index===2){phase=2;render();}else if(phase===2&&index===6)onEnter();});
  }
  function handleAction(action){if(/^cg-f[1-6]$/.test(action)){shell.root.querySelector('[data-cg-soft="'+action.slice(-1)+'"]')?.click();return true;}if(action==='back'){if(phase===2)onEnter();else onBack();return true;}return true;}
  render();return {handleAction,handleKey(event){if(event.key==='Escape')return handleAction('back');return false;},focus(){shell.body.focus();},destroy(){shell.destroy();}};
}
export function cgExamClockRows(exam,now=Date.now()){
  const seconds=Math.floor(cgExamElapsed(exam,now)/1000);return cgTable(['Examination Mode','Elapsed'],[['Time',String(Math.floor(seconds/3600)).padStart(2,'0')+':'+String(Math.floor(seconds/60)%60).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0')]]);
}
