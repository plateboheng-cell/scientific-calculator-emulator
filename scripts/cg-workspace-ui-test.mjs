import {createServer} from 'vite';
import {_electron} from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=path.resolve('.'),evidence=path.join(root,'.verification');await fs.mkdir(evidence,{recursive:true});const profile=await fs.mkdtemp(path.join(evidence,'cg-workspace-ui-'));
const server=await createServer({root,configFile:false,cacheDir:path.join(evidence,'cg-workspace-vite-cache'),logLevel:'error',optimizeDeps:{noDiscovery:true,include:['mathjs']},server:{host:'127.0.0.1',port:0,strictPort:false,watch:{ignored:['**/.verification/**','**/release/**','**/dist/**']}}});await server.listen();
console.log('READY isolated workspace server');
const address=server.httpServer.address(),url='http://127.0.0.1:'+address.port+'/scripts/fixtures/cg-workspace-fixture.html';
let app;const passed=[],errors=[];
try{
  app=await _electron.launch({executablePath:path.join(root,'node_modules/electron/dist/electron.exe'),args:[path.join(root,'scripts/fixtures/cg-workspace-harness.cjs'),'--test-url='+url,'--user-data-dir='+profile]});
  const page=await app.firstWindow();page.on('pageerror',error=>errors.push(error.message));await page.waitForFunction(()=>window.fixtureReady);page.setDefaultTimeout(10000);console.log('READY isolated workspace window');
  const soft=n=>page.locator('[data-cg-soft="'+n+'"]').click(),show=mode=>page.evaluate(mode=>window.fixture.show(mode),mode);
  const goto=async address=>{await page.locator('[data-sheet-goto]').fill(address);await page.locator('[data-ws-action="goto"]').click();};
  const cell=async(address,value)=>{await goto(address);await page.locator('[data-sheet-editor]').fill(value);await page.evaluate(()=>window.fixture.action('execute'));};
  async function check(name,run){await run();passed.push(name);console.log('PASS '+name);}
  await check('CG sparse spreadsheet edits A1:Z999 and formulas recalculate through the actual panel',async()=>{
    await cell('A1','2');await cell('A2','3');await cell('B1','=Sum(A1:A2)');assert.equal(await page.evaluate(()=>window.fixture.cell('B1')),5);
    await cell('Z999','7');assert.equal(await page.evaluate(()=>window.fixture.cell('Z999')),7);
    await cell('A1','8');assert.equal(await page.evaluate(()=>window.fixture.cell('B1')),11);
  });
  await check('sheet copy uses a snapshot and range fill shifts relative references',async()=>{
    await goto('A1');await page.evaluate(()=>window.fixture.action('options'));await soft(2);await page.evaluate(()=>window.fixture.action('back'));await cell('A1','9');await goto('C1');await page.evaluate(()=>window.fixture.action('cg-paste'));assert.equal(await page.evaluate(()=>window.fixture.cell('C1')),8);
    await page.evaluate(()=>window.fixture.action('back'));await goto('B1');await page.evaluate(()=>window.fixture.action('options'));await soft(6);await soft(1);await page.locator('[name=range]').fill('B1:B3');await page.locator('[name=expression]').fill('=A1*2');await soft(6);assert.equal(await page.evaluate(()=>window.fixture.cell('B2')),6);
  });
  await check('spreadsheet formatting and conditional highlight are saved and restored',async()=>{
    await page.evaluate(()=>window.fixture.action('setup'));await page.locator('[name=decimals]').fill('2');await soft(6);await soft(6);await soft(5);await page.locator('[name=operator]').selectOption('>');await page.locator('[name=value]').fill('5');await soft(3);await page.locator('[data-sheet-menu]').filter({hasText:/^Area Color$/}).click();await page.locator('[data-sheet-menu]').filter({hasText:/^Yellow$/}).click();await page.evaluate(()=>window.fixture.action('back'));await soft(6);
    assert.equal(await page.evaluate(()=>window.fixture.snapshot().spreadsheet.settings.decimals),2);await goto('A1');assert.match(await page.locator('[data-sheet-cell=A1]').textContent(),/9\.00/);assert.ok(await page.locator('td.conditional').count());
    const saved=await page.evaluate(()=>window.fixture.snapshot());await page.evaluate(saved=>window.fixture.show('spreadsheet',saved),saved);assert.equal(await page.evaluate(()=>window.fixture.cell('Z999')),7);
  });
  await check('spreadsheet text cells, lazy CellIf and physical quote entry stay text after reload',async()=>{
    await cell('A5','"X A1"');await cell('B5','=CellIf(Len(A5)=4,Left(A5,1),"No")');assert.equal(await page.evaluate(()=>window.fixture.cell('B5')),'X');
    await goto('A5');assert.equal(await page.locator('[data-sheet-cell=A5]').textContent(),'X A1');assert.ok(await page.locator('[data-sheet-cell=A5]').evaluate(button=>button.parentElement.classList.contains('text-cell')));
    await goto('A7');await page.locator('[data-sheet-editor]').focus();await page.evaluate(()=>{window.fixture.action('cg-strings');window.fixture.action('X');window.fixture.action('cg-strings');window.fixture.action('execute');});assert.equal(await page.evaluate(()=>window.fixture.cell('A7')),'X');
    const saved=await page.evaluate(()=>window.fixture.snapshot());await page.evaluate(saved=>window.fixture.show('spreadsheet',saved),saved);assert.equal(await page.evaluate(()=>window.fixture.cell('A5')),'X A1');
  });
  await check('shared graph table changes graph functions, reports singularities and draws',async()=>{
    await show('table');await page.locator('[name=f]').fill('x^2');await page.locator('[name=g]').fill('1/x');await page.locator('[name=start]').fill('-1');await page.locator('[name=end]').fill('1');await page.locator('[name=step]').fill('1');await soft(1);
    assert.match(await page.locator('.cg-workspace-body').innerText(),/ERROR/);assert.equal(await page.evaluate(()=>window.fixture.graph().expressions[0]),'x^2');await soft(2);assert.equal(await page.locator('canvas').count(),1);
  });
  await check('Table plot owns numeric, delete, EXE and arrow keys and traces finite samples',async()=>{
    assert.equal(await page.locator('[data-cg-soft="3"]').textContent(),'TRACE');assert.equal(await page.evaluate(()=>window.fixture.key({key:'1'})),true);assert.match(await page.locator('.cg-readout').textContent(),/x\? 1/);
    assert.equal(await page.evaluate(()=>window.fixture.key({key:'Enter'})),true);assert.match(await page.locator('.cg-readout').textContent(),/x=1 y=1/);assert.equal(await page.evaluate(()=>window.fixture.key({key:'ArrowLeft'})),true);assert.match(await page.locator('.cg-readout').textContent(),/x=0 y=0/);
    assert.equal(await page.evaluate(()=>window.fixture.action('up')),true);assert.match(await page.locator('.cg-readout').textContent(),/x=-1 y=-1/);assert.equal(await page.evaluate(()=>window.fixture.action('sin(')),true);assert.match(await page.locator('.cg-workspace-error').textContent(),/numeric graph coordinate/);
    await page.evaluate(()=>{window.fixture.action('clear');window.fixture.action('1');window.fixture.action('2');window.fixture.key({key:'Backspace'});});assert.match(await page.locator('.cg-readout').textContent(),/x\? 1/);assert.equal(await page.evaluate(()=>window.fixture.action('menu')),false);assert.equal(await page.locator('canvas').count(),1);await page.evaluate(()=>window.fixture.action('clear'));
  });
  await check('table reads paired parametric, polar and X= graph relations with correct argument labels',async()=>{
    await page.evaluate(()=>window.fixture.setGraph({expressions:['T','',''],expressions2:['T^2'],types:['parametric'],enabled:[true,false,false]}));await show('table');assert.equal(await page.locator('[name=f]').getAttribute('aria-label'),'X1(T)=');assert.equal(await page.locator('[name=g]').inputValue(),'T^2');await page.locator('[name=start]').fill('1');await page.locator('[name=end]').fill('2');await page.locator('[name=step]').fill('1');await soft(1);
    assert.deepEqual(await page.locator('tbody tr').evaluateAll(rows=>rows.map(row=>[...row.querySelectorAll('td')].map(cell=>Number(cell.textContent)))),[[1,1,1],[2,2,4]]);assert.deepEqual(await page.evaluate(()=>window.fixture.snapshot().tableColumns),['X1(T)','Y1(T)']);await soft(2);assert.equal(await page.locator('canvas').count(),1);
    await page.evaluate(()=>window.fixture.setGraph({expressions:['θ+theta','y^2'],expressions2:[],types:['polar','x'],enabled:[true,true]}));await show('table');await page.locator('[name=start]').fill('1');await page.locator('[name=end]').fill('2');await soft(1);assert.deepEqual(await page.locator('tbody tr').evaluateAll(rows=>rows.map(row=>[...row.querySelectorAll('td')].map(cell=>Number(cell.textContent)))),[[1,2,1],[2,4,4]]);await soft(2);assert.equal(await page.locator('canvas').count(),1);
    await page.evaluate(()=>window.fixture.setGraph({expressions:['x^2',''],expressions2:[],types:['y','y'],enabled:[true,true]}));
  });
  await check('second-order recursion produces Fibonacci values and a recursion plot',async()=>{
    await show('recursion');await soft(4);await soft(1);assert.match(await page.locator('.cg-workspace-body').innerText(),/144/);await page.evaluate(()=>window.fixture.action('down'));assert.ok(await page.locator('.cg-workspace-body').evaluate(body=>body.scrollTop)>0);await soft(2);assert.equal(await page.locator('canvas').count(),1);assert.equal(await page.locator('.cg-workspace-error').textContent(),'');
  });
  await check('recursion editor supports all three coupled a/b/c formulas and c initial terms',async()=>{
    await show('recursion');await page.locator('[name=type]').selectOption('first');for(const [name,value]of Object.entries({a:'b',b:'c',c:'a',a0:'1',b0:'2',c0:'3',start:'0',end:'2',step:'1'}))await page.locator('[name='+name+']').fill(value);await soft(1);
    const values=await page.locator('tbody tr').evaluateAll(rows=>rows.map(row=>[...row.querySelectorAll('td')].map(cell=>Number(cell.textContent))));assert.deepEqual(values,[[0,1,2,3],[1,2,3,1],[2,3,1,2]]);assert.equal(await page.evaluate(()=>window.fixture.snapshot().recursion.c),'a');await soft(2);assert.equal(await page.locator('canvas').count(),1);
  });
  await check('Recursion plot numeric jump and series arrows stay inside the graph',async()=>{
    assert.equal(await page.evaluate(()=>window.fixture.action('2')),true);assert.equal(await page.evaluate(()=>window.fixture.action('execute')),true);assert.match(await page.locator('.cg-readout').textContent(),/a\(n\) n=2 x=2 y=3/);assert.equal(await page.evaluate(()=>window.fixture.key({key:'ArrowDown'})),true);assert.match(await page.locator('.cg-readout').textContent(),/b\(n\) n=2 x=2 y=1/);assert.equal(await page.locator('canvas').count(),1);
  });
  await check('dynamic graph advances by hardware actions, plays and stops its timer',async()=>{
    await show('dynamic');await soft(4);await soft(1);assert.match(await page.locator('.cg-readout').textContent(),/A = -2/);await page.evaluate(()=>window.fixture.action('cg-f3'));assert.match(await page.locator('.cg-readout').textContent(),/A = -1/);
    await soft(1);assert.equal(await page.locator('[data-cg-soft="1"]').textContent(),'STOP');await page.waitForTimeout(320);await soft(1);assert.equal(await page.locator('[data-cg-soft="1"]').textContent(),'PLAY');assert.ok(await page.evaluate(()=>window.fixture.snapshot().dynamicFrame)>0);
  });
  await check('Dynamic plot routes numeric parameter jumps and all four arrows without falling through',async()=>{
    assert.equal(await page.evaluate(()=>window.fixture.key({key:'1'})),true);assert.equal(await page.evaluate(()=>window.fixture.key({key:'Enter'})),true);assert.match(await page.locator('.cg-readout').textContent(),/A = 1/);assert.equal(await page.evaluate(()=>window.fixture.key({key:'ArrowUp'})),true);assert.match(await page.locator('.cg-readout').textContent(),/A = 0/);assert.equal(await page.evaluate(()=>window.fixture.action('down')),true);assert.match(await page.locator('.cg-readout').textContent(),/A = 1/);assert.equal(await page.evaluate(()=>window.fixture.key({key:'ArrowLeft'})),true);assert.match(await page.locator('.cg-readout').textContent(),/A = 0/);assert.equal(await page.evaluate(()=>window.fixture.key({key:'ArrowRight'})),true);assert.match(await page.locator('.cg-readout').textContent(),/A = 1/);assert.equal(await page.locator('[data-cg-soft="1"]').textContent(),'PLAY');assert.equal(await page.locator('canvas').count(),1);
  });
  await check('conic panel plots ellipse and provides vertices and foci',async()=>{
    await show('conic');await soft(4);await soft(2);assert.equal(await page.locator('canvas').count(),1);assert.equal(await page.evaluate(()=>window.fixture.snapshot().conicInfo.vertices[0].x),4);await soft(3);assert.match(await page.locator('pre').textContent(),/foci/);
  });
  await check('eActivity saves named text, formula and graph strips and reloads the document',async()=>{
    await show('eactivity');await soft(2);await page.locator('[data-activity-line="0"]').fill('My calculation');await page.locator('[data-activity-line="1"]').fill('2+3');await soft(1);assert.equal(await page.locator('[data-line="1"] output').textContent(),'5');
    await soft(3);await soft(3);await page.locator('[data-activity-line="2"]').fill('x^2');await soft(1);assert.equal(await page.locator('[data-line="2"] canvas').count(),1);
    await soft(4);await page.locator('[name=name]').fill('Lesson');await soft(1);const saved=await page.evaluate(()=>window.fixture.snapshot());await page.evaluate(saved=>window.fixture.show('eactivity',saved),saved);assert.equal(await page.locator('[data-activity-select] option:checked').textContent(),'Lesson');assert.equal(await page.locator('[data-activity-line="0"]').inputValue(),'My calculation');
  });
  await check('physical calculator text and delete actions edit the selected field without leaving app',async()=>{
    await show('table');await page.locator('[name=f]').fill('');await page.locator('[name=f]').focus();await page.evaluate(()=>{window.fixture.action('x');window.fixture.action('^2');window.fixture.action('+');window.fixture.action('1');});assert.equal(await page.locator('[name=f]').inputValue(),'x^2+1');await page.evaluate(()=>window.fixture.action('delete'));assert.equal(await page.locator('[name=f]').inputValue(),'x^2+');
  });
  await check('physical UNDO/INS operate on drafts and committed cells, and action names are not typed',async()=>{
    await page.evaluate(()=>window.fixture.action('undo'));assert.equal(await page.locator('[name=f]').inputValue(),'x^2+1');await page.evaluate(()=>window.fixture.action('redo'));assert.equal(await page.locator('[name=f]').inputValue(),'x^2+');
    await page.locator('[name=f]').fill('123');await page.locator('[name=f]').evaluate(field=>field.setSelectionRange(1,1));await page.evaluate(()=>{window.fixture.action('insert');window.fixture.action('9');});assert.equal(await page.locator('[name=f]').inputValue(),'193');await page.evaluate(()=>window.fixture.action('undo'));assert.equal(await page.locator('[name=f]').inputValue(),'123');await page.evaluate(()=>{window.fixture.action('insert');window.fixture.action('9');});assert.equal(await page.locator('[name=f]').inputValue(),'1923');
    assert.equal(await page.evaluate(()=>window.fixture.action('cg-catalog')),false);assert.equal(await page.locator('[name=f]').inputValue(),'1923');
    await show('spreadsheet');await cell('A9','42');await page.evaluate(()=>window.fixture.action('undo'));assert.equal(await page.evaluate(()=>window.fixture.snapshot().spreadsheet.cells.A9),undefined);await page.evaluate(()=>window.fixture.action('redo'));assert.equal(await page.evaluate(()=>window.fixture.cell('A9')),42);
  });
  await check('CG component fits a 320px by 177px LCD with reachable softkeys and no renderer errors',async()=>{
    const geometry=await page.locator('.cg-workspace').evaluate(root=>({width:root.clientWidth,scroll:root.scrollWidth,soft:root.querySelector('.cg-workspace-softkeys').getBoundingClientRect().toJSON(),rect:root.getBoundingClientRect().toJSON()}));assert.ok(geometry.scroll<=geometry.width+1);assert.ok(geometry.soft.bottom<=geometry.rect.bottom+1);assert.deepEqual(errors,[]);await page.screenshot({path:path.join(evidence,'cg-workspace-ui.png')});
  });
}finally{
  await fs.writeFile(path.join(evidence,'cg-workspace-ui-results.json'),JSON.stringify({date:new Date().toISOString(),scope:'isolated component in real Electron, not main-menu integration',passed,errors},null,2));if(app)await app.close();await server.close();
}
