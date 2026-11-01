import {assert} from './calculator.js';
export const PROGRAM_PICTURE_BANK_LIMIT=1200000;
const dimensions=(width,height)=>Number.isInteger(width)&&Number.isInteger(height)&&width>0&&height>0&&width<=512&&height<=512;
function base64(bytes){let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(binary);}
export function encodeProgramPicture({width,height,data}){
  assert(dimensions(width,height)&&data?.length===width*height*4,'图片尺寸无效');const runs=[];
  for(let pixel=0;pixel<width*height;){const offset=pixel*4;let count=1;while(count<65535&&pixel+count<width*height&&data[offset]===data[(pixel+count)*4]&&data[offset+1]===data[(pixel+count)*4+1]&&data[offset+2]===data[(pixel+count)*4+2]&&data[offset+3]===data[(pixel+count)*4+3])count++;runs.push(count&255,count>>>8,data[offset],data[offset+1],data[offset+2],data[offset+3]);pixel+=count;}
  return {codec:'rgba-rle-v1',width,height,data:base64(Uint8Array.from(runs))};
}
export function decodeProgramPicture(source){
  assert(source&&source.codec==='rgba-rle-v1'&&dimensions(source.width,source.height)&&typeof source.data==='string'&&source.data.length<=2100000&&/^[A-Za-z0-9+/]*={0,2}$/.test(source.data),'图片存储数据无效');
  const binary=atob(source.data);assert(binary.length%6===0,'图片存储数据损坏');const pixels=new Uint8ClampedArray(source.width*source.height*4);let offset=0;
  for(let i=0;i<binary.length;i+=6){const count=binary.charCodeAt(i)|(binary.charCodeAt(i+1)<<8);assert(count>0&&offset+count*4<=pixels.length,'图片存储数据损坏');for(let p=0;p<count;p++){pixels[offset++]=binary.charCodeAt(i+2);pixels[offset++]=binary.charCodeAt(i+3);pixels[offset++]=binary.charCodeAt(i+4);pixels[offset++]=binary.charCodeAt(i+5);}}
  assert(offset===pixels.length,'图片存储数据不完整');return {width:source.width,height:source.height,data:pixels};
}
export function sanitizeProgramPictureBanks(source={}){
  const result={pict:{},capture:{}};let total=0;
  for(const kind of ['pict','capture'])for(const [key,picture]of Object.entries(source?.[kind]||{})){
    const slot=Number(key);if(!Number.isInteger(slot)||slot<1||slot>20||!picture||picture.codec!=='rgba-rle-v1'||!dimensions(picture.width,picture.height)||typeof picture.data!=='string'||picture.data.length>PROGRAM_PICTURE_BANK_LIMIT)continue;
    if(total+picture.data.length>PROGRAM_PICTURE_BANK_LIMIT)continue;total+=picture.data.length;result[kind][String(slot)]={codec:picture.codec,width:picture.width,height:picture.height,data:picture.data};
  }
  return result;
}
export function storeProgramPicture(banks,kind,slot,picture){
  assert(['pict','capture'].includes(kind)&&Number.isInteger(slot)&&slot>=1&&slot<=20,'图片存储编号须为 1–20');decodeProgramPicture(picture);
  const total=['pict','capture'].reduce((sum,key)=>sum+Object.entries(banks[key]||{}).reduce((n,[index,value])=>n+(key===kind&&String(index)===String(slot)?0:String(value?.data||'').length),0),0)+picture.data.length;
  assert(total<=PROGRAM_PICTURE_BANK_LIMIT,'图片存储内存不足');banks[kind]??={};banks[kind][String(slot)]=picture;
}
