// Research-only validation against independently exported factory resources.
// Samples and Python/zlib reference hashes live in .verification, never the app.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {parseCGPictureG3B,encodeCGPictureG3B} from '../src/engine/cg-pictureplot-files.js';
const root=path.resolve('.verification/native-picture-samples'),expected=JSON.parse(await fs.readFile(path.join(root,'python-reference.json'),'utf8')),results=[];
for(const sample of expected.samples){
  const file=path.join(root,sample.name);assert.equal(path.dirname(file),root);const input=await fs.readFile(file);let decoded;try{decoded=await parseCGPictureG3B(input);}catch(error){throw Error(sample.name+': '+error.message);}assert.equal(decoded.frames.length,sample.frames.length);assert.equal(decoded.width,384);assert.equal(decoded.height,192);
  for(let index=0;index<decoded.frames.length;index++)assert.equal(createHash('sha256').update(decoded.frames[index].pixels).digest('hex'),sample.frames[index].pixelsSha256,sample.name+' frame'+index);
  if(sample.name==='Coaster_car.g3b'){assert.equal(decoded.time.start,0);assert.equal(decoded.time.step,.4);assert.equal(decoded.window.xmin,-2.3);assert.equal(decoded.window.xmax,10.3);assert.equal(decoded.window.ymin,-.8);assert.equal(decoded.window.ymax,5.4);}
  results.push({name:sample.name,bytes:input.length,frames:decoded.frames.length,allPixelsMatchIndependentZlib:true,time:decoded.time,window:decoded.window});
}
const report={date:new Date().toISOString(),source:expected.source,zipSha256:expected.zipSha256,scope:'CP0001 RGB565 factory-resource exports, independently decompressed and hashed with Python zlib; no hardware transfer test',passed:results,errors:[]};await fs.writeFile('.verification/cg-g3b-original-results.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
const written=path.join(root,'written');await fs.mkdir(written,{recursive:true});const manifests=[];
for(const sample of expected.samples){
  const input=await fs.readFile(path.join(root,sample.name)),original=await parseCGPictureG3B(input),roundtrip=await encodeCGPictureG3B(original);assert.deepEqual(roundtrip,new Uint8Array(input));const target={...original,time:{start:1,step:.5},window:{xmin:original.window.xmin-1,xmax:original.window.xmax+1,ymin:original.window.ymin-1,ymax:original.window.ymax+1}},edited=await encodeCGPictureG3B(target),changed={...target,frames:target.frames.map(frame=>({pixels:frame.pixels.slice()}))};changed.frames[0].pixels[0]^=128;const frameEdited=await encodeCGPictureG3B(changed);
  for(const [kind,data,document]of [['roundtrip',roundtrip,original],['metadata',edited,target],['frame',frameEdited,changed]]){const name=kind+'_'+sample.name;await fs.writeFile(path.join(written,name),data);manifests.push({name,sourceName:sample.name,kind,time:document.time,window:document.window,pixelHashes:document.frames.map(frame=>createHash('sha256').update(frame.pixels).digest('hex'))});}
}
await fs.writeFile(path.join(written,'expected.json'),JSON.stringify({source:expected.source,zipSha256:expected.zipSha256,files:manifests},null,2));console.log('Wrote24 native exports for independent Python validation');
