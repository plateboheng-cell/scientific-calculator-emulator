import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createDesktopStorage} from '../src/state/desktop-storage.js';
import {AppStore,STORAGE_KEY,LEGACY_KEY} from '../src/state/store.js';
const {createStateFile}=createRequire(import.meta.url)('../electron/state-file.cjs');
function local(values={}){const map=new Map(Object.entries(values));return {map,getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value)};}
test('desktop adapter migrates the old browser profile and leaves rollback keys intact',()=>{
  const old=JSON.stringify({version:2,activeModel:'cg50',language:'en',profiles:{cg50:{mode:'graph'}}}),browser=local({[STORAGE_KEY]:old,[LEGACY_KEY]:'legacy'});let file=null;
  const storage=createDesktopStorage(browser,{loadState:()=>({ok:true,value:file}),saveState:value=>{file=value;return {ok:true};}}),store=new AppStore(storage);
  assert.equal(store.data.activeModel,'cg50');assert.equal(storage.getItem(LEGACY_KEY),'legacy');store.write();assert.equal(file,JSON.stringify(store.data));assert.equal(browser.getItem(LEGACY_KEY),'legacy');
});
test('desktop file is authoritative and succeeds when WebStorage reaches its quota',()=>{
  let file='saved';const browser={getItem:()=>null,setItem(){throw Error('quota');}},storage=createDesktopStorage(browser,{loadState:()=>({ok:true,value:file}),saveState:value=>{file=value;return {ok:true};}});
  assert.equal(storage.getItem(STORAGE_KEY),'saved');storage.setItem(STORAGE_KEY,'new file state');assert.equal(file,'new file state');assert.equal(storage.getItem(STORAGE_KEY),'new file state');
});
test('failed desktop writes do not update the cached or browser state',()=>{
  const browser=local({[STORAGE_KEY]:'old'}),storage=createDesktopStorage(browser,{loadState:()=>({ok:true,value:null}),saveState:()=>({ok:false,error:'disk full'})});
  assert.equal(storage.getItem(STORAGE_KEY),'old');assert.throws(()=>storage.setItem(STORAGE_KEY,'new'),/disk full/);assert.equal(storage.getItem(STORAGE_KEY),'old');assert.equal(browser.getItem(STORAGE_KEY),'old');
});
test('state file uses atomic replacement and recovers a valid previous snapshot',()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'scs-state-test-')),state=createStateFile(directory),first=JSON.stringify({version:2,profiles:{cg50:{value:1}}}),second=JSON.stringify({version:2,profiles:{cg50:{value:2}}});
  try{assert.equal(state.load().value,null);const savedFirst=state.save(first);assert.equal(savedFirst.ok,true,savedFirst.error);const savedSecond=state.save(second);assert.equal(savedSecond.ok,true,savedSecond.error);assert.equal(state.load().value,second);fs.writeFileSync(path.join(directory,'scientific-calculator-state.json'),'corrupt');assert.equal(state.load().value,first);assert.equal(state.load().recovered,true);assert.equal(state.save('not json').ok,false);assert.equal(state.load().value,first);}
  finally{const resolved=path.resolve(directory),base=path.resolve(os.tmpdir())+path.sep;assert.ok(resolved.startsWith(base)&&path.basename(resolved).startsWith('scs-state-test-'));fs.rmSync(resolved,{recursive:true});}
});
