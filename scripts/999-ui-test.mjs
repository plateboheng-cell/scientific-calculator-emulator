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
async function storeVariable(row,column){
  await key('variables').click();
  await page.locator(`[data-cw-cell="${row},${column}"]`).click();
  await key('execute').click();
  await choose('赋值');
}
async function parameters(values){for(const [name,value]of Object.entries(values)){const el=page.locator('[data-name="'+name+'"]');await el.evaluate((el,value)=>{el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));},String(value));}await page.locator('.run-button').click();}
async function dist(index,useList=false){await mode(2);await page.keyboard.press(String(index));if([1,2,6,7].includes(index))await page.keyboard.press(useList?'1':'2');await page.locator(useList?'#cw-dist-entry':'#parameters').waitFor();}
async function distributionRows(values){
  for(const value of values){await page.locator('#cw-dist-entry').fill(String(value));await page.keyboard.press('Enter');}
  await key('execute').click();
}
const probabilities=()=>page.locator('[data-dist-col="1"]').allTextContents();
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
  await key('page-down').click();assert.deepEqual(await page.locator('.mode-tile:visible .cw-home-label').allTextContents(),['不等式','复数','基数','矩阵','向量','比例式']);await page.keyboard.press('b');assert.match(await page.locator('.list-item').first().innerText(),/A:B=X:D/);await key('menu').click();await page.keyboard.press('a');assert.equal((await stored()).profiles.cn999cw.mode,'vector');await page.locator('#entry').waitFor();
 });
 await check('999 arithmetic and Tab completion use the shared engine',async()=>{
  await mode(0);await page.waitForFunction(()=>document.activeElement?.id==='entry'&&document.activeElement.hasFocus());await page.keyboard.type('sq');await page.locator('#math-completions').waitFor({state:'visible'});await page.keyboard.press('Tab');await page.keyboard.type('9');await page.keyboard.press('Enter');assert.equal((await stored()).profiles.cn999cw.history.at(-1).answer,'3');
 });
 await check('999 Verify checks chained relations and continues from the right-hand expression',async()=>{
  await key('tools').click();await choose('运算验证开启');await page.keyboard.type('3<4');await key('execute').click();
  assert.equal(await page.locator('#answer').innerText(),'True');assert.equal((await stored()).profiles.cn999cw.calculator.vars.Ans,1);
  await key('catalog').click();await choose('运算验证');await choose(/^>$/);await page.keyboard.type('5');await key('execute').click();
  assert.equal(await page.locator('#answer').innerText(),'False');assert.equal((await stored()).profiles.cn999cw.calculator.vars.Ans,0);
  await key('tools').click();await choose('运算验证关闭');assert.equal((await stored()).profiles.cn999cw.history.length,0);
 });
 await check('999 manual simplification applies the smallest common factor',async()=>{
  await key('tools').click();await choose('化简');await choose('手动');await key('clear').click();
  await page.keyboard.type('234');await key('frac').click();await page.keyboard.type('678');await key('execute').click();
  assert.match(await page.locator('#answer .katex-mathml annotation').textContent(),/234.*678/);
  await key('catalog').click();await choose('函数与分析');await choose('化简');await key('execute').click();
  assert.match(await page.locator('#answer .katex-mathml annotation').textContent(),/117.*339/);
  await key('tools').click();await choose('化简');await choose('自动');await key('clear').click();
 });
 await check('999 catalog stores an expression and runs colon-separated statements in order',async()=>{
  await key('clear').click();await page.keyboard.type('10');await key('catalog').click();await choose('多语句/赋值');await choose('→x');await key('execute').click();
  assert.equal((await stored()).profiles.cn999cw.calculator.vars.x,10);
  await key('clear').click();await page.keyboard.type('3+3');await key('catalog').click();await choose('多语句/赋值');await choose(/^:$/);await page.keyboard.type('3*3');
  await key('execute').click();assert.equal((await stored()).profiles.cn999cw.calculator.vars.Ans,6);
  await key('execute').click();assert.equal((await stored()).profiles.cn999cw.calculator.vars.Ans,9);
 });
 await check('999 normal density reproduces the official manual example and stores approximate Ans',async()=>{
  await dist(3);await parameters({x:36,'μ':35,'σ':2});near((await stored()).profiles.cn999cw.calculator.vars.Ans,.17603266338214976);assert.ok((await stored()).profiles.cn999cw.calculator.approximateVariables.includes('Ans'));assert.equal(await page.locator('.cw-dist-result output').innerText(),'0.1760326634');
  await key('execute').click();assert.equal(await page.locator('[data-name="μ"]').inputValue(),'35');assert.ok(await page.locator('.run-button').evaluate(button=>document.activeElement===button));
 });
 await check('999 inverse normal uses the documented left tail',async()=>{await dist(5);await parameters({'区域':.975,'μ':0,'σ':1});near((await stored()).profiles.cn999cw.calculator.vars.Ans,1.959963984540054);});
 await check('999 inverse-normal endpoints show their limits and keep the last finite Ans',async()=>{
  const before=(await stored()).profiles.cn999cw.calculator.vars.Ans;
  await dist(5);await parameters({'区域':0,'μ':0,'σ':1});
  assert.equal(await page.locator('.cw-dist-result output').innerText(),'−∞');
  await key('variables').click();assert.equal(await page.locator('.cw-dist-result output').innerText(),'−∞');
  await key('execute').click();await parameters({'区域':1});
  assert.equal(await page.locator('.cw-dist-result output').innerText(),'∞');
  assert.equal((await stored()).profiles.cn999cw.calculator.vars.Ans,before);
 });
 await check('999 Tools adds direct rare right tails without changing its seven native entries',async()=>{
  await mode(2);assert.equal(await page.locator('[data-dist-choice]').count(),7);
  await key('tools').click();assert.equal(await page.locator('[data-dist-choice]').count(),4);
  await key('back').click();assert.equal(await page.locator('[data-dist-choice]').count(),7);
  await key('tools').click();await page.keyboard.press('1');await page.keyboard.press('2');
  await parameters({x:10,N:1000,p:.0001});
  const answer=(await stored()).profiles.cn999cw.calculator.vars.Ans;
  assert.ok(Math.abs(answer/2.4074537897983194e-17-1)<1e-10);
 });
 await check('999 normal interval probability runs from lower to upper bound',async()=>{await dist(4);await parameters({'下限':-1,'上限':1,'μ':0,'σ':1});near((await stored()).profiles.cn999cw.calculator.vars.Ans,.6826894921370859);});
 await check('999 Distribution Catalog inserts a function at the parameter caret',async()=>{
  await dist(3);const x=page.locator('[data-name=x]');await x.fill('1+');
  await key('catalog').click();await choose('函数与分析');await choose('求和(Σ)');
  assert.equal(await x.inputValue(),'1+sum(');
  await page.keyboard.type('x,1,2)');await parameters({'μ':4,'σ':1});
  near((await stored()).profiles.cn999cw.calculator.vars.Ans,1/Math.sqrt(2*Math.PI));
 });
 await check('999 binomial cumulative list reproduces all four manual results',async()=>{
  const before=(await stored()).profiles.cn999cw.calculator.vars.Ans;
  await dist(2,true);
  for(const digit of ['2','3','4','5']){await key(digit).click();await page.locator('[data-action="execute"]').last().click();}
  await key('execute').click();
  await key('5').click();await key('execute').click();
  for(const digit of ['0','.','5'])await key(digit).click();
  await key('execute').click();await key('execute').click();
  assert.deepEqual((await probabilities()).slice(0,4).map(Number),[.5,.8125,.96875,1]);
  assert.equal((await stored()).profiles.cn999cw.calculator.vars.Ans,before);
  await page.screenshot({path:path.join(evidence,'999-distribution.png')});
 });
 await check('999 invalid list x produces a row error without suppressing valid rows',async()=>{await dist(1,true);await distributionRows([2,6]);assert.equal(await page.locator('[data-name="N"]').inputValue(),'5');await parameters({N:5,p:.5});const rows=await probabilities();near(Number(rows[0]),.3125);assert.match(rows[1],/错误/);});
 await check('999 distribution results can be stored and editing clears P without changing Ans',async()=>{
  const before=(await stored()).profiles.cn999cw.calculator.vars.Ans;
  await page.locator('[data-dist-row="0"][data-dist-col="1"]').click();await storeVariable(0,0);
  near((await stored()).profiles.cn999cw.calculator.vars.A,.3125);assert.equal((await stored()).profiles.cn999cw.calculator.vars.Ans,before);
  await page.locator('[data-dist-row="0"][data-dist-col="0"]').click();await key('delete').click();
  assert.ok((await probabilities()).every(value=>value===''));
  await key('tools').click();await choose('编辑');await choose('插入行');assert.equal(await page.locator('[data-dist-row="0"][data-dist-col="0"]').innerText(),'0');
 });
 await check('999 Poisson scalar mode produces a numerical probability',async()=>{await dist(6);await parameters({x:2,'λ':3});near((await stored()).profiles.cn999cw.calculator.vars.Ans,Math.exp(-3)*4.5);});
 await check('999 invalid standard deviation rejects calculation and retains Ans',async()=>{const before=(await stored()).profiles.cn999cw.calculator.vars.Ans;await dist(3);await parameters({x:1,'μ':0,'σ':0});assert.match(await page.locator('#form-error').innerText(),/标准差/);assert.equal((await stored()).profiles.cn999cw.calculator.vars.Ans,before);});
 await check('999 distribution list accepts 45 entries and rejects 46',async()=>{
  await dist(1,true);await key('tools').click();await choose('编辑');await choose('全部删除');
  await distributionRows(Array(45).fill(0));await parameters({N:1,p:.5});assert.equal((await probabilities()).length,45);
  await key('tools').click();await choose('编辑');await choose('插入行');assert.match(await page.locator('#form-error').innerText(),/1–45/);
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
  await cell('D1','=A1+$A$2');await page.locator('[data-cell=D1]').click();await key('tools').click();await choose('复制 & 粘贴');
  await page.locator('[data-cell=D2]').click();await key('execute').click();assert.equal(await page.locator('#sheet-entry').inputValue(),'=A2+$A$2');assert.equal(await cellText('D2'),'84');
  await key('down').click();await key('execute').click();assert.equal(await cellText('D3'),'91');await key('back').click();assert.equal(await page.locator('.cw-native-sheet.pasting').count(),0);
 });
 await check('999 catalog grabs a cell into the formula at the caret and variables store its result',async()=>{
  const before=(await stored()).profiles.cn999cw.calculator.vars.Ans;
  await page.locator('[data-cell=E1]').click();await key('shift').click();await key('(').click();
  await key('catalog').click();await choose('数据表格');await choose('数据抓取');
  await key('left').click();await key('execute').click();await key('+').click();await key('1').click();await key('execute').click();
  assert.equal(await cellText('E1'),'78');await page.locator('[data-cell=E1]').click();await storeVariable(0,1);
  assert.equal((await stored()).profiles.cn999cw.calculator.vars.B,78);assert.equal((await stored()).profiles.cn999cw.calculator.vars.Ans,before);
 });
 await check('999 sheet options retain stale formulas with Auto Calc off and show calculated values',async()=>{
  await key('tools').click();await choose('自动计算');await choose('关');await key('back').click();
  await cell('A3','100');assert.equal(await cellText('B3'),'95');await key('tools').click();await choose('重新计算');assert.equal(await cellText('B3'),'197');
  await key('tools').click();await choose('显示单元格');await choose('数值');await key('back').click();
  await page.locator('[data-cell=B3]').click();assert.equal(await page.locator('#sheet-entry').inputValue(),'197');await key('execute').click();assert.equal(await page.locator('#sheet-entry').inputValue(),'=2A3-3');await key('back').click();
 });
 await check('999 circular cell edits report an error and retain the previous value',async()=>{
  await page.locator('[data-cell=A1]').click();await page.locator('#sheet-entry').fill('=B1');await page.keyboard.press('Enter');assert.match(await page.locator('#sheet-error').innerText(),/循环引用/);assert.equal(await cellText('A1'),'35');await page.keyboard.press('Escape');
 });
 await check('999 navigation and Enter advance rows without leaving the sheet',async()=>{
  await page.locator('[data-cell=A1]').click();await page.keyboard.press('ArrowRight');assert.equal(await page.locator('#sheet-address').innerText(),'B1');await page.keyboard.type('5');await page.keyboard.press('Enter');assert.equal(await page.locator('#sheet-address').innerText(),'B2');assert.equal(await cellText('B1'),'5');
 });
 await check('999 sheet survives changing apps and clears on ON as documented',async()=>{
  await mode(0);await mode(3);assert.equal(await cellText('A1'),'35');assert.equal((await stored()).profiles.cn999cw.calculator.vars.B,78);
  await key('on').click();assert.equal(await cellText('A1'),'');assert.equal(await page.locator('#sheet-address').innerText(),'A1');
  assert.equal((await stored()).profiles.cn999cw.calculator.vars.B,0);assert.equal((await stored()).profiles.cn999cw.calculator.vars.Ans,0);
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
 await check('999 LineI/DecimalO and the two Norm modes change the result display',async()=>{
  await mode(0);await key('setup').click();await choose('计算设置');await choose('输入/输出');await choose('线性输入/小数输出');await key('clear').click();
  assert.equal(await page.locator('textarea#entry').count(),1);
  await page.keyboard.type('1/200');await key('execute').click();assert.match(await page.locator('#answer').innerText(),/5×10/);assert.equal(await page.locator('#answer sup').textContent(),'-3');
  await key('setup').click();await choose('计算设置');await choose('显示格式');await choose(/^Norm/);await choose('Norm 2');await key('clear').click();
  assert.equal(await page.locator('#answer').innerText(),'0.005');
 });
 await check('999 Settings & Data resets transient apps and preserves variables and Ans',async()=>{
  await mode(3);await cell('A1','9');await page.locator('[data-cell=A1]').click();await storeVariable(0,0);
  await key('setup').click();await choose('复位');await choose('设置 & 数据');await choose(/^是$/);
  const profile=(await stored()).profiles.cn999cw;
  assert.equal(profile.calculator.vars.A,9);assert.equal(profile.calculator.vars.Ans,.005);
  assert.equal(profile.cwSettings.inputOutput,'math');assert.equal(profile.cwSettings.norm,1);
  await page.locator('[data-mode="3"]').click();assert.equal(await cellText('A1'),'');
 });
 await check('switching to 991 restores ten apps and keeps 999 memory isolated',async()=>{await key('models').click();await page.locator('[data-model-choice=cncw]').click();await key('menu').click();assert.equal(await page.locator('.mode-tile').count(),10);assert.equal(await page.locator('.model').innerText(),'fx-991CN CW');assert.equal((await stored()).profiles.cncw?.calculator.vars.A??0,0);assert.equal((await stored()).profiles.cn999cw.calculator.vars.A,9);});
 await check('999 extended workbook fills all 225 cells and restores from a local file after ON',async()=>{
  await key('models').click();await page.locator('[data-model-choice=cn999cw]').click();await mode(3);
  await key('tools').click();await choose('桌面工作表');await choose('容量模式');await choose('扩展容量');await key('clear').click();
  await page.locator('.cw-sheet-capacity').waitFor({state:'visible'});
  await key('tools').click();await choose('数值填充');await parameters({expression:'7',range:'A1:E45'});
  assert.equal(await cellText('E45'),'7');
  await cell('C5','=2E10');assert.equal(await cellText('C5'),'14');
  const backupPath=path.join(profile,'999-workbook-backup.json');
  await app.evaluate(({session},filename)=>{
    session.defaultSession.once('will-download',(_,item)=>item.setSavePath(filename));
  },backupPath);
  await key('tools').click();await choose('桌面工作表');await choose('保存工作表文件');
  let saved;
  for(let attempt=0;attempt<40;attempt++){
    try{saved=JSON.parse(await fs.readFile(backupPath,'utf8'));break;}catch{await new Promise(resolve=>setTimeout(resolve,100));}
  }
  assert.equal(saved?.capacity,'extended');assert.equal(Object.keys(saved.cells).length,225);
  await key('on').click();assert.equal(await cellText('E45'),'');assert.equal(await page.locator('.cw-sheet-capacity').isVisible(),false);
  await key('tools').click();await choose('桌面工作表');
  const [chooser]=await Promise.all([page.waitForEvent('filechooser'),choose('从文件恢复')]);
  await chooser.setFiles(backupPath);
  await page.locator('.cw-sheet-capacity').waitFor({state:'visible'});
  assert.equal(await cellText('E45'),'7');
  assert.equal(await cellText('C5'),'14');
  assert.equal((await stored()).profiles.cn999cw.sheet,undefined);
  const replacement={...saved,cells:{A1:'99'}};
  await key('tools').click();await choose('桌面工作表');
  const [next]=await Promise.all([page.waitForEvent('filechooser'),choose('从文件恢复')]);
  await next.setFiles({name:'999-replacement.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(replacement))});
  await page.locator('.cw-list-heading').filter({hasText:'用文件替换当前工作表？'}).waitFor();
  await choose(/^取消$/);await key('clear').click();assert.equal(await cellText('A1'),'7');
  await key('tools').click();await choose('桌面工作表');
  const [accepted]=await Promise.all([page.waitForEvent('filechooser'),choose('从文件恢复')]);
  await accepted.setFiles({name:'999-replacement.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(replacement))});
  await choose(/^替换$/);assert.equal(await cellText('A1'),'99');assert.equal(await cellText('E45'),'');
 });
 await check('no unhandled 999 renderer errors',async()=>assert.deepEqual(errors,[]));
}finally{
 await fs.writeFile(path.join(evidence,'999-ui-results.json'),JSON.stringify({date:new Date().toISOString(),counts:{passed:passed.length,failed:failed.length,notRun:total-passed.length-failed.length},passed,failed,errors},null,2));await app?.close().catch(()=>{});
}
if(failed.length)process.exitCode=1;
