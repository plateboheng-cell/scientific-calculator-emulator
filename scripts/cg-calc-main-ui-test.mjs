import {_electron} from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {cg50} from '../src/models/cg50.js';
import {APP_VERSION} from '../src/brand.js';

// Real main-controller regression: physical calculator keys, native menus,
// MathLive/Line input, persisted calculator banks, notices and Electron restart.
// The profile is always isolated from the user's installed application data.
const evidence=path.resolve('.verification');await fs.mkdir(evidence,{recursive:true});
const profile=await fs.mkdtemp(path.join(evidence,'cg-calc-main-'));
const launch=()=>_electron.launch({executablePath:process.env.CNX_ELECTRON_PATH||undefined,args:[process.env.CNX_APP_PATH||'.','--user-data-dir='+profile],env:{...process.env,CNX_TEST:'1',CNX_TEST_SYSTEM_LANGUAGES:'["en-US"]'}});
const passed=[],errors=[];let app,page,runtime;
const watch=()=>{page.setDefaultTimeout(20000);page.on('pageerror',error=>errors.push(error.message));};
const key=action=>page.locator('[data-action="'+action+'"]').first();
const soft=number=>key('cg-f'+number).click();
const labels=()=>page.locator('#cg-context-softkeys button').allTextContents();
const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('cnx-v2')).profiles.cg50);
const close=(actual,expected,tolerance=1e-7)=>assert.ok(Math.abs(actual-expected)<=tolerance*Math.max(1,Math.abs(expected)),`${actual} differs from ${expected}`);
const arrayClose=(actual,expected,tolerance=1e-6)=>{assert.ok(Array.isArray(actual));assert.equal(actual.length,expected.length);actual.forEach((value,index)=>close(value,expected[index],tolerance));};
const noError=async()=>assert.equal(await page.locator('#answer.error').count(),0,await page.locator('#answer').innerText());
const entry=()=>page.locator('#entry').evaluate(field=>field.value);
const setup=async()=>{await key('shift').click();await key('menu').click();await page.locator('.cg-setup-panel').waitFor();};
const choice=async(row,number)=>{await page.locator('[data-setup-row="'+row+'"]').click();await soft(number);};
const inputMode=async name=>{await setup();await choice('inputOutput',name==='Math'?1:2);await key('back').click();assert.equal(await page.locator('#entry').evaluate(field=>field.tagName),name==='Math'?'MATH-FIELD':'INPUT');};
const mode=async name=>{await key('menu').click();const index=cg50.nativeMenu.findIndex(row=>row[3]===name);assert(index>=0);await page.locator('[data-mode="'+index+'"]').click();};
async function setEntry(source){await key('cg-clear-on').click();await page.locator('#entry').evaluate((field,value)=>{field.value=value;field.dispatchEvent(new Event('input',{bubbles:true}));field.focus();},source);}
async function calculate(source){await setEntry(source);await key('execute').click();await noError();return (await saved()).calculator.vars.Ans;}
async function calcMenu(pageIndex=0){await key('options').click();await soft(4);for(let index=0;index<pageIndex;index++)await soft(6);}
async function argumentsInput(mathLatex,lineSource){if(await page.locator('#entry').evaluate(field=>field.tagName)==='MATH-FIELD')await page.locator('#entry').evaluate((field,value)=>{field.focus();field.insert(value,{format:'latex',selectionMode:'after'});field.dispatchEvent(new Event('input',{bubbles:true}));},mathLatex);else await page.keyboard.type((lineSource??mathLatex)+')');}
async function nativeFunction(pageIndex,index,mathLatex,lineSource){await setEntry('');await calcMenu(pageIndex);await soft(index);const tag=await page.locator('#entry').evaluate(field=>field.tagName);if(tag==='MATH-FIELD')assert.match(await entry(),/\\CGCalcF/);await argumentsInput(mathLatex,lineSource);await key('execute').click();await noError();return saved();}
async function nativeInteger(command,input='107',right='7'){await setEntry(input);await calcMenu(2);await soft(command==='Int÷'?1:2);for(const digit of right)await key(digit).click();await key('execute').click();await noError();return (await saved()).calculator.vars.Ans;}
const banks=state=>({calculator:state.calculator,matrices:state.matrices,vectors:state.vectors,lists:state.cgWorkspace.statistics.lists,strings:state.cgWorkspace.strings});
async function check(name,run){try{await run();passed.push(name);console.log('PASS '+name);}catch(error){await fs.writeFile(path.join(evidence,'cg-calc-main-failure.json'),JSON.stringify({date:new Date().toISOString(),name,error:error.stack,runtime,passed,errors,entry:await entry().catch(()=>null),screen:await page.locator('#screen').innerText().catch(()=>null),notice:await page.locator('#cg-calculation-notice').innerText().catch(()=>null),state:await saved().catch(()=>null)},null,2));await page.screenshot({path:path.join(evidence,'cg-calc-main-failure.png')}).catch(()=>{});throw error;}}
async function expectLineError(source,pattern){const before=banks(await saved());await setEntry(source);await key('execute').click();assert.match(await page.locator('#answer.error').innerText(),pattern);assert.deepEqual(banks(await saved()),before);assert.equal(await page.locator('#cg-calculation-notice').count(),0);}

try{
  app=await launch();page=await app.firstWindow();watch();runtime=await app.evaluate(({app})=>({version:app.getVersion(),packaged:app.isPackaged}));assert.equal(runtime.version,APP_VERSION);
  await page.locator('[data-model-choice="cg50"]').click();await mode('calc');
  await setup();await choice('inputOutput',1);await choice('complex',1);await choice('angle',1);await choice('simplify',1);await key('back').click();

  await check('native CALC exposes the three manual F-key pages in their physical positions',async()=>{
    await calcMenu();assert.deepEqual(await labels(),['Solve','d/dx','d²/dx²','∫dx','SolveN','▶']);await soft(6);assert.deepEqual(await labels(),['FMin','FMax','Σ(','logab','','▶']);await soft(6);assert.deepEqual(await labels(),['Int÷','Rmdr','Simp','','','▶']);await soft(6);assert.deepEqual(await labels(),['Solve','d/dx','d²/dx²','∫dx','SolveN','▶']);
  });
  for(const input of ['Math','Line']){
    await check(input+' native F-key Int÷ and Rmdr reproduce107÷7 quotient15 and remainder2',async()=>{await inputMode(input);assert.equal(await nativeInteger('Int÷'),15);assert.equal(await nativeInteger('Rmdr'),2);const history=(await saved()).history;assert.match(history.at(-2).expr,/Int÷/);assert.match(history.at(-1).expr,/Rmdr/);});
    await check(input+' native integer operators preserve multiplication division addition and left associativity',async()=>{
      await setEntry('107');await calcMenu(2);await soft(1);for(const action of ['7','*','2','+','1'])await key(action).click();await key('execute').click();await noError();assert.equal((await saved()).calculator.vars.Ans,31);
      await setEntry(input==='Math'?'3\\times10':'3*10');await calcMenu(2);await soft(1);for(const action of ['3','+','1'])await key(action).click();await key('execute').click();await noError();assert.equal((await saved()).calculator.vars.Ans,11);
      await setEntry(input==='Math'?'100\\div4':'100/4');await calcMenu(2);await soft(2);await key('6').click();await key('execute').click();await noError();assert.equal((await saved()).calculator.vars.Ans,1);
    });
    await check(input+' physical DEL Undo and native CLIP preserve an atomic integer operator',async()=>{
      await setEntry('107');await calcMenu(2);await soft(1);await key('7').click();const original=await entry();await key('delete').click();await key('delete').click();assert.ok(!/Int÷|CGCalcIntDiv/.test(await entry()));
      for(let index=0;index<3&&await entry()!==original;index++){await key('alpha').click();await key('delete').click();}assert.equal(await entry(),original);
      await key('shift').click();await key('8').click();assert.deepEqual(await labels(),['COPY','CUT','','','','EXIT']);await soft(1);await key('cg-clear-on').click();await key('shift').click();await key('9').click();await key('execute').click();await noError();assert.equal((await saved()).calculator.vars.Ans,15);assert.match((await saved()).history.at(-1).expr,/Int÷/);
    });
  }
  await inputMode('Math');
  await check('CALC logab menu reads base2 and value8 in the native argument order',async()=>{const state=await nativeFunction(1,4,'2,8');close(state.calculator.vars.Ans,3);assert.match(state.history.at(-1).expr,/^logab\(/);});
  await check('CALC second derivative reads the complete polynomial body and returns26 at3',async()=>{const state=await nativeFunction(0,3,'X^{3}+4X^{2}+X-6,3');close(state.calculator.vars.Ans,26,1e-5);assert.match(state.history.at(-1).expr,/^diff2\(/);assert.ok(state.calculator.approximateVariables.includes('Ans'));assert.equal(state.calculator.exactAnswer,null);});
  await check('CALC first derivative returns12 for x cubed at2 and marks the result approximate',async()=>{const state=await nativeFunction(0,2,'X^{3},2');close(state.calculator.vars.Ans,12,1e-6);assert.ok(state.calculator.approximateVariables.includes('Ans'));assert.equal(state.calculator.exactAnswer,null);});
  await check('CALC integral uses radians internally with optional tolerance while preserving Deg SET UP',async()=>{
    const state=await nativeFunction(0,4,'\\sin(X),0,\\pi,0.000001');close(state.calculator.vars.Ans,2,1e-6);assert.equal(state.calculator.angle,'Deg');assert.match(state.history.at(-1).expr,/,0\.000001\)$/);assert.ok(state.calculator.approximateVariables.includes('Ans'));
    await setEntry('\\int_0^{\\pi}\\sin(X)\\,\\mathrm{d}X');await key('execute').click();await noError();close((await saved()).calculator.vars.Ans,2,1e-5);assert.equal((await saved()).calculator.angle,'Deg');
  });
  await check('CALC Sigma stores55 and intentionally updates its native scalar variable K to6',async()=>{const state=await nativeFunction(1,3,'K^{2}-3K+5,K,2,6');close(state.calculator.vars.Ans,55);assert.equal(state.calculator.vars.K,6);assert.match(state.history.at(-1).expr,/^Sigma\(/);});
  await check('the real natural Sigma template maps lower k only within its body and retains constant e',async()=>{
    await setEntry('\\sum_{k=1}^{3}(k+e)');await key('execute').click();await noError();const state=await saved();close(state.calculator.vars.Ans,6+3*Math.E);assert.equal(state.calculator.vars.K,3);assert.match(state.history.at(-1).expr,/^Sigma\(.+,K,1,3\)$/);assert.ok(state.history.at(-1).expr.includes('(e)'));
  });
  await check('CALC FMin returns native ListAns {2,5} independently of scalar Ans',async()=>{
    await calculate('17');const before=(await saved()).calculator;const state=await nativeFunction(1,1,'(X-2)^{2}+5,-1,4');arrayClose(state.calculator.nativeAnswers.list,[2,5]);assert.equal(state.calculator.vars.Ans,17);assert.deepEqual(state.calculator.exactAnswer,before.exactAnswer);assert.match(await page.locator('#answer').innerText(),/2/);
  });
  await check('CALC FMax includes the endpoint and returns native ListAns {2,4}',async()=>{const before=(await saved()).calculator;const state=await nativeFunction(1,2,'X^{2},0,2');arrayClose(state.calculator.nativeAnswers.list,[2,4]);assert.equal(state.calculator.vars.Ans,before.vars.Ans);assert.deepEqual(state.calculator.exactAnswer,before.exactAnswer);});
  await check('CALC SolveN shows the actual More solutions notice and physical EXE reveals roots {-1,6}',async()=>{
    const before=(await saved()).calculator;const state=await nativeFunction(0,5,'(X+1)(X-6),X,-2,7');await page.locator('#cg-calculation-notice').waitFor();assert.match(await page.locator('#cg-calculation-notice').innerText(),/More solutions may exist/);arrayClose(state.calculator.nativeAnswers.list,[-1,6]);assert.equal(state.calculator.vars.Ans,before.vars.Ans);assert.deepEqual(state.calculator.exactAnswer,before.exactAnswer);
    await key('execute').click();await page.locator('#cg-calculation-notice').waitFor({state:'detached'});assert.match(await page.locator('#answer').innerText(),/-1/);assert.match(await page.locator('#answer').innerText(),/6/);await page.locator('#screen').screenshot({path:path.join(evidence,'cg-calc-solven-main.png')});
  });
  await check('bounded native Solve chooses root2 of x squared minus4 for guess1 in[0,3]',async()=>{const state=await nativeFunction(0,1,'X^{2}-4,1,0,3');close(state.calculator.vars.Ans,2);assert.ok(state.calculator.approximateVariables.includes('Ans'));assert.equal(state.calculator.exactAnswer,null);});
  await check('native SolveN accepts a first derivative callback and shows its root2 with the normal notice',async()=>{
    const before=(await saved()).calculator;await setEntry('\\operatorname{SolveN}\\left(\\operatorname{diff}\\left(X^{3},X\\right)-12,X,0,3\\right)');await key('execute').click();await noError();
    await page.locator('#cg-calculation-notice').waitFor();assert.match(await page.locator('#cg-calculation-notice').innerText(),/More solutions may exist/);const state=await saved();arrayClose(state.calculator.nativeAnswers.list,[2],1e-5);assert.equal(state.calculator.vars.Ans,before.vars.Ans);await key('execute').click();assert.equal(await page.locator('#cg-calculation-notice').count(),0);
  });
  await inputMode('Line');
  await check('Line numerical assignment propagates approximate flags to its register and scalar Ans',async()=>{close(await calculate('diff(X^3,2)→A'),12,1e-6);const state=await saved();assert.ok(state.calculator.approximateVariables.includes('A'));assert.ok(state.calculator.approximateVariables.includes('Ans'));assert.equal(state.calculator.exactVariables.A,undefined);assert.equal(state.calculator.exactAnswer,null);});
  await check('Line SolveN propagates its notice and roots without replacing the independent scalar answer',async()=>{
    await calculate('77');await setEntry('SolveN((X+1)*(X-6),X,-2,7)');await key('execute').click();await noError();await page.locator('#cg-calculation-notice').waitFor();assert.match(await page.locator('#cg-calculation-notice').innerText(),/More solutions may exist/);arrayClose((await saved()).calculator.nativeAnswers.list,[-1,6]);assert.equal((await saved()).calculator.vars.Ans,77);await key('execute').click();assert.equal(await page.locator('#cg-calculation-notice').count(),0);
  });
  await check('Line failed nested calculus invalid precision No Solution and invalid integers preserve every existing memory bank',async()=>{
    for(const [source,pattern]of [['FMin(diff(X^2,1),0,2)',/Syntax ERROR/],['FMin((X-2)^2,0,4,0)',/Argument ERROR/],['SolveN(X^2+1,X,-2,2)',/No Solution/],['1.5 Int÷ 1',/Domain ERROR/],['107 Rmdr 0',/Math ERROR/],['Sigma(K^2,K,2,6):FMin(X^2,0,2,0)',/Argument ERROR/]])await expectLineError(source,pattern);
  });
  await check('Program numerical assignment commits its approximate register and result flags through the actual Panel',async()=>{
    await mode('program');await page.locator('[data-program-source]').fill('diff(X^3,2)→P:Print P');await soft(1);await page.waitForFunction(()=>JSON.parse(localStorage.getItem('cnx-v2')).profiles.cg50.calculator.approximateVariables.includes('P'));const state=await saved();close(state.calculator.vars.P,12,1e-6);assert.ok(state.calculator.approximateVariables.includes('Ans'));assert.equal(state.calculator.exactVariables.P,undefined);assert.equal(state.calculator.exactAnswer,null);assert.match(await page.locator('.cg-program-panel .cg-result').innerText(),/12/);assert.equal((await page.locator('.cg-program-panel .cg-error').innerText()).trim(),'');
  });
  await check('Program SolveN notice reaches the root UI and physical EXE acknowledges the native roots output',async()=>{
    await mode('calc');await calculate('77');await mode('program');await page.locator('[data-program-source]').fill('Print SolveN((X+1)*(X-6),X,-2,7)');await soft(1);await page.locator('#cg-calculation-notice').waitFor();assert.match(await page.locator('#cg-calculation-notice').innerText(),/More solutions may exist/);arrayClose((await saved()).calculator.nativeAnswers.list,[-1,6]);assert.equal((await saved()).calculator.vars.Ans,77);await key('execute').click();assert.equal(await page.locator('#cg-calculation-notice').count(),0);assert.match(await page.locator('.cg-program-panel .cg-result').innerText(),/-1.*6/s);assert.equal((await page.locator('.cg-program-panel .cg-error').innerText()).trim(),'');
  });
  await check('closing a Program SolveN notice restores pending Input keyboard focus and consumes the following7 once',async()=>{
    await mode('calc');await mode('program');await page.locator('[data-program-source]').fill('SolveN((X+1)*(X-6),X,-2,7):Input A:Print A');await soft(1);
    await page.locator('#cg-calculation-notice').waitFor();await page.locator('[data-program-input]').waitFor({state:'visible'});assert.match(await page.locator('#cg-calculation-notice').innerText(),/More solutions may exist/);await key('execute').click();await page.locator('#cg-calculation-notice').waitFor({state:'detached'});
    assert.equal(await page.locator('[data-program-input]').evaluate(input=>document.activeElement===input),true);await page.keyboard.type('7');await page.keyboard.press('Enter');await page.waitForFunction(()=>JSON.parse(localStorage.getItem('cnx-v2')).profiles.cg50.calculator.vars.A===7);assert.equal((await saved()).calculator.vars.A,7);assert.match(await page.locator('.cg-program-panel .cg-result').innerText(),/7/);assert.equal((await page.locator('.cg-program-panel .cg-error').innerText()).trim(),'');assert.equal(await page.locator('#cg-calculation-notice').count(),0);
  });
  await check('a Program No Solution error retains all calculator and array banks',async()=>{
    await mode('calc');await mode('program');const before=banks(await saved());await page.locator('[data-program-source]').fill('Print SolveN(X^2+1,X,-2,2)');await soft(1);assert.match(await page.locator('.cg-program-panel .cg-error').innerText(),/No Solution/);assert.deepEqual(banks(await saved()),before);assert.equal(await page.locator('#cg-calculation-notice').count(),0);
  });
  await check('a real Electron restart retains the numerical banks native variable and saved SET UP parameters',async()=>{
    await mode('calc');await inputMode('Line');const before=await saved(),memory=banks(before),parameters={mode:before.mode,format:before.format,digits:before.digits,system:before.cgWorkspace.system};await app.close();app=await launch();page=await app.firstWindow();watch();await page.locator('#entry').waitFor();const after=await saved();assert.deepEqual(banks(after),memory);assert.deepEqual({mode:after.mode,format:after.format,digits:after.digits,system:after.cgWorkspace.system},parameters);assert.equal(after.calculator.angle,'Deg');assert.equal(after.calculator.vars.K,3);assert.equal(await page.locator('#entry').evaluate(field=>field.tagName),'INPUT');assert.equal(await page.locator('#cg-calculation-notice').count(),0);
  });
  assert.deepEqual(errors,[]);await page.screenshot({path:path.join(evidence,'cg-calc-main-ui.png')});
}finally{
  await fs.writeFile(path.join(evidence,'cg-calc-main-ui-results.json'),JSON.stringify({date:new Date().toISOString(),scope:'real main UI, physical native CALC keys, Program/Line metadata, memory failure preservation and Electron restart; no full-device parity claim',runtime,passed,errors,profile},null,2));
  await app?.close().catch(()=>{});
}
