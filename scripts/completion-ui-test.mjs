import {_electron} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const evidence=path.resolve('.verification'),passed=[],failed=[],errors=[];
const total=(await fs.readFile(new URL(import.meta.url),'utf8')).match(/await check\(/g).length;
const profile=await fs.mkdtemp(path.join(evidence,'completion-ui-profile-'));
const app=await _electron.launch({executablePath:process.env.CNX_ELECTRON_PATH||undefined,args:[process.env.CNX_APP_PATH||'.','--user-data-dir='+profile],env:{...process.env,CNX_TEST:'1',CNX_TEST_SYSTEM_LANGUAGES:'["zh-CN"]'}});
const page=await app.firstWindow();page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));
const key=action=>page.locator('[data-action="'+action+'"]').first();
const popup=()=>page.locator('#math-completions');
const entry=()=>page.locator('#entry');
const value=()=>entry().evaluate(el=>el.value.trim());
const stored=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('cnx-v2')));
async function ready(){await page.waitForFunction(()=>{const el=document.activeElement;return el?.tagName==='MATH-FIELD'&&el.hasFocus();});}
async function select(id){if(!await page.locator('#model-picker[open]').count())await key('models').click();await page.locator('[data-model-choice='+id+']').click();await ready();}
async function fresh(){await page.keyboard.press('F4');await page.keyboard.press('1');await ready();}
async function type(s){await ready();await page.keyboard.type(s);}
async function answer(expected){await page.keyboard.press('Enter');const state=await stored();assert.equal(state.profiles[state.activeModel].history.at(-1)?.answer,String(expected));}
async function check(name,run){try{await run();passed.push(name);console.log('PASS '+name);}catch(e){failed.push({name,error:e.message});console.error('FAIL '+name+' '+e.message);await page.screenshot({path:path.join(evidence,'completion-failure-'+failed.length+'.png')});}}
try{
 await page.locator('#model-picker[open]').waitFor();await select('cncw');
 await check('CW uses 16 control, 12 science and 20 digit keys in original positions',async()=>{
   assert.equal(await page.locator('.cw-edition').count(),0);
   assert.doesNotMatch(await page.locator('.cw-model-header').innerText(),/中文版|Chinese edition/i);
   assert.equal(await page.locator('.physical-cw .key').count(),48);assert.equal(await page.locator('.cw-science .key').count(),12);assert.equal(await page.locator('.cw-digits .key').count(),20);
   assert.deepEqual(await page.locator('.cw-science .key').allTextContents(),['x','','√','xⁿ','x²','logₐ','(−)','sin','cos','tan','(',')']);
   assert.equal(await key('frac').getAttribute('aria-label'),'分数');assert.equal(await key('frac').locator('svg rect').count(),2);
   assert.deepEqual(await page.locator('.cw-digits .key').allTextContents(),['7','8','9','DEL','AC','4','5','6','×','÷','1','2','3','+','−','0','.','×10ˣ','格式','EXE']);
   assert.equal(await page.locator('.cw-page-keys .key').count(),2);assert.equal(await key('Ans').count(),0);
   for(const [selector,columns]of [['.cw-science .key',6],['.cw-digits .key',5]]){
     const boxes=await page.locator(selector).evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};}));
     for(let i=0;i<boxes.length;i++){assert.ok(Math.abs(boxes[i].width-boxes[i].height)<1,'native round key geometry');if(i%columns)assert.ok(Math.abs(boxes[i].y-boxes[i-1].y)<1);if(i>=columns){assert.ok(boxes[i].y>boxes[i-columns].y);assert.ok(Math.abs(boxes[i].x-boxes[i-columns].x)<1);}}
   }
   const positions=await page.locator('.cw-controls .key').evaluateAll(els=>Object.fromEntries(els.map(el=>{const r=el.getBoundingClientRect();return [el.dataset.action,{x:r.x,y:r.y}];})));
   assert.ok(positions.up.y<positions.execute.y&&positions.execute.y<positions.down.y);
   assert.ok(positions.left.x<positions.execute.x&&positions.execute.x<positions.right.x);
   assert.ok(positions['page-up'].x>positions.right.x&&positions['page-down'].y>positions['page-up'].y);
 });
 await check('CW HOME shows six applications and page key selects the remaining four',async()=>{
   await key('menu').click();assert.deepEqual(await page.locator('.cw-home-grid .mode-tile:visible .cw-home-label').allTextContents(),['计算','统计','函数表格','方程','不等式','复数']);
   await key('page-down').click();assert.deepEqual(await page.locator('.cw-home-grid .mode-tile:visible .cw-home-label').allTextContents(),['基数','矩阵','向量','比例式']);
   await key('page-up').click();await key('execute').first().click();await ready();
   await key('menu').click();await page.screenshot({path:path.join(evidence,'cw-home-corrected.png')});await page.keyboard.press('1');await ready();
 });
 await check('CW SHIFT x² is log10, SHIFT log is ln; FORMAT SHIFT inserts Ans',async()=>{
   await fresh();await key('shift').click();await key('^2').click();await type('100');await answer(2);
   await fresh();await key('shift').click();await key('format').click();await type('+3');await answer(5);
   await fresh();await key('shift').click();await key('log(').click();assert.match(await value(),/\\ln/);
 });
 await check('Tab completes sq into a working square-root placeholder',async()=>{
   await fresh();await type('sq');await popup().waitFor({state:'visible'});assert.match(await popup().innerText(),/sqrt\(x\)/);await page.keyboard.press('Tab');await type('9');await answer(3);assert.equal(await popup().isVisible(),false);
   await page.screenshot({path:path.join(evidence,'cw-corrected.png')});
 });
 await check('suggestion arrow selection chooses sinh and preserves execution',async()=>{
   await fresh();await type('si');assert.deepEqual(await popup().locator('[role=option] .completion-signature').allTextContents(),['sin(x)','sinh(x)']);await page.keyboard.press('ArrowDown');await page.keyboard.press('Tab');await type('0');assert.match(await value(),/\\sinh/);await answer(0);
 });
 await check('completion replaces only the token before the caret, preserving both sides',async()=>{
   await fresh();await type('2+sq+3');await entry().evaluate(el=>{el.position=4;});await popup().waitFor({state:'visible'});await page.keyboard.press('Tab');await type('9');await answer(8);
 });
 await check('nested fraction completion preserves numerator and native Tab to denominator',async()=>{
   await fresh();await key('frac').click();await type('sq');await page.keyboard.press('Tab');await type('9');await page.keyboard.press('Tab');await type('2');await answer(1.5);assert.match(await value(),/\\frac/);
 });
 await check('Tab with an ordinary fraction placeholder retains native navigation',async()=>{
   await fresh();await key('frac').click();await type('1');assert.equal(await popup().isVisible(),false);await page.keyboard.press('Tab');await type('4');await answer(.25);
 });
 await check('Esc dismisses suggestions without clearing the expression',async()=>{
   await fresh();await type('sq');await popup().waitFor({state:'visible'});await page.keyboard.press('Escape');assert.equal(await popup().isVisible(),false);assert.equal(await value(),'sq');
 });
 await check('Enter executes rather than silently accepting a candidate',async()=>{
   await fresh();await type('sq');const before=(await stored()).profiles.cncw.history.length;await page.keyboard.press('Enter');assert.equal(await popup().isVisible(),false);assert.equal(await value(),'sq');assert.equal((await stored()).profiles.cncw.history.length,before);
   // MathLive may notify again without editing. The computation error must stay.
   await entry().evaluate(el=>el.dispatchEvent(new Event('input',{bubbles:true})));
   assert.ok((await page.locator('#answer.error').innerText()).length);assert.equal(await popup().isVisible(),false);
   await fresh();await type('2+3');await answer(5);const displayed=await page.locator('#answer').innerText();
   await entry().evaluate(el=>el.dispatchEvent(new Event('input',{bubbles:true})));
   assert.equal(await page.locator('#answer').innerText(),displayed);
 });
 await check('clicking a suggestion keeps input focus and inserts valid mathematics',async()=>{
   await fresh();await type('sq');await popup().locator('[data-completion="0"]').click();await type('16');await answer(4);
 });
 await check('completion is one undoable edit',async()=>{
   await fresh();await type('sq');await page.keyboard.press('Tab');assert.match(await value(),/\\sqrt/);await page.keyboard.press('Control+z');assert.equal(await value(),'sq');
 });
 await check('explicit Ctrl+Space includes registered functions only when defined',async()=>{
   await fresh();await page.keyboard.press('F6');await page.keyboard.press('1');await ready();await type('x+1');await page.keyboard.press('Control+Enter');await ready();await type('f');await page.keyboard.press('Control+Space');await popup().waitFor({state:'visible'});assert.ok((await popup().innerText()).includes('f(x)'));await page.keyboard.press('Tab');

   await ready();await type('3');await answer(4);
 });
 await check('English suggestions and help are translated',async()=>{
   await fresh();await page.keyboard.press('F12');assert.doesNotMatch(await page.locator('.cw-model-header').innerText(),/中文版|Chinese edition/i);await type('sq');assert.match(await popup().innerText(),/Square root/);assert.match(await popup().innerText(),/Tab complete/);assert.doesNotMatch(await popup().innerText(),/\p{Script=Han}/u);await page.screenshot({path:path.join(evidence,'completion-english.png')});await page.keyboard.press('Escape');await key('clear').click();await type('2+3');await answer(5);await page.screenshot({path:path.join(evidence,'cw-clean-english.png')});await page.keyboard.press('F12');
 });
 await check('suggestions do not consume IME composition Tab',async()=>{
   await fresh();await type('sq');const during=await entry().evaluate(el=>{
     el.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));
     const event=new KeyboardEvent('keydown',{key:'Tab',isComposing:true,bubbles:true,cancelable:true});
     const notCanceled=el.dispatchEvent(event),hidden=document.querySelector('#math-completions').hidden,value=el.value;
     el.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true}));
     return {notCanceled,defaultPrevented:event.defaultPrevented,hidden,value:value.trim()};
   });assert.deepEqual(during,{notCanceled:true,defaultPrevented:false,hidden:true,value:'sq'});assert.equal(await value(),'sq');
 });
 await check('CW keys and external controls remain visible at normal and expanded sizes',async()=>{
   await fresh();for(const expanded of [false,true]){if(expanded)await page.keyboard.press('F10');assert.deepEqual(await page.locator('.calculator button').evaluateAll(els=>els.filter(el=>{const r=el.getBoundingClientRect();return r.top<0||r.left<0||r.right>innerWidth||r.bottom>innerHeight;}).map(el=>el.getAttribute('aria-label')||el.textContent)),[]);}await page.keyboard.press('F10');
 });
 await check('popup remains inside the window and selection survives model changes',async()=>{
   await fresh();await type('sq');const rect=await popup().boundingBox(),size=await page.evaluate(()=>({width:innerWidth,height:innerHeight}));assert.ok(rect.x>=0&&rect.y>=0&&rect.x+rect.width<=size.width&&rect.y+rect.height<=size.height);await page.screenshot({path:path.join(evidence,'completion-chinese.png')});await select('cnx');assert.equal(await popup().isVisible(),false);await type('sq');await page.keyboard.press('Tab');await type('25');await answer(5);
 });
 await check('TI matrix completions respect three matrix slots',async()=>{
   await select('ti36xpro');await key('shift').click();await key('options').click();await page.keyboard.press('2');await ready();await type('Ma');assert.deepEqual(await popup().locator('.completion-signature').allTextContents(),['MatA','MatB','MatC']);await page.keyboard.press('Escape');
 });
 await check('graph fields accept completion without stealing Enter or F6',async()=>{
   await select('cg50');await page.locator('#graph-y0').focus();await type('sq');await page.keyboard.press('Tab');await type('9');await page.keyboard.press('Enter');assert.equal(await page.locator('.graph-plot').isVisible(),false);await page.keyboard.press('F6');assert.ok(Number(await page.locator('#graph-canvas').getAttribute('data-points'))>100);
 });
 await check('no unhandled renderer exceptions',async()=>assert.deepEqual(errors,[]));
}finally{
 await fs.writeFile(path.join(evidence,'completion-ui-results.json'),JSON.stringify({date:new Date().toISOString(),counts:{passed:passed.length,failed:failed.length,notRun:total-passed.length-failed.length},passed,failed,errors},null,2));await app.close();
}
if(failed.length)process.exitCode=1;
