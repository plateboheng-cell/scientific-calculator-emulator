// Offline inventory of the installed, locked dependency graph. No extra packages.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.join(root,'.verification');
const lock=JSON.parse(await fs.readFile(path.join(root,'package-lock.json'),'utf8'));
const entries=[], notices=[], missing=[];
const noticePattern=/^(?:licen[cs]e|copying|notice|copyright)(?:[.\-_].*)?$/i;
for (const [location, metadata] of Object.entries(lock.packages ?? {}).sort(([a],[b])=>a.localeCompare(b))) {
  if (!location.startsWith('node_modules/')) continue;
  const directory=path.join(root,location);
  let pkg;
  try {pkg=JSON.parse(await fs.readFile(path.join(directory,'package.json'),'utf8'));}
  catch (error) {
    if (metadata.optional) continue; // Platform-specific optional packages may be absent.
    throw new Error(`Missing installed dependency: ${location}. Run npm ci first.`,{cause:error});
  }
  if (pkg.version !== metadata.version) throw new Error(`Installed/lockfile version mismatch: ${location}`);
  const license=typeof pkg.license==='string'?pkg.license:pkg.license?.type ?? metadata.license ?? 'UNKNOWN';
  const files=(await fs.readdir(directory,{withFileTypes:true})).filter(e=>e.isFile()&&noticePattern.test(e.name)).map(e=>e.name).sort();
  const embedded=[];
  if (pkg.name==='seedrandom') {
    const sources=['seedrandom.js',...(await fs.readdir(path.join(directory,'lib'))).filter(name=>name.endsWith('.js')&&!name.endsWith('.min.js')).map(name=>'lib/'+name)];
    for (const source of sources) {
      const contents=await fs.readFile(path.join(directory,source),'utf8');
      const comment=contents.match(/^\s*\/\*[\s\S]*?\*\//)?.[0];
      if (comment&&/copyright|license/i.test(comment)) embedded.push(source+'\n'+comment);
    }
  }
  if (pkg.name==='javascript-natural-sort') {
    embedded.push('naturalSort.js\n'+(await fs.readFile(path.join(directory,'naturalSort.js'),'utf8')).match(/^\/\*[\s\S]*?\*\//)[0]);
  }
  const runtime=!metadata.dev;
  const entry={name:pkg.name,version:pkg.version,license,scope:runtime?'runtime':'development',location,noticeFiles:files,embeddedNotices:embedded.map(section=>section.split('\n')[0])};
  entries.push(entry);
  // Electron is a development dependency but its runtime is distributed.
  if (runtime || pkg.name==='electron') {
    if (!files.length&&!embedded.length) missing.push(`${pkg.name}@${pkg.version}`);
    const sections=await Promise.all(files.map(async filename=>`${filename}\n${await fs.readFile(path.join(directory,filename),'utf8')}`));
    notices.push(`${pkg.name}@${pkg.version}\nLicense: ${license}\n${[...sections,...embedded].join('\n\n')||'The installed package declares this license in package.json but does not provide a license text or copyright notice. See docs/THIRD_PARTY_NOTICES.md for this upstream metadata gap.'}`);
  }
}
await fs.mkdir(out,{recursive:true});
await fs.writeFile(path.join(out,'dependency-licenses.json'),JSON.stringify({lockfileVersion:lock.lockfileVersion,packages:entries,missingRuntimeNotices:missing},null,2)+'\n');
await fs.writeFile(path.join(out,'THIRD-PARTY-LICENSES.txt'),[
  'scientific calculator simulator - third-party notices',
  'Generated offline from package-lock.json and the installed packages.',
  'Includes production dependency notices and the Electron package license.',
  'Electron/Chromium also ship LICENSE and LICENSES.chromium.html next to the executable. Retain those files.',
  'MathLive and KaTeX fonts are distributed unmodified under their upstream package notices.',
  ...notices,
].join('\n\n'+'='.repeat(72)+'\n\n')+'\n');
console.log(`License metadata: ${entries.length} installed packages; ${notices.length} runtime/Electron notice sections.`);
if (missing.length) console.warn('Upstream runtime packages without license/notice text (review before public distribution): '+missing.join(', '));
if (entries.some(e=>e.license==='UNKNOWN')) {
  console.warn('Some development packages have no declared license. Review dependency-licenses.json before redistributing development tooling.');
}
