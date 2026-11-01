import {_electron} from 'playwright';
import {build} from 'vite';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {sanitizeCGStatistics,switchCGListFile,cgStatisticsMemoryBytes} from '../src/engine/cg-statistics.js';
const root=path.resolve('.'),evidence=path.join(root,'.verification'),fixtures=path.join(root,'scripts/fixtures'),built=path.join(evidence,'cg-list-formulas-built');await fs.mkdir(evidence,{recursive:true});
await build({configFile:false,root:fixtures,base:'./',resolve:{alias:{'/src':path.join(root,'src')}},build:{outDir:built,emptyOutDir:true,target:'es2022',rollupOptions:{input:path.join(fixtures,'cg-list-formulas-fixture.html')}}});
const profile=await fs.mkdtemp(path.join(evidence,'cg-list-formulas-ui-'));let app,page;const passed=[],errors=[];
const saved=()=>page.evaluate(()=>structuredClone(window.formulaData));
const calcSaved=()=>page.evaluate(()=>window.formulaCalcSaved());
const reset=(data={},options={})=>page.evaluate(({data,options})=>window.makeFormulaStats(data,options),{data,options});
const physical=action=>page.locator('[data-physical="'+action+'"]').click();
const header=async index=>{await page.locator('[name=selectedList]').selectOption({value:String(index)});await page.locator('[data-stat-header="'+index+'"]').click();await page.locator('[data-stat-formula]').waitFor({state:'visible'});};
async function formula(index,source,keyboard=false){await header(index);await page.locator('[data-stat-formula]').fill(source);if(keyboard)await page.keyboard.press('Enter');else await physical('execute');}
async function visibleEditor(){const box=await page.locator('#screen').boundingBox(),field=await page.locator('[data-stat-formula]').boundingBox(),keys=await page.locator('.cg-stat-softkeys').boundingBox();assert(field&&keys);assert.equal(await page.locator('.cg-stat-softkeys button').count(),6);assert(field.y>=box.y&&field.y+field.height<=keys.y+.5);assert(keys.y+keys.height<=box.y+box.height+.5);}
async function check(name,run){try{await run();passed.push(name);console.log('PASS '+name);}catch(error){await fs.writeFile(path.join(evidence,'cg-list-formulas-ui-failure.json'),JSON.stringify({name,error:error.stack,passed,errors,state:await saved(),calculator:await calcSaved(),screen:await page.locator('#screen').innerText()},null,2));await page.screenshot({path:path.join(evidence,'cg-list-formulas-ui-failure.png')});throw error;}}
try{
  app=await _electron.launch({executablePath:path.join(root,'node_modules/electron/dist/electron.exe'),args:[path.join(fixtures,'cg-list-formulas-fixture.cjs'),'--user-data-dir='+profile],env:{...process.env,CG_LIST_FORMULA_TEST_FILE:path.join(built,'cg-list-formulas-fixture.html')},timeout:120000});page=await app.firstWindow();page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));await page.waitForFunction(()=>window.formulaPanel);
  await check('manual3-3 column header and keyboard Enter store9,11,13 in177px without persistent formula',async()=>{
    await reset({lists:[[3,4,5],[6,7,8]]});await header(2);await visibleEditor();await page.locator('[data-stat-formula]').type('List1+List2');await page.locator('#screen').screenshot({path:path.join(evidence,'cg-list-formula-entry-177.png')});await page.keyboard.press('Enter');
    assert.deepEqual((await saved()).lists[2],[9,11,13]);assert.equal((await saved()).selectedRow,0);assert(!(JSON.stringify(await saved())).includes('List1+List2'));assert.equal(await page.locator('[data-stat-formula]').isVisible(),false);
  });
  await check('physical UP selects a header and physical token/EXE actions calculate an entire column once',async()=>{
    await reset({lists:[[3,4,5],[6,7,8]],selectedList:2});await physical('up');await visibleEditor();await page.locator('[data-token=List]').click();await physical('1');await physical('+');await page.locator('[data-token=List]').click();await physical('2');assert.equal(await page.locator('[data-stat-formula]').inputValue(),'List1+List2');await physical('execute');assert.deepEqual((await saved()).lists[2],[9,11,13]);
  });
  await check('native quoted subnames and existing subname editing coexist; changing a source does not recalculate the target',async()=>{
    await reset({lists:[[3,4,5],[6,7,8]],names:['QTY','PRICE'],selectedList:1});await page.locator('[data-stat-name]').fill('COST');await page.locator('[data-stat-name]').press('Tab');assert.equal((await saved()).names[1],'COST');await formula(2,'List "QTY"*List"COST"',true);assert.deepEqual((await saved()).lists[2],[18,28,40]);
    await page.locator('[data-stat-list="0"][data-stat-row="0"]').click();await page.locator('[data-stat-value]').fill('100');await page.keyboard.press('Enter');assert.deepEqual((await saved()).lists[0],[100,4,5]);assert.deepEqual((await saved()).lists[2],[18,28,40]);assert.equal((await saved()).selectedRow,1);
  });
  await check('List26 accepts native Seq and self target multiplication remains corresponding-element arithmetic',async()=>{
    await reset({lists:[[3,4,5]]});await formula(25,'Seq(X^2,X,1,11,5)',true);assert.deepEqual((await saved()).lists[25],[1,36,121]);await formula(0,'List1*List1');assert.deepEqual((await saved()).lists[0],[9,16,25]);
  });
  await check('six List Files keep their independent formula targets and selected source values',async()=>{
    let data=sanitizeCGStatistics({});for(let file=0;file<6;file++){data=switchCGListFile(data,file);data.lists[0]=[file*10+1,file*10+2];}data=switchCGListFile(data,0);await reset(data);
    for(let file=0;file<6;file++){await page.locator('[data-stat-file]').selectOption({value:String(file)});await formula(2,'List1+1');assert.deepEqual((await saved()).lists[2],[file*10+2,file*10+3]);}
    for(let file=0;file<6;file++){await page.locator('[data-stat-file]').selectOption({value:String(file)});assert.deepEqual((await saved()).lists[2],[file*10+2,file*10+3]);}
  });
  await check('invalid dimensions/domain preserve every list and leave the editable expression and physical EXIT available',async()=>{
    await reset({lists:[[1,2],[1],[99]]});const before=(await saved()).lists,calc=await calcSaved();await formula(2,'List1+List2');assert((await page.locator('.cg-stat-error').innerText()).length>0);assert.deepEqual((await saved()).lists,before);await visibleEditor();await page.locator('[data-stat-formula]').fill('List1/0');await physical('execute');assert.deepEqual((await saved()).lists,before);assert.deepEqual(await calcSaved(),calc);await physical('back');assert.equal(await page.locator('[data-stat-formula]').isVisible(),false);
  });
  await check('complex mode uses tagged values while Real mode rejects actual complex reads without deleting stored values',async()=>{
    const data={lists:[[{re:1,im:2},3],[4,5]]};await reset(data);await formula(2,'List1+1');assert((await page.locator('.cg-stat-error').innerText()).length>0);assert.deepEqual((await saved()).lists[0],data.lists[0]);await reset(data,{complex:true});await formula(2,'List1*(1+i)',true);assert.deepEqual((await saved()).lists[2],[{re:-1,im:3},{re:3,im:3}]);
  });
  await check('column calculation protects p/Finance/Ans even when caller is already an isolated calculator',async()=>{
    await reset({lists:[[1,2]]},{isolated:true});const before=await calcSaved();await formula(2,'List1+NormPD(0)+Smpl_SI(360,5,-1000)');assert.ok(Math.abs((await saved()).lists[2][0]-(51+1/Math.sqrt(2*Math.PI)))<1e-12);assert.deepEqual(await calcSaved(),before);
  });
  await check('legacy Sequence fill uses a private calculator and preserves native registers after success and domain failure',async()=>{
    await reset({lists:[[7]]},{isolated:true});const before=await calcSaved();await page.keyboard.press('F6');await page.getByRole('button',{name:'Sequence fill',exact:true}).click();for(const [name,value]of Object.entries({expression:'NormPD(n)+Smpl_SI(360,5,-1000)',start:'0',end:'1',step:'1'}))await page.locator('[name="'+name+'"]').fill(value);await page.locator('[name=target]').selectOption({value:'2'});await physical('execute');assert.equal((await saved()).lists[2].length,2);assert.deepEqual(await calcSaved(),before);
    await page.keyboard.press('F6');await page.getByRole('button',{name:'Sequence fill',exact:true}).click();await page.locator('[name=expression]').fill('NormPD(n)/0');await physical('execute');assert.deepEqual(await calcSaved(),before);assert.equal((await saved()).lists[2].length,2);
  });
  await check('memory budget rejects an oversized calculated column atomically and keeps the177px editor/softkeys visible',async()=>{
    const data=sanitizeCGStatistics({lists:[[1,2],[3],[99]]});await reset(data,{limitBytes:cgStatisticsMemoryBytes(data)+50});const before=(await saved()).lists,calc=await calcSaved();await formula(2,'Seq(NormPD(X),X,1,100)');assert.match(await page.locator('.cg-stat-error').innerText(),/Memory Full/);assert.deepEqual((await saved()).lists,before);assert.deepEqual(await calcSaved(),calc);await visibleEditor();await page.locator('#screen').screenshot({path:path.join(evidence,'cg-list-formula-memory-177.png')});
  });
  await check('onChange storage refusal rolls controller and component back, and the same expression can be retried',async()=>{
    await reset({lists:[[1,2],[],[99]]});await header(2);const before=(await saved()).lists;await page.evaluate(()=>window.formulaRejectStorage=true);await page.locator('[data-stat-formula]').fill('List1+1');await physical('execute');assert.match(await page.locator('.cg-stat-error').innerText(),/preserved/);assert.deepEqual((await saved()).lists,before);assert.equal(await page.locator('[data-stat-formula]').inputValue(),'List1+1');await page.evaluate(()=>window.formulaRejectStorage=false);await physical('execute');assert.deepEqual((await saved()).lists[2],[2,3]);
  });
  await check('invalid pending expressions prevent a file switch without losing the draft or source file',async()=>{
    await reset({lists:[[1,2]]});await header(2);await page.locator('[data-stat-formula]').fill('List1+');await page.locator('[data-stat-file]').selectOption({value:'1'});assert.equal((await saved()).listFile,0);assert.equal(await page.locator('[data-stat-file]').inputValue(),'0');assert.equal(await page.locator('[data-stat-formula]').inputValue(),'List1+');await page.locator('[data-stat-formula]').fill('List1+1');await page.locator('[data-stat-file]').selectOption({value:'1'});assert.equal((await saved()).listFile,1);await page.locator('[data-stat-file]').selectOption({value:'0'});assert.deepEqual((await saved()).lists[2],[2,3]);
  });
  assert.deepEqual(errors,[]);
}finally{await fs.writeFile(path.join(evidence,'cg-list-formulas-ui-results.json'),JSON.stringify({date:new Date().toISOString(),scope:'real isolated Electron Statistics component at340×177px; keyboard and physical action API',passed,errors,profile},null,2));if(app)await app.close();}
