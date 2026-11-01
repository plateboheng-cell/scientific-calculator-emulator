import {_electron} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {MODELS} from '../src/models/registry.js';
const evidence=path.resolve('.verification'),profile=await fs.mkdtemp(path.join(evidence,'library-ui-profile-'));
const total=(await fs.readFile(new URL(import.meta.url),'utf8')).match(/await check\(/g).length;
const app=await _electron.launch({executablePath:process.env.CNX_ELECTRON_PATH||undefined,args:[process.env.CNX_APP_PATH||'.','--user-data-dir='+profile],env:{...process.env,CNX_TEST:'1',CNX_TEST_SYSTEM_LANGUAGES:'["zh-CN"]'}});
const page=await app.firstWindow(),passed=[],failed=[],errors=[],network=[];
page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:|^wss?:/.test(r.url()))network.push(r.url());});
const application=await app.evaluate(({app})=>({version:app.getVersion(),packaged:app.isPackaged}));
const key=action=>page.locator('[data-action="'+action+'"]').first();
const stored=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('cnx-v2')));
async function picker(){if(!await page.locator('#model-picker[open]').count())await key('models').click();}
async function select(id){await picker();await page.locator('[data-model-choice="'+id+'"]').click();}
async function ready(){await page.waitForFunction(()=>{const el=document.querySelector('#entry');return el&&document.activeElement===el&&(el.tagName!=='MATH-FIELD'||el.hasFocus());});}
async function fresh(){const id=(await stored()).activeModel,model=MODELS.find(m=>m.id===id),index=(model.nativeMenu||model.modes).findIndex(m=>m[3]==='calc');await key('menu').click();await page.keyboard.press(String(index+1));await ready();}
async function check(name,run){try{await run();passed.push(name);console.log('PASS '+name);}catch(e){failed.push({name,error:e.message});console.error('FAIL '+name+' '+e.message);await page.screenshot({path:path.join(evidence,'library-failure-'+failed.length+'.png')}).catch(()=>{});}}
try{
  await page.locator('#model-picker[open]').waitFor();
  await check('first-launch library keeps model names, honest status and no preview DOM collisions',async()=>{
    assert.equal(await page.locator('[data-model-choice]').count(),MODELS.length);
    for(const model of MODELS){const card=page.locator('[data-model-choice="'+model.id+'"]');assert.match(await card.innerText(),new RegExp(model.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));assert.equal(await card.isDisabled(),!model.selectable);if(model.selectable)assert.equal(await card.locator('svg').count(),1);}
    assert.deepEqual(await page.evaluate(()=>[...document.querySelectorAll('[id]')].map(el=>el.id).filter((id,i,all)=>all.indexOf(id)!==i)),[]);
    assert.equal(await page.locator('#model-picker .calculator,#model-picker .key,#model-picker [data-action]').count(),0);
    await page.keyboard.press('Escape');assert.equal(await page.locator('#model-picker').isVisible(),true);
  });
  await check('library switches Chinese and English while retaining model identifiers',async()=>{
    await page.locator('[data-picker-language]').click();assert.match(await page.locator('#model-picker').innerText(),/Choose your calculator/);assert.doesNotMatch((await page.locator('#model-picker').innerText()).replace('中文',''),/\p{Script=Han}/u);
    await page.screenshot({path:path.join(evidence,'library-english.png')});await page.locator('[data-picker-language]').click();
  });
  await check('narrow library scrolls without horizontal clipping and every model is reachable',async()=>{
    await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setSize(360,640));
    const geometry=await page.locator('#model-picker').evaluate(el=>({rect:el.getBoundingClientRect().toJSON(),width:innerWidth,height:innerHeight,scroll:el.scrollWidth,client:el.clientWidth}));assert.ok(geometry.rect.left>=0&&geometry.rect.right<=geometry.width+1&&geometry.rect.top>=0&&geometry.rect.bottom<=geometry.height+1);assert.ok(geometry.scroll<=geometry.client+1);
    for(const model of MODELS){const card=page.locator('[data-model-choice="'+model.id+'"]');await card.scrollIntoViewIfNeeded();const r=await card.boundingBox();assert.ok(r.width>100);}
    await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setSize(900,830));await page.locator('#model-picker').evaluate(el=>el.scrollTop=0);await page.screenshot({path:path.join(evidence,'model-library.png')});
    await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setSize(420,830));
  });
  await check('X chassis displays its model and has fifty physical keys with four round controls',async()=>{
    await select('cnx');await ready();assert.equal(await page.locator('.physical-classwiz .key,.physical-classwiz .nav button').count(),50);assert.equal(await page.locator('.classwiz-round').count(),4);assert.equal(await page.locator('.model').innerText(),'fx-991CN X');
    assert.equal(await page.locator('.classwiz-science .key').count(),18);assert.equal(await page.locator('.classwiz-digits .key').count(),20);assert.doesNotMatch(await page.locator('.classwiz-model-header').innerText(),/中文版|Chinese edition|CASIO/);
    await page.keyboard.type('2+3*4');await key('execute').click();assert.equal((await stored()).profiles.cnx.calculator.vars.Ans,14);await page.screenshot({path:path.join(evidence,'classwiz-x.png')});
  });
  await check('X native menu displays eight icons in four columns and a separate selected caption',async()=>{
    await key('menu').click();assert.deepEqual(await page.locator('.classwiz-menu-grid .mode-tile:visible .classwiz-menu-number').allTextContents(),['1','2','3','4','5','6','7','8']);assert.equal(await page.locator('[data-classwiz-shortcut]').textContent(),'1:');
    const boxes=await page.locator('.classwiz-menu-grid .mode-tile:visible').evaluateAll(els=>els.map(el=>el.getBoundingClientRect().toJSON()));for(let i=1;i<4;i++)assert.ok(Math.abs(boxes[i].y-boxes[0].y)<1);assert.ok(boxes[4].y>boxes[0].y);await page.screenshot({path:path.join(evidence,'classwiz-x-menu.png')});
  });
  await check('X menu scroll retains the previous icon row and reaches the last two applications',async()=>{
    await key('down').click();await key('down').click();assert.deepEqual(await page.locator('.classwiz-menu-grid .mode-tile:visible .classwiz-menu-number').allTextContents(),['5','6','7','8','9','A']);assert.equal(await page.locator('[data-classwiz-shortcut]').textContent(),'9:');await key('right').click();await key('execute').click();assert.equal((await stored()).profiles.cnx.mode,'ratio');
  });
  await check('returning to the current model preserves unsubmitted input and active marker',async()=>{
    await fresh();await page.keyboard.type('123');const before=await page.locator('#entry').evaluate(el=>el.value);await picker();assert.equal(await page.locator('[data-model-choice=cnx]').getAttribute('aria-current'),'true');await page.locator('[data-model-choice=cnx]').click();assert.equal(await page.locator('#entry').evaluate(el=>el.value),before);
    await picker();await page.locator('[data-picker-close]').click();assert.equal(await page.locator('#entry').evaluate(el=>el.value),before);
  });
  await check('switching models isolates histories and library cards support keyboard activation',async()=>{
    await fresh();await page.keyboard.type('7+8');await key('execute').click();const count=(await stored()).profiles.cnx.history.length;await select('cncw');await ready();await page.keyboard.type('2+3');await key('execute').click();assert.equal((await stored()).profiles.cncw.calculator.vars.Ans,5);
    await picker();await page.locator('[data-model-choice=cnx]').focus();await page.keyboard.press('Enter');await ready();assert.equal((await stored()).activeModel,'cnx');assert.equal((await stored()).profiles.cnx.history.length,count);assert.equal((await stored()).profiles.cnx.calculator.vars.Ans,15);
  });
  await check('all selectable model bodies and keys fit normal and narrow windows',async()=>{
    for(const model of MODELS.filter(m=>m.selectable)){
      await select(model.id);await fresh();
      for(const [width,height]of [[420,830],[360,640]]){
        await app.evaluate(({BrowserWindow},size)=>BrowserWindow.getAllWindows()[0].setSize(...size),[width,height]);try{await page.waitForFunction(()=>{const r=document.querySelector('.calculator').getBoundingClientRect();return r.left>=-1&&r.right<=innerWidth+1&&r.top>=-1&&r.bottom<=innerHeight+1;});}catch{throw new Error(model.id+' '+width+'x'+height+' '+JSON.stringify(await page.locator('.calculator').evaluate(el=>({rect:el.getBoundingClientRect().toJSON(),scroll:document.scrollingElement.scrollTop,width:innerWidth,height:innerHeight}))));}
        await page.evaluate(()=>document.fonts.ready);await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
        const bad=await page.locator('.calculator button').evaluateAll(els=>els.filter(el=>{const r=el.getBoundingClientRect();return r.left<-1||r.right>innerWidth+1||r.top<-1||r.bottom>innerHeight+1;}).map(el=>({key:el.getAttribute('aria-label')||el.textContent,rect:el.getBoundingClientRect().toJSON(),width:innerWidth,height:innerHeight})));assert.deepEqual(bad,[],model.id+' '+width+'x'+height);
      }
    }
    await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setSize(420,830));
  });
  await check('library and chassis workflows remain offline without renderer exceptions',async()=>{assert.deepEqual(errors,[]);assert.deepEqual(network,[]);});
}finally{await fs.writeFile(path.join(evidence,'library-ui-results.json'),JSON.stringify({date:new Date().toISOString(),application,counts:{passed:passed.length,failed:failed.length,notRun:total-passed.length-failed.length},passed,failed,errors,network},null,2));await app.close();}
if(failed.length)process.exitCode=1;
