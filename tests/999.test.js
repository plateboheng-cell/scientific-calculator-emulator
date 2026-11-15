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
import {verifyCWExpression} from '../src/engine/cw-verify.js';
import {cwBaseCalculate,cwBaseFormat} from '../src/engine/cw-base.js';
import {cwLinearSolution,cwPolynomialSolution} from '../src/engine/cw-equations.js';
import {describeStatistics,statistics} from '../src/engine/modes.js';
import {cwRegressionCoefficients,cwStatisticsScope} from '../src/engine/cw-statistics.js';
import {cwMatrixPower,cwVectorMultiply} from '../src/engine/cw-arrays.js';
import {formatCWComplexParts,formatCWEngineering,formatCWValue} from '../src/engine/cw-settings.js';
import {CW_ENGINEERING} from '../src/engine/cw-operators.js';
import {cwSexagesimalText,prepareCWLinearInput} from '../src/engine/cw-notation.js';
import {convertCWUnits,CW_UNIT_GROUPS} from '../src/engine/cw-units.js';
import {latexToExpression} from '../src/engine/notation.js';
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
test('999 reads cached formulas until an edit or explicit recalculation',()=>{
  const calculator=new ModelCalculator('cn999cw');
  const spreadsheet=calculator.createSpreadsheet();
  spreadsheet.set('A1','2');
  spreadsheet.set('B1','=A1+A');
  calculator.assign('A',3);
  assert.equal(spreadsheet.value('B1'),2);
  spreadsheet.autoCalculate=false;
  spreadsheet.set('A1','4');
  assert.equal(spreadsheet.value('A1'),4);
  assert.equal(spreadsheet.value('B1'),2);
  spreadsheet.recalculate();
  assert.equal(spreadsheet.value('B1'),7);
});
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
test('999 Verify evaluates each side and rejects reversed chains and complex inequalities',()=>{
  const calculator=new ModelCalculator('cn999cw');
  const evaluate=source=>calculator.evaluate(source,{},true);
  assert.deepEqual(verifyCWExpression('1≤1<1+1',evaluate),{truth:true,rhs:'1+1'});
  assert.equal(verifyCWExpression('2+3=5≠2+5=8',evaluate).truth,false);
  assert.equal(verifyCWExpression('i^2=-1',evaluate).truth,true);
  assert.throws(()=>verifyCWExpression('5≤6≥4',evaluate),/语法/);
  assert.throws(()=>verifyCWExpression('i<2',evaluate),/数学/);
});
test('999 Base-N follows the documented 32-bit ranges, prefixes and leading digits',()=>{
  assert.equal(cwBaseCalculate('d10+h10+b10+o10',10,{}),36);
  assert.equal(cwBaseFormat(cwBaseCalculate('15*37',10,{}),16),'0000022B');
  assert.equal(cwBaseCalculate('1010 AND 1100',2,{}),8);
  assert.equal(cwBaseCalculate('Not(1010)',2,{}),-11);
  assert.equal(cwBaseCalculate('1 OR 1 XOR 1',2,{}),0);
  assert.equal(cwBaseCalculate('-2147483648',10,{}),-2147483648);
  assert.throws(()=>cwBaseCalculate('2147483647+1',10,{}),/数学错误/);
});
test('999 coefficient workflows distinguish no solution, infinitely many and quadratic extrema',()=>{
  assert.equal(cwLinearSolution([[1,1,2],[2,2,5]]).kind,'none');
  assert.equal(cwLinearSolution([[1,1,2],[2,2,4]]).kind,'infinite');
  const solution=cwPolynomialSolution([1,2,-2]);
  assert.deepEqual(solution.roots.map(root=>root.tex),['-1+\\sqrt{3}','-1-\\sqrt{3}']);
  assert.deepEqual(solution.extrema,[{type:'最小值',x:-1,y:-3}]);
  assert.equal(cwPolynomialSolution([2,3,4],false).noRealRoots,true);
});
test('999 statistics capacities and regression coefficient order match the manual',()=>{
  const c=new ModelCalculator('cn999cw');
  assert.deepEqual([c.statisticsCapacity(),c.statisticsCapacity(false,true),c.statisticsCapacity(true,true)],[160,80,53]);
  const rows=[[1,3],[2,5],[3,7]];
  const fit=statistics(rows,'linear');
  const {a,b,r}=cwRegressionCoefficients(fit,'linear');
  assert.deepEqual([a,b],[2,1]);
  near(r,1,1e-14);
  assert.equal(cwStatisticsScope(describeStatistics(rows,true),fit,'linear').CWStatEstimateY(5.5),12);
  assert.equal(describeStatistics([[1,3],[1,4]],true)['ȳ'],3.5);
});
test('999 array operations handle two-dimensional cross products and inverse matrices',()=>{
  assert.deepEqual(cwVectorMultiply([1,2],[3,4]),[0,0,-2]);
  assert.deepEqual(cwMatrixPower([[2,1],[1,1]],-1),[[1,-1],[-1,2]]);
});
test('999 analysis accepts an expression body and the documented tolerance bound',()=>{
  const c=new ModelCalculator('cn999cw');c.angle='Rad';
  near(c.evaluate('integral(ln(x),1,e)'),1);
  assert.equal(c.evaluate('diff(sin(x),pi/2)'),0);
  assert.equal(c.evaluate('sum(x+1,1,5)'),20);
  assert.throws(()=>c.evaluate('integral(x,0,1,1e-23)'),/自变量错/);
});
test('999 retains 23 significant decimal digits across operations and reload',()=>{
  const c=new ModelCalculator('cn999cw');
  assert.equal(c.evaluate('(1e20+1)-1e20'),1);
  assert.equal(c.evaluate('(1e23+1)-1e23'),0);
  assert.equal(c.evaluate('0.1+0.2-0.3'),0);
  c.calculate('1e20+1');
  c.assign('A',c.vars.Ans,false,c.lastExactResult);
  const p=sanitizeProfile({calculator:c.save()},'cn999cw');
  const reopened=new ModelCalculator('cn999cw',p.calculator);
  assert.equal(reopened.evaluate('Ans-1e20'),1);
  reopened.define('f','x+A');reopened.define('g','f(x)-1e20');
  assert.equal(reopened.evaluate('g(2)'),3);
  reopened.assign('A',1e20);
  assert.equal(reopened.evaluate('g(0)'),0);
  assert.equal(sanitizeProfile({calculator:{vars:{A:2},cwDecimals:{A:'1.999',Ans:'1e20'}}},'cn999cw').calculator.cwDecimals.A,undefined);
});
test('999 scalar domains follow the manual at trig, factorial, roots and magnitude limits',()=>{
  const c=new ModelCalculator('cn999cw');
  assert.equal(c.evaluate('sin(90)'),1);
  assert.throws(()=>c.evaluate('tan(90)'),/数学错误/);
  assert.throws(()=>c.evaluate('cos(9e9)'),/数学错误/);
  assert.equal(c.evaluate('1e-99/10'),0);
  assert.throws(()=>c.evaluate('1e100/10'),/数学错误/);
  assert.throws(()=>c.evaluate('factorial(70)'),/数学错误/);
  near(c.evaluate('factorial(69)'),1.711224524281413e98);
  assert.equal(c.evaluate('(-8)^(1/3)'),-2);
  assert.equal(c.evaluate('nthRoot(-8,3)'),-2);
  c.angle='Gra';assert.equal(c.evaluate('cos(200)'),-1);
  c.angle='Rad';assert.throws(()=>c.evaluate('tan(pi/2)'),/数学错误/);
  assert.throws(()=>c.evaluate('RanInt(1,1)'),/数学错误/);
});
test('999 Verify compares the retained decimal result even when the doubles agree',()=>{
  const c=new ModelCalculator('cn999cw');
  const evaluate=expression=>({value:c.evaluate(expression),exact:c.lastExactResult});
  assert.equal(verifyCWExpression('1e20+1=1e20',evaluate).truth,false);
  assert.equal(verifyCWExpression('1e20+1>1e20',evaluate).truth,true);
  assert.throws(()=>verifyCWExpression('2+3',evaluate),/无运算符/);
});
test('999 display rounds a decimal tie using the retained digits',()=>{
  const c=new ModelCalculator('cn999cw');
  const p=sanitizeProfile({format:'Fix',digits:2},'cn999cw');
  const value=c.evaluate('1.005');
  assert.equal(formatCWValue(value,c,p,false,c.lastExactResult),'1.01');
});
test('999 documented DMS and unit examples are evaluated from the actual input tokens',()=>{
  const c=new ModelCalculator('cn999cw');
  assert.equal(cwSexagesimalText(c.evaluate(prepareCWLinearInput('2°20°30°+0°9°30°'))),'2°30′0″');
  assert.equal(cwSexagesimalText(1.25),'1°15′0″');
  near(c.evaluate(prepareCWLinearInput('5cm▸in')),1.968503937);
  const commands=CW_UNIT_GROUPS.flatMap(group=>group.commands);
  assert.equal(commands.length,40);
  for(const command of commands)assert.ok(Number.isFinite(convertCWUnits(1,command.from,command.to)));
  near(c.evaluate(prepareCWLinearInput('1hp▸kW')),.7456998715822702);
  assert.equal(c.evaluate(latexToExpression('\\CWLog\\left(2,16\\right)',{cwNative:true})),4);
  assert.equal(c.evaluate(latexToExpression('\\log_{2}\\left(16\\right)',{cwNative:true})),4);
});
test('999 groups implicit products in a divisor while preserving explicit products',()=>{
  const c=new ModelCalculator('cn999cw');
  assert.equal(c.evaluate('6/2(1+2)'),1);
  near(c.evaluate('6/2pi'),3/Math.PI);
  assert.equal(c.evaluate('6/2*(1+2)'),9);
  assert.equal(c.evaluate('(6/2)(1+2)'),9);
  c.define('f','6/2(x+2)');assert.equal(c.evaluate('f(1)'),1);
});

test('999 engineering suffixes scale one operand in natural and linear notation',()=>{
  const c=new ModelCalculator('cn999cw');
  for(const {name,text,exponent} of CW_ENGINEERING){
    assert.equal(c.evaluate('5'+text),Number('5e'+exponent));
    assert.equal(c.evaluate(latexToExpression('5\\'+name,{cwNative:true})),Number('5e'+exponent));
  }
  assert.equal(c.evaluate('999ｋ+25ｋ'),1024000);
  assert.equal(c.evaluate('2ｋ^2'),4e6);
  assert.equal(c.evaluate('2^3ｋ'),8000);
  assert.equal(c.evaluate('2(3+4)ｋ'),14000);
  c.assign('E',3);
  assert.equal(c.evaluate('2E1+E'),23);
  const p=sanitizeProfile({cwSettings:{engineering:true}},'cn999cw');
  assert.equal(formatCWValue(1024000,c,p),'1.024M');
  assert.equal(formatCWEngineering(1024000,p,3),'1024k');
  assert.equal(formatCWEngineering(1024000,p,0),'1024000');
});

test('999 angle suffixes and percentages bind to their operand',()=>{
  const c=new ModelCalculator('cn999cw');
  const expression=latexToExpression('\\left(\\frac{\\pi}{2}\\right)\\CWAngleRadian',{cwNative:true});
  assert.equal(c.evaluate(expression),90);
  assert.equal(c.evaluate('100ᵍ'),90);
  c.angle='Rad';
  assert.equal(c.evaluate('sin(90°)'),1);
  c.angle='Gra';
  assert.equal(c.evaluate('180°'),200);
  assert.equal(c.evaluate('150*20%'),30);
  assert.equal(c.evaluate('660/880%'),75);
  assert.equal(c.evaluate('3500-3500*25%'),2625);
  assert.equal(c.evaluate('1+20%'),1.2);
});

test('999 linear permutation, combination, remainder and dot obey their operator order',()=>{
  const c=new ModelCalculator('cn999cw');
  assert.equal(c.evaluate('10ᴾ4'),5040);
  assert.equal(c.evaluate('10ᶜ4'),210);
  assert.equal(c.evaluate('2*10ᶜ4'),420);
  assert.equal(c.evaluate('2(3)ᴾ2'),30);
  assert.equal(c.evaluate('5÷R2+1'),3);
  assert.equal(c.evaluate('3*5÷R2'),7);
  assert.equal(c.evaluate('sqrt(16)÷R3'),1);
  assert.equal(c.evaluate('2*VctA•VctB',{VctA:[1,2],VctB:[3,4]}),22);
  assert.throws(()=>c.evaluate('3÷R'),/语法错误/);
});

test('999 Rnd follows display precision through the decimal engine, functions and sheets',()=>{
  const c=new ModelCalculator('cn999cw',{}, {format:'Fix',digits:3});
  assert.equal(c.evaluate('10/3*3'),10);
  assert.equal(c.evaluate('Rnd(10/3)*3'),9.999);
  assert.equal(c.evaluate('Rnd(10^20+1)-10^20'),1);
  assert.equal(c.evaluate('Rnd(-1.0005)'),-1.001);
  c.define('f','Rnd(x/3)*3');
  assert.equal(c.evaluate('f(10)'),9.999);
  const sheet=c.createSpreadsheet();
  sheet.set('A1','=f(10)');
  assert.equal(sheet.value('A1'),9.999);
  c.cwRounding={format:'Sci',digits:3};
  assert.equal(c.evaluate('Rnd(1234)'),1230);
  c.cwRounding={format:'Norm',digits:10};
  assert.equal(c.evaluate('Rnd(1.23456789015)'),1.2345678902);
});

test('999 polar input follows the native priority and angular unit in both editors',()=>{
  const c=new ModelCalculator('cn999cw');
  const natural=latexToExpression('12\\div2\\CWPolarAngle 90',{cwNative:true,mode:'complex'});
  for(const expression of ['12/2∠90',natural]){
    const value=c.evaluate(expression,{},true);
    assert.equal(value.re,0);
    assert.equal(value.im,-6);
  }
  const fraction=latexToExpression('\\frac{12}{2}\\CWPolarAngle 90',{cwNative:true,mode:'complex'});
  assert.equal(c.evaluate(fraction,{},true).im,6);
  const implicit=latexToExpression('2\\pi\\CWPolarAngle 90',{cwNative:true,mode:'complex'});
  near(c.evaluate(implicit,{},true).im,2*Math.PI);
  assert.equal(c.evaluate(latexToExpression('5\\CWRemainder 2\\div2',{cwNative:true})),1);
  const example=c.evaluate('2∠45',{},true);
  near(example.re,Math.SQRT2);
  assert.equal(example.im,example.re);
  c.angle='Gra';
  assert.equal(c.evaluate('2∠100',{},true).im,2);
  c.angle='Rad';
  assert.equal(c.evaluate('2∠(pi/2)',{},true).im,2);
});

test('999 complex arithmetic covers the documented integer powers and components',()=>{
  const c=new ModelCalculator('cn999cw');
  const evaluate=source=>c.evaluate(source,{},true);
  assert.deepEqual(evaluate('(1+i)^4+(1-i)^2').toJSON(),{mathjs:'Complex',re:-4,im:-2});
  assert.equal(evaluate('i^9999999999').im,-1);
  assert.equal(evaluate('i^(-9999999999)').im,1);
  assert.throws(()=>evaluate('i^10000000000'),/指数超出范围/);
  assert.throws(()=>evaluate('1/(i-i)'),/数学错误/);
  const quotient=evaluate('(2+3i)/(4-5i)');
  near(quotient.re,-7/41);
  near(quotient.im,22/41);
  assert.equal(evaluate('sqrt(-4)').im,2);
  assert.equal(evaluate('arg(1+i)'),45);
  assert.equal(evaluate('arg(-1)'),180);
  assert.equal(evaluate('im(conj(2+3i))'),-3);
  assert.equal(evaluate('ln(-1)-pi*i'),0);
  assert.equal(evaluate('ln(i)-pi*i/2'),0);
  near(evaluate('log(-1)').im,Math.PI/Math.LN10);
  near(evaluate('CWLog(2,-1)').im,Math.PI/Math.LN2);
  assert.equal(typeof evaluate('sin(i)').im,'number');
});

test('999 retains complex decimal low digits through Ans, variable storage and profile reload',()=>{
  const c=new ModelCalculator('cn999cw');
  const value=c.calculate('(1e20+1)+i(1e20+2)',true);
  c.assign('A',value,false,c.lastExactResult);
  const saved=c.save();
  assert.deepEqual(saved.cwDecimals.Ans,{re:'100000000000000000001',im:'100000000000000000002'});
  saved.cwDecimals.Ans.im='1';
  assert.equal(c.cwDecimals.Ans.im,'100000000000000000002');
  const profile=sanitizeProfile({calculator:saved},'cn999cw');
  assert.equal(profile.calculator.cwDecimals.Ans,undefined);
  const reopened=new ModelCalculator('cn999cw',profile.calculator);
  const result=reopened.evaluate('A-(1e20+1e20i)',{},true);
  assert.deepEqual([result.re,result.im],[1,2]);
});

test('999 Verify compares retained complex components and displays the manual polar example',()=>{
  const c=new ModelCalculator('cn999cw');
  const evaluate=source=>({value:c.evaluate(source,{},true),exact:c.lastExactResult});
  assert.equal(verifyCWExpression('i^2=-1',evaluate).truth,true);
  assert.equal(verifyCWExpression('2∠45=sqrt(2)+sqrt(2)i',evaluate).truth,true);
  assert.equal(verifyCWExpression('1+1e-90i=1',evaluate).truth,false);
  assert.throws(()=>verifyCWExpression('i>0',evaluate),/数学错误/);
  const profile=sanitizeProfile({format:'Fix',digits:3},'cn999cw');
  const result=evaluate('sqrt(2)+sqrt(2)i');
  assert.deepEqual(formatCWComplexParts(result.value,c,profile,true,result.exact),['2.000','45.000']);
});
