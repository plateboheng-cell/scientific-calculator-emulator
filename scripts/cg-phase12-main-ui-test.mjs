import {_electron} from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {cg50} from '../src/models/cg50.js';

// Exercise the real entry, physical keyboard, application controllers and
// persisted profile. This is a bounded regression suite, not a parity claim.
const evidence=path.resolve('.verification');await fs.mkdir(evidence,{recursive:true});
const profile=await fs.mkdtemp(path.join(evidence,'cg-phase12-main-'));
const launch=()=>_electron.launch({executablePath:process.env.CNX_ELECTRON_PATH||undefined,args:[process.env.CNX_APP_PATH||'.','--user-data-dir='+profile],env:{...process.env,CNX_TEST:'1',CNX_TEST_SYSTEM_LANGUAGES:'["en-US"]'}});
const passed=[],errors=[];let app,page,runtime;
const watch=()=>{page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));};
const key=action=>page.locator('[data-action="'+action+'"]').first();
const soft=number=>key('cg-f'+number).click();
const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('cnx-v2')).profiles.cg50);
const carrier=(n,d=1)=>({kind:'cg-rational-v1',n:String(n),d:String(d),decimal:false});
const closeTo=(actual,expected)=>assert.ok(Math.abs(actual-expected)<=1e-12*Math.max(1,Math.abs(expected)),`${actual} differs from ${expected}`);
const noError=async()=>assert.equal(await page.locator('#answer.error').count(),0,await page.locator('#answer').innerText());
const setup=async()=>{await key('shift').click();await key('menu').click();await page.locator('.cg-setup-panel').waitFor();};
const choose=async(row,number)=>{await page.locator('[data-setup-row="'+row+'"]').click();await soft(number);};
const inputMode=async name=>{await setup();await choose('inputOutput',name==='Math'?1:2);await key('back').click();assert.equal(await page.locator('#entry').evaluate(field=>field.tagName),name==='Math'?'MATH-FIELD':'INPUT');};
const mode=async name=>{await key('menu').click();await page.locator('[data-mode="'+cg50.nativeMenu.findIndex(row=>row[3]===name)+'"]').click();};
const selectModel=async id=>{if(!await page.locator('#model-picker[open]').count())await key('models').click();await page.locator('[data-model-choice="'+id+'"]').click();};
async function setEntry(source){
  await key('cg-clear-on').click();
  await page.locator('#entry').evaluate((field,value)=>{field.value=value;field.dispatchEvent(new Event('input',{bubbles:true}));field.focus();},source);
}
async function calculate(source){await setEntry(source);await key('execute').click();await noError();return (await saved()).calculator.vars.Ans;}
async function fraction(n,d){assert.deepEqual((await saved()).calculator.exactAnswer,carrier(n,d));assert.match(await page.locator('#answer annotation').textContent(),new RegExp('\\\\frac\\{'+n+'\\}\\{'+d+'\\}'));}
async function simpMenu(){await key('options').click();await soft(4);await soft(6);await soft(6);assert.deepEqual(await page.locator('#cg-context-softkeys button').allTextContents(),['Int÷','Rmdr','Simp','','','▶']);}
async function metricMenu(){await key('options').click();await soft(6);assert.equal((await page.locator('#cg-context-softkeys button').allTextContents())[0],'CONVERT');await soft(1);await page.locator('.cg-metric-menu').waitFor();assert.deepEqual(await page.locator('#cg-context-softkeys button').allTextContents(),['▶','LENGTH','AREA','VOLUME','TIME','▶']);}
async function lengthUnit(number,{secondPage=false}={}){await soft(2);await page.locator('.cg-metric-unit-popup').waitFor();if(secondPage)await key('right').click();await key(String(number)).click();assert.equal(await page.locator('.cg-metric-unit-popup').count(),0);}
async function centimetresToInches(){await metricMenu();await lengthUnit(5);await soft(1);await lengthUnit(2,{secondPage:true});}
async function temperature(from,to){await metricMenu();await soft(6);assert.equal((await page.locator('#cg-context-softkeys button').allTextContents())[1],'TMPR');await soft(2);await key(String(from)).click();await soft(1);await soft(2);await key(String(to)).click();}
async function headerFormula(index,source){await page.locator('[name=selectedList]').selectOption({value:String(index)});await page.locator('[data-stat-header="'+index+'"]').click();await page.locator('[data-stat-formula]').waitFor({state:'visible'});await page.locator('[data-stat-formula]').fill(source);await key('execute').click();assert.equal((await page.locator('.cg-stat-error').innerText()).trim(),'');}
async function check(name,run){
  try{await run();passed.push(name);console.log('PASS '+name);}
  catch(error){await fs.writeFile(path.join(evidence,'cg-phase12-main-failure.json'),JSON.stringify({name,error:error.stack,passed,errors,entry:await page.locator('#entry').evaluate(field=>field.value).catch(()=>null),screen:await page.locator('#screen').innerText().catch(()=>null),state:await saved().catch(()=>null)},null,2));await page.screenshot({path:path.join(evidence,'cg-phase12-main-failure.png')}).catch(()=>{});throw error;}
}

try{
  app=await launch();page=await app.firstWindow();watch();runtime=await app.evaluate(({app})=>({version:app.getVersion(),packaged:app.isPackaged}));
  await page.locator('#model-picker[open]').waitFor();await selectModel('cg50');await mode('calc');
  await check('SET UP Manual retains the actual Math fraction15/60 and its persisted exact carrier',async()=>{
    await setup();await choose('inputOutput',1);await choose('complex',1);await choose('display',3);await choose('fracResult',1);await choose('simplify',2);await key('back').click();
    assert.equal(await calculate('\\frac{15}{60}'),.25);await fraction(15,60);assert.equal((await saved()).cgWorkspace.system.simplify,'Manual');
  });
  await check('OPTN CALC page3 Simp takes the smallest factor3 then5 and shows the actual F result',async()=>{
    await simpMenu();await soft(3);await key('execute').click();await noError();await fraction(5,20);assert.equal(await page.locator('.cg-simp-factor').innerText(),'F=3');
    await soft(3);await key('execute').click();await noError();await fraction(1,4);assert.equal(await page.locator('.cg-simp-factor').innerText(),'F=5');
    await page.locator('#screen').screenshot({path:path.join(evidence,'cg-phase12-simp.png')});
  });
  await check('Simp accepts the physical specified divisor9 for27/63',async()=>{
    await calculate('\\frac{27}{63}');await simpMenu();await soft(3);await key('9').click();await key('execute').click();await noError();await fraction(3,7);assert.equal(await page.locator('.cg-simp-factor').innerText(),'F=9');
  });
  await check('Simp rejects factor3 for4/8 without changing scalar Ans or its exact banks',async()=>{
    await calculate('\\frac{4}{8}');const before=(await saved()).calculator;await simpMenu();await soft(3);await key('3').click();await key('execute').click();
    assert.match(await page.locator('#answer.error').innerText(),/Can[’']t Simplify/);assert.deepEqual((await saved()).calculator,before);assert.equal(await page.locator('.cg-simp-factor').count(),0);
  });
  await check('Simp of an irreducible answer retains1/4 and removes the old F indicator',async()=>{
    await calculate('\\frac{1}{4}');await simpMenu();await soft(3);await key('execute').click();await noError();await fraction(1,4);assert.equal(await page.locator('.cg-simp-factor').count(),0);
  });
  await check('physical store arrow and ALPHA A retain the Manual exact fraction in a scalar register',async()=>{
    await calculate('\\frac{15}{60}');await key('cg-store-arrow').click();await key('alpha').click();await key('x').click();await key('execute').click();await noError();
    const state=await saved();assert.equal(state.calculator.vars.A,.25);assert.deepEqual(state.calculator.exactVariables.A,carrier(15,60));assert.deepEqual(state.calculator.exactAnswer,carrier(15,60));
  });
  await check('a real Electron close and restart preserve Manual, exact Ans and the stored fraction',async()=>{
    await app.close();app=await launch();page=await app.firstWindow();watch();await page.locator('#entry').waitFor();const state=await saved();
    assert.equal(state.cgWorkspace.system.simplify,'Manual');assert.equal(state.cgWorkspace.system.inputOutput,'Math');assert.deepEqual(state.calculator.exactVariables.A,carrier(15,60));assert.deepEqual(state.calculator.exactAnswer,carrier(15,60));
    assert.equal(await calculate('A'),.25);await fraction(15,60);
  });
  await check('Line SimplifyAuto and SimplifyMan commands synchronize SET UP and exact state',async()=>{
    await inputMode('Line');assert.equal(await calculate('SimplifyAuto:15/60→B'),.25);assert.equal((await saved()).cgWorkspace.system.simplify,'Auto');assert.deepEqual((await saved()).calculator.exactVariables.B,carrier(1,4));
    assert.equal(await calculate('SimplifyMan:15/60→B'),.25);assert.equal((await saved()).cgWorkspace.system.simplify,'Manual');assert.deepEqual((await saved()).calculator.exactVariables.B,carrier(15,60));assert.match(await page.locator('#answer').innerText(),/15\s*\/\s*60/);
    await setEntry('SimplifyAuto');await key('execute').click();await noError();assert.equal((await saved()).cgWorkspace.system.simplify,'Auto');assert.equal((await saved()).calculator.vars.Ans,.25);
  });
  await check('Line Simp with no divisor accepts EXE after the trailing command space',async()=>{
    assert.equal(await calculate('SimplifyMan:15/60'),.25);await simpMenu();await soft(3);assert.match(await page.locator('#entry').inputValue(),/^Ans\s+Simp\s*$/);
    await key('execute').click();await noError();assert.deepEqual((await saved()).calculator.exactAnswer,carrier(5,20));assert.match(await page.locator('#answer').innerText(),/5\s*\/\s*20/);assert.equal(await page.locator('.cg-simp-factor').innerText(),'F=3');
  });
  await check('Line malformed Simp divisors cannot concatenate into12 or alter24/96',async()=>{
    for(const divisor of ['1 2','(1)(2)']){
      assert.equal(await calculate('SimplifyMan:24/96'),.25);const before=(await saved()).calculator;assert.deepEqual(before.exactAnswer,carrier(24,96));
      await setEntry('Ans Simp '+divisor);await key('execute').click();assert.equal(await page.locator('#answer.error').count(),1);assert.deepEqual((await saved()).calculator,before);assert.equal(await page.locator('.cg-simp-factor').count(),0);
    }
  });
  await check('Line physical mixed fraction toggle shows73/20 then3 13/20 then73/20 without changing its exact value',async()=>{
    closeTo(await calculate('SimplifyMan:73/20'),73/20);assert.match(await page.locator('#answer').innerText(),/73\s*\/\s*20/);
    await key('shift').click();await key('sd').click();assert.match(await page.locator('#answer').innerText(),/3\s+13\s*\/\s*20/);assert.deepEqual((await saved()).calculator.exactAnswer,carrier(73,20));
    await key('shift').click();await key('sd').click();assert.match(await page.locator('#answer').innerText(),/73\s*\/\s*20/);assert.deepEqual((await saved()).calculator.exactAnswer,carrier(73,20));assert.equal((await saved()).cgWorkspace.system.fracResult,'d/c');
  });
  await check('Program SimplifyMan commits the shared preference and exact register without losing the program output',async()=>{
    await mode('program');await page.locator('[data-program-source]').fill('SimplifyMan:27/63→C:Print C');await soft(1);
    await page.waitForFunction(()=>JSON.parse(localStorage.getItem('cnx-v2')).profiles.cg50.calculator.vars.C===27/63);
    assert.equal((await saved()).cgWorkspace.system.simplify,'Manual');assert.deepEqual((await saved()).calculator.exactVariables.C,carrier(27,63));assert.match(await page.locator('.cg-program-panel .cg-result').innerText(),/27\/63/);await mode('calc');
    await setup();assert.match(await page.locator('[data-setup-value="simplify"]').innerText(),/Manual/);await key('back').click();
  });
  await check('actual Statistics header formula stores List3 once and source edits do not recalculate its result',async()=>{
    await calculate('{3,4,5}→List1:{6,7,8}→List2:15/60');const before=(await saved()).calculator;
    await mode('stat');await headerFormula(2,'List1+List2');assert.deepEqual((await saved()).cgWorkspace.statistics.lists[2],[9,11,13]);assert.deepEqual((await saved()).calculator,before);
    await page.locator('[data-stat-list="0"][data-stat-row="0"]').click();await page.locator('[data-stat-value]').fill('100');await key('execute').click();
    assert.deepEqual((await saved()).cgWorkspace.statistics.lists[0],[100,4,5]);assert.deepEqual((await saved()).cgWorkspace.statistics.lists[2],[9,11,13]);assert.equal(JSON.stringify((await saved()).cgWorkspace.statistics).includes('List1+List2'),false);
    await mode('calc');
  });
  await check('Math Metric native F keys and numeric popup convert50cm to inches with a following+1',async()=>{
    await inputMode('Math');await setEntry('50');await centimetresToInches();await key('+').click();await key('1').click();await key('execute').click();await noError();closeTo((await saved()).calculator.vars.Ans,50/2.54+1);
    const state=await saved();assert.equal(state.history.at(-1).expr.replace(/[()\s]/g,''),'50[cm]▶[in]+1');assert.equal(state.calculator.exactAnswer,null);assert.equal(await page.locator('.cg-metric-menu').count(),1);
    await page.locator('#screen').screenshot({path:path.join(evidence,'cg-phase12-metric-math.png')});
  });
  await check('Line Metric uses the same native menus and preserves a following+1 as ordinary arithmetic',async()=>{
    await inputMode('Line');await setEntry('50');await centimetresToInches();assert.match(await page.locator('#entry').inputValue(),/50\[cm\]▶\[in\]/);await key('+').click();await key('1').click();await key('execute').click();await noError();closeTo((await saved()).calculator.vars.Ans,50/2.54+1);
    assert.equal((await saved()).history.at(-1).expr.replace(/[()\s]/g,''),'50[cm]▶[in]+1');assert.equal((await saved()).calculator.exactAnswer,null);
  });
  await check('Math and Line temperature menus convert32°F to0°C without an offset residue',async()=>{
    for(const name of ['Math','Line']){await inputMode(name);await setEntry('32');await temperature(3,1);await key('execute').click();await noError();assert.equal((await saved()).calculator.vars.Ans,0);}
  });
  await check('Metric operates on the shared flat List while preserving the independent scalar exact Ans',async()=>{
    await calculate('{1,2,3}→List1:17');const before=(await saved()).calculator;
    await inputMode('Math');await setEntry('');await key('shift').click();await key('1').click();await key('1').click();await metricMenu();await lengthUnit(6);await soft(1);await lengthUnit(5);await key('execute').click();await noError();
    const state=await saved();assert.deepEqual(state.calculator.nativeAnswers.list,[100,200,300]);assert.deepEqual(state.cgWorkspace.statistics.lists[0],[1,2,3]);assert.equal(state.calculator.vars.Ans,17);assert.deepEqual(state.calculator.exactAnswer,before.exactAnswer);
  });
  await check('Math native List1[2] index followed by Metric m to cm returns200 without changing the source List',async()=>{
    await setEntry('');await key('shift').click();await key('1').click();await page.keyboard.type('1[2]');await metricMenu();await lengthUnit(6);await soft(1);await lengthUnit(5);await key('execute').click();await noError();
    const state=await saved();assert.equal(state.calculator.vars.Ans,200);assert.equal(state.calculator.exactAnswer,null);assert.deepEqual(state.cgWorkspace.statistics.lists[0],[1,2,3]);
  });
  await check('Metric EXIT closes popup then conversion controller and returns to its parent OPTN page',async()=>{
    await setEntry('50');await metricMenu();await soft(2);assert.equal(await page.locator('.cg-metric-unit-popup').count(),1);await key('back').click();assert.equal(await page.locator('.cg-metric-unit-popup').count(),0);assert.equal(await page.locator('.cg-metric-menu').count(),1);
    await key('back').click();assert.equal(await page.locator('.cg-metric-menu').count(),0);assert.equal((await page.locator('#cg-context-softkeys button').allTextContents())[0],'CONVERT');
  });
  await check('CAPTURE overlay keyboard3 and Enter save Capt3 while an open Metric unit popup remains unchanged',async()=>{
    await setEntry('50');await metricMenu();await soft(2);const entryBefore=await page.locator('#entry').evaluate(field=>field.value);
    await key('shift').click();await key('7').click();await page.locator('#cg-capture-dialog').waitFor();await page.keyboard.type('3');await page.keyboard.press('Enter');await page.locator('#cg-capture-dialog').waitFor({state:'detached'});
    const capture=(await saved()).cgWorkspace.programImageBanks.capture['3'];assert.equal(capture.width,384);assert.equal(capture.height,216);assert.equal(await page.locator('#entry').evaluate(field=>field.value),entryBefore);assert.equal(await page.locator('.cg-metric-unit-popup').count(),1);
    await key('back').click();await key('back').click();assert.equal(await page.locator('.cg-metric-menu').count(),0);
  });
  await check('SET UP disposes an open Metric popup and returns to the intact input',async()=>{
    await setEntry('50');await metricMenu();await soft(2);await setup();assert.equal(await page.locator('.cg-metric-menu').count(),0);await key('back').click();assert.equal(await page.locator('.cg-metric-menu').count(),0);assert.equal(await page.locator('#entry').evaluate(field=>field.value),'50');
  });
  await check('model switching disposes Metric UI and retains the actual CG calculation and shared registers',async()=>{
    const before=(await saved()).calculator;await metricMenu();await soft(2);await selectModel('ti36xpro');assert.equal(await page.locator('.cg-metric-menu').count(),0);await selectModel('cg50');await page.locator('#entry').waitFor();assert.equal(await page.locator('.cg-metric-menu').count(),0);assert.deepEqual((await saved()).calculator,before);
  });
  assert.deepEqual(errors,[]);await page.screenshot({path:path.join(evidence,'cg-phase12-main-ui.png')});
}finally{
  await fs.writeFile(path.join(evidence,'cg-phase12-main-ui-results.json'),JSON.stringify({date:new Date().toISOString(),scope:'real main controller, native keyboard/menu actions and Electron restart',runtime,passed,errors,profile},null,2));
  await app?.close().catch(()=>{});
}
