import test from 'node:test';
import assert from 'node:assert/strict';
import {deflateSync,inflateSync} from 'node:zlib';
import {decodeCGPictureBCD,encodeCGPictureBCD,parseCGPictureG3B,encodeCGPictureG3B,encodeCGPictureSourceChunks,decodeCGPictureSourceChunks} from '../src/engine/cg-pictureplot-files.js';
const bcd=digits=>Uint8Array.from(digits.match(/../g),part=>parseInt(part,16));
function fixture({count=3,pixelBytes=384*192*2}={}){
  const colors=[0xf800,0x07e0,0x001f],frames=Array.from({length:count},(_,index)=>{const pixels=new Uint8Array(pixelBytes);for(let i=0;i<pixels.length;i+=2){pixels[i]=colors[index%3]>>8;pixels[i+1]=colors[index%3]&255;}return {pixels,compressed:Uint8Array.from(deflateSync(pixels),value=>{const inverted=value^255;return ((inverted<<3)|(inverted>>5))&255;})};}),imageLength=frames.reduce((n,f)=>n+4+f.compressed.length,0),out=new Uint8Array(0xcc+imageLength+200),view=new DataView(out.buffer),u32=(offset,value)=>view.setUint32(offset,value),u16=(offset,value)=>view.setUint16(offset,value);
  out.set([0xaa,0xac,0xbd,0xaf,0x90,0x88,0x9a,0x8d,0x82,0xff,0xef,0xff,0xef,0xff]);out[14]=((out.length+0x41)&255)^255;out[15]=0xfe;u32(16,(out.length^0xffffffff)>>>0);out[20]=((out.length+0xb8)&255)^255;out[28]=(out[18]+out[19]+0x9b)&255;out[29]=(out[19]+0x85)&255;
  out.set([0x43,0x50,0,1],0x20);u32(0x30,out.length-0x20);u32(0x34,0x492);u32(0x3c,out.length-200-0xb8);u32(0x48,140);u32(0x54,44);u32(0x60,16);u32(0xb8,0x10000);u32(0xbc,imageLength);u16(0xc0,384);u16(0xc2,192);u16(0xc4,count);u16(0xc6,16);u16(0xc8,0x100);
  let offset=0xcc;for(const frame of frames){u32(offset,frame.compressed.length);out.set(frame.compressed,offset+4);offset+=4+frame.compressed.length;}
  const footer=offset;out.set([0x30,0x31,0x30,0x30],footer);u32(footer+4,132);
  const values=['601100000000000000000000','101100000000000000000000','100100000000000000000000','100100000000000000000000','600600000000000000000000','100600000000000000000000','100100000000000000000000','000000000000000000000000','102360000000000000000000','100360000000000000000000','098500000000000000000000'];values.forEach((value,index)=>out.set(bcd(value),footer+8+index*12));
  const time=footer+140;out.set([0x30,0x31,0x30,0x30],time);u32(time+4,24);out.set([0,0,0x50,0x47,0x54,0x69,0x6d,0x65],time+8);u32(time+16,2);out.set(bcd('000000000000000000000000'),time+20);out.set(bcd('099400000000000000000000'),time+32);out.set([0x30,0x31,0x30,0x30],footer+184);u32(footer+188,8);return {bytes:out,frames,footer};
}
test('native12-byte BCD decodes the independently documented Cahute examples',()=>{
  assert.equal(decodeCGPictureBCD(bcd('600123000000000000000000')),-1.23);assert.equal(decodeCGPictureBCD(bcd('100230400000000000000000')),2.304);assert.equal(decodeCGPictureBCD(bcd('098456000000000000000000')),.0456);assert.equal(decodeCGPictureBCD(bcd('597786000000000000000000')),-.00786);assert.equal(decodeCGPictureBCD(new Uint8Array(12)),0);assert.throws(()=>decodeCGPictureBCD(bcd('1a7100000000000000000000')));
});
test('G3B parser reads real binary frame blocks and separate ViewWindow/PGTime metadata',async()=>{
  const source=fixture(),decoded=await parseCGPictureG3B(source.bytes);assert.equal(decoded.format,'g3b');assert.equal(decoded.frames.length,3);for(let index=0;index<3;index++)assert.deepEqual(decoded.frames[index].pixels,source.frames[index].pixels);assert.deepEqual(decoded.window,{xmin:-10,xmax:10,ymin:-6,ymax:6});assert.deepEqual(decoded.time,{start:0,step:.4});assert.deepEqual(decoded.calibration.origin,{u:192,v:96});assert.equal(decoded.metadata.length,200);
});
test('G3B validates frame counts,length bounds,metadata layout and checksums before accepting data',async()=>{
  for(const mutate of [data=>data[0]=0,data=>new DataView(data.buffer).setUint16(0xc4,31),data=>new DataView(data.buffer).setUint32(0xcc,0xffffffff),data=>data[0xd0+new DataView(data.buffer).getUint32(0xcc)-1]^=1]){const data=fixture().bytes;mutate(data);await assert.rejects(()=>parseCGPictureG3B(data));}
  const source=fixture();source.bytes[source.footer+140+16+3]=3;await assert.rejects(()=>parseCGPictureG3B(source.bytes),/PGTime/);
  await assert.rejects(()=>parseCGPictureG3B(new TextEncoder().encode('{"format":"g3b"}')),/G3B/);
});
test('G3B bounded decompression rejects a valid compressed stream with excess pixel bytes',async()=>{
  await assert.rejects(()=>parseCGPictureG3B(fixture({count:1,pixelBytes:384*192*2+20}).bytes),/exceeds one frame/);
});
test('G3B no-edit writing preserves every original byte including opaque header and style fields',async()=>{
  const source=fixture();source.bytes[0x78]=0xa5;source.bytes[source.footer+195]=0x73;const decoded=await parseCGPictureG3B(source.bytes);assert.deepEqual(await encodeCGPictureG3B(decoded),source.bytes);
});
test('G3B time/window edits update only confirmed BCD fields and preserve original compressed frames',async()=>{
  const source=fixture();source.bytes[source.footer+17]=0xa5;const decoded=await parseCGPictureG3B(source.bytes);decoded.time={start:1,step:1.5};decoded.window={xmin:-20,xmax:20,ymin:-12,ymax:12};const written=await encodeCGPictureG3B(decoded),allowed=new Set([0,1,4,5].flatMap(index=>Array.from({length:9},(_,n)=>source.footer+8+index*12+n)).concat([160,172].flatMap(offset=>Array.from({length:9},(_,n)=>source.footer+offset+n))));
  for(let index=0;index<written.length;index++)if(written[index]!==source.bytes[index])assert.ok(allowed.has(index),'Unexpected metadata/header edit at'+index);
  assert.deepEqual(written.slice(0xcc,source.footer),source.bytes.slice(0xcc,source.footer));const result=await parseCGPictureG3B(written);assert.deepEqual(result.time,decoded.time);assert.deepEqual(result.window,decoded.window);
});
test('G3B edited/new frames are independently accepted by Node zlib and retain all RGB565 pixels',async()=>{
  const source=fixture(),decoded=await parseCGPictureG3B(source.bytes);decoded.frames[0].pixels[0]^=128;const output=await encodeCGPictureG3B(decoded);let offset=0xcc;
  for(let index=0;index<decoded.frames.length;index++){const length=new DataView(output.buffer).getUint32(offset),compressed=output.slice(offset+4,offset+4+length).map(value=>(((value>>3)|(value<<5))&255)^255);assert.deepEqual(new Uint8Array(inflateSync(compressed)),decoded.frames[index].pixels);offset+=4+length;}
  assert.equal(offset,output.length-200);
  const created=await encodeCGPictureG3B({frames:decoded.frames,time:{start:2,step:.5},window:{xmin:-2,xmax:2,ymin:-1,ymax:1}});const result=await parseCGPictureG3B(created);assert.equal(result.frames.length,3);assert.deepEqual(result.time,{start:2,step:.5});assert.deepEqual(result.window,{xmin:-2,xmax:2,ymin:-1,ymax:1});
});
test('native source chunk JSON transport is bounded and byte exact across chunk boundaries',()=>{
  const source=Uint8Array.from({length:200001},(_,index)=>index%251),chunks=JSON.parse(JSON.stringify(encodeCGPictureSourceChunks(source)));assert.ok(chunks.length>1);assert.deepEqual(decodeCGPictureSourceChunks(chunks),source);assert.throws(()=>decodeCGPictureSourceChunks(['data:bad']));assert.throws(()=>decodeCGPictureSourceChunks(Array(401).fill('AA==')));
  for(const value of [0,-1.23,2.304,.0456,-.00786,1e99])assert.equal(decodeCGPictureBCD(encodeCGPictureBCD(value)),value);
});
