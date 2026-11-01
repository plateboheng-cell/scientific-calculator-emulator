import {_electron} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {resizeCalculatorWindow} from './electron-layout.mjs';
const evidence=path.resolve('.verification'),profile=await fs.mkdtemp(path.join(evidence,'ex-ui-profile-'));
const total=(await fs.readFile(new URL(import.meta.url),'utf8')).match(/await check\(/g).length;
const app=await _electron.launch({executablePath:process.env.CNX_ELECTRON_PATH||undefined,args:[process.env.CNX_APP_PATH||'.','--user-data-dir='+profile],env:{...process.env,CNX_TEST:'1',CNX_TEST_SYSTEM_LANGUAGES:'["en-US"]'}});
const page=await app.firstWindow(),passed=[],failed=[],errors=[],network=[];page.setDefaultTimeout(12000);
page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:|^wss?:/.test(r.url()))network.push(r.url());});
const application=await app.evaluate(({app})=>({version:app.getVersion(),packaged:app.isPackaged}));
const key=action=>page.locator('[data-action="'+action+'"]').first();
const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('cnx-v2')));
const ex=async()=>(await saved()).profiles.ex;
const near=(a,b)=>assert.ok(Number.isFinite(a)&&Math.abs(a-b)<1e-8*Math.max(1,Math.abs(b)),`${a} != ${b}`);
async function ready(){await page.waitForFunction(()=>{const el=document.querySelector('#entry');return el&&document.activeElement===el&&(el.tagName!=='MATH-FIELD'||el.hasFocus());});}
async function mode(shortcut){await key('menu').click();await page.keyboard.press(shortcut);}
async function fresh(){await mode('1');await ready();}
async function latex(value){await page.locator('#entry').evaluate((el,value)=>{el.value=value;el.position=el.lastOffset;el.dispatchEvent(new Event('input',{bubbles:true}));},value);await page.locator('#entry').focus();}
async function option(index){await page.locator('.list-item').nth(index).click();}
async function parameters(values){for(const [name,value]of Object.entries(values)){await page.locator('[data-name="'+name+'"]').evaluate((el,value)=>{el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));},String(value));}await page.locator('.run-button').click();}
async function cell(address,value){await page.locator('[data-cell="'+address+'"]').click();await page.locator('#sheet-entry').fill(value);await page.keyboard.press('Enter');}
async function resultNumbers(){return page.locator('.result-row').evaluateAll(rows=>Object.fromEntries(rows.map(row=>[row.firstElementChild.textContent,row.lastElementChild.querySelector('annotation')?.textContent||row.lastElementChild.textContent])));}
async function check(name,run){try{await run();passed.push(name);console.log('PASS '+name);}catch(e){failed.push({name,error:e.message});console.error('FAIL '+name+' '+e.message);await page.screenshot({path:path.join(evidence,'ex-ui-failure-'+failed.length+'.png')}).catch(()=>{});}}
try{
  await page.locator('#model-picker[open]').waitFor();
  await check('EX is selectable as Experimental with its own model preview and English legends',async()=>{
    const card=page.locator('[data-model-choice=ex]');assert.equal(await card.isDisabled(),false);assert.match(await card.locator('.model-status').innerText(),/Experimental/);assert.equal(await card.locator('svg').count(),1);await card.click();await ready();assert.equal(await page.locator('.model').innerText(),'fx-991EX');assert.equal(await page.locator('.physical-classwiz .key,.physical-classwiz .nav button').count(),50);assert.equal(await key('constants').count(),0);assert.equal(await key('7').getAttribute('data-shift'),'constants');assert.match(await page.locator('.classwiz-digits').innerText(),/CONST/);assert.match(await page.locator('.classwiz-science').innerText(),/RECALL/);await page.screenshot({path:path.join(evidence,'ex-calculator.png')});
  });
  await check('EX arithmetic and captured fraction entry preserve the correct numerical answer',async()=>{
    await fresh();await page.keyboard.type('2+3*4');await key('execute').click();near((await ex()).calculator.vars.Ans,14);await fresh();await page.keyboard.type('7');await key('frac').click();await page.keyboard.type('3');await key('execute').click();near((await ex()).calculator.vars.Ans,7/3);await key('shift').click();await key('sd').click();assert.equal(await page.locator('#answer annotation').textContent(),String.raw`2\frac{1}{3}`);await page.screenshot({path:path.join(evidence,'ex-calculator.png')});
  });
  await check('EX menu scroll shows original 5–8 and 9/A/B/C rather than a renamed X menu',async()=>{
    await mode('1');await key('menu').click();assert.equal(await page.locator('.mode-tile').count(),12);assert.deepEqual(await page.locator('.mode-tile:visible .classwiz-menu-number').allTextContents(),['1','2','3','4','5','6','7','8']);await key('down').click();await key('down').click();assert.deepEqual(await page.locator('.mode-tile:visible .classwiz-menu-number').allTextContents(),['5','6','7','8','9','A','B','C']);await key('right').click();assert.equal(await page.locator('[data-classwiz-shortcut]').textContent(),'A:');await page.screenshot({path:path.join(evidence,'ex-menu.png')});
  });
  await check('EX physical numeric and A/B/C keys select native main-menu applications',async()=>{
    await key('menu').click();await key('8').click();assert.equal((await ex()).mode,'spreadsheet');assert.equal(await page.locator('#sheet-entry').count(),1);
    for(const [action,expected]of [['-','equation'],['dms','inequality'],['^(-1)','ratio']]){await key('menu').click();await page.locator('.classwiz-science [data-action="'+action+'"]').click();assert.equal((await ex()).mode,expected);}
  });
  await check('EX ALPHA CALC equality and Newton SOLVE operate in Calculate',async()=>{
    await fresh();await page.keyboard.type('x^2');await page.keyboard.press('ArrowRight');await key('alpha').click();await key('calc').click();await page.keyboard.type('2');await key('shift').click();await key('calc').click();assert.match(await page.locator('.solve-equation annotation').textContent(),/=/);await page.locator('[data-solve-variable=x]').fill('1');await page.keyboard.press('Enter');near((await ex()).calculator.vars.x,Math.sqrt(2));assert.equal((await ex()).mode,'calc');assert.match(await page.locator('#screen').innerText(),/L−R/);
  });
  await check('EX manual SOLVE example keeps B fixed while selecting x as unknown',async()=>{
    await fresh();await latex('x^2+B=0');await key('shift').click();await key('calc').click();await page.locator('[data-solve-variable=x]').fill('1');await page.keyboard.press('Enter');await page.locator('[data-solve-variable=B]').fill('-2');await page.keyboard.press('Enter');await page.keyboard.press('ArrowUp');await page.keyboard.press('Enter');near((await ex()).calculator.vars.x,Math.sqrt(2));assert.equal((await ex()).calculator.vars.B,-2);assert.equal(Object.hasOwn((await ex()).calculator.vars,'z'),false);
  });
  await check('EX Complex app calculates real and imaginary components',async()=>{
    await mode('2');await ready();await page.keyboard.type('(1+2i)*(3-4i)');await key('execute').click();assert.match(await page.locator('#answer').innerText(),/11.*2/s);assert.equal(await page.locator('#answer .katex-error').count(),0);
  });
  await check('EX blue DEC/HEX/BIN/OCT keys switch Base-N without inserting powers',async()=>{
    await mode('3');await ready();await key('^').click();assert.equal(await page.locator('#format-ind').textContent(),'HEX');
    for(const [letter,expected]of [['A','B'],['B','C'],['C','D'],['D','E'],['E','F'],['F','10']]){await key('clear').click();await page.locator('.classwiz-science [data-alpha="'+letter+'"]').click();await key('+').click();await key('1').click();await key('execute').click();assert.equal((await page.locator('#answer').innerText()).trim(),expected);}
    assert.equal((await ex()).base,16);await key('clear').click();await key('log(').click();await page.keyboard.type('10+1');await key('execute').click();assert.match(await page.locator('#answer').innerText(),/11/);assert.equal((await ex()).base,2);await key('ln(').click();assert.equal((await ex()).base,8);await key('^2').click();assert.equal((await ex()).base,10);
  });
  await check('EX Base-N supports operator continuation and physical Ans for signed answers',async()=>{
    await mode('3');await ready();await key('^2').click();await page.keyboard.type('1+1');await key('execute').click();await key('+').click();await key('1').click();await key('execute').click();near((await ex()).calculator.vars.Ans,3);await key('clear').click();await key('Ans').click();await page.keyboard.type('+1');await key('execute').click();near((await ex()).calculator.vars.Ans,4);await key('clear').click();await page.keyboard.type('0-1');await key('execute').click();await key('+').click();await key('1').click();await key('execute').click();near((await ex()).calculator.vars.Ans,0);
  });
  await check('EX Matrix app evaluates the manual determinant through the stored matrix',async()=>{
    await mode('4');for(const index of [0,0,1,1])await option(index);await parameters({c0_0:2,c0_1:1,c1_0:1,c1_1:1});await key('clear').click();await key('options').click();await option(6);await page.keyboard.type('A');await key('execute').click();near((await ex()).calculator.vars.Ans,1);assert.deepEqual((await ex()).matrices.MatA,[[2,1],[1,1]]);
  });
  await check('EX Vector app uses two independent data objects and adds their components',async()=>{
    for(const [index,values]of [[0,{c0:1,c1:2}],[1,{c0:3,c1:4}]]){await mode('5');await option(0);await option(index);await option(0);await parameters(values);}
    await latex(String.raw`\vec{A}+\vec{B}`);await key('execute').click();assert.match(await page.locator('#answer').innerText(),/4.*6/s);assert.deepEqual((await ex()).vectors.VctA,[1,2]);assert.deepEqual((await ex()).vectors.VctB,[3,4]);
  });
  await check('EX statistics compute real data and are cleared when leaving the app',async()=>{
    await mode('6');await option(0);await parameters({x0:1,x1:2,x2:3});assert.match(await page.locator('#screen').innerText(),/x̄\s*2/);assert.deepEqual((await ex()).statsRows,[]);await mode('1');await mode('6');assert.equal(await page.locator('.list-item').count(),3);await option(0);assert.equal(await page.locator('[data-name=x0]').evaluate(el=>el.value),'');
  });
  await check('EX statistics show 160/80/53 row limits for the active column layout',async()=>{
    assert.match(await page.locator('#stat-capacity').innerText(),/160/);await page.locator('#frequency-toggle').check();assert.match(await page.locator('#stat-capacity').innerText(),/80/);await page.locator('[data-name=model]').selectOption('linear');assert.match(await page.locator('#stat-capacity').innerText(),/53/);await page.locator('#frequency-toggle').uncheck();assert.match(await page.locator('#stat-capacity').innerText(),/80/);
  });
  await check('turning frequency off ignores hidden old or invalid frequencies',async()=>{
    await mode('6');await option(0);await page.locator('#frequency-toggle').check();await parameters({x0:1,x1:10,f0:9,f1:1});assert.equal((await resultNumbers()).n,'10');assert.equal((await resultNumbers())['Σx'],'19');await page.keyboard.press('Escape');await page.locator('#frequency-toggle').uncheck();await parameters({});assert.equal((await resultNumbers()).n,'2');assert.equal((await resultNumbers())['Σx'],'11');await page.keyboard.press('Escape');await page.locator('[data-name=f0]').evaluate(el=>el.value=String.raw`\frac{1}{}`);await parameters({});assert.equal((await resultNumbers()).n,'2');assert.equal((await resultNumbers())['Σx'],'11');
  });
  await check('EX distribution menu and normal parameters follow the official order',async()=>{
    await mode('7');const labels=await page.locator('.list-item').allTextContents();assert.match(labels[0],/Normal/);assert.match(labels[3],/Binomial/);await option(0);assert.deepEqual(await page.locator('#parameters [data-name]').evaluateAll(els=>els.map(el=>el.dataset.name)),['x','σ','μ']);await parameters({x:36,'σ':2,'μ':35});near((await ex()).calculator.vars.Ans,.17603266338214976);assert.equal(await page.locator('#screen .screen-hint').count(),1);await page.screenshot({path:path.join(evidence,'ex-distribution.png')});
  });
  await check('EX inverse normal and manual binomial list produce approximate results',async()=>{
    await mode('7');await option(2);await parameters({'区域':.975,'σ':2,'μ':35});near((await ex()).calculator.vars.Ans,38.91992796908011);
    await mode('7');await option(3);await option(0);await parameters({values:'10 11 12 13',N:15,p:.6});assert.equal(await page.locator('.result-row').count(),4);assert.doesNotMatch(await page.locator('.result-list').innerText(),/Error|错误/);assert.match(await page.locator('.result-list').innerText(),/0.1859/);
  });
  await check('EX Spreadsheet manual constants and formulas actually recalculate',async()=>{
    await mode('8');for(const [address,value]of [['A1','7*5'],['A2','7*6'],['A3','A2+7'],['B1','=A1+7']])await cell(address,value);for(const [address,value]of [['A1','35'],['A2','42'],['A3','49'],['B1','42']])assert.equal(await page.locator('[data-cell='+address+']').innerText(),value);await cell('A1','2');assert.equal(await page.locator('[data-cell=B1]').innerText(),'9');await page.screenshot({path:path.join(evidence,'ex-spreadsheet.png')});
  });
  await check('EX Spreadsheet is cleared on app exit and ON with no sheet persistence',async()=>{
    await mode('1');await mode('8');assert.equal(await page.locator('[data-cell=A1]').innerText(),'');await cell('A1','5');await key('on').click();assert.equal(await page.locator('[data-cell=A1]').innerText(),'');assert.equal(Object.hasOwn(await ex(),'sheet'),false);
  });
  await check('EX Spreadsheet OPTN opens usable formula fill and relative copy tools',async()=>{
    await cell('A1','35');await cell('A2','42');await cell('A3','49');await key('options').click();assert.match(await page.locator('.list-item').nth(1).innerText(),/Fill|fill/);await option(1);await parameters({expression:'2A1-3',range:'B1:B3'});assert.equal(await page.locator('[data-cell=B1]').innerText(),'67');assert.equal(await page.locator('[data-cell=B3]').innerText(),'95');await page.locator('[data-cell=B1]').click();await key('options').click();await option(3);await page.locator('[data-cell=C3]').click();await key('options').click();await option(5);assert.equal(await page.locator('[data-cell=C3]').innerText(),'187');
  });
  await check('EX sheet rejects overlong constants transactionally',async()=>{
    await cell('A1','2');await cell('A1','12345678901');assert.match(await page.locator('#sheet-error').innerText(),/10/);assert.equal(await page.locator('[data-cell=A1]').innerText(),'2');await cell('A1','='+('1+'.repeat(25))+'1');assert.match(await page.locator('#sheet-error').innerText(),/49/);assert.equal(await page.locator('[data-cell=A1]').innerText(),'2');
  });
  await check('full initialization clears session sheets and distribution parameters',async()=>{
    await cell('A1','5');await page.keyboard.press('F11');await option(6);await option(2);await option(0);await ready();await mode('8');assert.equal(await page.locator('[data-cell=A1]').innerText(),'');await mode('7');await option(3);await option(1);assert.equal(await page.locator('[data-name=N]').evaluate(el=>el.value),'1');
  });
  await check('EX Table enforces 45 single rows and 30 dual rows in the actual UI',async()=>{
    await mode('9');await parameters({f:'x^2',start:0,end:44,step:1});assert.equal(await page.locator('.data-table tbody tr').count(),45);
    await mode('9');await parameters({f:'x^2',g:'x+1',start:0,end:29,step:1});assert.equal(await page.locator('.data-table tbody tr').count(),30);
    await mode('9');await parameters({f:'x',g:'x+1',start:0,end:30,step:1});assert.match(await page.locator('#form-error').innerText(),/30/);
  });
  await check('EX A Equation/Func keeps polynomial/system solving separate from Calculate SOLVE',async()=>{
    await mode('A');assert.equal(await page.locator('.list-item').count(),2);assert.match(await page.locator('.list-item').first().innerText(),/4/);await option(1);await option(0);await parameters({a:1,b:0,c:-2});const text=await page.locator('.result-list').innerText();assert.equal(await page.locator('.result-row').count(),2);assert.match(text,/1.414213562/);assert.match(text,/[-−]1.414213562/);assert.equal((await ex()).mode,'equation');
  });
  await check('EX B Inequality and C Ratio applications return actual solutions',async()=>{
    await mode('B');await option(0);await page.locator('[data-name=op]').selectOption('<');await parameters({a:1,b:2,c:-3});assert.match(await page.locator('.result-list').innerText(),/[-−]3.*1/s);
    await mode('C');await option(0);await parameters({a:1,b:2,c:10});assert.match(await page.locator('.result-list').innerText(),/5/);
  });
  await check('EX SHIFT common log, ALPHA DEL undo and scannable calculation-text QR work',async()=>{
    await fresh();await key('shift').click();await page.locator('.classwiz-science [data-action="-"]').click();await page.keyboard.type('100');await key('execute').click();near((await ex()).calculator.vars.Ans,2);
    await fresh();await page.keyboard.type('2+3');const before=await page.locator('#entry').evaluate(el=>el.value);await key('alpha').click();await key('delete').click();assert.notEqual(await page.locator('#entry').evaluate(el=>el.value),before);assert.doesNotMatch(await page.locator('#entry').evaluate(el=>el.value),/undo/);
    await fresh();await page.keyboard.type('7+8');await key('execute').click();near((await ex()).calculator.vars.Ans,15);await key('shift').click();await key('options').click();await page.locator('.qr-image svg').waitFor();assert.equal(await page.locator('.qr-image svg').isVisible(),true);const payload=await page.locator('.qr-panel pre').textContent();assert.match(payload,/scientific calculator simulator\nfx-991EX/);assert.match(payload,/mode: calc/);assert.match(payload,/= 15/);assert.match(await page.locator('.qr-panel > small').textContent(),/simulator export/);await page.keyboard.press('Escape');await ready();near((await ex()).calculator.vars.Ans,15);
  });
  await check('EX memory, independent history and Base-N setting survive restart',async()=>{
    await fresh();await page.keyboard.type('7');await key('execute').click();await key('store').click();await option(6);near((await ex()).calculator.vars.M,7);await mode('3');await ready();await key('^').click();await page.reload();await ready();assert.equal((await saved()).activeModel,'ex');assert.equal((await ex()).base,16);near((await ex()).calculator.vars.M,7);assert.equal(await page.locator('.model').innerText(),'fx-991EX');
  });
  await check('EX Chinese interface and high zoom retain uncluttered input and key bounds',async()=>{
    await fresh();await page.keyboard.press('F12');assert.equal(await page.locator('html').getAttribute('lang'),'zh-CN');await key('menu').click();assert.equal(await page.locator('[data-classwiz-label]').textContent(),'计算');await page.keyboard.press('1');await ready();assert.equal(await page.locator('#entry').evaluate(el=>getComputedStyle(el).outlineStyle),'none');
    await resizeCalculatorWindow(app,page,360,640,1.5);
    assert.deepEqual(await page.locator('.calculator button').evaluateAll(els=>els.filter(el=>{const r=el.getBoundingClientRect();return r.left<-1||r.right>innerWidth+1||r.top<-1||r.bottom>innerHeight+1;}).map(el=>el.getAttribute('aria-label'))),[]);
  });
  await check('EX workflows stay offline without renderer exceptions',async()=>{assert.deepEqual(errors,[]);assert.deepEqual(network,[]);});
}finally{await fs.writeFile(path.join(evidence,'ex-ui-results.json'),JSON.stringify({date:new Date().toISOString(),application,counts:{passed:passed.length,failed:failed.length,notRun:total-passed.length-failed.length},passed,failed,errors,network},null,2));await app.close();}
if(failed.length)process.exitCode=1;
