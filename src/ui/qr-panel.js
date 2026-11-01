import QRCode from 'qrcode';
import './qr-panel.css';
import {splitQrPayload} from '../engine/qr-export.js';

// This intentionally exports plain calculation text, not a manufactured CASIO
// WES/authenticity URL. The referenced official manual does not specify that encoding.
export function createQrPanel({host,payload,language='zh',onClose}){
  const abort=new AbortController(),pages=splitQrPayload(payload);let index=0,contrast=0;
  const english=language==='en';
  const container=document.createElement('div');container.className='qr-panel';
  const heading=document.createElement('strong');heading.textContent=english?'QR · simulator export':'QR · 模拟器导出';
  const code=document.createElement('div');code.className='qr-image';code.setAttribute('aria-label',english?'Scannable calculation text':'可扫描的计算文本');
  const footer=document.createElement('div');footer.className='qr-footer';
  const previous=document.createElement('button');previous.type='button';previous.textContent='◀';
  const counter=document.createElement('span');
  const next=document.createElement('button');next.type='button';next.textContent='▶';
  const close=document.createElement('button');close.type='button';close.textContent=english?'Back':'返回';
  const note=document.createElement('small');note.textContent=english?'Scan to read text. This QR is a simulator export.':'扫码读取计算文本。此二维码为模拟器导出。';
  const details=document.createElement('details'),summary=document.createElement('summary'),text=document.createElement('pre');
  summary.textContent=english?'QR text':'二维码内容';text.textContent=payload;details.append(summary,text);
  footer.append(previous,counter,next,close);container.append(heading,code,footer,note,details);host.replaceChildren(container);
  async function paint(){
    const page=index;
    counter.textContent=`${page+1}/${pages.length}`;
    // Version is chosen by the encoder from actual UTF-8 content and ECC level M.
    const svg=await QRCode.toString(pages[page],{type:'svg',errorCorrectionLevel:'M',margin:4,color:{dark:contrast<0?'#273427':'#000000',light:'#ffffff'}});
    if(!abort.signal.aborted&&page===index)code.innerHTML=svg;
  }
  const turn=step=>{index=(index+step+pages.length)%pages.length;void paint();};
  previous.addEventListener('click',()=>turn(-1),{signal:abort.signal});next.addEventListener('click',()=>turn(1),{signal:abort.signal});close.addEventListener('click',onClose,{signal:abort.signal});
  function handleAction(action){
    if(['clear','back','ex-qr'].includes(action)){onClose();return true;}
    if(['execute','down'].includes(action)){turn(1);return true;}
    if(action==='up'){turn(-1);return true;}
    if(['left','right'].includes(action)){contrast=action==='left'?-1:0;void paint();return true;}
    return false;
  }
  const ready=paint();
  return {handleAction,destroy:()=>abort.abort(),ready,pages};
}
