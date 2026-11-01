import test from 'node:test';
import assert from 'node:assert/strict';
import {getModel} from '../src/models/registry.js';
import {ModelCalculator} from '../src/engine/model-calculator.js';
import {distribution,distributionTypes,normalPDF,normalCDF,inverseNormal,binomialPDF,binomialCDF,poissonPDF,poissonCDF} from '../src/engine/distributions.js';
import {cellPosition,rangeAddresses,shiftReferences} from '../src/engine/spreadsheet.js';
import {calculatorHTML} from '../src/ui/calculator.js';
import {cwHomeHTML} from '../src/ui/cw-home.js';
import {sanitizeProfile,AppStore,STORAGE_KEY} from '../src/state/store.js';
import {translate} from '../src/i18n.js';
const near=(a,b,t=1e-10)=>assert.ok(Math.abs(a-b)<=t*Math.max(Math.abs(b),1e-300),`${a} != ${b}`);
const sheet=()=>new ModelCalculator('cn999cw').createSpreadsheet();

test('999 has twelve documented apps, shared physical CW keys and a white body',()=>{
  const model=getModel('cn999cw');assert.deepEqual(model.modes.map(m=>m[3]),['calc','stat','distribution','spreadsheet','table','equation','inequality','complex','base','matrix','vector','ratio']);
  assert.equal(model.keyboard,getModel('cncw').keyboard);assert.equal(model.status,'experimental');
  assert.match(calculatorHTML(model),/white-cw/);assert.match(calculatorHTML(model),/fx-999CN CW/);assert.doesNotMatch(calculatorHTML(model),/fx-991CN CW/);
  assert.match(cwHomeHTML(model.modes,0),/数据表格/);assert.deepEqual(model.modes.map(m=>m[1]),'1234567890AB'.split(''));
});
test('999 capabilities stay gated; TI independently enables its documented statistics distributions',()=>{
  for(const id of ['cnx','cncw']){const c=new ModelCalculator(id);assert.throws(()=>c.distribution('normalPDF',{x:0,'μ':0,'σ':1}));assert.throws(()=>c.createSpreadsheet());}
  assert.throws(()=>new ModelCalculator('cg50').createSpreadsheet()); // CG uses its separate A1:Z999 engine.
  near(new ModelCalculator('cg50').distribution('normalPDF',{x:0,'μ':0,'σ':1}),1/Math.sqrt(2*Math.PI));
  assert.throws(()=>new ModelCalculator('ti36xpro').createSpreadsheet());
  near(new ModelCalculator('ti36xpro').distribution('normalPDF',{x:0,'μ':0,'σ':1}),1/Math.sqrt(2*Math.PI));
  assert.equal(distributionTypes.length,7);assert.throws(()=>distribution('bad',{}));
});
test('999 shared calculation, complex, calculus and registered functions remain usable',()=>{
  const c=new ModelCalculator('cn999cw');assert.equal(c.calculate('2+3*4'),14);near(c.evaluate('sin(30)'),.5);assert.equal(c.evaluate('(1+i)^2',{},true).im,2);near(c.integrate('x^2',0,1),1/3);c.define('f','x^2');assert.equal(c.evaluate('f(3)'),9);
});
test('manual normal density example x36 mu35 sigma2',()=>near(normalPDF(36,35,2),.17603266338214976));
test('manual binomial cumulative list for N5 p0.5',()=>[.5,.8125,.96875,1].forEach((p,i)=>near(binomialCDF(i+2,5,.5),p)));
test('normal interval and inverse are symmetric and correctly standardized',()=>{
  near(normalPDF(0),1/Math.sqrt(2*Math.PI));near(normalCDF(-1,1),.6826894921370859);near(normalCDF(-1e99,0),.5);near(inverseNormal(.975),1.959963984540054);near(inverseNormal(.025),-1.959963984540054);assert.equal(inverseNormal(.5,35,2),35);
  near(inverseNormal(.975,35,2),38.91992796908011);assert.equal(normalCDF(2,2),0);
});
test('normal small positive tails do not vanish through 1 minus CDF cancellation',()=>{
  near(normalCDF(8,9),6.21983198586583e-16,1e-10);near(normalCDF(-9,-8),6.21983198586583e-16,1e-10);near(inverseNormal(1e-12),-7.034483825301132);assert.equal(normalCDF(-1e99,1e99,0,1e-300),1);
});
test('binomial endpoints, degenerate trials and exact small probabilities',()=>{
  near(binomialPDF(2,5,.5),.3125);assert.equal(binomialCDF(5,5,.5),1);assert.equal(binomialPDF(0,0,0),1);assert.equal(binomialPDF(0,5,0),1);assert.equal(binomialPDF(5,5,1),1);assert.equal(binomialCDF(4,5,1),0);
});
test('binomial CDF agrees with an independent finite PMF sum',()=>{
  for(const p of [.01,.3,.8,.99]){let sum=0;for(let k=0;k<=20;k++){let choose=1;for(let i=1;i<=k;i++)choose*= (21-i)/i;sum+=choose*p**k*(1-p)**(20-k);near(binomialCDF(k,20,p),sum,1e-9);}}
});
test('large binomial parameters avoid factorial overflow',()=>{near(binomialPDF(500,1000,.5),.0252250181783608,1e-9);near(binomialCDF(500,1000,.5),.5126125090891804,1e-9);assert.ok(Number.isFinite(binomialCDF(500000,1000000,.5)));});
test('Poisson mass and cumulative probabilities agree with recurrence',()=>{
  for(const lambda of [.01,1,10,100]){let term=Math.exp(-lambda),sum=0;for(let k=0;k<=120;k++){if(k)term*=lambda/k;sum+=term;near(poissonPDF(k,lambda),term,1e-9);near(poissonCDF(k,lambda),sum,1e-9);}}
});
test('Poisson mode remains finite beyond factorial range',()=>{near(poissonPDF(1000,1000),.0126146113487215,1e-9);near(poissonCDF(1000,1000)-poissonCDF(999,1000),poissonPDF(1000,1000),1e-8);});
test('distribution domain errors reject fractions, overflow and impossible parameters',()=>{
  for(const fn of [()=>normalPDF(0,0,0),()=>normalCDF(2,1),()=>inverseNormal(0),()=>inverseNormal(1),()=>binomialPDF(1.5,5,.5),()=>binomialCDF(6,5,.5),()=>binomialPDF(2,5,1.1),()=>binomialCDF(1,1e6+1,.5),()=>poissonPDF(0,0),()=>poissonCDF(-1,2),()=>normalPDF(NaN),()=>inverseNormal(Infinity)])assert.throws(fn);
});
test('spreadsheet constants follow manual examples and are frozen after evaluation',()=>{const s=sheet();s.set('A1','7*5');s.set('A2','7*6');s.set('A3','A2+7');s.set('B1','=A1+7');assert.deepEqual(['A1','A2','A3','B1'].map(a=>s.value(a)),[35,42,49,42]);s.set('A2','1');assert.equal(s.value('A3'),49);});
test('formula recalculation follows changes through multiple dependencies',()=>{const s=sheet();s.set('A1','2');s.set('B1','=A1+7');s.set('C1','=B1*2');s.set('A1','5');assert.equal(s.value('C1'),24);});
test('sheet range aggregates match the manual and handle a rectangle',()=>{const s=sheet();[35,42,49].forEach((n,i)=>s.set('A'+(i+1),String(n)));s.set('A4','=Sum(A1:A3)');assert.equal(s.value('A4'),126);s.set('B1','=Mean(A1:A3)');assert.equal(s.value('B1'),42);s.set('B2','=Min(A1:A3)+Max(A1:A3)');assert.equal(s.value('B2'),84);s.set('C1','=Sum(A1:B3)');assert.equal(s.value('C1'),252);});
test('sheet rounds entered constants to ten significant digits',()=>{const s=sheet();s.set('A1','12345678915');assert.equal(s.value('A1'),12345678920);s.set('A2','1/3');assert.equal(s.value('A2'),.3333333333);});
test('relative, absolute and mixed references shift independently',()=>{assert.equal(shiftReferences('=A1+$B2+C$3+$D$4',1,2),'=B3+$B4+D$3+$D$4');assert.equal(shiftReferences('=1e10+A1',1,1),'=1e10+B2');});
test('sheet copy adjusts references and cut preserves them',()=>{const s=sheet();s.set('A1','2');s.set('B1','=A1+7');s.copy('B1','C3');assert.equal(s.source('C3'),'=B3+7');s.copy('B1','D4',true);assert.equal(s.source('D4'),'=A1+7');assert.equal(s.source('B1'),'');assert.equal(s.value('D4'),9);});
test('out-of-range copied references become visible error cells',()=>{const s=sheet();s.set('B1','=A1+7');s.copy('B1','A1');assert.match(s.source('A1'),/\?/);assert.ok(s.values.A1.error);assert.throws(()=>s.value('A1'));});
test('manual formula-fill and value-fill examples use row-relative references',()=>{const s=sheet();[35,42,49].forEach((n,i)=>s.set('A'+(i+1),String(n)));s.fill('B1:B3','2A1-3');assert.deepEqual([1,2,3].map(r=>s.value('B'+r)),[67,81,95]);s.fill('C1:C3','B1*3',false);assert.deepEqual([1,2,3].map(r=>s.value('C'+r)),[201,243,285]);s.set('A1','1');assert.equal(s.value('B1'),-1);assert.equal(s.value('C1'),201);});
test('sheet circular input is rejected without corrupting previous cells',()=>{const s=sheet();s.set('A1','2');s.set('B1','=A1');assert.throws(()=>s.set('A1','=B1'),/循环引用/);assert.equal(s.value('A1'),2);assert.throws(()=>s.set('C1','=C1'),/循环引用/);});
test('sheet rejects executable input, non-real values and undefined addresses',()=>{const s=sheet();for(const text of ['=import(1)','=A1=2','=F1','=A46','=[1,2]','=sqrt(-1)','=1/0'])assert.throws(()=>s.set('A1',text),text);assert.deepEqual(s.cells,{});});
test('sheet bounds include E45 and reject reversed or oversized ranges',()=>{const s=sheet();s.set('E45','7');assert.equal(s.value('E45'),7);assert.deepEqual(cellPosition('E45'),{col:4,row:44});for(const a of ['A0','F1','A46','constructor'])assert.throws(()=>cellPosition(a));assert.throws(()=>rangeAddresses('B3:A1'));assert.equal(rangeAddresses('A1:E45').length,225);});
test('sheet capacity and input length failures are transactional',()=>{const s=sheet();assert.throws(()=>s.set('A1','1+'.repeat(30)+'1'),/49/);const addresses=rangeAddresses('A1:E45');for(let i=0;i<121;i++)s.set(addresses[i],'1');assert.equal(s.usedBytes(),1694);assert.throws(()=>s.set(addresses[121],'1'),/内存/);assert.equal(Object.keys(s.cells).length,121);assert.throws(()=>s.fill('A1:E45','1',false),/内存/);assert.equal(Object.keys(s.cells).length,121);});
test('empty cells are zero, removed cells recalculate formulas and power clear resets selection',()=>{const s=sheet();s.set('B1','=A1+3');assert.equal(s.value('B1'),3);s.set('A1','2');s.set('A1','');assert.equal(s.value('B1'),3);s.selected='E45';s.clear();assert.equal(s.selected,'A1');assert.deepEqual(s.cells,{});});
test('999 profile persists its own mode and variables without saving volatile sheet data',()=>{
  const c=new ModelCalculator('cn999cw');c.assign('A',7);const p=sanitizeProfile({mode:'spreadsheet',calculator:c.save(),sheet:{A1:'5'},distributionParameters:{N:5}},'cn999cw');assert.equal(p.mode,'spreadsheet');assert.equal(p.calculator.vars.A,7);assert.equal(p.sheet,undefined);assert.equal(p.distributionParameters,undefined);
  const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)},store=new AppStore(storage,'en');store.select('cn999cw');store.saveProfile('cn999cw',c,p);assert.equal(new AppStore(storage).profile('cn999cw').calculator.vars.A,7);assert.deepEqual(store.profile('cncw').calculator.vars,{});assert.equal(JSON.parse(data.get(STORAGE_KEY)).activeModel,'cn999cw');
});
test('999 labels and new errors translate into English',()=>{for(const label of ['分布','数据表格','二项概率密度','反正态累积分布','公式填充','循环引用错误','单元格内容','分布列表须有 1–45 项'])assert.doesNotMatch(translate(label,'en'),/[\u4e00-\u9fff]/);});
