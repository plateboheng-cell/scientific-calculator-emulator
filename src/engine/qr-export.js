import {assert} from './calculator.js';

export const EX_OFFICIAL_MANUAL='https://www.casio.com/content/dam/casio/global/support/manuals/calculators/pdf/004-en/f/fx-570_991EX_EN.pdf';
export function buildQrPayload({modelName='fx-991EX',mode='calc',angle='Deg',expression='',answer='',rows=[],error=''}={}){
  const lines=['scientific calculator simulator',String(modelName),`mode: ${mode}; angle: ${angle}`];
  if(expression)lines.push(String(expression));
  if(answer!==''&&answer!==undefined&&answer!==null)lines.push(`= ${answer}`);
  if(error)lines.push(`Error: ${error}`);
  for(const row of rows)lines.push(Array.isArray(row)?row.join('\t'):String(row));
  if(lines.length===3)lines.push(`Manual: ${EX_OFFICIAL_MANUAL}`);
  const text=lines.join('\n');assert(text.length<=32000,'二维码内容过长');return text;
}

// Keep each image readable on the small simulated LCD. Scanning any page yields
// ordinary text; pages are numbered explicitly rather than claiming structured
// append support or a connection to CASIO's calculator authentication service.
export function splitQrPayload(payload,maxBytes=160){
  assert(typeof payload==='string'&&payload.length>0&&payload.length<=32000,'二维码内容为空或过长');
  assert(Number.isInteger(maxBytes)&&maxBytes>=32&&maxBytes<=2048,'二维码分页大小错误');
  const encoder=new TextEncoder(),parts=[];let current='',bytes=0;
  for(const ch of payload){const count=encoder.encode(ch).length;if(bytes+count>maxBytes){parts.push(current);current='';bytes=0;}current+=ch;bytes+=count;}
  if(current)parts.push(current);
  return parts.length===1?parts:parts.map((part,index)=>`scientific calculator simulator\n${index+1}/${parts.length}\n${part}`);
}
