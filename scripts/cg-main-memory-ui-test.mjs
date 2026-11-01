import {_electron} from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {cg50} from '../src/models/cg50.js';
import {encodeG3M,parseG3M} from '../src/engine/casio-files.js';
import {parseCGMainMemory,restoreCGMainMemorySource} from '../src/engine/cg-main-memory-files.js';

// Actual production main controller, built dist and real Electron persistence.
// No controller globals are injected. Main-process setup only intercepts real
// downloads so save dialogs cannot block an unattended test.
const evidence=path.resolve('.verification');await fs.mkdir(evidence,{recursive:true});
const runtime=await fs.mkdtemp(path.join(evidence,'cg-native-main-'));
const profile=path.join(runtime,'profile'),downloadDirectory=path.join(runtime,'downloads');
await fs.mkdir(downloadDirectory,{recursive:true});
const passed=[],errors=[],downloads=[];
let app,page,launchSequence=0;
const key=action=>page.locator('[data-action="'+action+'"]').first();
const soft=index=>key('cg-f'+index).click();
const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('cnx-v2')).profiles.cg50);
const mode=async name=>{await key('menu').click();await page.locator('[data-mode="'+cg50.nativeMenu.findIndex(row=>row[3]===name)+'"]').click();};

const hex=text=>Uint8Array.from(text.replace(/\s/g,'').match(/../g).map(n=>parseInt(n,16)));
const concat=(...parts)=>Uint8Array.from(parts.flatMap(part=>Array.from(part)));
const zero=hex('00 00 00 00 00 00 00 00 00 00 00 00');
const bcd={1:hex('10 01 00 00 00 00 00 00 00 00 00 00'),2:hex('10 02 00 00 00 00 00 00 00 00 00 00'),3:hex('10 03 00 00 00 00 00 00 00 00 00 00'),4:hex('10 04 00 00 00 00 00 00 00 00 00 00'),5:hex('10 05 00 00 00 00 00 00 00 00 00 00'),7:hex('10 07 00 00 00 00 00 00 00 00 00 00'),11:hex('10 11 10 00 00 00 00 00 00 00 00 00'),13:hex('10 11 30 00 00 00 00 00 00 00 00 00'),42:hex('10 14 20 00 00 00 00 00 00 00 00 00')};
function cellsHeader(rows,columns,title=''){const bytes=new Uint8Array(16);bytes.set(Array.from(title,c=>c.charCodeAt(0)));const view=new DataView(bytes.buffer);view.setUint16(8,rows);view.setUint16(10,columns);return bytes;}
// Native Program body below is written as independent byte facts: assignment
// 0E, newline 0D and addition 89. It is not UTF-8 masquerading as a program.
const numericSource='7→B\nB+5→C\nC◢';
const numericBody=hex('37 0E 42 0D 42 89 35 0E 43 0D 43 0C');
const numericProgram=new Uint8Array(24);numericProgram.set(numericBody,10);
const flaggedOne=bcd[1].slice();flaggedOne[0]|=128;
const setup=new Uint8Array(200);setup[0x13]=0;setup[0x2a]=1;setup[0x2e]=1;
const unknownPayload=hex('00 FF 7F 00 F7 00 13 42 81 00');
const mixedBytes=encodeG3M({groups:[
  {name:'PROGRAM',files:[{name:'NUMLINK',directory:'system',type:1,data:numericProgram}]},
  {name:'LISTFILE 1',files:[{name:'1LIST3',directory:'main',type:5,data:concat(cellsHeader(2,0,'G3DATA'),flaggedOne,bcd[4],bcd[2],zero)}]},
  {name:'MAT Z',files:[{name:'MAT_Z',directory:'main',type:6,data:concat(cellsHeader(2,2),bcd[2],bcd[3],bcd[5],bcd[7])}]},
  {name:'VCT Z',files:[{name:'VCT_Z',directory:'main',type:6,data:concat(cellsHeader(2,1),bcd[11],bcd[13])}]},
  {name:'ALPHA MEM',files:[{name:'A',directory:'$GLOBAL',type:0,data:concat(bcd[42],zero)}]},
  {name:'SETUP',files:[{name:'SETUP',directory:'$GLOBAL',type:0x14,data:setup}]},
  {name:'OPAQUE',files:[{name:'RAW',directory:'main',type:0x44,data:unknownPayload,reservedBytes:[7,8,9]}]},
]});
const mixedFile=path.join(runtime,'MIXED.g3m');await fs.writeFile(mixedFile,mixedBytes);
const authorFile=path.resolve('tests/fixtures/casio-main-memory/PONG.g3m');
const authorBytes=new Uint8Array(await fs.readFile(authorFile));
const authorParsed=await parseCGMainMemory(authorBytes),authorSource=authorParsed.entries[0].decoded.source;
const badFile=path.join(runtime,'CORRUPT.g3m'),badBytes=authorBytes.slice();badBytes[29]^=1;await fs.writeFile(badFile,badBytes);

async function launch(){
  const launchDownloadDirectory=path.join(downloadDirectory,'launch-'+(++launchSequence));await fs.mkdir(launchDownloadDirectory,{recursive:true});
  app=await _electron.launch({executablePath:process.env.CNX_ELECTRON_PATH||undefined,args:[process.env.CNX_APP_PATH||'.','--user-data-dir='+profile],env:{...process.env,CNX_TEST:'1',CNX_TEST_SYSTEM_LANGUAGES:'["en-US"]'},timeout:120000});
  page=await app.firstWindow();
  await app.evaluate(({session,BrowserWindow},directory)=>{
    globalThis.cgNativeDownloads=[];
    globalThis.cgNativeTransferTrace=[];
    const window=BrowserWindow.getAllWindows()[0];globalThis.cgNativeTransferTrace.push({event:'session',isDefault:window.webContents.session===session.defaultSession});
    window.webContents.on('will-navigate',(event,url)=>globalThis.cgNativeTransferTrace.push({event:'will-navigate',url,prevented:event.defaultPrevented}));
    window.webContents.session.on('will-download',(_event,item)=>{
      const record={name:item.getFilename(),file:directory+'/'+globalThis.cgNativeDownloads.length+'_'+item.getFilename(),state:'running'};
      globalThis.cgNativeDownloads.push(record);item.setSavePath(record.file);
      item.once('done',(_event,state)=>{record.state=state;record.receivedBytes=item.getReceivedBytes();record.totalBytes=item.getTotalBytes();});
    });
  },launchDownloadDirectory);
  page.setDefaultTimeout(20000);
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(['error','warning'].includes(message.type()))console.error('RENDERER '+message.text());});
  await page.locator('.calculator').waitFor();
}
async function download(action,expectedName){
  const index=await app.evaluate(()=>globalThis.cgNativeDownloads.length);await action();let record;
  for(let attempt=0;attempt<160;attempt++){
    record=await app.evaluate((_electron,index)=>globalThis.cgNativeDownloads[index]||null,index);
    if(record?.state==='completed')break;
    if(record?.state==='interrupted'||record?.state==='cancelled')throw Error('Native download '+record.state);
    await page.waitForTimeout(50);
  }
  assert.equal(record?.state,'completed','Native download did not complete');assert.equal(record.name,expectedName);downloads.push(record);
  const bytes=new Uint8Array(await fs.readFile(record.file));assert.equal(bytes.length,record.receivedBytes);return {record,bytes};
}
async function openNative(file){
  await mode('link');const chooserEvent=page.waitForEvent('filechooser');await soft(4);await(await chooserEvent).setFiles(file);
  await page.locator('.cg-workspace-body pre').filter({hasText:path.basename(file)}).waitFor();
}
async function waitProgram(name){await page.waitForFunction(name=>JSON.parse(localStorage.getItem('cnx-v2')).profiles.cg50.cgWorkspace.program.programs.some(program=>program.name===name),name);}
async function selectProgram(name){await mode('program');await page.locator('[data-program-list]').selectOption({label:name});}
async function runNumeric(){
  await selectProgram('NUMLINK');assert.equal(await page.locator('[data-program-source]').inputValue(),numericSource);await soft(1);
  await page.locator('[data-prompt]:visible').waitFor();assert.match(await page.locator('.cg-program-panel .cg-result').innerText(),/12/);await soft(1);
  await page.waitForFunction(()=>document.querySelector('.cg-program-panel .cg-result')?.textContent.includes('Done'));
  assert.equal(await page.locator('.cg-program-panel .cg-error').innerText(),'');assert.match(await page.locator('.cg-program-panel .cg-result').innerText(),/12/);
  const state=await saved();assert.equal(state.calculator.vars.B,7);assert.equal(state.calculator.vars.C,12);
}
function assertNativeExport(parsed){
  const find=kind=>parsed.entries.find(entry=>entry.kind===kind);
  assert.deepEqual(find('list').decoded.values,[{re:1,im:2},4]);assert.equal(find('list').decoded.title,'G3DATA');
  assert.deepEqual(find('matrix').decoded.values,[[2,3],[5,7]]);assert.deepEqual(find('vector').decoded.values,[[11],[13]]);
  assert.equal(parsed.entries.find(entry=>entry.kind==='variable'&&entry.name==='A').decoded.values[0],42);
  const unknown=parsed.entries.find(entry=>entry.group==='OPAQUE'&&entry.name==='RAW');assert.equal(unknown.status,'opaque');
  const raw=parsed.archive.groups[unknown.groupIndex].files[unknown.fileIndex];assert.deepEqual(raw.data,unknownPayload);assert.deepEqual(raw.reservedBytes,Uint8Array.of(7,8,9));
  const pong=parsed.entries.find(entry=>entry.kind==='program'&&entry.name==='PONG');
  assert.deepEqual(parsed.archive.groups[pong.groupIndex].files[pong.fileIndex].data,authorParsed.archive.groups[0].files[0].data);
}
async function check(name,run){
  try{await run();passed.push(name);console.log('PASS '+name);}
  catch(error){await fs.writeFile(path.join(evidence,'cg-main-memory-main-failure.json'),JSON.stringify({date:new Date().toISOString(),name,error:error.stack,runtime,screen:await page.locator('#screen').innerText().catch(()=>null),state:await saved().catch(()=>null),downloads:await app.evaluate(()=>globalThis.cgNativeDownloads||[]).catch(()=>[]),transferTrace:await app.evaluate(()=>globalThis.cgNativeTransferTrace||[]).catch(()=>[])},null,2));await page.screenshot({path:path.join(evidence,'cg-main-memory-main-failure.png')}).catch(()=>{});throw error;}
}

try{
  await launch();await page.locator('[data-model-choice=cg50]').click();
  await check('Link reads the unchanged author archive and native SAVE produces byte-identical bytes',async()=>{
    await openNative(authorFile);assert.match(await page.locator('#screen').innerText(),/1 decoded · 0 retained opaque/);
    const savedDownload=await download(()=>soft(1),'PONG.g3m');assert.deepEqual(savedDownload.bytes,authorBytes);
  });
  await check('native IMPORT commits the author Program while preserving the live Link panel',async()=>{
    await soft(2);await waitProgram('PONG');const state=await saved();assert.equal(state.mode,'link');assert.equal(await page.locator('.cg-workspace-softkeys').count(),1);
    assert.match(await page.locator('.cg-workspace-error').innerText(),/Imported 1/);
    await page.screenshot({path:path.join(evidence,'cg-main-memory-import.png')});
    await selectProgram('PONG');assert.equal(await page.locator('[data-program-source]').inputValue(),authorSource);
  });
  await check('mixed native Program/List/Mat/Vct/scalar/SETUP records import with unknown data retained',async()=>{
    await openNative(mixedFile);assert.match(await page.locator('#screen').innerText(),/6 decoded · 1 retained opaque/);await soft(2);await waitProgram('NUMLINK');
    await page.waitForFunction(()=>JSON.parse(localStorage.getItem('cnx-v2')).profiles.cg50.calculator.vars.A===42);
    const state=await saved();assert.equal(state.mode,'link');assert.deepEqual(state.cgWorkspace.statistics.lists[2],[{re:1,im:2},4]);
    assert.deepEqual(state.matrices.MatZ,[[2,3],[5,7]]);assert.deepEqual(state.vectors.VctZ,[[11],[13]]);assert.equal(state.cgWorkspace.system.complex,'a+bi');assert.equal(state.calculator.angle,'Deg');
    const retained=await restoreCGMainMemorySource(state.cgWorkspace.nativeMainMemory);assert.equal(retained.entries.length,8);assert.equal(retained.entries.filter(entry=>entry.status==='opaque').length,1);
  });
  await check('IMPORT keeps an edited Program conflict and reviewed REPLACE restores its native source',async()=>{
    await selectProgram('NUMLINK');await page.locator('[data-program-source]').fill('99→C\nC');
    await openNative(mixedFile);await soft(2);await page.locator('.cg-workspace-error').filter({hasText:'Kept 2'}).waitFor();
    assert.match(await page.locator('.cg-workspace-body').innerText(),/NUMLINK: Program already exists/);
    let state=await saved();assert.equal(state.cgWorkspace.program.programs.find(program=>program.name==='NUMLINK').source,'99→C\nC');
    await soft(4);assert.match(await page.locator('#screen').innerText(),/Replace matching/);await soft(1);
    await page.waitForFunction(source=>JSON.parse(localStorage.getItem('cnx-v2')).profiles.cg50.cgWorkspace.program.programs.find(program=>program.name==='NUMLINK')?.source===source,numericSource);
    state=await saved();assert.equal(state.mode,'link');assert.match(await page.locator('.cg-workspace-error').innerText(),/Imported 6/);
  });
  await check('the imported numeric native Program runs through the actual Program controller',runNumeric);
  await check('Link CURRENT EXPORT emits parseable mixed native memories and retains original opaque records',async()=>{
    await openNative(mixedFile);const result=await download(()=>soft(3),'MAINMEM.g3m');assertNativeExport(await parseCGMainMemory(result.bytes));
    assert.equal(parseG3M(result.bytes).header.producerProfile,'cg50-public-basic-exports');
    await page.screenshot({path:path.join(evidence,'cg-main-memory-export.png')});
  });
  await check('an invalid producer header is rejected without replacing any active or retained native memory',async()=>{
    const before=await saved();await mode('link');const chooserEvent=page.waitForEvent('filechooser');await soft(4);await(await chooserEvent).setFiles(badFile);
    await page.locator('.cg-workspace-error').filter({hasText:'integrity bytes'}).waitFor();const after=await saved();
    assert.deepEqual(after.cgWorkspace.nativeMainMemory,before.cgWorkspace.nativeMainMemory);assert.deepEqual(after.matrices,before.matrices);assert.deepEqual(after.vectors,before.vectors);assert.equal(after.calculator.vars.A,42);
  });
  await check('a real application close/restart preserves the source archive, memories and runnable imported Program',async()=>{
    const before=await saved();await app.close();app=null;await launch();const after=await saved();
    assert.deepEqual(after.cgWorkspace.nativeMainMemory,before.cgWorkspace.nativeMainMemory);assert.deepEqual(after.cgWorkspace.statistics.lists[2],[{re:1,im:2},4]);assert.deepEqual(after.vectors.VctZ,[[11],[13]]);
    const source=await restoreCGMainMemorySource(after.cgWorkspace.nativeMainMemory);assert.equal(source.entries.length,8);assert.equal(source.source.provenance.length,7);
    await runNumeric();await mode('link');const exported=await download(()=>soft(5),'MAINMEM.g3m');assertNativeExport(await parseCGMainMemory(exported.bytes));
    await page.screenshot({path:path.join(evidence,'cg-main-memory-restarted.png')});
  });
  await check('deleting an imported Program stays deleted in current native exports and after a real restart',async()=>{
    await selectProgram('NUMLINK');await soft(4);assert(!(await saved()).cgWorkspace.program.programs.some(program=>program.name==='NUMLINK'));
    await mode('link');let result=await download(()=>soft(5),'MAINMEM.g3m');let parsed=await parseCGMainMemory(result.bytes);assertNativeExport(parsed);assert(!parsed.entries.some(entry=>entry.kind==='program'&&entry.name==='NUMLINK'));
    await app.close();app=null;await launch();assert(!(await saved()).cgWorkspace.program.programs.some(program=>program.name==='NUMLINK'));
    await mode('link');result=await download(()=>soft(5),'MAINMEM.g3m');parsed=await parseCGMainMemory(result.bytes);assertNativeExport(parsed);assert(!parsed.entries.some(entry=>entry.kind==='program'&&entry.name==='NUMLINK'));
    await page.screenshot({path:path.join(evidence,'cg-main-memory-deleted.png')});
  });
  assert.deepEqual(errors,[]);
}finally{
  await fs.writeFile(path.join(evidence,'cg-main-memory-main-ui-results.json'),JSON.stringify({date:new Date().toISOString(),scope:'actual production main controller, native files, Electron downloads and application restart',runtime,passed,errors,downloads},null,2));
  if(app)await app.close();
}
