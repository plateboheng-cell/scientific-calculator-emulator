import {_electron} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
const evidence=path.resolve('.verification'),passed=[],failed=[],errors=[];
const total=(await fs.readFile(new URL(import.meta.url),'utf8')).match(/await check\(/g).length;
const profile=await fs.mkdtemp(path.join(evidence,'999-ui-profile-'));
let app,page;
async function launch(){app=await _electron.launch({executablePath:process.env.CNX_ELECTRON_PATH||undefined,args:[process.env.CNX_APP_PATH||'.','--user-data-dir='+profile],env:{...process.env,CNX_TEST:'1',CNX_TEST_SYSTEM_LANGUAGES:'["zh-CN"]'}});page=await app.firstWindow();page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));await page.locator('.calculator').waitFor();}
const key=action=>page.locator('[data-action="'+action+'"]').first();
const stored=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('cnx-v2')));
const near=(a,b,t=1e-8)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
async function mode(index){await key('menu').click();if(index>=6)await key('page-down').click();else await key('page-up').click();await page.locator('[data-mode="'+index+'"]').click();}
async function choose(text){await page.locator('.list-item').filter({hasText:text}).first().click();}
async function parameters(values){for(const [name,value]of Object.entries(values)){const el=page.locator('[data-name="'+name+'"]');await el.evaluate((el,value)=>{el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));},String(value));}await page.locator('.run-button').click();}
async function dist(index,useList=false){await mode(2);await page.keyboard.press(String(index));if([1,2,6,7].includes(index))await page.keyboard.press(useList?'1':'2');await page.locator('#parameters').waitFor();}
async function cell(address,text){await page.locator('[data-cell="'+address+'"]').click();await page.locator('#sheet-entry').fill(text);await page.keyboard.press('Enter');}
async function cellText(address){return page.locator('[data-cell="'+address+'"]').innerText();}
async function check(name,run){try{await run();passed.push(name);console.log('PASS '+name);}catch(e){failed.push({name,error:e.message});console.error('FAIL '+name+' '+e.message);await page.screenshot({path:path.join(evidence,'999-failure-'+failed.length+'.png')}).catch(()=>{});}}
try{
 await launch();await page.locator('[data-model-choice=cn999cw]').click();
 await check('999 selects its own white 48-key body and twelve-app first HOME page',async()=>{
  assert.equal(await page.locator('.cw-edition').count(),0);assert.doesNotMatch(await page.locator('.cw-model-header').innerText(),/中文版|Chinese edition/i);
  assert.equal(await page.locator('.white-cw .physical-cw .key').count(),48);assert.equal(await page.locator('.model').innerText(),'fx-999CN CW');await key('menu').click();assert.equal(await page.locator('.mode-tile').count(),12);assert.deepEqual(await page.locator('.mode-tile:visible .cw-home-label').allTextContents(),['计算','统计','分布','数据表格','函数表格','方程']);await page.screenshot({path:path.join(evidence,'999-home.png')});
 });
 await check('999 second HOME page and A/B desktop shortcuts reach the final apps',async()=>{
  await key('page-down').click();assert.deepEqual(await page.locator('.mode-tile:visible .cw-home-label').allTextContents(),['不等式','复数','基数','矩阵','向量','比例式']);await page.keyboard.press('b');assert.match(await page.locator('.screen-heading').innerText(),/比例/);await key('menu').click();await page.keyboard.press('a');assert.match(await page.locator('.screen-heading').innerText(),/向量/);
 });
 await check('999 arithmetic and Tab completion use the shared engine',async()=>{
  await mode(0);await page.waitForFunction(()=>document.activeElement?.id==='entry'&&document.activeElement.hasFocus());await page.keyboard.type('sq');await page.locator('#math-completions').waitFor({state:'visible'});await page.keyboard.press('Tab');await page.keyboard.type('9');await page.keyboard.press('Enter');assert.equal((await stored()).profiles.cn999cw.history.at(-1).answer,'3');
 });
 await check('999 normal density reproduces the official manual example and stores approximate Ans',async()=>{
  await dist(3);await parameters({x:36,'μ':35,'σ':2});near((await stored()).profiles.cn999cw.calculator.vars.Ans,.17603266338214976);assert.ok((await stored()).profiles.cn999cw.calculator.approximateVariables.includes('Ans'));assert.match(await page.locator('.result-list').innerText(),/0.176032/);
 });
 await check('999 inverse normal uses the documented left tail',async()=>{await dist(5);await parameters({'区域':.975,'μ':0,'σ':1});near((await stored()).profiles.cn999cw.calculator.vars.Ans,1.959963984540054);});
 await check('999 normal interval probability runs from lower to upper bound',async()=>{await dist(4);await parameters({'下限':-1,'上限':1,'μ':0,'σ':1});near((await stored()).profiles.cn999cw.calculator.vars.Ans,.6826894921370859);});
 await check('999 binomial cumulative list reproduces all four manual results',async()=>{
  await dist(2,true);await parameters({values:'2\n3\n4\n5',N:5,p:.5});const results=await page.locator('[data-result-number]').allTextContents();assert.deepEqual(results.map(s=>Number(s.replace('≈','').trim())),[.5,.8125,.96875,1]);await page.screenshot({path:path.join(evidence,'999-distribution.png')});
 });
 await check('999 invalid list x produces a row error without suppressing valid rows',async()=>{await dist(1,true);await parameters({values:'2\n6',N:5,p:.5});const rows=await page.locator('[data-result-number]').allTextContents();near(Number(rows[0].replace('≈','').trim()),.3125);assert.match(rows[1],/错误/);});
 await check('999 Poisson scalar mode produces a numerical probability',async()=>{await dist(6);await parameters({x:2,'λ':3});near((await stored()).profiles.cn999cw.calculator.vars.Ans,Math.exp(-3)*4.5);});
 await check('999 invalid standard deviation rejects calculation and retains Ans',async()=>{const before=(await stored()).profiles.cn999cw.calculator.vars.Ans;await dist(3);await parameters({x:1,'μ':0,'σ':0});assert.match(await page.locator('#form-error').innerText(),/标准差/);assert.equal((await stored()).profiles.cn999cw.calculator.vars.Ans,before);});
 await check('999 distribution list accepts 45 entries and rejects 46',async()=>{
  await dist(1,true);await parameters({values:Array(45).fill('0').join('\n'),N:1,p:.5});assert.equal(await page.locator('.result-row').count(),45);await dist(1,true);await parameters({values:Array(46).fill('0').join('\n'),N:1,p:.5});assert.match(await page.locator('#form-error').innerText(),/1–45/);
 });
 await check('999 spreadsheet provides all 225 cells and its E45 boundary',async()=>{await mode(3);assert.equal(await page.locator('[data-cell]').count(),225);await cell('E45','12345678915');assert.equal(await cellText('E45'),'12345678920');await page.locator('[data-cell=A1]').click();});
 await check('999 spreadsheet evaluates the manual constants and formula examples',async()=>{
  await cell('A1','7*5');await cell('A2','7*6');await cell('A3','A2+7');await cell('B1','=A1+7');await cell('A4','=Sum(A1:A3)');assert.equal(await cellText('A4'),'126');assert.equal(await cellText('B1'),'42');const selected=await page.locator('.sheet-grid button.selected').boundingBox(),grid=await page.locator('.sheet-grid-wrap').boundingBox();assert.ok(selected.y+selected.height<=grid.y+grid.height+1,'EXE must scroll the next selected row into view');await page.screenshot({path:path.join(evidence,'999-spreadsheet.png')});
 });
 await check('999 physical keys enter and execute a spreadsheet expression',async()=>{
  await page.locator('[data-cell=D1]').click();await key('7').click();await key('*').click();await key('5').click();await key('execute').click();assert.equal(await cellText('D1'),'35');
 });
 await check('999 existing formulas can be edited at the caret without being replaced',async()=>{
  await cell('D1','=A1+7');await page.locator('[data-cell=D1]').click();await key('tools').click();await choose('编辑单元格');await page.keyboard.press('Backspace');await page.keyboard.type('8');await page.keyboard.press('Enter');assert.equal(await cellText('D1'),'43');
  await page.locator('[data-cell=D1]').click();await page.locator('#sheet-entry').click();await page.keyboard.press('End');await page.keyboard.press('Backspace');await page.keyboard.type('9');await page.keyboard.press('Enter');assert.equal(await cellText('D1'),'44');
 });
 await check('999 formula fill and value fill implement the manual examples',async()=>{
  await key('tools').click();await choose('公式填充');await parameters({expression:'2A1-3',range:'B1:B3'});assert.equal(await cellText('B2'),'81');await key('tools').click();await choose('数值填充');await parameters({expression:'B1*3',range:'C1:C3'});assert.equal(await cellText('C3'),'285');
 });
 await check('999 copied formulas shift relative references and preserve absolute references',async()=>{
  await cell('D1','=A1+$A$2');await page.locator('[data-cell=D1]').click();await key('tools').click();await choose('复制 & 粘贴');await page.locator('[data-cell=D2]').click();await key('tools').click();await choose(/^\d*\s*粘贴$/);await page.locator('[data-cell=D2]').click();assert.equal(await page.locator('#sheet-entry').inputValue(),'=A2+$A$2');assert.equal(await cellText('D2'),'84');
 });
 await check('999 circular cell edits report an error and retain the previous value',async()=>{
  await page.locator('[data-cell=A1]').click();await page.locator('#sheet-entry').fill('=B1');await page.keyboard.press('Enter');assert.match(await page.locator('#sheet-error').innerText(),/循环引用/);assert.equal(await cellText('A1'),'35');await page.keyboard.press('Escape');
 });
 await check('999 navigation and Enter advance rows without leaving the sheet',async()=>{
  await page.locator('[data-cell=A1]').click();await page.keyboard.press('ArrowRight');assert.equal(await page.locator('#sheet-address').innerText(),'B1');await page.keyboard.type('5');await page.keyboard.press('Enter');assert.equal(await page.locator('#sheet-address').innerText(),'B2');assert.equal(await cellText('B1'),'5');
 });
 await check('999 sheet survives changing apps and clears on ON as documented',async()=>{
  await mode(0);await mode(3);assert.equal(await cellText('A1'),'35');await key('on').click();assert.equal(await cellText('A1'),'');assert.equal(await page.locator('#sheet-address').innerText(),'A1');
 });
 await check('999 sheet and distribution labels translate to English',async()=>{
  await page.keyboard.press('F12');assert.equal(await page.locator('#sheet-entry').getAttribute('aria-label'),'Cell contents');await key('menu').click();assert.deepEqual(await page.locator('.mode-tile:visible .cw-home-label').allTextContents(),['Calculate','Statistics','Distribution','Spreadsheet','Function table','Equation']);await page.locator('[data-mode="2"]').click();assert.match(await page.locator('.list-item').first().innerText(),/Binomial PD/);await page.keyboard.press('F12');
 });
 await check('999 volatile sheet data is excluded from persistent storage',async()=>{await mode(3);await cell('A1','9');const profile=(await stored()).profiles.cn999cw;assert.equal(profile.sheet,undefined);assert.equal(profile.mode,'spreadsheet');});
 await check('999 normal and expanded body stay inside the viewport',async()=>{
  for(let i=0;i<2;i++){if(i)await page.keyboard.press('F10');const box=await page.locator('.calculator').boundingBox(),size=await page.evaluate(()=>({w:innerWidth,h:innerHeight}));assert.ok(box.x>=-1&&box.y>=-1&&box.x+box.width<=size.w+1&&box.y+box.height<=size.h+1);}await page.screenshot({path:path.join(evidence,'999-expanded.png')});await page.keyboard.press('F10');
 });
 await check('999 restart remembers model and mode but starts with an empty powered-on sheet',async()=>{
  await app.close();await launch();await page.locator('#sheet-entry').waitFor();assert.equal((await stored()).activeModel,'cn999cw');assert.equal(await cellText('A1'),'');
 });
 await check('switching to 991 restores ten apps and keeps 999 history isolated',async()=>{await key('models').click();await page.locator('[data-model-choice=cncw]').click();await key('menu').click();assert.equal(await page.locator('.mode-tile').count(),10);assert.equal(await page.locator('.model').innerText(),'fx-991CN CW');assert.equal((await stored()).profiles.cncw?.history.length||0,0);assert.equal((await stored()).profiles.cn999cw.history.at(-1).answer,'3');});
 await check('no unhandled 999 renderer errors',async()=>assert.deepEqual(errors,[]));
}finally{
 await fs.writeFile(path.join(evidence,'999-ui-results.json'),JSON.stringify({date:new Date().toISOString(),counts:{passed:passed.length,failed:failed.length,notRun:total-passed.length-failed.length},passed,failed,errors},null,2));await app?.close().catch(()=>{});
}
if(failed.length)process.exitCode=1;
