import {_electron} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const evidence=path.resolve('.verification');
await fs.mkdir(evidence,{recursive:true});
const total=(await fs.readFile(new URL(import.meta.url),'utf8')).match(/await check\(/g).length;
const directory=await fs.mkdtemp(path.join(evidence,'models-profile-'));
const passed=[],failed=[],errors=[];
let app,page;
async function launch(){
  app=await _electron.launch({executablePath:process.env.CNX_ELECTRON_PATH||undefined,args:[process.env.CNX_APP_PATH||'.','--user-data-dir='+directory],env:{...process.env,CNX_TEST:'1',CNX_TEST_SYSTEM_LANGUAGES:'["zh-CN"]'}});
  page=await app.firstWindow();page.on('pageerror',e=>errors.push(e.message));
  await page.locator('#model-picker[open], #entry, #graph-y0').first().waitFor();
}
const key=action=>page.locator('[data-action="'+action+'"]').first();
async function select(id){if(!await page.locator('#model-picker[open]').count())await key('models').click();await page.locator('[data-model-choice='+id+']').click();}
async function check(name,run){try{await run();passed.push(name);console.log('PASS '+name);}catch(e){failed.push({name,error:e.message});console.error('FAIL '+name+' '+e.message);await page.screenshot({path:path.join(evidence,'models-failure-'+failed.length+'.png')});}}
async function type(text){await page.keyboard.type(text);}
async function answer(expected){await key('execute').click();const answer=page.locator('#answer .katex-html');assert.equal((await (await answer.count()?answer:page.locator('#answer')).innerText()).replace(/\s/g,''),String(expected));}
async function fresh(){await key('clear').click();await page.locator('#entry').focus();}
const profile=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('cnx-v2')));
try{
  await launch();await select('ti36xpro');
  await check('TI physical 2x3 control and 7x5 main keys, no invented Apps key',async()=>{
    assert.equal(await page.locator('.physical-ti-left .key').count(),6);assert.equal(await page.locator('.physical-ti-main .key').count(),35);
    assert.deepEqual(await page.locator('.physical-ti-main .key').allTextContents(),['eˣ\n10ˣ','EE','!\nnCr\nnPr','table','clear','π\ne\ni','sin\nsin⁻¹','cos\ncos⁻¹','tan\ntan⁻¹','÷','x^□','n/d','(',')','×','x²','7','8','9','−','x y z t\na b c d','4','5','6','+','sto→','1','2','3','◀▶≈','on','0','.','(−)','enter']);
    assert.equal(await page.locator('.physical-ti .key').filter({hasText:/Apps|MENU|HOME/}).count(),0);
  });
  await check('TI repeated log key replaces ln with base-10 log',async()=>{await fresh();await key('ti-multi:log').click();await key('ti-multi:log').click();await type('100');await answer(2);await page.screenshot({path:path.join(evidence,'ti36xpro-local.png')});});
  await check('TI nCr multi-tap retains the preceding 52 operand',async()=>{await fresh();await type('52');await key('ti-multi:prob').click();await key('ti-multi:prob').click();await type('5');await answer(2598960);});
  await check('TI nPr third multi-tap retains the preceding 5 operand',async()=>{await fresh();await type('5');for(let i=0;i<3;i++)await key('ti-multi:prob').click();await type('3');await answer(60);});
  await check('TI multi-tap stops cycling after operand input',async()=>{await fresh();await key('ti-multi:log').click();await type('2');await page.keyboard.press('ArrowRight');await key('ti-multi:log').click();assert.match(await page.locator('#entry').evaluate(el=>el.value),/ln.*ln/);});
  await check('TI variable key cycles all eight variables',async()=>{await fresh();for(let i=0;i<8;i++)await key('ti-multi:variables').click();assert.equal((await page.locator('#entry').evaluate(el=>el.value)).trim(),'d');});
  await check('TI solver and Auto/Ask-x have actual model limits',async()=>{
    await key('shift').click();await key('ti-multi:cos').click();assert.deepEqual((await page.locator('.list-item').allTextContents()).map(s=>s.replace(/\s/g,'')),['12次','23次']);
    await key('mode:table').click();assert.match(await page.locator('#screen').innerText(),/Auto/);assert.match(await page.locator('#screen').innerText(),/Ask-x/);
  });
  await check('TI constants opens its own 20-entry guidebook catalog',async()=>{
    await key('ti-quit').count().then(async()=>{await key('shift').click();await key('ti-mode').click();});
    await key('shift').click();await key('(').click();assert.equal(await page.locator('.list-item').count(),20);await page.locator('.list-item').first().click();await answer(299792458);
  });
  await select('cg50');
  await check('CG50 native function keys, 20 relation slots and contextual menu',async()=>{
    assert.deepEqual(await page.locator('.physical-function-keys .key').allTextContents(),['F1','F2','F3','F4','F5','F6']);assert.equal(await page.locator('[data-graph-index]').count(),20);
    assert.deepEqual(await page.locator('.graph-screen-softkeys button').allTextContents(),['SELECT','DELETE','TYPE','TOOL','MODIFY','DRAW']);
  });
  await check('CG50 V-Window works before drawing and clears old curves',async()=>{
    await page.locator('#graph-y0').focus();await type('x^2');await page.keyboard.press('ArrowRight');await type('-4');await page.keyboard.press('Enter');assert.equal(await page.locator('.graph-plot').isVisible(),false);
    await page.keyboard.press('Shift+F3');await page.locator('[name=xmin]').fill('-5');await page.locator('[name=xmax]').fill('5');await page.locator('.graph-window-form button').click();assert.equal(await page.locator('#graph-canvas').getAttribute('data-points'),'0');
    assert.equal((await profile()).profiles.cg50.graph.window.xmax,5);
  });
  await check('CG50 F6 draws curves, SHIFT F1 traces without mutating x/Ans',async()=>{
    await key('cg-clear-on').click();await page.keyboard.press('F6');assert.ok(Number(await page.locator('#graph-canvas').getAttribute('data-points'))>100);
    assert.equal(await page.locator('.graph-screen-softkeys button').count(),0);
    await page.screenshot({path:path.join(evidence,'cg50-graph.png')});
    const before=(await profile()).profiles.cg50.calculator.vars;
    await page.keyboard.press('Shift+F1');assert.equal(Number(await page.locator('#graph-canvas').getAttribute('data-trace-y')),-4);await page.keyboard.press('ArrowRight');
    assert.deepEqual((await profile()).profiles.cg50.calculator.vars,before);
  });
  await check('CG50 native Zoom F3 IN halves the window',async()=>{await page.keyboard.press('Shift+F2');assert.deepEqual(await page.locator('.graph-screen-softkeys button').allTextContents(),['BOX','FACTOR','IN','OUT','AUTO','▶']);await page.keyboard.press('F3');assert.equal((await profile()).profiles.cg50.graph.window.xmax,2.5);});
  await check('CG50 G-Solv ROOT and right arrow find distinct roots; failure clears stale result',async()=>{
    await page.keyboard.press('Shift+F5');await page.keyboard.press('F1');assert.ok(Math.abs(Number(await page.locator('#graph-canvas').getAttribute('data-trace-x'))+2)<1e-8);
    await page.keyboard.press('ArrowRight');assert.ok(Math.abs(Number(await page.locator('#graph-canvas').getAttribute('data-trace-x'))-2)<1e-8);
    await page.keyboard.press('ArrowRight');assert.match(await page.locator('.graph-error').innerText(),/根/);assert.equal(await page.locator('#graph-canvas').getAttribute('data-trace-x'),null);
  });
  await check('CG50 main menu has 19 native positions and opens its Statistics application',async()=>{
    await key('menu').click();assert.deepEqual(await page.locator('.native-menu-grid .mode-tile small').allTextContents(),['1','2','3','4','5','6','7','8','9','A','B','C','D','E','F','G','H','I','J']);
    await page.keyboard.press('2');await page.locator('.cg-stat-panel').waitFor();assert.equal((await profile()).profiles.cg50.mode,'stat');assert.equal(await page.locator('[data-stat-value]').count(),1);assert.equal(await page.locator('.native-menu-grid').count(),0);
    await key('menu').click();await page.keyboard.press('5');assert.equal(await page.locator('[data-graph-index]').count(),20);
    await page.screenshot({path:path.join(evidence,'cg50-local.png')});
  });
  await check('model history/variables and 20 graph slots survive switch and restart',async()=>{
    await page.locator('#graph-y19').evaluate(el=>{el.value='x+1';});await page.locator('#graph-y19').focus();await page.keyboard.press('Enter');
    await select('ti36xpro');await fresh();await type('2+3');await answer(5);await select('cg50');assert.equal((await page.locator('#graph-y19').evaluate(el=>el.value)).trim(),'x+1');
    await app.close();app=null;await launch();assert.equal((await page.locator('#graph-y19').evaluate(el=>el.value)).trim(),'x+1');assert.ok((await profile()).profiles.ti36xpro.history.some(h=>h.answer==='5'));
  });
  await check('new model keys and external controls fit the window; English help is translated',async()=>{
    for(const id of ['cg50','ti36xpro']){await select(id);assert.deepEqual(await page.locator('.calculator button').evaluateAll(els=>els.filter(e=>{const r=e.getBoundingClientRect();return r.top<0||r.bottom>innerHeight||r.left<0||r.right>innerWidth;}).map(e=>e.textContent)),[]);await page.keyboard.press('F12');await key('help').click();assert.doesNotMatch(await page.locator('#help').innerText(),/\p{Script=Han}/u);await page.keyboard.press('Escape');await page.keyboard.press('F12');}
  });
  await check('new models have no renderer exceptions',async()=>assert.deepEqual(errors,[]));
}finally{
  await app?.close();await fs.writeFile(path.join(evidence,'models-ui-results.json'),JSON.stringify({date:new Date().toISOString(),counts:{passed:passed.length,failed:failed.length,notRun:total-passed.length-failed.length},passed,failed,errors},null,2));
}
if(failed.length)process.exitCode=1;
