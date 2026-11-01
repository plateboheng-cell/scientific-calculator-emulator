import test from 'node:test';
import assert from 'node:assert/strict';
import {ModelCalculator} from '../src/engine/model-calculator.js';
import {runCGProgram} from '../src/engine/cg-program.js';
import {renderCGProgramGraphics,disposeCGProgramGraphics} from '../src/ui/cg-program-canvas.js';
function canvasDocument(){const canvases=[];return {canvases,createElement(tag){assert.equal(tag,'canvas');const trace={lines:[],moves:[],rects:[],texts:[],images:[],strokes:0};const ctx={beginPath(){},closePath(){},save(){},restore(){},rect(){},clip(){},arc(){},ellipse(){},fill(){},setLineDash(){},strokeRect:(...p)=>trace.rects.push(p),moveTo:(...p)=>trace.moves.push(p),lineTo:(...p)=>trace.lines.push(p),stroke(){trace.strokes++;},fillRect:(...p)=>trace.rects.push(p),fillText:(...p)=>trace.texts.push(p),drawImage:(...p)=>trace.images.push(p),getImageData:(x,y,width,height)=>({width,height,data:new Uint8ClampedArray(width*height*4).fill(255)}),createImageData:(width,height)=>({width,height,data:new Uint8ClampedArray(width*height*4)}),putImageData:(...p)=>trace.images.push(p)};const canvas={width:0,height:0,dataset:{},setAttribute(){},getContext:()=>ctx,trace};canvases.push(canvas);return canvas;}};}
test('BASIC graph commands draw actual coordinate lines, pixels and text onto a canvas',()=>{
  const calc=new ModelCalculator('cg50'),result=runCGProgram(calc,'ViewWindow -10,10,1,-10,10,1:ClrGraph:F-Line -10,-10,10,10:PlotOn 1,2:Text 10,20,"hello"'),document=canvasDocument();
  const canvas=renderCGProgramGraphics(calc,result.commands,{document});assert.ok(canvas);assert.equal(canvas.dataset.commands,'5');
  assert.ok(canvas.trace.lines.some(([x,y])=>x===384&&y===0));assert.ok(canvas.trace.rects.some(([x,y,w,h])=>x===210&&y===85&&w===3&&h===3));assert.deepEqual(canvas.trace.texts.at(-1),['hello',20,20]);
});
test('each Graph instruction captures its numeric variables and sampling keeps calculator state intact',()=>{
  const calc=new ModelCalculator('cg50'),before=calc.save(),result=runCGProgram(calc,'For 1→A To 2:Graph Y=A*x:Next'),document=canvasDocument();
  assert.deepEqual(result.commands.map(c=>c.variables.A),[1,2]);const canvas=renderCGProgramGraphics(calc,result.commands,{document});assert.ok(canvas.trace.lines.length>100);assert.ok(canvas.trace.lines.flat().every(Number.isFinite));assert.deepEqual(calc.save(),before);
});
test('saved graph memories, tangent/normal/inverse and capture recall are rendered',()=>{
  const calc=new ModelCalculator('cg50'),result=runCGProgram(calc,'DrawGraph:Tangent Y1,1:Normal Y1,1:Inverse Y1:StoCapt 1:ClrGraph:RclCapt 1'),document=canvasDocument();
  const canvas=renderCGProgramGraphics(calc,result.commands,{document,graph:{expressions:['x^2'],enabled:[true]}});assert.ok(canvas.trace.images.length);assert.equal(canvas.trace.images.at(-1)[0],document.canvases[1]);
});
test('program graphics update incrementally while preserving the same display surface',()=>{
  const calc=new ModelCalculator('cg50'),result=runCGProgram(calc,'PlotOn 1,2:PlotOn 3,4'),document=canvasDocument(),session={};
  const first=renderCGProgramGraphics(calc,result.commands.slice(0,1),{document,session}),before=first.trace.rects.length;
  const second=renderCGProgramGraphics(calc,result.commands,{document,session});assert.equal(first,second);assert.equal(second.trace.rects.length,before+1);assert.equal(document.canvases.length,1);
});
test('Locate uses the native 21 by 7 text grid and ClrText erases it',()=>{
  const calc=new ModelCalculator('cg50'),result=runCGProgram(calc,'Locate 3,2,"ABC":Locate 4,2,"x"');assert.equal(result.textScreen[1],'  AxC');assert.equal(runCGProgram(calc,'Locate 1,1,"x":ClrText').textScreen.some(Boolean),false);
  assert.throws(()=>runCGProgram(calc,'Locate 22,1,"x"'));
});
test('Recursion line/point/phase/web and Table plot commands produce real plotted coordinates',()=>{
  const calc=new ModelCalculator('cg50'),document=canvasDocument(),workspace={recursion:{type:'first',a:'a+1',b:'b+2',a0:1,b0:2,start:0,end:5,step:1},table:{start:-2,end:2,step:1}},graph={expressions:['x^2'],enabled:[true]};
  for(const source of ['DrawR-Con','DrawR-Plt','DrawR-Phase','DrawWeb','DrawFTG-Con','DrawFTG-Plt']){
    const result=runCGProgram(calc,source),canvas=renderCGProgramGraphics(calc,result.commands,{document,workspace,graph});assert.ok(canvas,source);assert.ok(canvas.trace.lines.length>2||canvas.trace.rects.length>2,source);
  }
  assert.throws(()=>renderCGProgramGraphics(calc,runCGProgram(calc,'DrawR-Con').commands,{document}),/Recursion/);
});
test('DrawDyna uses saved range and advances actual frames, with explicit timer disposal',()=>{
  const calc=new ModelCalculator('cg50'),document=canvasDocument(),session={},ticks=[],cleared=[],workspace={dynamic:{expression:'A*x',parameter:'A',start:-1,end:1,step:1,xmin:-2,xmax:2,interval:30}};
  const canvas=renderCGProgramGraphics(calc,runCGProgram(calc,'DrawDyna').commands,{document,workspace,session,setTimer:fn=>{ticks.push(fn);return 17;},clearTimer:id=>cleared.push(id)});
  assert.equal(canvas.dataset.dynamicValue,'-1');ticks[0]();assert.equal(canvas.dataset.dynamicValue,'0');ticks[0]();assert.equal(canvas.dataset.dynamicValue,'1');disposeCGProgramGraphics(session);assert.deepEqual(cleared,[17]);
  assert.throws(()=>renderCGProgramGraphics(calc,runCGProgram(calc,'DrawDyna').commands,{document}),/Dynamic Graph/);
});
test('Pict and capture registers survive new renderer sessions as serializable image memory',()=>{
  const calc=new ModelCalculator('cg50'),document=canvasDocument(),workspace={};
  renderCGProgramGraphics(calc,runCGProgram(calc,'Graph Y=x:StoPict 3:StoCapt 4').commands,{document,workspace});const persisted=JSON.parse(JSON.stringify(workspace));
  assert.equal(persisted.programImageBanks.pict[3].codec,'rgba-rle-v1');assert.equal(persisted.programImageBanks.capture[4].width,384);
  const canvas=renderCGProgramGraphics(calc,runCGProgram(calc,'RclPict 3:RclCapt 4').commands,{document,workspace:persisted});assert.equal(canvas.trace.images.length,2);
});
test('DrawStat uses configured S-Gph list/type choices rather than hardcoded scatter',()=>{
  const calc=new ModelCalculator('cg50'),document=canvasDocument(),lists=Array.from({length:26},()=>[]);lists[2]=[1,2,2,4,8];
  const canvas=renderCGProgramGraphics(calc,runCGProgram(calc,'DrawStat',{lists}).commands,{document,lists,workspace:{statistics:{xList:2,graphType:'Hist',graphs:[{enabled:true,type:'Hist',xList:2},{enabled:false},{enabled:false}]}}});
  assert.equal(canvas.dataset.statTypes,'Hist');assert.equal(canvas.dataset.statLayers,'1');assert.ok(canvas.trace.rects.length>1);
});

test('drawing snapshots apply V-WIN arrows in command order and graph formulas read that same window',()=>{
  const calc=new ModelCalculator('cg50'),result=runCGProgram(calc,'ViewWindow -2,2,1,-4,4,1:PlotOn 0,0:-1→Xmin:PlotOn 0,0:Graph Y=Xmin'),document=canvasDocument(),session={};
  const canvas=renderCGProgramGraphics(calc,result.commands,{document,session});assert.ok(canvas.trace.rects.some(([x,y,w,h])=>x===191&&y===107&&w===3&&h===3));assert.ok(canvas.trace.rects.some(([x,y,w,h])=>x===127&&y===107&&w===3&&h===3));assert.equal(session.window.xmin,-1);assert.ok(canvas.trace.lines.some(([,y])=>Math.abs(y-135)<1e-8));
});
