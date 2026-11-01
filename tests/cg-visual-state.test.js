import test from 'node:test';
import assert from 'node:assert/strict';
import {sanitizeCGVisualState} from '../src/engine/cg-visual-state.js';
test('visual state ignores broken point/object references and preserves usable geometry',()=>{
  const state=sanitizeCGVisualState({points:[null,{id:'P1',x:0,y:0},{id:'P2',x:1,y:1},{id:'P1',x:8,y:8},{id:'bad',x:NaN,y:1}],objects:[{id:'G3',kind:'line',a:'P1',b:'P2'},{id:'G4',kind:'circle',center:'P1',edge:'missing'}],window:{xmin:1,xmax:0,ymin:NaN,ymax:1},sequence:1e99});
  assert.equal(state.points.length,2);assert.equal(state.objects.length,1);assert.equal(state.sequence,3);assert.deepEqual(state.window,{xmin:-10,xmax:10,ymin:-6,ymax:6});
});
test('Picture Plot accepts only bounded raster data URLs and finite calibration values',()=>{
  for(const url of ['https://example.com/private.png','file:///C:/x.png','data:image/svg+xml;base64,PHN2Zz4=','data:image/png;base64,'+'A'.repeat(1300000)])assert.equal(sanitizeCGVisualState({imageUrl:url},'pictureplot').imageUrl,'');
  const good=sanitizeCGVisualState({imageUrl:'data:image/png;base64,AAAA',points:[{u:1,v:2},{u:NaN,v:0}],xUnit:0,origin:{u:0,v:0}},'pictureplot');assert.equal(good.imageUrl,'data:image/png;base64,AAAA');assert.equal(good.points.length,1);assert.equal(good.xUnit,1);assert.deepEqual(good.origin,{u:0,v:0});
});
test('3D legacy camera migrates into bounded native grids, degree angles and zoom',()=>{
  const state=sanitizeCGVisualState({type:'surface',expression:'x^2-y^2',range:{xmin:1,xmax:0,steps:10000},camera:{yaw:Infinity,pitch:10,zoom:100}},'graph3d');
  assert.equal(state.schema,2);assert.equal(state.graphs.length,3);assert.equal(state.graphs[0].type,'surface');assert.equal(state.window.xgrid,25);assert.equal(state.window.ygrid,25);assert.equal(state.window.xmin,-3);assert.equal(state.window.xmax,3);assert.equal(state.zoom,8);
  assert.ok(Math.abs(state.window.theta-.6*180/Math.PI)<1e-8);assert.ok(Math.abs(state.window.phi-(90-1.5*180/Math.PI))<1e-8);assert.ok(state.window.theta>-180&&state.window.theta<=180);assert.ok(state.window.phi>=0&&state.window.phi<360);
  assert.equal(sanitizeCGVisualState({},'graph3d').graphs.filter(Boolean).length,0);
  for(const mode of ['geometry','pictureplot','graph3d'])assert.doesNotThrow(()=>sanitizeCGVisualState(null,mode));
});
