import {_electron} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const evidence = path.resolve('.verification');
const profile = await fs.mkdtemp(path.join(evidence,'999-manual-profile-'));
const launch = () => _electron.launch({executablePath:process.env.CNX_ELECTRON_PATH||undefined,
  args:[process.env.CNX_APP_PATH||'.','--user-data-dir='+profile],env:{...process.env,CNX_TEST:'1',CNX_TEST_SYSTEM_LANGUAGES:'["zh-CN"]'},
});
const errors = [], passed = [], failed = [];
async function openPage(app) {
  const page=await app.firstWindow();
  page.setDefaultTimeout(7000);
  page.on('pageerror',error=>errors.push(error.message));
  return page;
}
let app=await launch(),page=await openPage(app);
const key = action => page.locator(`[data-action="${action}"]`).first();
const press = action => key(action).click();
const ok = () => press('execute');
const cell = (row,column) => page.locator(`[data-cw-cell="${row},${column}"]`);
const entry = () => page.locator('#cw-grid-entry');
const answer = () => page.locator('[data-cw-result]').innerText();
const vars = () => page.evaluate(() => JSON.parse(localStorage.getItem('cnx-v2')).profiles.cn999cw.calculator.vars);
const near = (actual,expected) => assert.ok(Math.abs(actual-expected)<=1e-8*Math.max(1,Math.abs(expected)),`${actual} != ${expected}`);

async function choose(label) { await page.locator('.list-item').filter({hasText:label}).first().click(); }
async function mode(index) {
  await press('menu');
  await press(index<6?'page-up':'page-down');
  await page.locator(`[data-mode="${index}"]`).click();
}
async function write(value) {
  await entry().fill(String(value));
  await ok();
}
async function setCell(row,column,value) { await cell(row,column).click(); await write(value); }
async function writeAll(values) { for (const value of values) await write(value); }
async function latex(selector,value) {
  await page.locator(selector).evaluate((el,text) => {el.value=text;el.dispatchEvent(new Event('input',{bubbles:true}));},value);
}
async function fields(values) {
  for (const [name,value] of Object.entries(values)) {
    const field=page.locator(`[data-name="${name}"]`);
    await field.fill(String(value));
    await ok();
  }
  await ok();
}
async function screenshot(name) { await page.locator('.screen-rim').screenshot({path:path.join(evidence,`999-manual-${name}.png`)}); }
async function check(name,run) {
  try {await run();passed.push(name);console.log('PASS '+name);}
  catch (failure) {
    failed.push({name,error:failure.message});console.error('FAIL '+name+' '+failure.message);
    await page.screenshot({path:path.join(evidence,`999-manual-failure-${failed.length}.png`)}).catch(()=>{});
  }
}

try {
  await page.locator('[data-model-choice=cn999cw]').click();
  await check('statistics example 3 uses the 160/80 editor and displays 119, 5.95 and 6.4475',async()=>{
    await mode(1);await choose('单变量统计');
    await press('tools');await choose('频数');await choose('开');await press('clear');
    assert.deepEqual(await page.locator('.cw-cell-viewport thead th').allTextContents(),['','x','Freq']);
    await writeAll([1,2,3,4,5,6,7,8,9,10]);
    await cell(0,1).click();await writeAll([1,2,1,2,2,2,3,4,2,1]);
    await ok();await choose('单变量结果');
    assert.equal(await page.locator('[data-cw-value="Σx"]').textContent(),'119');
    assert.equal(await page.locator('[data-cw-value="x̄"]').textContent(),'5.95');
    assert.equal(await page.locator('[data-cw-value="σx²"]').textContent(),'6.4475');
    await screenshot('statistics');
    await press('back');await ok();await choose('统计计算');
    await press('catalog');await choose('统计');await choose(/^求和/);await choose(/^Σx$/);await ok();
    assert.equal((await vars()).Ans,119);
    await press('clear');await page.keyboard.type('2');
    await press('catalog');await choose('统计');await choose('正态分布');await choose('▶t');await ok();
    near((await vars()).Ans,(2-5.95)/Math.sqrt(6.4475));
    await press('catalog');await choose('统计');await choose('正态分布');await choose('P(');
    await press('shift');await press('format');await ok();
    near((await vars()).Ans,.05990013396);
  });

  await check('paired editor clears rows when switching type and labels slope a for y=ax+b',async()=>{
    await mode(1);await choose('双变量统计');
    await press('tools');await choose('频数');await choose('关');await press('clear');
    assert.equal(await cell(0,0).textContent(),'');
    await writeAll([3,1,2]);await cell(0,1).click();await writeAll([7,3,5]);
    await press('tools');await choose('排序');await choose('x升序');
    assert.deepEqual(await page.locator('[data-cw-cell]').allTextContents(),['1','3','2','5','3','7','','']);
    await ok();await choose('回归计算结果');await choose(/^y=ax\+b$/);
    near(Number(await page.locator('[data-cw-value=a]').textContent()),2);
    near(Number(await page.locator('[data-cw-value=b]').textContent()),1);
  });

  await check('number table example starts with columns, registers f/g, and generates the five documented rows',async()=>{
    await mode(4);assert.deepEqual(await page.locator('.cw-cell-viewport thead th').allTextContents(),['','x','f(x)','g(x)']);
    for (const [name,sign] of [['f','+'],['g','-']]) {
      await press('tools');await choose('定义f(x)/g(x)');await choose(`定义${name}(x)`);
      await latex(`[data-name=${name}]`,`x^2${sign}\\frac{1}{2}`);await ok();
    }
    await press('tools');await choose('表格范围');await fields({start:-1,end:1,step:.5});
    assert.equal(await cell(0,1).textContent(),'1.5');assert.equal(await cell(1,2).textContent(),'-0.25');
    assert.equal(await cell(4,0).textContent(),'1');assert.equal((await vars()).x,1);
    await screenshot('table');
    await cell(1,0).click();await press('+');assert.equal(await cell(1,0).textContent(),'-0.5');
    await setCell(1,0,2);assert.equal(await cell(1,1).textContent(),'4.5');
  });

  await check('table Verify accepts a correct cell, rejects a wrong one and restores calculated columns',async()=>{
    await press('tools');await choose('运算验证开启');
    assert.equal(await cell(0,1).textContent(),'');
    await setCell(0,1,1.5);assert.equal(await answer(),'True');await ok();
    assert.equal(await cell(0,1).textContent(),'1.5');
    await setCell(0,2,4);assert.equal(await answer(),'False');await press('back');
    assert.equal(await cell(0,2).textContent(),'');
    await press('tools');await choose('运算验证关闭');assert.equal(await cell(0,2).textContent(),'0.5');
    await press('tools');await choose('表格类型');await choose(/f\(x\)$/);await press('clear');
    assert.deepEqual(await page.locator('.cw-cell-viewport thead th').allTextContents(),['','x','f(x)']);
    assert.equal(await cell(0,0).textContent(),'');
    await press('tools');await choose('表格范围');await fields({start:1,end:45,step:1});
    assert.equal(await cell(44,0).textContent(),'45');
  });

  await check('linear equation example 1 paginates x=1, y=2, z=3 and returns to its coefficients',async()=>{
    await mode(5);await choose('线性方程组');await choose('3个未知数');
    await writeAll([1,-1,1,2,1,1,-1,0,-1,1,1,4]);await ok();
    for (const value of ['1','2','3']) { assert.equal(await answer(),value);await ok(); }
    assert.equal(await cell(2,3).textContent(),'4');await press('clear');assert.equal(await cell(2,3).textContent(),'0');
  });

  await check('quadratic example 2 shows both exact roots and the minimum coordinates',async()=>{
    await mode(5);await choose('多项式方程');await choose(/^ax²\+bx\+c$/);
    await writeAll([1,2,-2]);await ok();
    const equationTex = () => page.locator('[data-cw-result] annotation').textContent();
    assert.equal(await equationTex(),'-1+\\sqrt{3}');await ok();assert.equal(await equationTex(),'-1-\\sqrt{3}');
    await ok();assert.equal(await answer(),'-1');await ok();assert.equal(await answer(),'-3');
    await ok();await press('tools');await choose('运算验证开启');await ok();
    await choose(/^解/);await choose('2个解');await fields({'x₁':'-1+sqrt(3)','x₂':'-1-sqrt(3)'});
    assert.equal(await page.locator('.cw-list-heading').innerText(),'True');
    await choose('返回方程');await press('tools');await choose('运算验证关闭');
  });

  await check('Solver example 5 edits B, registers the equation, chooses x and reports L−R',async()=>{
    await mode(5);await choose('求解方程');await press('variables');await setCell(0,1,4);await press('back');
    await latex('[data-name=expr]','x^2-\\frac{B}{2}=0');await ok();await choose(/^x/);await fields({x:1});
    near((await vars()).x,Math.sqrt(2));near(Number(await page.locator('[data-cw-value="L−R"]').textContent()),0);
    await ok();await page.locator('[data-name=expr]').waitFor();
  });

  await check('inequality and ratio examples use coefficient entry and natural results',async()=>{
    await mode(6);await choose(/^ax²\+bx\+c/);await choose('≥0');await writeAll([1,2,-3]);await ok();
    assert.equal(await answer(),'x≤-3, 1≤x');await press('back');assert.equal(await cell(0,2).textContent(),'-3');
    await mode(11);await choose('A:B=X:D');await writeAll([3,8,12]);await ok();
    assert.equal(await page.locator('[data-cw-result] annotation').textContent(),'\\frac{9}{2}');await ok();
    assert.equal(await cell(0,2).textContent(),'12');
  });

  await check('Base-N examples convert 555 to 0000022B and read mixed-base prefixes',async()=>{
    await mode(8);await page.locator('#entry').fill('15*37');await ok();assert.equal(await page.locator('#answer').innerText(),'555');
    await press('format');assert.equal(await page.locator('#answer').innerText(),'0000022B');
    await press('format');assert.match(await page.locator('#answer').innerText(),/^0000 0000 0000 0000\s+0000 0010 0010 1011$/);
    await press('format');await press('format');await press('clear');
    for (const [label,character] of [['十进制(d)','+'],['十六进制(h)','+'],['二进制(b)','+'],['八进制(o)','']]) {
      await press('catalog');await choose('进制前缀');await choose(label);await page.keyboard.type('10'+character);
    }
    await ok();assert.equal(await page.locator('#answer').innerText(),'36');
    await page.locator('#entry').fill('2147483647+1');await ok();assert.match(await page.locator('.cw-page-title').innerText(),/数学错误/);
    await press('right');assert.equal(await page.locator('#entry').inputValue(),'2147483647+1');
  });

  await check('matrix example 1 uses TOOLS and CATALOG, preserves scalar Ans and copies MatAns',async()=>{
    await mode(9);const previous = (await vars()).Ans;
    for (const [name,values] of [['MatA',[2,1,1,1]],['MatB',[2,-1,-1,2]]]) {
      await press('tools');await choose(new RegExp('^'+name+':'));await choose('确认');await writeAll(values);await ok();
    }
    await press('catalog');await choose('矩阵');await choose(/^MatA$/);await press('*');
    await press('catalog');await choose('矩阵');await choose(/^MatB$/);await ok();
    assert.deepEqual(await page.locator('[data-cw-cell]').allTextContents(),['3','0','1','1']);
    assert.equal((await vars()).Ans,previous);await screenshot('matrix');
    await press('tools');await choose('赋值');await choose(/^MatD$/);await ok();
    await mode(0);await mode(9);await press('tools');assert.match(await page.locator('.list-item').filter({hasText:/^MatD/}).textContent(),/2×2/);
  });

  await check('vector example 1 and its dot and cross products use the selected vector memories',async()=>{
    await mode(10);
    for (const [name,values] of [['VctA',[1,2]],['VctB',[3,4]]]) {
      await press('tools');await choose(new RegExp('^'+name+':'));await choose('确认');await writeAll(values);await ok();
    }
    const insertVector = async name => {await press('catalog');await choose('向量');await choose(new RegExp('^'+name+'$'));};
    await insertVector('VctA');await press('+');await insertVector('VctB');await ok();
    assert.deepEqual(await page.locator('[data-cw-cell]').allTextContents(),['4','6']);await press('clear');
    await insertVector('VctA');await press('catalog');await choose('向量');await choose('内积');await insertVector('VctB');await ok();
    assert.equal((await vars()).Ans,11);await press('clear');
    await insertVector('VctA');await press('*');await insertVector('VctB');await ok();
    assert.deepEqual(await page.locator('[data-cw-cell]').allTextContents(),['0','0','-2']);
  });
  await check('Calculate inserts integral, sum and permutation in the original expression',async()=>{
    await mode(0);await press('shift');await press('*');
    assert.match(await page.locator('#entry').evaluate(el=>el.value),/\\int/);
    await latex('#entry','\\int_{1}^{e}\\left(\\ln\\left(x\\right)\\right)\\,dx');await ok();near((await vars()).Ans,1);
    await press('catalog');await choose('函数与分析');await choose('求和(Σ)');
    assert.match(await page.locator('#entry').evaluate(el=>el.value),/\\sum/);
    await latex('#entry','\\sum_{x=1}^{5}\\left(x+1\\right)');await ok();assert.equal((await vars()).Ans,20);
    await latex('#entry','5\\CWPermutation 2');await ok();assert.equal((await vars()).Ans,20);
    await latex('#entry','5\\CWRemainder 2');await ok();assert.equal((await vars()).Ans,2);assert.match(await page.locator('#answer').innerText(),/R=1/);
  });
  await check('Calculate recalls a previous result without replacing the current Ans',async()=>{
    await mode(0);await latex('#entry','2+2');await ok();await latex('#entry','3+3');await ok();
    await press('up');assert.equal(await page.locator('#answer').innerText(),'4');assert.equal((await vars()).Ans,6);
  });
  await check('999 preserves the low decimal digit in Ans and A across a packaged app restart',async()=>{
    await mode(0);await latex('#entry','10^{20}+1');await ok();
    await press('variables');await ok();await choose('赋值');
    const memories=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('cnx-v2')).profiles.cn999cw.calculator.cwDecimals);
    assert.equal((await memories()).Ans,'100000000000000000001');assert.equal((await memories()).A,'100000000000000000001');
    await app.close();app=await launch();page=await openPage(app);
    await page.locator('#entry').waitFor();
    await latex('#entry','\\mathrm{Ans}-10^{20}');await ok();assert.equal(await page.locator('#answer').innerText(),'1');
    await latex('#entry','A-10^{20}');await ok();assert.equal(await page.locator('#answer').innerText(),'1');
    await press('tools');await choose('运算验证开启');
    await latex('#entry','10^{20}+1=10^{20}');await ok();assert.equal(await page.locator('#answer').innerText(),'False');
    await press('tools');await choose('运算验证关闭');
  });
  await check('999 recovers at the zero denominator in the manual error example',async()=>{
    await mode(0);await latex('#entry','14\\div0\\times2');await ok();
    assert.match(await page.locator('.cw-page-title').innerText(),/数学错误/);await press('left');
    await page.waitForFunction(()=>document.activeElement?.id==='entry'&&document.activeElement.position===3);
    await page.keyboard.type('1');await ok();near((await vars()).Ans,2.8);
  });
  await check('999 enters the six degree markers in the manual example and switches display formats',async()=>{
    await mode(0);
    for(const [i,part] of ['2','20','30','0','9','30'].entries()){
      if(i===3)await press('+');
      await page.keyboard.type(part);await press('shift');await press('x');
    }
    await ok();assert.equal(await page.locator('#answer').innerText(),'2°30′0″');
    await press('format');await choose(/^小数$/);assert.equal(await page.locator('#answer').innerText(),'2.5');
    await press('format');await choose('六十进制');assert.equal(await page.locator('#answer').innerText(),'2°30′0″');
  });
  await check('999 distinguishes common-log base order from the natural log-base template',async()=>{
    await mode(0);await press('shift');await press('^2');
    assert.match(await page.locator('#entry').evaluate(el=>el.value),/\\CWLog/);
    await latex('#entry','\\CWLog\\left(2,16\\right)');await ok();assert.equal((await vars()).Ans,4);
    await latex('#entry','\\log_{2}\\left(16\\right)');await ok();assert.equal((await vars()).Ans,4);
  });
  await check('999 linear mode groups implicit divisors and executes the manual cm to inch command',async()=>{
    await mode(0);await press('setup');await choose('计算设置');await choose('输入/输出');await choose('线性输入/线性输出');await press('clear');
    await page.locator('#entry').fill('6/2(1+2)');await ok();assert.equal(await page.locator('#answer').innerText(),'1');
    assert.match(await page.locator('#entry').inputValue(),/\/\s*\(2/);
    await press('page-up');assert.equal(await page.locator('#entry').evaluate(el=>el.selectionStart),0);
    await press('clear');await page.keyboard.type('5');await press('catalog');await choose('单位转换');await choose('长度');await choose(/^cm▸in$/);
    assert.equal(await page.locator('#entry').inputValue(),'5cm▸in');await ok();assert.equal(await page.locator('#answer').innerText(),'1.968503937');
    await press('clear');await page.locator('#entry').fill('log(2,16)');await ok();assert.equal((await vars()).Ans,4);
  });
  await check('999 linear angle and percent commands preserve the catalog caret',async()=>{
    await mode(0);
    const input=page.locator('#entry');
    await input.fill('(pi/2)+1');
    await input.evaluate(el=>el.setSelectionRange(6,6));
    await press('catalog');await choose('角度 / 坐标转换 / 六十进制');await choose(/^弧度$/);
    assert.equal(await input.inputValue(),'(pi/2)ʳ+1');await ok();
    assert.equal((await vars()).Ans,91);
    await input.fill('660/880');
    await press('catalog');await choose('概率');await choose(/^%$/);await ok();
    assert.equal((await vars()).Ans,75);
    await press('setup');await choose('计算设置');await choose('输入/输出');await choose('数学输入/数学输出');await press('clear');
    await latex('#entry','\\left(\\frac{\\pi}{2}\\right)');
    await page.locator('#entry').evaluate(el=>el.position=el.lastOffset);
    await press('catalog');await choose('角度 / 坐标转换 / 六十进制');await choose(/^弧度$/);
    assert.match(await page.locator('#entry').evaluate(el=>el.value),/\\CWAngleRadian/);
    await ok();assert.equal((await vars()).Ans,90);
  });
  await check('999 enters the linear permutation and remainder with their native operators',async()=>{
    await mode(0);await press('setup');await choose('计算设置');await choose('输入/输出');await choose('线性输入/线性输出');await press('clear');
    const input=page.locator('#entry');
    await input.fill('10');await press('shift');await press('+');await page.keyboard.type('4');
    assert.equal(await input.inputValue(),'10ᴾ4');await ok();assert.equal((await vars()).Ans,5040);
    await input.fill('5');await press('catalog');await choose('函数与分析');await choose('求余数');await page.keyboard.type('2');
    assert.equal(await input.inputValue(),'5÷R2');await ok();
    assert.equal((await vars()).Ans,2);assert.match(await page.locator('#answer').innerText(),/R=1/);
    await press('setup');await choose('计算设置');await choose('输入/输出');await choose('数学输入/数学输出');await press('clear');
  });
  await check('999 engineering symbols enter through Catalog and arrows move the mantissa',async()=>{
    await mode(0);await press('setup');await choose('计算设置');await choose('工程符号');await choose('开');await press('clear');
    await latex('#entry','999');
    await page.locator('#entry').evaluate(el=>el.position=el.lastOffset);
    await press('catalog');await choose('工程符号');assert.equal(await page.locator('.list-item').count(),11);await choose('千(ｋ)');
    await press('+');await page.keyboard.type('25');await press('catalog');await choose('工程符号');await choose('千(ｋ)');
    await ok();assert.equal(await page.locator('#answer').innerText(),'1.024M');
    assert.equal((await vars()).Ans,1024000);
    await press('format');await choose('工程记数法');
    await press('right');assert.equal(await page.locator('#answer').innerText(),'1024k⇄');
    await page.keyboard.press('ArrowRight');assert.equal(await page.locator('#answer').innerText(),'1024000⇄');
    await page.keyboard.press('ArrowLeft');await press('9');
    assert.equal(await page.locator('#answer').innerText(),'1024k⇄');
    await ok();assert.equal(await page.locator('#answer').innerText(),'1024k');
    assert.equal((await vars()).Ans,1024000);
    await press('setup');await choose('计算设置');await choose('工程符号');await choose('关');await press('clear');
    await latex('#entry','1234');await ok();
    await press('format');await choose('工程记数法');await press('right');
    assert.equal(await page.locator('#answer sup').innerText(),'0');
    await press('left');await press('left');
    assert.match(await page.locator('#answer').innerText(),/^0\.001234×10/);
    assert.equal(await page.locator('#answer sup').innerText(),'6');
    await press('back');
    assert.equal(await page.locator('.cw-eng-indicator').count(),0);
    assert.equal((await vars()).Ans,1234);
    await screenshot('engineering');
  });
  await check('999 Rnd uses Fix 3 in Calculate and worksheet formulas',async()=>{
    await mode(0);await press('setup');await choose('计算设置');await choose('显示格式');await choose('Fix');await choose('3');await press('clear');
    await latex('#entry','10\\div3\\times3');await ok();assert.equal(await page.locator('#answer').innerText(),'10.000');
    await press('catalog');await choose('数值计算');await choose('四舍五入');
    assert.match(await page.locator('#entry').evaluate(el=>el.value),/Rnd/);
    await latex('#entry','\\operatorname{Rnd}\\left(10\\div3\\right)\\times3');await ok();
    assert.equal(await page.locator('#answer').innerText(),'9.999');
    await mode(3);await page.locator('#sheet-entry').fill('=');
    await press('catalog');await choose('数值计算');await choose('四舍五入');
    assert.equal(await page.locator('#sheet-entry').inputValue(),'=Rnd(');
    await page.keyboard.type('10/3)*3');await ok();
    assert.equal(await page.locator('[data-cell=A1]').innerText(),'9.999');
    await press('setup');await choose('计算设置');await choose('显示格式');await choose('Norm');await choose('Norm 1');await press('clear');
  });
  await check('999 ratio coefficients accept a catalog suffix at the grid caret',async()=>{
    await mode(11);await choose('A:B=X:D');await entry().fill('3');
    await press('catalog');await choose('工程符号');await choose('千(ｋ)');
    assert.equal(await entry().inputValue(),'3ｋ');
    await ok();await writeAll([8,12]);await ok();assert.equal(await answer(),'4500');
  });

  await check('999 enters the manual polar expression and switches its result coordinates',async()=>{
    await mode(7);
    await press('2');await press('shift');await press('8');await page.keyboard.type('45');
    assert.match(await page.locator('#entry').evaluate(el=>el.value),/\\CWPolarAngle/);
    await ok();
    const answerTex=()=>page.locator('#answer .katex-mathml annotation').textContent();
    assert.equal(await answerTex(),'\\sqrt{2}+\\sqrt{2}i');
    const stored=(await vars()).Ans;
    near(stored.re,Math.SQRT2);near(stored.im,Math.SQRT2);
    await press('format');await choose('极坐标形式(r∠θ)');
    assert.equal(await page.locator('#answer').innerText(),'2∠45');
    await press('format');await choose('代数形式(a+bi)');
    assert.equal(await answerTex(),'\\sqrt{2}+\\sqrt{2}i');
    assert.deepEqual((await vars()).Ans,stored);
    await screenshot('complex-rectangular');
  });
  await check('999 non-Math output shows complex components on separate lines',async()=>{
    const inputOutput=async label=>{
      await press('setup');await choose('计算设置');await choose('输入/输出');await choose(label);await press('clear');
    };
    await mode(7);await inputOutput('数学输入/小数输出');
    await latex('#entry','2+3i');await ok();
    const lines=()=>page.locator('#answer [data-cw-component]').allTextContents();
    assert.deepEqual(await lines(),['2','3i']);
    const geometry=await page.locator('#answer .cw-complex-lines').evaluate(el=>{
      const [real,imaginary]=el.children;
      return [real.getBoundingClientRect().top,imaginary.getBoundingClientRect().top];
    });
    assert.ok(geometry[1]>geometry[0]);
    await press('format');await choose('极坐标形式(r∠θ)');
    assert.equal(await page.locator('#answer [data-cw-component=radius]').count(),1);
    assert.match(await page.locator('#answer [data-cw-component=argument]').innerText(),/^∠/);
    await inputOutput('线性输入/线性输出');
    await page.locator('#entry').fill('12/2');
    await press('catalog');await choose('复数');await choose(/^∠$/);await page.keyboard.type('90');
    assert.equal(await page.locator('#entry').inputValue(),'12/2∠90');
    await ok();assert.deepEqual(await lines(),['0','-6i']);
    await screenshot('complex-split');
    await inputOutput('数学输入/数学输出');
  });
  await check('999 complex Verify and the manual integer-power example run through the Complex app',async()=>{
    await mode(7);
    await latex('#entry','\\left(1+i\\right)^{4}+\\left(1-i\\right)^{2}');await ok();
    assert.match(await page.locator('#answer').innerText(),/[-−]4[-−]2i/);
    await latex('#entry','\\ln\\left(-1\\right)');await ok();
    assert.equal((await vars()).Ans.re,0);near((await vars()).Ans.im,Math.PI);
    assert.equal(await page.locator('#answer .katex-mathml annotation').textContent(),'\\pi i');
    await press('tools');await choose('运算验证开启');
    await press('shift');await press('9');await press('^2');
    await press('catalog');await choose('运算验证');await choose(/^=$/);
    await page.keyboard.type('-1');await ok();
    assert.equal(await page.locator('#answer').innerText(),'True');
    assert.equal((await vars()).Ans,1);
    await latex('#entry','i>0');await ok();
    assert.match(await page.locator('.cw-page-title').innerText(),/数学错误/);
    assert.equal((await vars()).Ans,1);
    await press('back');await press('tools');await choose('运算验证关闭');
  });
  await check('999 complex Ans and a stored variable retain both low digits across restart',async()=>{
    await mode(7);
    await latex('#entry','\\left(10^{20}+1\\right)+\\left(10^{20}+2\\right)i');await ok();
    await press('variables');await ok();await choose('赋值');
    const decimals=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('cnx-v2')).profiles.cn999cw.calculator.cwDecimals);
    const expected={re:'100000000000000000001',im:'100000000000000000002'};
    assert.deepEqual((await decimals()).Ans,expected);
    assert.deepEqual((await decimals()).A,expected);
    await app.close();app=await launch();page=await openPage(app);
    await page.locator('#entry').waitFor();
    await latex('#entry','A-\\left(10^{20}+10^{20}i\\right)');await ok();
    assert.deepEqual((await vars()).Ans,{re:1,im:2});
  });
  await check('999 polynomial roots convert the selected page without changing the next root',async()=>{
    await mode(5);await choose('多项式方程');await choose(/^ax²\+bx\+c$/);
    await writeAll([2,3,4]);await ok();
    const rootTex=()=>page.locator('[data-cw-result] annotation').textContent();
    const first=await rootTex();
    assert.match(first,/\\sqrt\{23\}/);
    await press('format');await choose('极坐标形式(r∠θ)');
    assert.match(await answer(),/∠/);
    await ok();assert.match(await rootTex(),/\\sqrt\{23\}/);
    await press('up');assert.match(await answer(),/∠/);
    await press('format');await choose('代数形式(a+bi)');
    assert.equal(await rootTex(),first);
  });

  await check('999 TOOLS Undo and redo retain a native fraction and its caret',async()=>{
    await mode(0);await press('clear');await press('frac');await press('7');await press('down');
    const field=page.locator('#entry');
    const snapshot=()=>field.evaluate(el=>({value:el.value,selection:el.selection}));
    const before=await snapshot();
    await press('6');
    const after=await snapshot();
    const undo=async()=>{await press('tools');await choose('撤消');};
    await undo();assert.deepEqual(await snapshot(),before);
    await undo();assert.deepEqual(await snapshot(),after);
    await page.keyboard.press('Control+z');assert.deepEqual(await snapshot(),before);
    await page.keyboard.press('Control+y');assert.deepEqual(await snapshot(),after);
  });
  await check('999 linear Undo and menu return preserve the edit and caret',async()=>{
    await mode(0);
    const inputOutput=async label=>{
      await press('setup');await choose('计算设置');await choose('输入/输出');await choose(label);await press('clear');
    };
    await inputOutput('线性输入/线性输出');
    await page.keyboard.type('3+5');
    const field=page.locator('#entry');
    await press('tools');await choose('撤消');assert.equal(await field.inputValue(),'3+');
    await press('tools');await choose('撤消');assert.equal(await field.inputValue(),'3+5');
    await field.evaluate(el=>el.setSelectionRange(1,1));
    await press('catalog');await press('back');
    assert.equal(await field.evaluate(el=>el.selectionStart),1);
    await inputOutput('数学输入/数学输出');
  });
  await check('999 follows the manual template jumps and SHIFT DEL square-root capture',async()=>{
    await mode(0);await press('clear');
    for(const action of ['1','+','frac','7','down','6'])await press(action);
    const field=page.locator('#entry');
    const denominator=await field.evaluate(el=>el.position);
    await press('shift');await press('right');
    assert.equal(await field.evaluate(el=>el.position===el.lastOffset),true);
    await field.evaluate((el,position)=>el.position=position,denominator);
    await press('shift');await press('left');
    assert.equal(await field.evaluate(el=>el.position),2);
    await field.evaluate((el,position)=>el.position=position,denominator);
    await press('left');await press('left');
    assert.equal(await field.evaluate(el=>el.position),2);
    await press('shift');await press('delete');
    const selected=await field.evaluate(el=>({range:el.selection.ranges[0],last:el.lastOffset}));
    assert.deepEqual(selected.range,[2,selected.last]);
    await press('sqrt(');
    assert.match(await field.evaluate(el=>el.value),/^1\+\\sqrt\{\\frac(?:76|\{7\}\{6\})\}$/);
    await ok();near((await vars()).Ans,1+Math.sqrt(7/6));
  });
  await check('999 replays the manual 4 times 3 example from the result screen',async()=>{
    await mode(0);await press('clear');
    for(const action of ['4','*','3','+','2','execute'])await press(action);
    assert.equal(await page.locator('#answer').innerText(),'14');
    await press('left');
    assert.equal(await page.locator('#entry').evaluate(el=>el.position===el.lastOffset),true);
    await press('delete');await press('delete');await press('-');await press('7');
    assert.equal((await vars()).Ans,14);
    await ok();assert.equal(await page.locator('#answer').innerText(),'5');
  });
  await check('999 arrows scroll a long result and BACK or AC returns to formula editing',async()=>{
    await mode(7);
    await latex('#entry','9.87654321\\times10^{99}+9.87654321\\times10^{98}i');await ok();
    const field=page.locator('#entry'),screen=page.locator('#screen'),output=page.locator('#answer');
    const expression=await field.evaluate(el=>el.value);
    const stored=(await vars()).Ans;
    const right=await output.evaluate(el=>el.scrollLeft);
    assert.ok(right>1);
    assert.notEqual(await screen.getAttribute('data-cw-answer-left'),null);
    await press('left');
    assert.ok(await output.evaluate(el=>el.scrollLeft)<right);
    assert.notEqual(await screen.getAttribute('data-cw-answer-right'),null);
    assert.notEqual(await field.getAttribute('data-cw-readout'),null);
    assert.deepEqual((await vars()).Ans,stored);
    await press('right');
    assert.ok(Math.abs(await output.evaluate(el=>el.scrollLeft)-right)<1);
    await screenshot('replay-overflow');
    await press('back');assert.equal(await output.innerText(),'');
    assert.equal(await field.evaluate(el=>el.value),expression);
    await ok();await press('clear');assert.equal(await field.evaluate(el=>el.value),'');
    await press('right');
    assert.equal(await field.evaluate(el=>el.value),expression);
    assert.equal(await field.evaluate(el=>el.position),0);
    assert.deepEqual((await vars()).Ans,stored);
  });

  await check('999 HOME places twelve crisp-edged icons on the two native LCD pages',async()=>{
    await mode(0);await press('menu');
    const layout=await page.evaluate(()=>{
      const screen=document.querySelector('#screen').getBoundingClientRect();
      const status=document.querySelector('.cw-lcd-status');
      const strip=status.getBoundingClientRect();
      const tiles=[...document.querySelectorAll('.cw-home-grid .mode-tile:not([hidden])')];
      const first=tiles[0].getBoundingClientRect();
      return {
        height:screen.height, width:screen.width,
        status:getComputedStyle(status.querySelector('svg')).visibility,
        pitch:strip.width/196,
        tile:first.height, firstLeft:first.left-strip.left, firstTop:first.top-strip.top,
        icons:tiles.filter(tile=>tile.querySelector('.cw-lcd-home-icon[shape-rendering=crispEdges]')).length,
      };
    });
    assert.equal(layout.status,'hidden');
    assert.equal(layout.icons,6);
    assert.ok(Math.abs(layout.height/layout.pitch-68)<1,JSON.stringify(layout));
    assert.ok(Math.abs(layout.tile/layout.pitch-31)<1,JSON.stringify(layout));
    assert.ok(Math.abs(layout.firstLeft/layout.pitch-2)<1,JSON.stringify(layout));
    assert.ok(Math.abs(layout.firstTop/layout.pitch-12)<1,JSON.stringify(layout));
    await screenshot('lcd-home');
    await press('page-down');
    assert.equal(await page.locator('.mode-tile:visible .cw-lcd-home-icon').count(),6);
    assert.equal(await page.locator('.mode-tile:visible.selected').getAttribute('data-mode'),'6');
    await screenshot('lcd-home-second');
  });
  await check('999 dot-matrix font and fixed indicators follow input, result and replay',async()=>{
    await mode(0);await press('clear');
    const indicator=name=>page.locator('[data-cw-indicator="'+name+'"]');
    const font=await page.evaluate(async()=> (await document.fonts.load('16px "CNX LCD"','3')).map(face=>face.status));
    assert.deepEqual(font,['loaded']);
    assert.equal(await indicator('math').getAttribute('hidden'),null);
    assert.equal(await indicator('angle').locator('text').textContent(),'D');
    assert.notEqual(await indicator('shift').getAttribute('hidden'),null);
    await press('shift');assert.equal(await indicator('shift').getAttribute('hidden'),null);await press('shift');
    await press('3');await press('/');await press('2');await ok();
    assert.equal(await page.locator('#answer annotation').textContent(),'\\frac{3}{2}');
    assert.match(await page.locator('#entry').evaluate(el=>getComputedStyle(el.shadowRoot.querySelector('.ML__cmr')).fontFamily),/CNX LCD/);
    const answerDigit=page.locator('#answer .katex-html .mord').filter({hasText:/^3$/}).last();
    assert.match(await answerDigit.evaluate(el=>getComputedStyle(el).fontFamily),/CNX LCD/);
    assert.notEqual(await page.locator('#entry').getAttribute('data-cw-readout'),null);
    assert.equal(await indicator('previous').getAttribute('hidden'),null);
    await screenshot('lcd-fraction');
    await press('clear');await press('1');await press('0');await ok();await press('up');
    assert.equal(await indicator('next').getAttribute('hidden'),null);
    assert.notEqual(await indicator('previous').getAttribute('hidden'),null);
    await press('left');
    assert.equal(await page.locator('#entry').getAttribute('data-cw-readout'),null);
    await press('catalog');
    assert.equal(await page.locator('.cw-lcd-status svg').evaluate(el=>getComputedStyle(el).visibility),'hidden');
  });
  await check('999 uses four contrast tones and a boxed angle indicator in numeric apps',async()=>{
    await mode(0);await press('setup');await choose('系统设置');await choose('对比度');
    const scale=page.locator('.cw-contrast-scale');
    assert.match(await scale.evaluate(el=>getComputedStyle(el).backgroundImage),/25%.*50%.*75%/);
    await screenshot('lcd-contrast');
    await press('right');await press('left');await ok();await press('clear');
    await mode(2);
    const status=page.locator('.cw-lcd-status');
    assert.equal(await status.locator('svg').evaluate(el=>getComputedStyle(el).visibility),'hidden');
    await page.keyboard.press('3');
    await page.locator('.cw-dist-param').first().waitFor();
    assert.equal(await status.locator('svg').evaluate(el=>getComputedStyle(el).visibility),'visible');
    assert.equal(await status.locator('[data-cw-indicator=angle] text').textContent(),'D');
    assert.notEqual(await status.locator('[data-cw-indicator=math]').getAttribute('hidden'),null);
    const run=page.locator('.cw-distribution .run-button');
    assert.ok(await run.evaluate(el=>el.getBoundingClientRect().bottom<=el.closest('.cw-distribution').getBoundingClientRect().bottom+1));
    await screenshot('lcd-distribution-parameters');
  });
  await check('999 power-off blanks the LCD content while leaving the display glass visible',async()=>{
    await mode(0);await press('clear');await press('3');await ok();
    const lcd=page.locator('#screen'),background=await lcd.evaluate(el=>getComputedStyle(el).backgroundColor);
    await press('shift');await press('clear');
    assert.match(await page.locator('.calculator').getAttribute('class'),/\boff\b/);
    assert.equal(await lcd.evaluate(el=>getComputedStyle(el).backgroundColor),background);
    assert.equal(await lcd.evaluate(el=>getComputedStyle(el).visibility),'visible');
    assert.equal(await page.locator('#answer').evaluate(el=>getComputedStyle(el).visibility),'hidden');
    await screenshot('lcd-off');
    await press('on');
    assert.doesNotMatch(await page.locator('.calculator').getAttribute('class'),/\boff\b/);
    assert.equal(await page.locator('#answer').innerText(),'');
  });

  await check('999 manual application scenarios emit no unhandled renderer errors',async()=>assert.deepEqual(errors,[]));
} finally {
  const application=await app.evaluate(({app})=>({version:app.getVersion(),packaged:app.isPackaged}));
  await fs.writeFile(path.join(evidence,'999-manual-ui-results.json'),JSON.stringify({application,passed,failed,errors},null,2));
  await app.close();
}
if (failed.length) process.exitCode=1;
