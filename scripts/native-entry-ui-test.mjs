import {_electron} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {resizeCalculatorWindow} from './electron-layout.mjs';

const evidence=path.resolve('.verification'),profile=await fs.mkdtemp(path.join(evidence,'native-entry-profile-'));
const passed=[],failed=[],errors=[],network=[];
const total=(await fs.readFile(new URL(import.meta.url),'utf8')).match(/await check\(/g).length;
const app=await _electron.launch({executablePath:process.env.CNX_ELECTRON_PATH||undefined,args:[process.env.CNX_APP_PATH||'.','--user-data-dir='+profile],env:{...process.env,CNX_TEST:'1',CNX_TEST_SYSTEM_LANGUAGES:'["zh-CN"]'}});
const page=await app.firstWindow();page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:|^wss?:/.test(r.url()))network.push(r.url());});
const application=await app.evaluate(({app})=>({version:app.getVersion(),packaged:app.isPackaged}));
const key=action=>page.locator('[data-action="'+action+'"]').first();
const stored=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('cnx-v2')));
const near=(a,b)=>assert.ok(Number.isFinite(a)&&Math.abs(a-b)<=1e-9*Math.max(1,Math.abs(b)),`${a} != ${b}`);
async function ready(){await page.waitForFunction(()=>{const el=document.querySelector('#entry');return el&&document.activeElement===el&&(el.tagName!=='MATH-FIELD'||el.hasFocus());});}
async function select(id){if(!await page.locator('#model-picker[open]').count())await key('models').click();await page.locator('[data-model-choice='+id+']').click();}
async function fresh(){await key('menu').click();await page.locator('[data-mode="0"]').click();await ready();}
async function latex(value){await page.locator('#entry').evaluate((el,v)=>{el.value=v;el.position=el.lastOffset;el.dispatchEvent(new Event('input',{bubbles:true}));},value);await page.locator('#entry').focus();}
async function solveKey(){await key('shift').click();await key('calc').click();}
async function check(name,run){try{await run();passed.push(name);console.log('PASS '+name);}catch(e){failed.push({name,error:e.message});console.error('FAIL '+name+' '+e.message);await page.screenshot({path:path.join(evidence,'native-entry-failure-'+failed.length+'.png')}).catch(()=>{});}}
try{
  await page.locator('#model-picker[open]').waitFor();await select('cnx');await ready();
  await check('main LCD entry has no rectangular frame or highlight when blank, editing or blurred',async()=>{
    for(const id of ['cnx','cncw','cn999cw','ex']){
      await select(id);await fresh();
      for(const expression of ['', '2+3']){
        await latex(expression);
        for(const focused of [true,false]){
          if(focused)await page.locator('#entry').focus();else await key('clear').focus();
          // MathLive updates its editor focus state after the DOM focus event.
          // Read the appearance only after both states settle across rendering.
          const settled=expected=>{const el=document.querySelector('#entry');return !!el&&(document.activeElement===el)===expected&&el.hasFocus()===expected;};
          await page.waitForFunction(settled,focused);
          await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
          await page.waitForFunction(settled,focused);
          const style=await page.locator('#entry').evaluate(el=>{const s=getComputedStyle(el);return {borders:[s.borderTopWidth,s.borderRightWidth,s.borderBottomWidth,s.borderLeftWidth],outline:s.outlineStyle,shadow:s.boxShadow,background:s.backgroundColor,focused:el.hasFocus()};});
          assert.equal(style.focused,focused);assert.deepEqual(style.borders,['0px','0px','0px','0px']);assert.equal(style.outline,'none');assert.equal(style.shadow,'none');assert.equal(style.background,'rgba(0, 0, 0, 0)');
        }
      }
      await page.locator('#entry').focus();await key('execute').click();near((await stored()).profiles[id].calculator.vars.Ans,5);
    }
    await select('cnx');await fresh();await page.locator('.screen-rim').screenshot({path:path.join(evidence,'entry-frame-after-blank.png')});
    await page.keyboard.type('2+3');await key('execute').click();await page.locator('.screen-rim').screenshot({path:path.join(evidence,'entry-frame-after-answer.png')});
  });
  await check('X fraction key has vertically stacked boxes and a horizontal bar',async()=>{
    // This check is independent of the multi-model appearance check above.
    // Restore X even when that check failed while another model was selected.
    await select('cnx');await fresh();
    const boxes=await key('frac').locator('svg rect').evaluateAll(els=>els.map(el=>{const b=el.getBBox();return {x:b.x,y:b.y,width:b.width,height:b.height};}));assert.equal(boxes.length,2);assert.ok(boxes[0].y+boxes[0].height<12&&boxes[1].y>12);assert.equal(await key('frac').locator('svg path').getAttribute('d'),'M5 12h14');
  });
  await check('X blank fraction enters numerator then denominator using arrows',async()=>{
    await fresh();await key('frac').click();await page.keyboard.type('2');await page.keyboard.press('ArrowDown');await page.keyboard.type('3');await key('execute').click();near((await stored()).profiles.cnx.calculator.vars.Ans,2/3);
  });
  await check('X fraction captures the preceding number instead of creating a mixed number',async()=>{
    await fresh();await page.keyboard.type('7');await key('frac').click();await page.keyboard.type('3');await key('execute').click();near((await stored()).profiles.cnx.calculator.vars.Ans,7/3);assert.match(await page.locator('#entry').evaluate(el=>el.value),/^\\frac(?:\{7\}|7)(?:\{3\}|3)$/);
  });
  await check('physical divide is an infix operator distinct from the fraction template',async()=>{
    await fresh();await page.keyboard.type('7');await key('/').click();await page.keyboard.type('3');assert.match(await page.locator('#entry').evaluate(el=>el.value),/\\div/);await key('execute').click();near((await stored()).profiles.cnx.calculator.vars.Ans,7/3);
  });
  await check('SHIFT fraction starts a new mixed-number entry after an answer',async()=>{
    await key('shift').click();await key('frac').click();await page.keyboard.type('3');await page.keyboard.press('Tab');await page.keyboard.type('1');await page.keyboard.press('Tab');await page.keyboard.type('2');await key('execute').click();near((await stored()).profiles.cnx.calculator.vars.Ans,3.5);
  });
  await check('SHIFT S-D displays 7/3 as 2 1/3 on the main answer line',async()=>{
    await fresh();await latex(String.raw`\frac{7}{3}`);await key('execute').click();await key('shift').click();await key('sd').click();assert.equal(await page.locator('#answer annotation').textContent(),String.raw`2\frac{1}{3}`);near((await stored()).profiles.cnx.calculator.vars.Ans,7/3);await page.screenshot({path:path.join(evidence,'native-mixed-fraction.png')});
  });
  await check('mixed-number decimal toggle preserves the value and restores improper format',async()=>{
    await key('sd').click();assert.match(await page.locator('#answer').innerText(),/2.333333333/);await key('sd').click();assert.equal(await page.locator('#answer annotation').textContent(),String.raw`\frac{7}{3}`);
  });
  await check('X ALPHA CALC enters equality before SHIFT CALC solves in Calculate',async()=>{
    await fresh();await page.keyboard.type('x^2');await page.keyboard.press('ArrowRight');await key('alpha').click();await key('calc').click();await page.keyboard.type('2');assert.match(await page.locator('#entry').evaluate(el=>el.value),/=/);await solveKey();assert.equal(await page.locator('[data-name=expr]').count(),0);assert.match(await page.locator('.solve-equation annotation').textContent(),/=/);await page.locator('[data-solve-variable=x]').fill('1');await key('execute').click();near((await stored()).profiles.cnx.calculator.vars.x,Math.sqrt(2));assert.equal((await stored()).profiles.cnx.mode,'calc');assert.match(await page.locator('#screen').innerText(),/L−R/);await page.screenshot({path:path.join(evidence,'native-x-solve-result.png')});
  });
  await check('X AC returns to the original equation and SOLVE reuses the saved variable',async()=>{
    await key('clear').click();assert.match(await page.locator('#entry').evaluate(el=>el.value),/=/);await solveKey();near(Number(await page.locator('[data-solve-variable=x]').inputValue()),Math.sqrt(2));await key('clear').click();
  });
  await check('X manual example edits x and B, then selects x for solving',async()=>{
    await fresh();await latex('x^2+B=0');await solveKey();await page.locator('[data-solve-variable=x]').fill('1');await page.keyboard.press('Enter');await page.locator('[data-solve-variable=B]').fill('-2');await page.keyboard.press('Enter');await page.keyboard.press('ArrowUp');await page.keyboard.press('Enter');const vars=(await stored()).profiles.cnx.calculator.vars;near(vars.x,Math.sqrt(2));assert.equal(vars.B,-2);
  });
  await check('X SOLVE can select B while retaining the supplied x value',async()=>{
    await fresh();await latex('x^2+B=0');await solveKey();await page.locator('[data-solve-variable=x]').fill('3');await page.keyboard.press('Enter');await page.locator('[data-solve-variable=B]').fill('0');await page.keyboard.press('Enter');await page.keyboard.press('Enter');const vars=(await stored()).profiles.cnx.calculator.vars;assert.equal(vars.x,3);near(vars.B,-9);assert.equal((await stored()).profiles.cnx.mode,'calc');
  });
  await check('X equation mode keeps polynomial/system solving separate from SOLVE',async()=>{
    await key('menu').click();await page.locator('[data-mode="7"]').click();assert.equal(await page.locator('.list-item').count(),2);assert.doesNotMatch(await page.locator('#screen').innerText(),/求解方程/);await solveKey();assert.equal(await page.locator('.solve-variables').count(),0);assert.equal((await stored()).profiles.cnx.mode,'equation');
  });
  await check('empty X input reports the missing equation instead of opening a blank solver',async()=>{
    await fresh();await solveKey();assert.match(await page.locator('#answer.error').innerText(),/先输入方程/);assert.equal(await page.locator('.solve-variables').count(),0);
  });
  await check('CW solver stays in Equation and is absent from Calculate Tools',async()=>{
    await select('cncw');await fresh();await key('tools').click();assert.doesNotMatch(await page.locator('#screen').innerText(),/求解方程/);await page.keyboard.press('Shift+F6');assert.equal((await stored()).profiles.cncw.mode,'equation');assert.equal(await page.locator('[data-name=expr]').count(),1);assert.equal(await page.locator('.solve-variables').count(),0);
  });
  await check('999 desktop SOLVE shortcut routes to its Equation application',async()=>{
    await select('cn999cw');await fresh();await page.keyboard.press('Shift+F6');assert.equal((await stored()).profiles.cn999cw.mode,'equation');assert.equal(await page.locator('[data-name=expr]').count(),1);
  });
  await check('both CW fraction keys capture the numerator with working denominator entry',async()=>{
    for(const id of ['cncw','cn999cw']){await select(id);await fresh();await page.keyboard.type('7');await key('frac').click();await page.keyboard.type('3');await key('execute').click();near((await stored()).profiles[id].calculator.vars.Ans,7/3);}
  });
  await check('deep formulas and results occupy separate clipped display regions',async()=>{
    for(const id of ['cnx','cncw','cn999cw','ex']){
      await select(id);await fresh();await latex(String.raw`\frac{\frac{\frac{123}{456}}{789}}{12345}`);await key('execute').click();
      const boxes=await page.locator('#expression-host').evaluate(el=>({expression:el.getBoundingClientRect().toJSON(),answer:document.querySelector('#answer').getBoundingClientRect().toJSON(),overflow:getComputedStyle(el).overflowY}));assert.ok(boxes.expression.bottom+1<=boxes.answer.top);assert.equal(boxes.overflow,'auto');
    }
    await page.screenshot({path:path.join(evidence,'native-display-separated.png')});
  });
  await check('narrow windows at 100/125/150 percent zoom keep the body and keys visible',async()=>{
    try{
      for(const id of ['cnx','cncw','cn999cw','ex'])for(const zoom of [1,1.25,1.5]){
        await select(id);await fresh();await resizeCalculatorWindow(app,page,360,640,zoom);
        await page.waitForFunction(()=>{const r=document.querySelector('.calculator').getBoundingClientRect();return r.left>=-1&&r.right<=innerWidth+1&&r.top>=-1&&r.bottom<=innerHeight+1;});
        const bad=await page.locator('.calculator button').evaluateAll(els=>els.filter(el=>{const r=el.getBoundingClientRect();return r.left<-.5||r.right>innerWidth+.5||r.top<-.5||r.bottom>innerHeight+.5;}).map(el=>el.getAttribute('aria-label')));assert.deepEqual(bad,[]);
      }
      const image=await app.evaluate(async({BrowserWindow})=>(await BrowserWindow.getAllWindows()[0].capturePage()).toPNG().toString('base64'));
      await fs.writeFile(path.join(evidence,'native-zoom-150.png'),Buffer.from(image,'base64'));
    }finally{await resizeCalculatorWindow(app,page,420,830,1);}
  });
  await check('approximate calculus output is not converted into an exact mixed fraction',async()=>{
    await select('cnx');await fresh();await key('integral').click();for(const [name,value] of Object.entries({expr:'x^2',a:'0',b:'1'}))await page.locator('[data-name='+name+']').evaluate((el,v)=>{el.value=v;},value);await page.locator('.run-button').click();await key('shift').click();await key('sd').click();assert.equal(await page.locator('#answer .approximation').count(),1);assert.equal(await page.locator('#answer .mfrac').count(),0);assert.match(await page.locator('#answer').innerText(),/0.3333333333/);
  });
  await check('English X solver preserves equation and translates native prompts',async()=>{
    await fresh();await latex('x^2=2');await page.keyboard.press('F12');await solveKey();await page.waitForFunction(()=>!/\p{Script=Han}/u.test(document.querySelector('#screen').innerText));await page.screenshot({path:path.join(evidence,'native-x-solve-en.png')});await page.locator('[data-solve-variable=x]').fill('1');await page.keyboard.press('Enter');near((await stored()).profiles.cnx.calculator.vars.x,Math.sqrt(2));assert.doesNotMatch(await page.locator('#screen').innerText(),/\p{Script=Han}/u);
  });
  await check('Chinese/English key legends and SHIFT labels fit their own key columns',async()=>{
    for(const id of ['cnx','cncw','cn999cw','ex'])for(const language of ['zh-CN','en']){
      await select(id);await fresh();if(await page.locator('html').getAttribute('lang')!==language)await page.keyboard.press('F12');
      const bad=await page.locator('.calculator .key').evaluateAll(keys=>{
        const problems=[];
        for(const key of keys){
          const box=key.getBoundingClientRect();
          for(const node of key.childNodes)if(node.nodeType===Node.TEXT_NODE&&node.textContent.trim()){
            const range=document.createRange();range.selectNodeContents(node);const r=range.getBoundingClientRect();if(r.left<box.left-1||r.right>box.right+1||r.top<box.top-1||r.bottom>box.bottom+1)problems.push(key.textContent.trim());
          }
          const wrap=key.closest('.key-wrap'),column=wrap.getBoundingClientRect();
          for(const label of wrap.querySelectorAll('.secondary>span'))if(label.textContent.trim()){
            if(!label.getClientRects().length)continue;
            const range=document.createRange();range.selectNodeContents(label);const r=range.getBoundingClientRect();if(r.left<column.left-1||r.right>column.right+1||r.bottom>box.top+1)problems.push('SHIFT/ALPHA '+label.textContent.trim());
          }
          for(const label of wrap.querySelectorAll('.cw-key-caption,.classwiz-control-caption')){
            if(!label.getClientRects().length)continue;
            const range=document.createRange();range.selectNodeContents(label);const r=range.getBoundingClientRect();if(r.left<column.left-1||r.right>column.right+1||r.bottom>box.top+1)problems.push('caption '+label.textContent.trim());
          }
        }
        return problems;
      });assert.deepEqual(bad,[],id+' '+language);
    }
  });
  await check('native-entry workflows stay offline without renderer exceptions',async()=>{assert.deepEqual(errors,[]);assert.deepEqual(network,[]);});
}finally{
  await fs.writeFile(path.join(evidence,'native-entry-ui-results.json'),JSON.stringify({date:new Date().toISOString(),application,counts:{passed:passed.length,failed:failed.length,notRun:total-passed.length-failed.length},passed,failed,errors,network},null,2));await app.close();
}
if(failed.length)process.exitCode=1;
