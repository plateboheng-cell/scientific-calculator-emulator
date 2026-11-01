import {_electron} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {resizeCalculatorWindow} from './electron-layout.mjs';

const evidence=path.resolve('.verification'),profile=await fs.mkdtemp(path.join(evidence,'fraction-layout-'));
const app=await _electron.launch({executablePath:process.env.CNX_ELECTRON_PATH||undefined,args:[process.env.CNX_APP_PATH||'.','--user-data-dir='+profile],env:{...process.env,CNX_TEST:'1',CNX_TEST_SYSTEM_LANGUAGES:'["zh-CN"]'}});
const page=await app.firstWindow(),passed=[],errors=[];
page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));
const application=await app.evaluate(({app})=>({version:app.getVersion(),packaged:app.isPackaged}));
const key=action=>page.locator('[data-action="'+action+'"]').first();
const clear=()=>page.locator('[data-action="clear"],[data-action="cg-clear-on"]').first().click();
async function ready(){await page.waitForFunction(()=>document.querySelector('#entry')===document.activeElement);}
async function geometry(){
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  return page.evaluate(()=>{
    const rect=selector=>document.querySelector(selector).getBoundingClientRect().toJSON();
    const field=document.querySelector('#entry'),scale=document.querySelector('.calculator').getBoundingClientRect().height/document.querySelector('.calculator').offsetHeight;
    const glyphs=[];
    const walker=document.createTreeWalker(field.shadowRoot.querySelector('.ML__base'),NodeFilter.SHOW_TEXT);
    while(walker.nextNode()){const node=walker.currentNode;if(!/\d/.test(node.textContent))continue;const range=document.createRange();range.selectNodeContents(node);const box=range.getBoundingClientRect();if(box.height>0)glyphs.push(box.toJSON());}
    const carets=[...field.shadowRoot.querySelectorAll('.ML__caret,.ML__text-caret')].map(el=>el.getBoundingClientRect().toJSON()).filter(box=>box.height>0);
    return {rim:rect('.screen-rim'),status:rect('.status'),screen:rect('#screen'),input:rect('#expression-host'),answer:rect('#answer'),rimScroll:document.querySelector('.screen-rim').scrollTop,screenScroll:document.querySelector('#screen').scrollTop,scale,glyphs,carets};
  });
}
function statusFixed(before,after){
  assert.equal(after.rimScroll,0,'Fixed LCD frame was scrolled');assert.equal(after.screenScroll,0,'Formula moved the LCD viewport');
  assert.ok(Math.abs(after.status.top-before.status.top)<.5,'Status row moved');
  if(after.status.height)assert.ok(Math.abs(after.screen.top-after.status.bottom)<.5,'LCD no longer begins below status');
  assert.ok(after.input.top>=Math.max(after.status.bottom,after.screen.top),'Input overlaps status');
  if(after.answer.height)assert.ok(after.input.bottom+1<=after.answer.top,'Formula overlaps result');
}
try{
  await page.locator('#model-picker[open]').waitFor();
  const cases=[...['cnx','ex','cncw','cn999cw','ti36xpro','cg50'].map(id=>({id,width:420,height:830,zoom:1})),...['cn999cw','ti36xpro'].flatMap(id=>[1.25,1.5].map(zoom=>({id,width:360,height:640,zoom})))];
  for(const test of cases){
    if(!await page.locator('#model-picker[open]').count())await key('models').click();
    await page.locator('[data-model-choice="'+test.id+'"]').click();
    await key('menu').click();await page.keyboard.press('1');await ready();
    await resizeCalculatorWindow(app,page,test.width,test.height,test.zoom);
    const baseline=await geometry();
    await key('frac').click();let current=await geometry();statusFixed(baseline,current);
    assert.ok(current.input.height>=current.screen.height*.8,'Empty result starves fraction input');
    await page.keyboard.type('12');await page.keyboard.press('ArrowDown');await page.keyboard.type('345');
    current=await geometry();statusFixed(baseline,current);assert.ok(current.glyphs.length>=2);
    for(const glyph of current.glyphs){assert.ok(glyph.top>=current.status.bottom+7*current.scale,'Fraction touches the status row');assert.ok(glyph.top>=current.input.top&&glyph.bottom<=current.input.bottom+1,'Simple fraction is clipped');}
    await page.keyboard.press('ArrowUp');statusFixed(baseline,await geometry());
    await key('execute').click();current=await geometry();statusFixed(baseline,current);
    if(test.id!=='ti36xpro')for(const glyph of current.glyphs)assert.ok(glyph.top>=current.input.top&&glyph.bottom<=current.input.bottom+1,'Calculated fraction is clipped');
    // The small TI LCD permits a scrolling formula with a result, but its caret must remain reachable.
    for(const caret of current.carets)assert.ok(caret.top>=current.input.top-1&&caret.bottom<=current.input.bottom+1,'Calculated fraction caret is clipped: '+JSON.stringify(current));
    const answer=await page.evaluate(id=>JSON.parse(localStorage.getItem('cnx-v2')).profiles[id].calculator.vars.Ans,test.id);assert.ok(Math.abs(answer-12/345)<1e-12);
    await clear();
    for(let depth=0;depth<12;depth++)await key('frac').click();
    // MathLive uses this native operation before revealing the active caret.
    await page.locator('#entry').evaluate(el=>el.scrollIntoView({block:'nearest',inline:'nearest'}));
    statusFixed(baseline,await geometry());
    await clear();await key('frac').click();await page.keyboard.type('1');await page.keyboard.press('ArrowDown');await page.keyboard.type('2');
    statusFixed(baseline,await geometry());
    if(test.zoom===1&&['cn999cw','cncw'].includes(test.id)){
      await page.screenshot({path:path.join(evidence,'fraction-fixed-'+test.id+'.png')});
      await page.locator('.screen-rim').screenshot({path:path.join(evidence,'fraction-fixed-'+test.id+'-lcd.png')});
    }
    passed.push(test);console.log('PASS '+test.id+' '+test.width+'x'+test.height+' zoom '+test.zoom);
  }
  assert.deepEqual(errors,[]);
}finally{await fs.writeFile(path.join(evidence,'fraction-layout-ui-results.json'),JSON.stringify({date:new Date().toISOString(),application,passed,errors},null,2));await app.close();}
