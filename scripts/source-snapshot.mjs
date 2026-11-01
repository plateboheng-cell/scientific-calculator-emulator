import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root=path.resolve('.'),files=[];
async function walk(relative){for(const entry of await fs.readdir(path.join(root,relative),{withFileTypes:true})){const next=path.join(relative,entry.name);if(entry.isDirectory())await walk(next);else if(/\.(?:js|cjs|css|json)$/.test(entry.name))files.push(next);}}
await walk('src');await walk('electron');files.push('package.json','package-lock.json','vite.config.js','index.html');
const hashes={};for(const file of files.sort())hashes[file.replaceAll(path.sep,'/')]=createHash('sha256').update(await fs.readFile(path.join(root,file))).digest('hex');
const digest=createHash('sha256').update(JSON.stringify(hashes)).digest('hex'),record={date:new Date().toISOString(),digest,hashes};
if(process.argv[2]==='--assert'){const expected=JSON.parse(await fs.readFile(process.argv[3],'utf8'));assert.deepEqual(hashes,expected.hashes,'Source changed after the validated build; rebuild before testing or packaging');console.log('Source snapshot unchanged: '+digest);}
else{await fs.writeFile(process.argv[2]||'.verification/source-snapshot.json',JSON.stringify(record,null,2));console.log('Saved source snapshot: '+digest);}
