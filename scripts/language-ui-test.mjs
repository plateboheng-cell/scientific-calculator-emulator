import {_electron} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {resolveLanguage} from '../src/language.js';

const evidence=path.resolve('.verification');
await fs.mkdir(evidence,{recursive:true});
const passed=[],failed=[],errors=[];
const profile=()=>fs.mkdtemp(path.join(evidence,'language-profile-'));
async function launch(directory,languages){
  const env={...process.env,CNX_TEST:'1'};
  delete env.CNX_TEST_SYSTEM_LANGUAGES;
  if(languages)env.CNX_TEST_SYSTEM_LANGUAGES=JSON.stringify(languages);
  const app=await _electron.launch({executablePath:process.env.CNX_ELECTRON_PATH||undefined,args:[process.env.CNX_APP_PATH||'.','--user-data-dir='+directory],env});
  const page=await app.firstWindow();
  page.on('pageerror',error=>errors.push(error.message));
  try{await page.locator('#model-picker[open], #entry').first().waitFor();}
  catch(error){
    await page.screenshot({path:path.join(evidence,'language-startup-failure.png')}).catch(()=>{});
    await fs.writeFile(path.join(evidence,'language-startup-failure.html'),await page.content()).catch(()=>{});
    await app.close();throw error;
  }
  return {app,page};
}
async function withApp(directory,languages,run){
  const instance=await launch(directory,languages);
  try{return await run(instance);}finally{await instance.app.close();}
}
async function check(name,run){
  try{await run();passed.push(name);console.log('PASS '+name);}
  catch(error){failed.push({name,error:error.message});throw error;}
}
async function assertLanguage(page,language){
  await page.waitForFunction(expected=>document.documentElement.lang===expected,language==='zh'?'zh-CN':'en');
  if(await page.locator('#model-picker[open]').count()){
    assert.equal(await page.locator('#picker-title').innerText(),language==='zh'?'选择你的计算器':'Choose your calculator');
  }
}
try{
  await check('native OS UI language reaches the isolated renderer',async()=>{
    await withApp(await profile(),undefined,async({app,page})=>{
      const native=await app.evaluate(({app})=>app.getPreferredSystemLanguages());
      assert.deepEqual(await page.evaluate(()=>window.cnxSystem.languages),native);
      assert.equal(await page.evaluate(()=>Object.isFrozen(window.cnxSystem)&&Object.isFrozen(window.cnxSystem.languages)),true);
      assert.equal(await page.evaluate(()=>typeof window.require),'undefined');
      await assertLanguage(page,resolveLanguage(native));
    });
  });
  for(const [name,languages,expected] of [
    ['Chinese system first launch',['zh-CN'],'zh'],
    ['English system first launch',['en-US'],'en'],
    ['Traditional Chinese system uses the supported Chinese UI',['zh-Hant-TW'],'zh'],
    ['unsupported preferred language falls back to English',['fr-FR','zh-CN'],'en'],
  ]){
    await check(name,async()=>withApp(await profile(),languages,async({page})=>{
      await assertLanguage(page,expected);
      if(name==='English system first launch')await page.screenshot({path:path.join(evidence,'language-auto-en.png')});
    }));
  }
  await check('manual English survives a restart on a Chinese system',async()=>{
    const directory=await profile();
    await withApp(directory,['zh-CN'],async({page})=>{
      await page.locator('[data-picker-language]').click();await assertLanguage(page,'en');
    });
    await withApp(directory,['zh-CN'],async({page})=>assertLanguage(page,'en'));
  });
  await check('manual Chinese, selected model and history survive an English-system restart',async()=>{
    const directory=await profile();
    await withApp(directory,['en-US'],async({page})=>{
      await page.locator('[data-picker-language]').click();await assertLanguage(page,'zh');
      await page.locator('[data-model-choice=cncw]').click();
      await page.waitForFunction(()=>document.activeElement?.id==='entry'&&document.activeElement.hasFocus());
      await page.keyboard.type('2+3');await page.keyboard.press('Enter');
      assert.match(await page.locator('#answer').innerText(),/5/);
    });
    await withApp(directory,['en-US'],async({page})=>{
      await assertLanguage(page,'zh');
      assert.equal(await page.locator('.model').innerText(),'fx-991CN CW');
      const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('cnx-v2')));
      assert.equal(state.language,'zh');assert.equal(state.activeModel,'cncw');
      assert.ok(state.profiles.cncw.history.some(row=>row.answer==='5'));
    });
  });
  assert.deepEqual(errors,[]);
}finally{
  await fs.writeFile(path.join(evidence,'language-ui-results.json'),JSON.stringify({date:new Date().toISOString(),counts:{passed:passed.length,failed:failed.length,notRun:7-passed.length-failed.length},passed,failed,errors},null,2));
}
