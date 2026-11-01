import {_electron} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {expressionToLatex} from '../src/engine/notation.js';

const evidence=path.resolve('.verification'),profile=await fs.mkdtemp(path.join(evidence,'usability-profile-'));
const passed=[],failed=[],errors=[],network=[];
const total=(await fs.readFile(new URL(import.meta.url),'utf8')).match(/await check\(/g).length;
let app,page,application;
async function launch(){
  app=await _electron.launch({executablePath:process.env.CNX_ELECTRON_PATH||undefined,args:[process.env.CNX_APP_PATH||'.','--user-data-dir='+profile],env:{...process.env,CNX_TEST:'1',CNX_TEST_SYSTEM_LANGUAGES:'["zh-CN"]'}});
  page=await app.firstWindow();page.setDefaultTimeout(12000);
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:|^wss?:/.test(r.url()))network.push(r.url());});
  await page.locator('.calculator').waitFor();application=await app.evaluate(({app})=>({version:app.getVersion(),packaged:app.isPackaged}));
}
const key=action=>page.locator('[data-action="'+action+'"]').first();
const stored=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('cnx-v2')));
const near=(a,b,t=1e-7)=>assert.ok(Number.isFinite(a)&&Math.abs(a-b)<=t*Math.max(1,Math.abs(b)),`${a} != ${b}`);
async function select(id){if(!await page.locator('#model-picker[open]').count())await key('models').click();await page.locator('[data-model-choice='+id+']').click();}
async function parameters(values){for(const [name,value]of Object.entries(values))await page.locator('[data-name="'+name+'"]').evaluate((el,v)=>{el.value=el.tagName==='MATH-FIELD'?v.latex:v.plain;el.dispatchEvent(new Event('input',{bubbles:true}));},{plain:String(value),latex:expressionToLatex(String(value))});await page.locator('.run-button').click();}
async function expression(text){await key('clear').click();await page.locator('#entry').focus();await page.keyboard.type(text);await key('execute').click();}
async function graphExpressions(expressions){for(let i=0;i<5;i++){if(await page.locator('#graph-y0').isVisible()&&(await page.locator('.graph-screen-softkeys [data-soft="6"]').textContent())==='DRAW')break;await page.keyboard.press('Escape');}await page.locator('#graph-y0').waitFor({state:'visible'});assert.equal(await page.locator('.graph-screen-softkeys [data-soft="6"]').textContent(),'DRAW');for(let i=0;i<expressions.length;i++)await page.locator('#graph-y'+i).evaluate((el,value)=>{el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));},expressionToLatex(expressions[i]));await page.keyboard.press('F6');await page.locator('#graph-canvas').waitFor({state:'visible'});}
const coordinate=async name=>Number(await page.locator('#graph-canvas').getAttribute('data-trace-'+name));
async function check(name,run){try{await run();passed.push(name);console.log('PASS '+name);}catch(e){failed.push({name,error:e.message});console.error('FAIL '+name+' '+e.message);await page.screenshot({path:path.join(evidence,'usability-failure-'+failed.length+'.png')}).catch(()=>{});}}
try{
  await launch();await select('cncw');
  await check('991 CW has six CODATA 2018 categories and computes the selected Planck constant',async()=>{
    await key('catalog').click();await page.locator('.list-item').filter({hasText:'科学常数'}).click();assert.equal(await page.locator('.list-item').count(),6);
    await page.locator('.list-item').first().click();assert.equal(await page.locator('.list-item').count(),9);await page.locator('.list-item').first().click();await key('execute').click();assert.equal((await stored()).profiles.cncw.calculator.vars.Ans,6.62607015e-34);
  });
  await check('991 CW small-scale SOLVE returns one and marks the result approximate',async()=>{
    await page.keyboard.press('Shift+F6');await parameters({expr:'1e-24*(x-1)=0',guess:0});near((await stored()).profiles.cncw.calculator.vars.x,1);assert.match(await page.locator('#screen').innerText(),/≈/);
  });
  await check('991 CW no-real-root equation reports failure without storing a false root',async()=>{
    await page.keyboard.press('Escape');await parameters({expr:'1e-24*(x^2+1)=0',guess:0});assert.match(await page.locator('#form-error').innerText(),/无法求解/);near((await stored()).profiles.cncw.calculator.vars.x,1);
  });
  await check('991 CW quadratic regression accepts offset data and predicts in stable coordinates',async()=>{
    await key('menu').click();await page.locator('[data-mode="1"]').click();await page.locator('.list-item').first().click();await page.locator('select[data-name=model]').selectOption('quadratic');
    const values={};for(let i=0;i<5;i++){values['x'+i]=10000+i;values['y'+i]=i*i;}await parameters(values);assert.equal(await page.locator('#form-error').count(),0);
    await page.keyboard.press('Escape');await page.keyboard.press('Escape');await page.locator('.list-item').filter({hasText:'回归预测'}).click();await parameters({x:10002.5});assert.match(await page.locator('#screen').innerText(),/6\.25/);
  });
  await select('cn999cw');
  await check('999 CW exposes the same 2018 categories without changing its twelve apps',async()=>{
    await key('menu').click();assert.equal(await page.locator('.mode-tile').count(),12);await page.locator('[data-mode="0"]').click();await key('catalog').click();await page.locator('.list-item').filter({hasText:'科学常数'}).click();assert.equal(await page.locator('.list-item').count(),6);
  });
  await check('999 CW shares corrected SOLVE through its own keyboard shortcut',async()=>{await page.keyboard.press('Shift+F6');await parameters({expr:'1e-24*(x-1)=0',guess:0});near((await stored()).profiles.cn999cw.calculator.vars.x,1);});
  await select('ti36xpro');
  await check('TI MODE presents the six original rows with independent settings',async()=>{
    await page.keyboard.press('F11');assert.equal(await page.locator('.ti-mode-row').count(),6);assert.deepEqual(await page.locator('.ti-mode-row').first().locator('button').allTextContents(),['DEG','RAD','GRAD']);await page.screenshot({path:path.join(evidence,'ti-mode.png')});
  });
  await check('TI MODE arrow keys move the cursor and ENTER confirms RAD',async()=>{await page.keyboard.press('ArrowRight');await page.keyboard.press('Enter');assert.equal((await stored()).profiles.ti36xpro.calculator.angle,'Rad');await page.locator('[data-ti-setting="0,0"]').click();});
  await check('TI ENG and two decimals produce a correctly rounded engineering result',async()=>{
    await page.locator('[data-ti-setting="1,2"]').click();await page.locator('[data-ti-setting="2,3"]').click();await key('clear').click();await expression('123456.78');assert.equal((await page.locator('#answer').innerText()).trim(),'123.46e+3');
  });
  await check('TI CLASSIC input supports actual editing, fractions and multi-tap combinations',async()=>{
    await key('ti-mode').click();await page.locator('[data-ti-setting="1,0"]').click();await page.locator('[data-ti-setting="2,0"]').click();await page.locator('[data-ti-setting="5,0"]').click();await key('clear').click();assert.equal(await page.locator('input#entry').count(),1);
    await expression('1/4');assert.equal((await page.locator('#answer').innerText()).trim(),'0.25');await key('clear').click();await page.locator('#entry').fill('52');await key('ti-multi:prob').click();await key('ti-multi:prob').click();await page.keyboard.type('5');await key('execute').click();assert.equal((await stored()).profiles.ti36xpro.calculator.vars.Ans,2598960);
  });
  await check('TI polar output uses angle units and keeps exact stored complex components',async()=>{
    await key('ti-mode').click();await page.locator('[data-ti-setting="3,2"]').click();await page.locator('[data-ti-setting="2,3"]').click();await key('clear').click();await expression('2*i');assert.equal((await page.locator('#answer').innerText()).trim(),'2.00∠90.00');
  });
  await check('TI HEX mode actually changes parsing and output',async()=>{
    await key('ti-mode').click();await page.locator('[data-ti-setting="4,1"]').click();await key('clear').click();await expression('FF+1');assert.equal((await page.locator('#answer').innerText()).trim(),'100');
  });
  await check('TI MODE settings and active base survive a full Electron restart',async()=>{
    await app.close();app=null;await launch();assert.equal((await stored()).profiles.ti36xpro.tiSettings.base,16);await expression('F+1');assert.equal((await page.locator('#answer').innerText()).trim(),'10');
  });
  await check('TI restores MathPrint and its own constants catalog remains operational',async()=>{
    await key('ti-mode').click();await page.locator('[data-ti-setting="4,0"]').click();await page.locator('[data-ti-setting="5,1"]').click();await page.locator('[data-ti-setting="2,0"]').click();await page.locator('[data-ti-setting="3,0"]').click();await key('clear').click();await key('shift').click();await key('(').click();assert.equal(await page.locator('.list-item').count(),20);await page.locator('.list-item').first().click();await key('execute').click();assert.equal((await stored()).profiles.ti36xpro.calculator.vars.Ans,299792458);
  });
  await check('TI 2nd data opens DISTR with the seven functions in manual order',async()=>{
    await key('shift').click();await key('ti-data').click();await page.keyboard.press('ArrowRight');assert.deepEqual((await page.locator('.list-item').allTextContents()).map(s=>s.replace(/^\d+/,'')),['Normalpdf','Normalcdf','invNorm','Binompdf','Binomcdf','Poissonpdf','Poissoncdf']);await page.locator('.list-item').first().click();await parameters({x:0,'μ':0,'σ':1});near((await stored()).profiles.ti36xpro.calculator.vars.Ans,1/Math.sqrt(2*Math.PI));
  });
  await check('TI Binompdf ALL calculates the complete bounded probability list',async()=>{
    await key('shift').click();await key('ti-data').click();await page.keyboard.press('ArrowRight');await page.locator('.list-item').filter({hasText:'Binompdf'}).click();await page.locator('.list-item').filter({hasText:'ALL'}).click();await parameters({N:2,p:.5});const values=await page.locator('[data-result-number]').allTextContents();assert.deepEqual(values.map(s=>Number(s.replace('≈','').trim())),[.25,.5,.25]);
  });
  await check('TI ALL rejects list overflow without overwriting the prior result',async()=>{
    await page.keyboard.press('Escape');await parameters({N:42,p:.5});assert.match(await page.locator('#form-error').innerText(),/42/);
  });
  await select('cg50');
  await check('CG50 MIN finds the actual vertex through native G-Solv keys',async()=>{await graphExpressions(['x^2-4','']);await page.keyboard.press('Shift+F5');await page.keyboard.press('F3');near(await coordinate('x'),0);near(await coordinate('y'),-4);});
  await check('CG50 MAX and Y-intercept return distinct correct coordinates',async()=>{
    await graphExpressions(['-(x-1)^2+3','']);await page.keyboard.press('Shift+F5');await page.keyboard.press('F2');near(await coordinate('x'),1);near(await coordinate('y'),3);await page.keyboard.press('Shift+F5');await page.keyboard.press('F4');near(await coordinate('x'),0);near(await coordinate('y'),2);
  });
  await check('CG50 manual intersection example navigates both ways between crossings',async()=>{
    await graphExpressions(['x+1','x^2']);await page.keyboard.press('Shift+F5');await page.keyboard.press('F5');near(await coordinate('x'),(1-Math.sqrt(5))/2);await page.keyboard.press('ArrowRight');near(await coordinate('x'),(1+Math.sqrt(5))/2);await page.keyboard.press('ArrowLeft');near(await coordinate('x'),(1-Math.sqrt(5))/2);
  });
  await check('CG50 Y-CAL selects a curve and calculates a supplied x',async()=>{
    await page.keyboard.press('Shift+F5');await page.keyboard.press('F6');await page.keyboard.press('F1');await page.keyboard.press('Enter');await page.locator('[name=X]').fill('.5');await page.locator('.graph-parameter-form button').click();near(await coordinate('x'),.5);near(await coordinate('y'),1.5);
  });
  await check('CG50 X-CAL finds two x values for a supplied y',async()=>{
    await page.keyboard.press('Shift+F5');await page.keyboard.press('F6');await page.keyboard.press('F2');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');await page.locator('[name=Y]').fill('4');await page.locator('.graph-parameter-form button').click();near(await coordinate('x'),-2);await page.keyboard.press('ArrowRight');near(await coordinate('x'),2);
  });
  await check('CG50 integration returns a numerical area without altering Ans',async()=>{
    const before=(await stored()).profiles.cg50.calculator.vars.Ans;await page.keyboard.press('Shift+F5');await page.keyboard.press('F6');await page.keyboard.press('F3');await page.keyboard.press('Enter');await page.locator('[name=Lower]').fill('0');await page.locator('[name=Upper]').fill('1');await page.locator('.graph-parameter-form button').click();near(Number(await page.locator('#graph-canvas').getAttribute('data-integral')),1/3);assert.equal((await stored()).profiles.cg50.calculator.vars.Ans,before);
  });
  await check('CG50 STYLE applies and persists the native Broken line option',async()=>{
    await page.keyboard.press('Escape');await page.keyboard.press('F4');await page.keyboard.press('F1');assert.deepEqual(await page.locator('.graph-screen-softkeys button').allTextContents(),['Normal','Thick','Broken','Dot','Thin','']);await page.keyboard.press('F3');assert.equal((await stored()).profiles.cg50.graph.styles[1],'Broken');await page.keyboard.press('F6');await page.screenshot({path:path.join(evidence,'cg50-analysis.png')});
  });
  await check('CG50 FACTOR changes both zoom axes and PREVIOUS restores the window',async()=>{
    const original={...(await stored()).profiles.cg50.graph.window};await page.keyboard.press('Shift+F2');await page.keyboard.press('F2');await page.locator('[name=Xfact]').fill('4');await page.locator('[name=Yfact]').fill('3');await page.locator('.graph-parameter-form button').click();await page.keyboard.press('F3');const zoomed=(await stored()).profiles.cg50.graph.window;near(zoomed.xmax-zoomed.xmin,(original.xmax-original.xmin)/4);near(zoomed.ymax-zoomed.ymin,(original.ymax-original.ymin)/3);near((zoomed.xmax+zoomed.xmin)/2,(original.xmax+original.xmin)/2);near((zoomed.ymax+zoomed.ymin)/2,(original.ymax+original.ymin)/2);await page.keyboard.press('Shift+F2');await page.keyboard.press('F6');await page.keyboard.press('F5');const restored=(await stored()).profiles.cg50.graph.window;for(const name of ['xmin','xmax','ymin','ymax'])near(restored[name],original[name]);
  });
  await check('CG50 AUTO adapts the vertical range to real curve values',async()=>{await graphExpressions(['x+1','x^2']);const original=(await stored()).profiles.cg50.graph.window,quadraticMin=original.xmin<=0&&original.xmax>=0?0:Math.min(original.xmin**2,original.xmax**2),low=Math.min(original.xmin+1,quadraticMin),high=Math.max(original.xmax+1,original.xmin**2,original.xmax**2),padding=(high-low)*.05;await page.keyboard.press('Shift+F2');await page.keyboard.press('F5');const fitted=(await stored()).profiles.cg50.graph.window;near(fitted.xmin,original.xmin);near(fitted.xmax,original.xmax);near(fitted.ymin,low-padding);near(fitted.ymax,high+padding);});
  await check('CG50 styles and zoom factors survive restart independently of TI settings',async()=>{
    await app.close();app=null;await launch();const profiles=(await stored()).profiles;assert.equal(profiles.cg50.graph.styles[1],'Broken');assert.equal(profiles.cg50.graph.zoomX,4);assert.equal(profiles.ti36xpro.tiSettings.input,'math');
  });
  await check('CW constant categories and TI MODE work with the English interface',async()=>{
    await select('cncw');await page.keyboard.press('F12');await key('catalog').click();await page.locator('.list-item').filter({hasText:'Scientific constants'}).click();assert.doesNotMatch(await page.locator('#screen').innerText(),/\p{Script=Han}/u);await select('ti36xpro');await key('ti-mode').click();assert.doesNotMatch(await page.locator('#screen').innerText(),/\p{Script=Han}/u);
  });
  await check('all usability workflows remain offline and have no renderer exceptions',async()=>{assert.deepEqual(errors,[]);assert.deepEqual(network,[]);});
}finally{
  await app?.close();await fs.writeFile(path.join(evidence,'usability-ui-results.json'),JSON.stringify({date:new Date().toISOString(),application,counts:{passed:passed.length,failed:failed.length,notRun:total-passed.length-failed.length},passed,failed,errors,network},null,2));
}
if(failed.length)process.exitCode=1;
