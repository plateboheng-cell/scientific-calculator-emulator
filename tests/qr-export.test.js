import test from 'node:test';
import assert from 'node:assert/strict';
import {buildQrPayload,splitQrPayload,EX_OFFICIAL_MANUAL} from '../src/engine/qr-export.js';
import QRCode from 'qrcode';
import jsQR from 'jsqr';

test('EX exports actual expressions, results and rows as explicitly identified simulator text',()=>{
  const payload=buildQrPayload({expression:'1/3',answer:'0.3333333333',rows:[['x','f(x)'],[2,4]]});
  assert.match(payload,/scientific calculator simulator/);assert.match(payload,/1\/3\n= 0\.3333333333/);assert.match(payload,/x\tf\(x\)\n2\t4/);
  assert.doesNotMatch(payload,/wes\.casio|authentic|serial|genuine/);
  assert.match(buildQrPayload(),new RegExp(EX_OFFICIAL_MANUAL.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
});
test('EX QR pages retain Unicode characters and are valid encoder payloads',async()=>{
  const payload='计算结果 π = 3.1415926535\n'.repeat(30),pages=splitQrPayload(payload);
  assert.ok(pages.length>1);const recovered=pages.map(page=>page.split('\n').slice(2).join('\n')).join('');assert.equal(recovered,payload);
  for(const page of pages){
    const code=QRCode.create(page,{errorCorrectionLevel:'M'});assert.ok(code.modules.size>=21);
    const svg=await QRCode.toString(page,{type:'svg',margin:4,errorCorrectionLevel:'M'});assert.match(svg,/<svg[^>]+viewBox/);
    const scale=4,size=(code.modules.size+8)*scale,pixels=new Uint8ClampedArray(size*size*4).fill(255);
    for(let y=0;y<code.modules.size;y++)for(let x=0;x<code.modules.size;x++)if(code.modules.get(y,x))for(let j=0;j<scale;j++)for(let i=0;i<scale;i++){
      const offset=(((y+4)*scale+j)*size+(x+4)*scale+i)*4;pixels[offset]=pixels[offset+1]=pixels[offset+2]=0;
    }
    assert.equal(jsQR(pixels,size,size)?.data,page,'independent decoder recovers every exported UTF-8 page');
  }
  assert.throws(()=>splitQrPayload(''));assert.throws(()=>splitQrPayload('x',2));
});
