import test from 'node:test';
import assert from 'node:assert/strict';
import {encodeProgramPicture,decodeProgramPicture,sanitizeProgramPictureBanks,storeProgramPicture} from '../src/engine/cg-program-pictures.js';
test('lossless compact picture storage round-trips pixel RGBA and long runs',()=>{
  const image={width:384,height:216,data:new Uint8ClampedArray(384*216*4).fill(255)};image.data.set([25,50,75,128],400);const encoded=encodeProgramPicture(image);assert.ok(encoded.data.length<100);const decoded=decodeProgramPicture(JSON.parse(JSON.stringify(encoded)));assert.deepEqual(decoded.data,image.data);assert.equal(decoded.width,image.width);assert.equal(decoded.height,image.height);
});
test('picture banks survive JSON sessions and reject malformed data and slot numbers',()=>{
  const image=encodeProgramPicture({width:1,height:1,data:Uint8ClampedArray.from([1,2,3,255])}),banks=sanitizeProgramPictureBanks();storeProgramPicture(banks,'pict',20,image);storeProgramPicture(banks,'capture',1,image);const restored=sanitizeProgramPictureBanks(JSON.parse(JSON.stringify(banks)));assert.deepEqual(decodeProgramPicture(restored.pict[20]).data,Uint8ClampedArray.from([1,2,3,255]));assert.deepEqual(restored.capture[1],image);
  for(const slot of [0,21,1.5])assert.throws(()=>storeProgramPicture(banks,'pict',slot,image));for(const value of [{...image,data:'AAAA'},{...image,width:1000},{...image,data:'<script>'},{...image,data:''}])assert.throws(()=>decodeProgramPicture(value));
});
