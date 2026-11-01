import test from 'node:test';
import assert from 'node:assert/strict';
import {sanitizeCGStatistics} from '../src/engine/cg-statistics.js';
import {prepareCGStatisticalLayer,renderCGStatisticsPlot} from '../src/ui/cg-statistics-plot.js';
test('Broken graph connects histogram class centers and weighted frequencies',()=>{
  const data=sanitizeCGStatistics({lists:[[.2,.8,1.1,1.8,2.2],[1,2,1,3,1]]});
  const config={xList:0,freqList:1,histogramStart:0,histogramWidth:1,color:'#2563eb'};
  const broken=prepareCGStatisticalLayer(data,config,'Broken');assert.deepEqual(broken.points.map(p=>[p.x,p.y]),[[.5,3],[1.5,4],[2.5,1]]);
  const hist=prepareCGStatisticalLayer(data,config,'Hist');assert.deepEqual(hist.bars.map(p=>[p.x,p.y,p.width]),[[0,3,1],[1,4,1],[2,1,1]]);
});
test('bar graph has up to three equally sized data series without frequency multiplication',()=>{
  const data=sanitizeCGStatistics({lists:[[1,2,3],[4,5,6],[7,8,9],[100,100,100]]});
  const layer=prepareCGStatisticalLayer(data,{xList:0,freqList:3,barLists:[0,1,2],color:'#2563eb'},'Bar');assert.equal(layer.barSeries.length,3);assert.deepEqual(layer.bars.map(bar=>bar.y),[1,2,3,4,5,6,7,8,9]);
  assert.throws(()=>prepareCGStatisticalLayer({...data,lists:[[1,2,3],[4,5]]},{xList:0,barLists:[0,1]},'Bar'),/Dimension/);
});
test('bar and non-bar graph mixing is rejected per manual condition error',()=>{
  const saved=sanitizeCGStatistics({lists:[[1,2,3],[2,4,6]],graphs:[{enabled:true,type:'Bar',xList:0},{enabled:true,type:'Scatter',xList:0,yList:1}]});
  assert.throws(()=>renderCGStatisticsPlot({canvas:{width:384,height:216,getContext:()=>({})},readout:{},saved,options:{multiple:true}}),/Condition ERROR/);
});
test('MedBox uses stored quartile mode and optional outlier whiskers',()=>{
  const saved=sanitizeCGStatistics({lists:[[1,2,2,3,3,4,100]]});const layer=prepareCGStatisticalLayer(saved,{xList:0,outliers:true},'MedBox');assert.equal(layer.box.max,4);assert.deepEqual(layer.box.outliers,[100]);
  saved.lists[0]=[1,2,3,4];saved.quartile='OnData';assert.equal(prepareCGStatisticalLayer(saved,{xList:0},'MedBox').box.Q1,1);
});
test('bar dataset selection, graph colors and view configuration survive sanitization',()=>{
  const source={quartile:'OnData',autoWindow:false,graphWindow:{xmin:0,xmax:10,ymin:-5,ymax:15},graphs:[{enabled:true,type:'Bar',xList:2,barLists:[2,3,4],color:'#abcdef',barColors:['#abcdef','#112233','#445566'],marker:'square'},{enabled:true,type:'Bar',xList:5,color:'#dc2626'}]};
  const data=sanitizeCGStatistics(source);assert.deepEqual(data.graphs[0].barLists,[2,3,4]);assert.deepEqual(data.graphs[0].barColors,['#abcdef','#112233','#445566']);assert.equal(data.graphs[1].barColors[0],'#dc2626');assert.equal(data.graphs[0].marker,'square');assert.equal(data.quartile,'OnData');assert.equal(data.autoWindow,false);assert.deepEqual(data.graphWindow,source.graphWindow);data.graphs[0].barLists[0]=0;assert.equal(source.graphs[0].barLists[0],2);
});
