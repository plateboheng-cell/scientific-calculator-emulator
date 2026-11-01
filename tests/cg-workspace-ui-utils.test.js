import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCGCSV,encodeCGCSV,drawCGPlot} from '../src/ui/cg-ui.js';

test('CG CSV round trip preserves delimiters, quotes, newlines and empty numeric cells',()=>{
  const rows=[['1','2',''],['a,b','"quoted"','two\nlines'],['x\ry','normal','5']];
  assert.deepEqual(parseCGCSV(encodeCGCSV(rows)),rows);
  assert.deepEqual(parseCGCSV('1,2\r\n3,4\r\n'),[['1','2'],['3','4']]);
});
test('CG CSV rejects unterminated quotes and limits imported text size',()=>{
  assert.throws(()=>parseCGCSV('"unclosed'),/quote/);assert.throws(()=>parseCGCSV('x'.repeat(1000001)),/large/);
});
test('workspace graph window handles constant series, holes and all-invalid samples',()=>{
  const numbers=[],ctx={fillRect(){},save(){},beginPath(){},rect(){},clip(){},stroke(){},restore(){},moveTo(x,y){numbers.push(x,y);},lineTo(x,y){numbers.push(x,y);},arc(x,y,r){numbers.push(x,y,r);}};
  const canvas={width:384,height:216,getContext:()=>ctx};
  const win=drawCGPlot(canvas,[[{x:2,y:5},null,{x:2,y:5}]]);assert.ok(win.xmin<2&&win.xmax>2&&win.ymin<5&&win.ymax>5);assert.ok(numbers.every(Number.isFinite));
  const empty=drawCGPlot(canvas,[[null,{x:Infinity,y:NaN}]]);assert.deepEqual(empty,{xmin:-10,xmax:10,ymin:-11.6,ymax:11.6});
  assert.throws(()=>drawCGPlot(canvas,[],{xmin:0,xmax:0,ymin:-1,ymax:1}),/window/);
});
