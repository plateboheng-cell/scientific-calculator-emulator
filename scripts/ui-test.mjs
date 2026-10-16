import { _electron } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
const evidence=path.resolve('.verification');await fs.mkdir(evidence,{recursive:true});
const profile=await fs.mkdtemp(path.join(evidence,'profile-'));
const app=await _electron.launch({executablePath:process.env.CNX_ELECTRON_PATH||undefined,args:[process.env.CNX_APP_PATH||'.','--user-data-dir='+profile],env:{...process.env,CNX_TEST:'1'}});
const p=await app.firstWindow();const errors=[];p.on('pageerror',e=>errors.push(e.message));const passed=[];
const check=async(name,fn)=>{await fn();passed.push(name);console.log('PASS '+name);};
const key=k=>p.keyboard.press(k), type=s=>p.keyboard.insertText(s), text=()=>p.locator('#screen').innerText();
const calc=async s=>{await key('F4');await key('1');await type(s);await key('Enter');};
const param=async(value)=>{await key('Control+A');await type(value);await key('Enter');};
try{
 await p.waitForSelector('#entry');
 await check('键盘四则运算、连续计算',async()=>{await calc('2+3*4');assert.match(await p.locator('#answer').innerText(),/14/);await key('+');await type('6');await key('Enter');assert.match(await p.locator('#answer').innerText(),/20/);});
 await check('自然分数与 S⇔D',async()=>{await calc('1/3');assert.equal(await p.locator('#answer .katex').count(),1);await key('F9');assert.match(await p.locator('#answer').innerText(),/0.3333333333/);await key('F9');});
 await check('三角函数',async()=>{await calc('sin(30)');await key('F9');assert.match(await p.locator('#answer').innerText(),/0.5/);});
 await check('复数模式',async()=>{await key('F4');await key('2');await type('(1+2i)*(3-4i)');await key('Enter');assert.match(await text(),/11.*2i/);});
 await check('基数 HEX',async()=>{await key('F4');await key('3');await key('2');await type('A+F');await key('Enter');assert.match(await text(),/19/);});
 await check('矩阵全键盘定义与行列式',async()=>{await key('F4');await key('4');await key('1');await key('1');await key('Control+A');await type('1,2\n3,4');await key('Enter');await key('Control+A');await type('det(MatA)');await key('Enter');assert.match(await p.locator('#answer').innerText(),/-2/);});
 await check('向量全键盘定义与模',async()=>{await key('F4');await key('5');await key('1');await key('1');await param('3,4');await key('Control+A');await type('norm(VctA)');await key('Enter');assert.match(await p.locator('#answer').innerText(),/5/);});
 await check('统计全键盘输入',async()=>{await key('F4');await key('6');await key('1');await key('Enter');await key('Control+A');await type('1\n2\n3');await key('Enter');assert.match(await text(),/x̄\s*2/);});
 await check('函数表格',async()=>{await key('F4');await key('7');await param('x^2');await key('Enter');await param('1');await param('5');await param('1');assert.equal(await p.locator('.data-table tbody tr').count(),5);});
 await check('二元联立方程',async()=>{await key('F4');await key('8');await key('1');await key('1');await param('1,1,3');await param('1,-1,1');assert.match(await text(),/x\s*2/);assert.match(await text(),/y\s*1/);});
 await check('二次方程',async()=>{await key('F4');await key('8');await key('2');await key('1');await param('1');await param('0');await param('-4');assert.match(await text(),/x1\s*-2/);assert.match(await text(),/x2\s*2/);});
 await check('不等式',async()=>{await key('F4');await key('9');await key('1');await key('Enter');await param('1');await param('0');await param('-1');assert.match(await text(),/−∞.*-1.*1.*\+∞/s);});
 await check('比例',async()=>{await key('F4');await key('0');await key('1');await param('3');await param('8');await param('12');assert.match(await text(),/4.5/);});
 await check('SOLVE',async()=>{await key('F4');await key('1');await key('Shift+F6');await param('x^2=2');await param('1');assert.match(await text(),/1.414213562/);});
 await check('科学常数可以纯键盘浏览',async()=>{await key('F4');await key('1');await key('F7');await key('1');await key('Enter');assert.match(await p.locator('#answer').innerText(),/299792458/);});
 await check('单位换算',async()=>{await key('F8');await key('1');await param('1');assert.match(await text(),/2.54/);});
 await check('鼠标点按与 SHIFT',async()=>{await p.locator('[data-action="menu"]').click();await p.locator('[data-mode="0"]').click();await p.locator('[data-action="2"]').click();await p.locator('[data-action="+"]').click();await p.locator('[data-action="3"]').click();await p.locator('[data-action="execute"]').click();assert.match(await p.locator('#answer').innerText(),/5/);await p.locator('[data-action="clear"]').click();await p.locator('[data-action="shift"]').click();await p.locator('[data-action="sin("]').click();await type('0.5)');await key('Enter');assert.match(await p.locator('#answer').innerText(),/30/);});
 await check('错误恢复',async()=>{await calc('1/0');assert.match(await text(),/超出数值范围/);await key('Escape');await key('Control+A');await type('7*8');await key('Enter');assert.match(await p.locator('#answer').innerText(),/56/);});
 await check('帮助可用',async()=>{await key('F1');assert.equal(await p.locator('#help').evaluate(e=>e.open),true);await key('Escape');});
 await check('参数结果支持 S⇔D',async()=>{await key('F4');await key('0');await key('1');await param('1');await param('3');await param('1');await key('F9');assert.equal(await p.locator('.result-row .katex').count(),1);await key('F9');assert.match(await text(),/0.3333333333/);});
 await check('展开屏幕后按键仍全部可见',async()=>{await key('F10');const bad=await p.locator('.calculator button').evaluateAll(els=>els.filter(e=>{const r=e.getBoundingClientRect();return r.top<0||r.bottom>innerHeight||r.left<0||r.right>innerWidth;}).map(e=>e.textContent));assert.deepEqual(bad,[]);await key('F10');});
 await check('窗口内所有按键可见',async()=>{const bad=await p.locator('.calculator button').evaluateAll(els=>els.filter(e=>{const r=e.getBoundingClientRect();return r.top<0||r.bottom>innerHeight||r.left<0||r.right>innerWidth;}).map(e=>e.textContent));assert.deepEqual(bad,[]);});
 const emptyInputs=async()=>{const values=await p.locator('#parameters input,#parameters textarea').evaluateAll(els=>els.map(e=>e.value));assert.ok(values.length>0);assert.deepEqual(values,values.map(()=>''));};
 await check('界面只有正常名称和功能标记',async()=>{assert.equal(await p.locator('.model').innerText(),'fx-991CN X');assert.doesNotMatch(await p.locator('#app').textContent(),/开源版|OPEN SOURCE|框定版|兼容初版|去.*版/);});
 await check('各模式新建参数均为空白',async()=>{
   for(const seq of [['7'],['8','1','1'],['8','2','3'],['9','2'],['0','1'],['4','1','1'],['5','1','1'],['6','1']]){await key('F4');for(const k of seq)await key(k);await emptyInputs();}
   await key('F4');await key('1');await key('Shift+F6');await emptyInputs();
   for(const seq of [['F5','2','1'],['F5','2','2'],['F5','2','3'],['F5','2','4'],['F5','3','3'],['F5','4','3'],['F8','1']]){await key('F4');await key('1');for(const k of seq)await key(k);await emptyInputs();}
   await key('F4');await key('1');await type('A+B');await key('F6');await emptyInputs();
   await key('F4');await key('1');await p.locator('[data-action="shift"]').click();await p.locator('[data-action="^"]').click();await emptyInputs();
 });
 await check('空白参数不能当作零计算',async()=>{await key('F4');await key('0');await key('1');await p.locator('.run-button').click();assert.match(await p.locator('#form-error').innerText(),/请输入/);await emptyInputs();});
 await check('退出各功能后主菜单仍选中该功能',async()=>{for(const [digit,index] of [['3',2],['4',3],['5',4],['6',5],['7',6],['8',7],['9',8],['0',9]]){await key('F4');await key(digit);await key('Escape');assert.equal(await p.locator('.mode-tile.selected').getAttribute('data-mode'),String(index));}await key('F4');await key('2');await key('F4');assert.equal(await p.locator('.mode-tile.selected').getAttribute('data-mode'),'1');});
 await check('数字快捷键进入的子菜单返回时保持选中',async()=>{await key('F4');await key('8');await key('2');await key('3');await emptyInputs();await key('Escape');assert.equal(await p.locator('.list-item.selected').getAttribute('data-list'),'2');await key('Escape');assert.equal(await p.locator('.list-item.selected').getAttribute('data-list'),'1');await key('Escape');assert.equal(await p.locator('.mode-tile.selected').getAttribute('data-mode'),'7');});
 await check('重新打开功能目录仍停留在使用过的功能',async()=>{await key('F4');await key('1');await key('F5');await key('2');await key('4');await key('Escape');assert.equal(await p.locator('.list-item.selected').getAttribute('data-list'),'3');await key('Escape');assert.equal(await p.locator('.list-item.selected').getAttribute('data-list'),'1');await key('Escape');await key('F5');assert.equal(await p.locator('.list-item.selected').getAttribute('data-list'),'1');});
 await check('结果返回编辑保留本人输入',async()=>{await key('F4');await key('0');await key('1');await param('3');await param('8');await param('12');await key('Escape');assert.deepEqual(await p.locator('#parameters input').evaluateAll(els=>els.map(e=>e.value)),['3','8','12']);await key('Escape');await key('1');await emptyInputs();});
 await check('设置中可切换中文与英文',async()=>{await key('F11');await key('4');await key('2');assert.equal(await p.locator('html').getAttribute('lang'),'en');assert.equal(await p.title(),'CNX Calculator');await key('Escape');assert.match(await text(),/Settings/);await p.reload();await p.waitForSelector('#entry');assert.equal(await p.locator('html').getAttribute('lang'),'en');assert.match(await p.locator('#mode-label').innerText(),/Calculate/);});
 await check('英文覆盖所有模式、常数、帮助与错误提示',async()=>{
   const englishScreen=async()=>assert.doesNotMatch(await text(),/\p{Script=Han}/u);
   await key('F4');await englishScreen();
   for(const digit of ['1','2','3','4','5','6','7','8','9','0']){await key('F4');await key(digit);await englishScreen();}
   for(const seq of [['F5','2','1'],['F5','3'],['F5','4'],['F7'],['F8'],['F5','7']]){await key('F4');await key('1');for(const k of seq)await key(k);await englishScreen();}
   await key('F4');await key('4');await key('1');await key('1');await englishScreen();
   await key('F4');await key('5');await key('1');await key('1');await englishScreen();
   await key('F4');await key('1');await type('1/0');await key('Enter');assert.match(await p.locator('#answer').innerText(),/out of range/);await englishScreen();
   await key('F1');assert.doesNotMatch(await p.locator('#help').innerText(),/\p{Script=Han}/u);await key('Escape');
   await key('F4');await key('8');await key('2');await key('3');await p.locator('.run-button').click();assert.match(await p.locator('#form-error').innerText(),/Enter/);await englishScreen();
 });
 await check('切换语言保留输入内容和菜单位置',async()=>{await key('F4');await key('0');await key('2');await type('17');await key('F12');assert.equal(await p.locator('html').getAttribute('lang'),'zh-CN');assert.equal(await p.locator('#param-0').inputValue(),'17');await key('Escape');assert.equal(await p.locator('.list-item.selected').getAttribute('data-list'),'1');await key('F12');assert.match(await text(),/Ratio/);assert.equal(await p.locator('.list-item.selected').getAttribute('data-list'),'1');await key('F12');});
 await key('F4');await key('1');await p.screenshot({path:path.join(evidence,'calculator.png')});await key('F4');await p.screenshot({path:path.join(evidence,'menu.png')});
 await key('7');await p.screenshot({path:path.join(evidence,'empty-function.png')});await key('F4');await key('F12');await p.screenshot({path:path.join(evidence,'english.png')});
 assert.deepEqual(errors,[]);await fs.writeFile(path.join(evidence,'ui-results.json'),JSON.stringify({date:'2026-10-16',electron:await app.evaluate(({app})=>process.versions.electron),passed,errors},null,2));
}catch(e){await p.screenshot({path:path.join(evidence,'ui-failure.png')});throw e;}finally{await app.close();}
