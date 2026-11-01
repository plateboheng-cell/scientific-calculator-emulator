import fs from 'node:fs/promises';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {_electron} from 'playwright';
import {cg50} from '../src/models/cg50.js';
import {APP_NAME,APP_VERSION} from '../src/brand.js';

// Record the actual packaged application. CDP capture starts only after its
// first usable screen, so no blank Electron startup is added to the video.
// Every run receives its own user-data directory; the user's profiles are not
// imported, edited, or read by this demonstration.
const root=path.resolve('.');
const work=path.join(root,'.verification','cg-run-demo-'+APP_VERSION);
const output=path.join(root,'录屏');
await fs.mkdir(work,{recursive:true});await fs.mkdir(output,{recursive:true});
const run=await fs.mkdtemp(path.join(work,'take-'));
const profile=path.join(run,'profile');await fs.mkdir(profile);
const executable=process.env.CNX_ELECTRON_PATH||path.join(root,'release','win-unpacked',APP_NAME+'.exe');
const ffmpeg=process.env.SCS_FFMPEG_PATH||'ffmpeg';
await fs.access(executable);
if(path.isAbsolute(ffmpeg))await fs.access(ffmpeg);
const final=path.join(output,APP_NAME+'-'+APP_VERSION+'-CG50计算演示.mp4');
const candidate=path.join(run,'calculation-demo.mp4');
const frames=[],steps=[],errors=[];
let app,page,cdp,identity,started=0,ended=0,frameWrites=Promise.resolve(),captureActive=false;

function acceptFrame(data){
  if(!captureActive)return;
  const at=(performance.now()-started)/1000;
  const name='frame-'+String(frames.length).padStart(6,'0')+'.jpg';
  frames.push({name,at});
  frameWrites=frameWrites.then(()=>fs.writeFile(path.join(run,name),Buffer.from(data,'base64')));
}
async function snapshot(){const result=await cdp.send('Page.captureScreenshot',{format:'jpeg',quality:92,fromSurface:true});acceptFrame(result.data);}
const key=action=>page.locator('[data-action="'+action+'"]').first();
const hold=ms=>page.waitForTimeout(ms);
async function press(action,delay=110){await key(action).click();if(delay)await hold(delay);}
async function soft(number,delay=110){await press('cg-f'+number,delay);}
const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('cnx-v2')).profiles.cg50);
async function witness(name,extra={}){
  steps.push({name,atSeconds:Math.round((performance.now()-started)/10)/100,...extra});
  await snapshot();
}
async function mode(name){
  await press('menu',230);
  const index=cg50.nativeMenu.findIndex(row=>row[3]===name);assert(index>=0);
  await page.locator('[data-mode="'+index+'"]').click();await hold(220);
}
async function fraction(n,d){
  const state=await saved();
  assert.deepEqual(state.calculator.exactAnswer,{kind:'cg-rational-v1',n:String(n),d:String(d),decimal:false});
  assert.match(await page.locator('#answer annotation').textContent(),new RegExp('\\\\frac\\{'+n+'\\}\\{'+d+'\\}'));
  assert.equal(await page.locator('#answer.error').count(),0);
}
async function setMathFraction(){
  await press('cg-clear-on');
  for(const action of ['1','5','frac','6','0'])await press(action,90);
  await hold(650);await press('execute',0);await fraction(15,60);
}

try{
  app=await _electron.launch({executablePath:executable,args:['--user-data-dir='+profile],env:{...process.env,CNX_TEST:'1',CNX_TEST_SYSTEM_LANGUAGES:'["zh-CN"]'}});
  page=await app.firstWindow();page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setContentSize(480,900));
  identity=await app.evaluate(({app})=>({name:app.getName(),version:app.getVersion(),packaged:app.isPackaged,userData:app.getPath('userData')}));
  assert.equal(identity.name,APP_NAME);assert.equal(identity.version,APP_VERSION);assert.equal(identity.packaged,true,'Use the validated packaged application for this recording');
  assert.equal(path.resolve(identity.userData).toLowerCase(),path.resolve(profile).toLowerCase());
  await page.locator('[data-model-choice="cg50"]').waitFor({state:'visible'});
  await page.evaluate(()=>document.fonts.ready);
  cdp=await page.context().newCDPSession(page);
  cdp.on('Page.screencastFrame',event=>{acceptFrame(event.data);void cdp.send('Page.screencastFrameAck',{sessionId:event.sessionId}).catch(()=>{});});
  started=performance.now();captureActive=true;await snapshot();
  await cdp.send('Page.startScreencast',{format:'jpeg',quality:92,maxWidth:480,maxHeight:900,everyNthFrame:1});
  await hold(300);
  await page.locator('[data-model-choice="cg50"]').click();
  await page.locator('.calculator-cover-scene').waitFor({state:'detached'});await hold(500);
  await witness('CG50 stationary cover removal');
  await mode('calc');

  await press('shift');await press('menu',200);
  await page.locator('[data-setup-row="simplify"]').click();await soft(2,850);
  assert.match(await page.locator('[data-setup-value="simplify"]').innerText(),/Manual/);
  await witness('SET UP Simplify Manual');await press('back',200);
  await setMathFraction();await hold(1800);await witness('Manual fraction15/60',{numerator:15,denominator:60});
  await press('options');await soft(4);await soft(6);await soft(6,650);
  assert.deepEqual(await page.locator('#cg-context-softkeys button').allTextContents(),['Int÷','Rmdr','Simp','','','▶']);
  await soft(3,220);await press('execute',0);await fraction(5,20);
  assert.equal(await page.locator('.cg-simp-factor').innerText(),'F=3');
  await hold(2200);await witness('Simp by3 gives5/20',{factor:3});
  await soft(3,220);await press('execute',0);await fraction(1,4);
  assert.equal(await page.locator('.cg-simp-factor').innerText(),'F=5');
  await hold(2200);await witness('Simp by5 gives1/4',{factor:5});

  await press('cg-clear-on');await press('5');await press('0',350);
  await press('options');await soft(6);await soft(1,300);
  await soft(2,500);await press('5',400); // LENGTH page1 number5: cm
  await soft(1,250); // Native conversion arrow
  await soft(2,400);await press('right',400);await press('2',600); // LENGTH page2 number2: in
  await witness('Metric50cm to inches, units selected with native numeric keys');
  await press('execute',0);
  assert.equal(await page.locator('#answer.error').count(),0);
  const converted=(await saved()).calculator.vars.Ans;
  assert.ok(Math.abs(converted-50/2.54)<1e-12);
  await hold(2400);await witness('Metric result',{centimetres:50,inches:converted});

  // Populate two short columns through Statistics itself, then demonstrate its
  // one-shot whole-column calculation. No reactive formula is persisted.
  await mode('stat');
  for(const [column,values]of [[0,[3,4,5]],[1,[6,7,8]]]){
    await page.locator('[name="selectedList"]').selectOption({value:String(column)});
    await page.locator('[data-stat-list="'+column+'"][data-stat-row="0"]').click();
    for(const value of values){await page.locator('[data-stat-value]').fill(String(value));await press('execute',70);}
  }
  await hold(500);
  await page.locator('[name="selectedList"]').selectOption({value:'2'});
  await page.locator('[data-stat-header="2"]').click();
  await page.locator('[data-stat-formula]').pressSequentially('List1+List2',{delay:70});
  await hold(650);await witness('Statistics List3 header formula List1+List2');
  await press('execute',0);
  assert.deepEqual((await saved()).cgWorkspace.statistics.lists[2],[9,11,13]);
  assert.equal((await page.locator('.cg-stat-error').innerText()).trim(),'');
  await hold(2200);await witness('Statistics List3 stores9,11,13 once',{list3:[9,11,13]});
  assert.deepEqual(errors,[]);
  await snapshot();ended=performance.now();captureActive=false;
  await cdp.send('Page.stopScreencast');await frameWrites;
}catch(error){
  captureActive=false;
  if(page){await page.screenshot({path:path.join(work,'recording-failure.png')}).catch(()=>{});}
  await fs.writeFile(path.join(work,'recording-failure.json'),JSON.stringify({date:new Date().toISOString(),error:error.stack,identity,steps,errors,screen:await page?.locator('#screen').innerText().catch(()=>null)},null,2));
  throw error;
}finally{
  captureActive=false;await cdp?.send('Page.stopScreencast').catch(()=>{});await frameWrites;await app?.close();
}

assert(frames.length>=10,'Not enough captured frames');
const duration=(ended-started)/1000;
// Screencast frames carry real elapsed times. Static displays therefore remain
// visible for their full demonstration pause rather than collapsing in time.
const concat=['ffconcat version 1.0'];
for(let index=0;index<frames.length;index++){
  const next=index+1<frames.length?frames[index+1].at:duration;
  concat.push("file '"+frames[index].name+"'",'duration '+Math.max(.001,next-frames[index].at).toFixed(6));
}
concat.push("file '"+frames.at(-1).name+"'");
await fs.writeFile(path.join(run,'frames.ffconcat'),concat.join('\n')+'\n');
execFileSync(ffmpeg,['-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',path.join(run,'frames.ffconcat'),'-an','-r','25','-vf','scale=480:900:force_original_aspect_ratio=decrease,pad=480:900:(ow-iw)/2:(oh-ih)/2','-c:v','libx264','-preset','medium','-crf','23','-pix_fmt','yuv420p','-movflags','+faststart',candidate],{stdio:'inherit'});
assert((await fs.stat(candidate)).size>10000,'Encoded video is unexpectedly small');
execFileSync(ffmpeg,['-hide_banner','-loglevel','error','-i',candidate,'-f','null','-'],{stdio:'inherit'});
await fs.copyFile(candidate,final);
await fs.writeFile(path.join(work,'recording.json'),JSON.stringify({date:new Date().toISOString(),identity,final,bytes:(await fs.stat(final)).size,width:480,height:900,captureElapsedSeconds:Math.round(duration*100)/100,frames:frames.length,decodeVerified:true,capture:'actual packaged Electron CDP screencast, real elapsed frame durations',isolatedProfile:profile,steps,errors,scope:'CG50 Manual Simp, Metric menu and one-shot Statistics column formula; not a full-device parity claim'},null,2));
console.log(final);
