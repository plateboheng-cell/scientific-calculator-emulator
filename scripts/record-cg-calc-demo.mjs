import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {performance} from 'node:perf_hooks';
import {execFileSync,spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {_electron} from 'playwright';
import {cg50} from '../src/models/cg50.js';
import {expressionToLatex} from '../src/engine/notation.js';
import {APP_NAME,APP_VERSION} from '../src/brand.js';

// Actual packaged app recording. expressionToLatex constructs editable input;
// every displayed answer is evaluated by the running calculator itself.
const root=path.resolve('.'),work=path.join(root,'.verification','cg-calc-demo-'+APP_VERSION),output=path.join(root,'录屏');
await fs.mkdir(work,{recursive:true});await fs.mkdir(output,{recursive:true});
const run=await fs.mkdtemp(path.join(work,'take-')),profile=path.join(run,'profile');await fs.mkdir(profile);
const executable=process.env.CNX_ELECTRON_PATH||path.join(root,'release','win-unpacked',APP_NAME+'.exe');
const ffmpeg=process.env.SCS_FFMPEG_PATH||'ffmpeg';await fs.access(executable);if(path.isAbsolute(ffmpeg))await fs.access(ffmpeg);
const final=path.join(output,APP_NAME+'-'+APP_VERSION+'-CG50数值计算演示.mp4'),candidate=path.join(run,'calculation-demo.mp4');
const frames=[],steps=[],errors=[];
let app,page,cdp,identity,started=0,ended=0,captureActive=false,frameWrites=Promise.resolve();

function acceptFrame(data){
  if(!captureActive)return;const at=(performance.now()-started)/1000,name='frame-'+String(frames.length).padStart(6,'0')+'.jpg';
  frames.push({name,at});frameWrites=frameWrites.then(()=>fs.writeFile(path.join(run,name),Buffer.from(data,'base64')));
}
async function snapshot(){const frame=await cdp.send('Page.captureScreenshot',{format:'jpeg',quality:92,fromSurface:true});acceptFrame(frame.data);}
const key=action=>page.locator('[data-action="'+action+'"]').first(),hold=ms=>page.waitForTimeout(ms);
async function press(action,delay=100){await key(action).click();if(delay)await hold(delay);}
const soft=(number,delay=100)=>press('cg-f'+number,delay);
const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('cnx-v2')).profiles.cg50);
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-6*Math.max(1,Math.abs(expected)),String([actual,expected]));
async function noError(){assert.equal(await page.locator('#answer.error').count(),0,await page.locator('#answer').innerText());}
async function witness(name,extra={}){steps.push({name,atSeconds:Math.round((performance.now()-started)/10)/100,...extra});await snapshot();}
async function calcMenu(pageNumber=0){await press('options');await soft(4);for(let index=0;index<pageNumber;index++)await soft(6);}
async function digits(value){for(const digit of String(value))await press(digit,90);}
async function nativeInteger(kind,expected){
  await press('cg-clear-on');await digits(107);await calcMenu(2);await hold(550);
  assert.deepEqual(await page.locator('#cg-context-softkeys button').allTextContents(),['Int÷','Rmdr','Simp','','','▶']);
  await soft(kind==='quotient'?1:2,350);await digits(7);await hold(500);await witness(kind==='quotient'?'Native107 Int÷7 input':'Native107 Rmdr7 input');
  await press('execute',0);await noError();assert.equal((await saved()).calculator.vars.Ans,expected);await hold(2100);
  await witness(kind==='quotient'?'Integer quotient result15':'Integer remainder result2',{result:expected,source:(await saved()).history.at(-1).expr});
}
async function fillMathCall(source){
  const latex=expressionToLatex(source);assert.equal(typeof latex,'string');
  await page.locator('#entry').evaluate((field,value)=>{assertMathField(field);field.value=value;field.dispatchEvent(new Event('input',{bubbles:true}));field.focus();field.position=field.lastOffset;function assertMathField(element){if(element.tagName!=='MATH-FIELD')throw Error('Expected real MathLive entry');}},latex);
  await hold(1250);
}

try{
  app=await _electron.launch({executablePath:executable,args:['--user-data-dir='+profile],env:{...process.env,CNX_TEST:'1',CNX_TEST_SYSTEM_LANGUAGES:'["zh-CN"]'}});
  page=await app.firstWindow();page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setContentSize(480,900));
  identity=await app.evaluate(({app})=>({name:app.getName(),version:app.getVersion(),packaged:app.isPackaged,userData:app.getPath('userData')}));
  assert.equal(identity.name,APP_NAME);assert.equal(identity.version,APP_VERSION);assert.equal(identity.packaged,true,'Record the validated packaged app');
  assert.equal(path.resolve(identity.userData).toLowerCase(),path.resolve(profile).toLowerCase(),'Recording must use its independent user-data directory');
  await page.locator('[data-model-choice="cg50"]').waitFor({state:'visible'});await page.evaluate(()=>document.fonts.ready);
  cdp=await page.context().newCDPSession(page);
  cdp.on('Page.screencastFrame',event=>{acceptFrame(event.data);void cdp.send('Page.screencastFrameAck',{sessionId:event.sessionId}).catch(()=>{});});
  started=performance.now();captureActive=true;await snapshot();await cdp.send('Page.startScreencast',{format:'jpeg',quality:92,maxWidth:480,maxHeight:900,everyNthFrame:1});
  await hold(250);await page.locator('[data-model-choice="cg50"]').click();await page.locator('.calculator-cover-scene').waitFor({state:'detached'});await hold(450);await witness('CG50 stationary cover removal');
  await press('menu',280);const runIndex=cg50.nativeMenu.findIndex(row=>row[3]==='calc');assert(runIndex>=0);await page.locator('[data-mode="'+runIndex+'"]').click();await hold(450);await witness('RUN-MATRIX');

  await nativeInteger('quotient',15);await nativeInteger('remainder',2);
  const scalarAnswerBefore=(await saved()).calculator.vars.Ans;assert.equal(scalarAnswerBefore,2);

  await calcMenu(1);assert.deepEqual(await page.locator('#cg-context-softkeys button').allTextContents(),['FMin','FMax','Σ(','logab','','▶']);await soft(1,250);
  await fillMathCall('FMin(x^2-4*x+9,0,3)');await witness('Native FMin expression input');await press('execute',0);await noError();
  const minimum=(await saved()).calculator.nativeAnswers.list;assert.equal(minimum.length,2);near(minimum[0],2);near(minimum[1],5);assert.equal((await saved()).calculator.vars.Ans,scalarAnswerBefore);
  await hold(3100);await witness('FMin returns the List answer2,5 with independent scalar Ans',{listAnswer:minimum,scalarAnswer:scalarAnswerBefore});

  await calcMenu();await soft(5,250);await fillMathCall('SolveN(x^2-5*x-6)');await witness('Native SolveN expression input');await press('execute',0);
  await page.locator('#cg-calculation-notice').waitFor({state:'visible'});assert.match(await page.locator('#cg-calculation-notice').innerText(),/More solutions may exist/);
  assert.deepEqual((await saved()).calculator.nativeAnswers.list,[-1,6]);assert.equal((await saved()).calculator.vars.Ans,scalarAnswerBefore);
  await hold(2600);await witness('Actual native numerical warning requires EXE',{message:'More solutions may exist.'});await press('execute',0);await page.locator('#cg-calculation-notice').waitFor({state:'detached'});await noError();
  assert.deepEqual((await saved()).calculator.nativeAnswers.list,[-1,6]);assert.equal((await saved()).calculator.vars.Ans,scalarAnswerBefore);
  await hold(2400);await witness('SolveN returns ListAns-1,6 after real EXE acknowledgement',{listAnswer:[-1,6],scalarAnswer:scalarAnswerBefore});
  // Keep a readable final display and target a35–40 second demonstration.
  await hold(Math.max(0,35500-(performance.now()-started)));assert.deepEqual(errors,[]);await snapshot();ended=performance.now();captureActive=false;await cdp.send('Page.stopScreencast');await frameWrites;
}catch(error){
  captureActive=false;await page?.screenshot({path:path.join(work,'recording-failure.png')}).catch(()=>{});
  await fs.writeFile(path.join(work,'recording-failure.json'),JSON.stringify({date:new Date().toISOString(),error:error.stack,identity,steps,errors,screen:await page?.locator('#screen').innerText().catch(()=>null)},null,2));throw error;
}finally{captureActive=false;await cdp?.send('Page.stopScreencast').catch(()=>{});await frameWrites;await app?.close();}

assert(frames.length>=10,'Not enough captured frames');const captureElapsedSeconds=(ended-started)/1000;
const concat=['ffconcat version 1.0'];
for(let index=0;index<frames.length;index++){const next=index+1<frames.length?frames[index+1].at:captureElapsedSeconds;concat.push("file '"+frames[index].name+"'",'duration '+Math.max(.001,next-frames[index].at).toFixed(6));}
concat.push("file '"+frames.at(-1).name+"'");await fs.writeFile(path.join(run,'frames.ffconcat'),concat.join('\n')+'\n');
execFileSync(ffmpeg,['-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',path.join(run,'frames.ffconcat'),'-an','-r','25','-vf','scale=480:900:force_original_aspect_ratio=decrease,pad=480:900:(ow-iw)/2:(oh-ih)/2','-c:v','libx264','-preset','medium','-crf','23','-pix_fmt','yuv420p','-movflags','+faststart',candidate],{stdio:'inherit',windowsHide:true});
assert((await fs.stat(candidate)).size>10000,'Encoded video is unexpectedly small');
const decode=spawnSync(ffmpeg,['-hide_banner','-i',candidate,'-f','null','-'],{encoding:'utf8',windowsHide:true,maxBuffer:4*1024*1024});
if(decode.error)throw decode.error;assert.equal(decode.status,0,decode.stderr);const duration=/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(decode.stderr);assert(duration,'FFmpeg did not report encoded media duration');
const mediaDurationSeconds=Number(duration[1])*3600+Number(duration[2])*60+Number(duration[3]);assert(mediaDurationSeconds>0);assert.match(decode.stderr,/Video:\s*h264/);
await fs.copyFile(candidate,final);
const player=path.join(work,'player.html');await fs.writeFile(player,'<!doctype html><meta charset="utf-8"><title>'+APP_NAME+' '+APP_VERSION+' CG50 数值计算演示</title><style>body{margin:0;background:#12181e;display:grid;place-items:center;min-height:100vh}video{max-height:100vh;max-width:100vw}</style><video id="player" controls playsinline src="'+pathToFileURL(final).href+'"></video>','utf8');
await fs.writeFile(path.join(work,'recording.json'),JSON.stringify({date:new Date().toISOString(),identity,final,player,bytes:(await fs.stat(final)).size,width:480,height:900,captureElapsedSeconds:Math.round(captureElapsedSeconds*100)/100,mediaDurationSeconds,frames:frames.length,decodeVerified:true,capture:'actual packaged Electron CDP screencast with real elapsed frame durations',isolatedProfile:profile,steps,errors,scope:'Native CG50 Int÷,Rmdr,FMin,SolveN and actual EXE warning acknowledgement; bounded demonstration, not a complete device-parity claim'},null,2));
console.log(final);
