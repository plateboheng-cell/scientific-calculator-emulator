// Independently decoded CP0001 G3B sequences. Format facts were cross-checked
// against cfxm's original notes and eight factory-resource exports published by
// their exporter: https://www.cemetech.net/downloads/files/2356/x2777
// https://www.omnimaga.org/casio-calculator-programming-news-and-support/hacking-into-the-g3pb-format-%28halted%29/
// BCD layout: https://cahute.org/topics/number-formats.html#fx-9860g-style-bcd
// Vendor images stay in .verification; no artwork is part of this implementation.
import {assert} from './calculator.js';
import {parseCasioHeader,CASIO_FILE_LIMIT} from './casio-files.js';

const bytes=value=>value instanceof ArrayBuffer?new Uint8Array(value):ArrayBuffer.isView(value)?new Uint8Array(value.buffer,value.byteOffset,value.byteLength):null;
const number=(data,offset,size=4)=>size===2?new DataView(data.buffer,data.byteOffset,data.byteLength).getUint16(offset):new DataView(data.buffer,data.byteOffset,data.byteLength).getUint32(offset);
const match=(data,offset,expected)=>expected.every((value,index)=>data[offset+index]===value);
export function decodeCGPictureBCD(value){
  const data=bytes(value);assert(data?.length===12,'Native real requires12 bytes');const digits=Array.from(data.slice(0,9),value=>[value>>4,value&15]).flat();assert(digits.every(digit=>digit<=9),'Unsupported native non-decimal value');
  if(digits.slice(3).every(digit=>digit===0))return 0;
  let exponent=digits[0]*100+digits[1]*10+digits[2],sign=1;if(exponent>=500){sign=-1;exponent-=500;}exponent-=100;
  const result=Number((sign<0?'-':'')+digits[3]+'.'+digits.slice(4).join('')+'e'+exponent);assert(Number.isFinite(result)&&Math.abs(result)<1e100,'Native real is outside supported finite range');return result;
}
export function encodeCGPictureBCD(value){
  assert(typeof value==='number'&&Number.isFinite(value)&&Math.abs(value)<1e100,'Native real must be finite and below10^100');if(value===0)return new Uint8Array(12);
  const [mantissa,power]=Math.abs(value).toExponential(14).split('e'),exponent=Number(power)+100+(value<0?500:0);assert(exponent>=0&&exponent<=999,'Native real exponent is outside the BCD range');
  const digits=String(exponent).padStart(3,'0')+mantissa.replace('.','')+'000000',out=new Uint8Array(12);for(let i=0;i<12;i++)out[i]=Number(digits[i*2])*16+Number(digits[i*2+1]);return out;
}
export function encodeCGPictureSourceChunks(value){
  const data=bytes(value);assert(data&&data.length<=CASIO_FILE_LIMIT,'Native source exceeds16MiB');const chunks=[];for(let offset=0;offset<data.length;offset+=49152){let binary='';for(const item of data.subarray(offset,offset+49152))binary+=String.fromCharCode(item);chunks.push(btoa(binary));}return chunks;
}
export function decodeCGPictureSourceChunks(chunks){
  assert(Array.isArray(chunks)&&chunks.length>=1&&chunks.length<=400,'Invalid native source chunks');const parts=[];let count=0;for(const chunk of chunks){assert(typeof chunk==='string'&&chunk.length<=65536&&/^[A-Za-z0-9+/]+={0,2}$/.test(chunk),'Invalid native source chunk');const binary=atob(chunk);count+=binary.length;assert(count<=CASIO_FILE_LIMIT,'Native source exceeds16MiB');parts.push(Uint8Array.from(binary,char=>char.charCodeAt(0)));}const data=new Uint8Array(count);let offset=0;for(const part of parts){data.set(part,offset);offset+=part.length;}return data;
}
async function inflateFrame(compressed,expected){
  const unobfuscated=compressed.map(value=>(((value>>3)|(value<<5))&255)^255),stream=new Blob([unobfuscated]).stream().pipeThrough(new DecompressionStream('deflate')),reader=stream.getReader(),chunks=[];let count=0;
  try{while(true){const next=await reader.read();if(next.done)break;count+=next.value.length;if(count>expected){await reader.cancel();throw Error('G3B decompression exceeds one frame');}chunks.push(next.value);}}
  catch(error){throw Error('Invalid G3B DEFLATE/checksum: '+error.message);}finally{reader.releaseLock();}
  assert(count===expected,'G3B decompressed pixel count does not match384×192 RGB565');const pixels=new Uint8Array(count);let offset=0;for(const chunk of chunks){pixels.set(chunk,offset);offset+=chunk.length;}return pixels;
}
export async function parseCGPictureG3B(value){
  const data=bytes(value);assert(data&&data.length>=0xd0+200&&data.length<=CASIO_FILE_LIMIT,'G3B input is truncated or exceeds16MiB');let header;try{header=parseCasioHeader(data);}catch(error){throw Error('Invalid G3B header: '+error.message);}
  assert(header.subtype===0x7d&&match(data,0x20,[0x43,0x50,0,1,0,0]),'Expected a native CP0001 picture sequence');
  assert(number(data,0x34)===0x492&&number(data,0xb8)===0x10000,'Unsupported native G3B variant');
  assert(number(data,0x48)===0x8c&&number(data,0x54)===0x2c&&number(data,0x60)===0x10,'Unsupported G3B footer layout');
  const imageEnd=data.length-200;
  assert(number(data,0x30)===data.length-0x20&&number(data,0x3c)===imageEnd-0xb8&&number(data,0xbc)===imageEnd-0xcc,'Invalid G3B nested size fields');
  const width=number(data,0xc0,2),height=number(data,0xc2,2),count=number(data,0xc4,2),bitDepth=number(data,0xc6,2);
  const imageFlags=number(data,0xc8,2);
  assert(width===384&&height===192&&bitDepth===16&&count>=1&&count<=30&&[0x100,0x128].includes(imageFlags)&&number(data,0xca,2)===0,'Unsupported G3B dimensions,frame count or pixel format');
  const frames=[];let offset=0xcc;
  for(let index=0;index<count;index++){assert(offset+4<=imageEnd,'Truncated G3B frame length');const length=number(data,offset);offset+=4;assert(length>0&&length<=imageEnd-offset,'Truncated or invalid G3B frame payload');const compressed=data.slice(offset,offset+length),pixels=await inflateFrame(compressed,width*height*2);frames.push({pixels,compressed});offset+=length;}
  assert(offset===imageEnd,'Unexpected trailing G3B image bytes');
  const footer=imageEnd;assert(match(data,footer,[0x30,0x31,0x30,0x30])&&number(data,footer+4)===132,'Unsupported G3B View Window metadata');
  const values=Array.from({length:11},(_,index)=>decodeCGPictureBCD(data.slice(footer+8+index*12,footer+20+index*12))),window={xmin:values[0],xmax:values[1],ymin:values[4],ymax:values[5]};
  assert(window.xmin<window.xmax&&window.ymin<window.ymax,'Invalid native Picture Plot View Window');
  const timeOffset=footer+140;assert(match(data,timeOffset,[0x30,0x31,0x30,0x30])&&number(data,timeOffset+4)===24&&match(data,timeOffset+8,[0,0,0x50,0x47,0x54,0x69,0x6d,0x65])&&number(data,timeOffset+16)===2,'Unsupported G3B PGTime metadata');
  const time={start:decodeCGPictureBCD(data.slice(timeOffset+20,timeOffset+32)),step:decodeCGPictureBCD(data.slice(timeOffset+32,timeOffset+44))};assert(Math.abs(time.start)<1e10&&time.step>0&&time.step<1e10,'Invalid native Picture Plot time progression');
  assert(match(data,footer+184,[0x30,0x31,0x30,0x30])&&number(data,footer+188)===8,'Unsupported G3B style footer');
  const origin={u:-window.xmin*width/(window.xmax-window.xmin),v:window.ymax*height/(window.ymax-window.ymin)};
  return {format:'g3b',variant:'CP0001-RGB565',width,height,bitDepth,imageFlags,frames,time,window,calibration:{origin,xRef:{u:origin.u+width/(window.xmax-window.xmin),v:origin.v},yRef:{u:origin.u,v:origin.v-height/(window.ymax-window.ymin)},xUnit:1,yUnit:1},metadata:data.slice(imageEnd),source:data.slice()};
}

const equalBytes=(a,b)=>a?.length===b?.length&&a.every((value,index)=>value===b[index]);
async function compressFrame(pixels){
  const reader=new Blob([pixels]).stream().pipeThrough(new CompressionStream('deflate')).getReader(),chunks=[];let count=0;try{while(true){const next=await reader.read();if(next.done)break;count+=next.value.length;if(count>CASIO_FILE_LIMIT){await reader.cancel();throw Error('G3B compressed data exceeds16MiB');}chunks.push(next.value);}}finally{reader.releaseLock();}
  const data=new Uint8Array(count);let offset=0;for(const chunk of chunks){for(const value of chunk){const inverted=value^255;data[offset++]=((inverted<<3)|(inverted>>5))&255;}}return data;
}
function defaultMetadata(){
  // Known valid200-byte metadata structure, not a guessed user-plot record.
  const data=new Uint8Array(200),view=new DataView(data.buffer),tag=offset=>data.set([0x30,0x31,0x30,0x30],offset);tag(0);view.setUint32(4,132);
  const values=[-6.3,6.3,1,.0333333333333333,-3.1,3.1,1,0,360,3.6,.067741935483871];values.forEach((value,index)=>data.set(encodeCGPictureBCD(value),8+index*12));tag(140);view.setUint32(144,24);data.set([0,0,0x50,0x47,0x54,0x69,0x6d,0x65],148);view.setUint32(156,2);data.set(encodeCGPictureBCD(0),160);data.set(encodeCGPictureBCD(1),172);tag(184);view.setUint32(188,8);data.set([0,5,4,5,0,1,0,0],192);return data;
}
export async function encodeCGPictureG3B(picture){
  assert(picture&&Array.isArray(picture.frames)&&picture.frames.length>=1&&picture.frames.length<=30,'G3B requires1–30 frames');
  assert((picture.width??384)===384&&(picture.height??192)===192&&(picture.bitDepth??16)===16,'G3B export requires384×192 RGB565');
  const frames=picture.frames.map(frame=>{const pixels=bytes(frame.pixels);assert(pixels?.length===384*192*2,'G3B frame requires147456 RGB565 bytes');return pixels;}),original=picture.source?await parseCGPictureG3B(picture.source):null;
  const time=picture.time??original?.time??{start:0,step:1},window=picture.window??original?.window??{xmin:-6.3,xmax:6.3,ymin:-3.1,ymax:3.1},flags=picture.imageFlags??original?.imageFlags??0x100;
  assert(typeof time.start==='number'&&Math.abs(time.start)<1e10&&typeof time.step==='number'&&time.step>0&&time.step<1e10,'Invalid G3B time progression');
  assert(['xmin','xmax','ymin','ymax'].every(key=>typeof window[key]==='number'&&Number.isFinite(window[key])&&Math.abs(window[key])<1e100)&&window.xmin<window.xmax&&window.ymin<window.ymax,'Invalid G3B View Window');assert([0x100,0x128].includes(flags),'Unsupported G3B image flags');
  const sameFrames=original&&frames.length===original.frames.length&&frames.every((pixels,index)=>equalBytes(pixels,original.frames[index].pixels)),sameTime=original&&time.start===original.time.start&&time.step===original.time.step,sameWindow=original&&['xmin','xmax','ymin','ymax'].every(key=>window[key]===original.window[key]);
  if(sameFrames&&sameTime&&sameWindow&&flags===original.imageFlags)return original.source.slice();
  const compressed=[];for(let index=0;index<frames.length;index++)compressed.push(original?.frames[index]&&equalBytes(frames[index],original.frames[index].pixels)?original.frames[index].compressed:await compressFrame(frames[index]));
  const imageLength=compressed.reduce((count,data)=>count+4+data.length,0),length=0xcc+imageLength+200;assert(length<=CASIO_FILE_LIMIT,'G3B output exceeds16MiB');const output=new Uint8Array(length),view=new DataView(output.buffer),set32=(offset,value)=>view.setUint32(offset,value),set16=(offset,value)=>view.setUint16(offset,value);
  if(original)output.set(original.source.subarray(0,0xcc));else {output.set([0xaa,0xac,0xbd,0xaf,0x90,0x88,0x9a,0x8d,0x82,0xff,0xef,0xff,0xef,0xff]);output[15]=0xfe;output.set([0x43,0x50,0,1],0x20);}
  output[14]=((length+0x41)&255)^255;set32(16,(length^0xffffffff)>>>0);output[20]=((length+0xb8)&255)^255;output[28]=(output[18]+output[19]+0x9b)&255;output[29]=(output[19]+0x85)&255;set32(0x30,length-0x20);set32(0x34,0x492);set32(0x3c,length-200-0xb8);set32(0x48,140);set32(0x54,44);set32(0x60,16);set32(0xb8,0x10000);set32(0xbc,imageLength);set16(0xc0,384);set16(0xc2,192);set16(0xc4,frames.length);set16(0xc6,16);set16(0xc8,flags);set16(0xca,0);
  let offset=0xcc;for(const frame of compressed){set32(offset,frame.length);output.set(frame,offset+4);offset+=4+frame.length;}
  const metadata=original?original.metadata.slice():defaultMetadata();if(!sameWindow)for(const [key,index]of Object.entries({xmin:0,xmax:1,ymin:4,ymax:5}))metadata.set(encodeCGPictureBCD(window[key]).subarray(0,9),8+index*12);if(!sameTime){metadata.set(encodeCGPictureBCD(time.start).subarray(0,9),160);metadata.set(encodeCGPictureBCD(time.step).subarray(0,9),172);}output.set(metadata,offset);return output;
}
