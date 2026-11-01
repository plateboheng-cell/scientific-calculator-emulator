import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {cg50} from '../src/models/cg50.js';
import {APP_VERSION} from '../src/brand.js';

const root=path.resolve('.'),work=path.join(root,'.verification/cg-demo-'+APP_VERSION),output=path.join(root,'录屏');
await fs.mkdir(work,{recursive:true});await fs.mkdir(output,{recursive:true});
const ffmpeg=process.env.SCS_FFMPEG_PATH||'ffmpeg';
if(path.isAbsolute(ffmpeg)){
  const registry=JSON.parse(await fs.readFile('node_modules/playwright-core/browsers.json','utf8'));
  process.env.PLAYWRIGHT_BROWSERS_PATH=path.join(work,'runtime');
  const dir=path.join(process.env.PLAYWRIGHT_BROWSERS_PATH,'ffmpeg-'+registry.browsers.find(x=>x.name==='ffmpeg').revision);
  await fs.mkdir(dir,{recursive:true});await fs.copyFile(ffmpeg,path.join(dir,'ffmpeg-win64.exe'));
}
const {_electron}=await import('playwright');
const profile=await fs.mkdtemp(path.join(work,'profile-'));
const app=await _electron.launch({executablePath:process.env.CNX_ELECTRON_PATH||undefined,args:[process.env.CNX_APP_PATH||'.','--user-data-dir='+profile],env:{...process.env,CNX_TEST:'1',CNX_TEST_SYSTEM_LANGUAGES:'["zh-CN"]'},recordVideo:{dir:work,size:{width:480,height:900}}});
const page=await app.firstWindow(),errors=[];page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setContentSize(480,900));
const key=action=>page.locator('[data-action="'+action+'"]').first(),hold=ms=>page.waitForTimeout(ms);
async function mode(id){await key('menu').click();await page.locator('[data-mode="'+cg50.nativeMenu.findIndex(row=>row[3]===id)+'"]').click();await hold(400);}
const video=page.video();let identity;
try{
  await page.locator('[data-model-choice=cg50]').click();await page.locator('.calculator-cover-scene').waitFor({state:'detached'});await hold(1200);
  await key('menu').click();await hold(2200);
  await page.locator('[data-mode="'+cg50.nativeMenu.findIndex(row=>row[3]==='graph3d')+'"]').click();
  await key('cg-f3').click();await page.locator('[data-surface-type]').selectOption({value:'sphere'});await page.locator('[data-3d-param=r]').fill('2');await key('cg-f6').click();await key('cg-f6').click();await page.locator('[data-visual-canvas]').scrollIntoViewIfNeeded();await hold(2400);
  await key('right').click();await key('right').click();await hold(1000);
  await key('back').click();await key('cg-f3').click();await page.locator('[data-surface-type]').selectOption({value:'cylinder'});for(const [name,value]of Object.entries({r:1.5,zmin:-2,zmax:2,h:0,k:0}))await page.locator('[data-3d-param="'+name+'"]').fill(String(value));await key('cg-f6').click();await key('cg-f6').click();await page.locator('[data-visual-canvas]').scrollIntoViewIfNeeded();await hold(2200);
  await mode('program');await page.locator('[data-program-source]').fill('{1,2,3,4,5}→List1\nSum(List1)→A\nPrint A');await hold(1800);await key('cg-f1').click();await page.locator('.cg-result').scrollIntoViewIfNeeded();await hold(2400);
  await mode('stat');await page.locator('[data-stat-file]').selectOption({value:'5'});await page.locator('[data-stat-value]').fill('63');await key('execute').click();await hold(1200);await page.locator('[data-stat-file]').selectOption({value:'0'});await hold(2200);
  await mode('financial');await key('cg-f2').click();await hold(1500);await key('cg-f1').click();await page.locator('.cg-result').scrollIntoViewIfNeeded();await hold(2200);
  await mode('table');await page.locator('[name=f]').fill('x^2');for(const [name,value]of Object.entries({start:'-2',end:'2',step:'1'}))await page.locator('[name='+name+']').fill(value);await key('cg-f1').click();await hold(2400);
  identity=await app.evaluate(({app})=>({name:app.getName(),version:app.getVersion(),packaged:app.isPackaged}));
}catch(error){await page.screenshot({path:path.join(work,'recording-failure.png')});await fs.writeFile(path.join(work,'recording-failure.json'),JSON.stringify({error:error.stack,screen:await page.locator('#screen').innerText()},null,2));throw error;}finally{await app.close();await video.saveAs(path.join(work,'desktop-demo.webm'));}
if(errors.length)throw Error(errors.join('\n'));
const final=path.join(output,'scientific calculator simulator-'+APP_VERSION+'-CG50演示.mp4');
execFileSync(ffmpeg,['-hide_banner','-loglevel','error','-y','-i',path.join(work,'desktop-demo.webm'),'-an','-c:v','libx264','-preset','medium','-crf','24','-pix_fmt','yuv420p','-movflags','+faststart',final],{stdio:'inherit'});
await fs.writeFile(path.join(work,'recording.json'),JSON.stringify({date:new Date().toISOString(),identity,final,bytes:(await fs.stat(final)).size,errors},null,2));
console.log(final);
