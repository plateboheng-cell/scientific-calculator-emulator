// Render an original vector icon with the project's installed Electron.
import { _electron } from 'playwright';
import fs from 'node:fs/promises';
const app=await _electron.launch({args:['.'],env:{...process.env,CNX_TEST:'1'}});
try{const page=await app.firstWindow();await page.setContent(await fs.readFile('build-resources/icon.svg','utf8'));await page.evaluate(()=>{document.body.style.margin='0';document.body.style.background='transparent';});const png=await page.locator('svg').screenshot({omitBackground:true,scale:'css'});await fs.writeFile('build-resources/icon.png',png);const header=Buffer.alloc(22);header.writeUInt16LE(1,2);header.writeUInt16LE(1,4);header.writeUInt16LE(1,10);header.writeUInt16LE(32,12);header.writeUInt32LE(png.length,14);header.writeUInt32LE(22,18);await fs.writeFile('build-resources/icon.ico',Buffer.concat([header,png]));}finally{await app.close();}
