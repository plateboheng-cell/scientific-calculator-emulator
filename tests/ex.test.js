import test from 'node:test';
import assert from 'node:assert/strict';
import {ex} from '../src/models/ex.js';
import {getModel} from '../src/models/registry.js';
import {ModelCalculator} from '../src/engine/model-calculator.js';
import {baseCalculate,baseFormat} from '../src/engine/modes.js';
import {math} from '../src/engine/calculator.js';
import {constantsFor} from '../src/engine/model-constants.js';
import {statistics} from '../src/engine/modes.js';
import {distributionTypes} from '../src/engine/distributions.js';
import {shortcutAction, modifiedKeyAction} from '../src/keyboard/mapping.js';
import {AppStore, STORAGE_KEY, createSession, sanitizeProfile} from '../src/state/store.js';

const near = (actual, expected, tolerance=1e-10) => assert.ok(
  Math.abs(actual-expected) <= tolerance*Math.max(Math.abs(expected),1e-300),
  `${actual} differs from ${expected}`,
);
const array = value => math.isMatrix(value) ? value.toArray() : value;

// These are checks of the independent desktop implementation against the cited
// manual's documented cases; passing them is not full handheld certification.
test('EX exposes twelve documented applications with original 1–9/A/B/C shortcuts', () => {
  const model=getModel('ex');
  assert.equal(model,ex);
  assert.equal(model.name,'fx-991EX');
  assert.equal(model.family,'ex');
  assert.equal(model.status,'experimental');
  assert.equal(model.selectable,true);
  assert.equal(model.appearance,'classwiz-ex');
  assert.equal(model.menuShortcuts,'classwiz');
  assert.deepEqual(model.modes.map(mode=>mode[3]),[
    'calc','complex','base','matrix','vector','stat','distribution','spreadsheet',
    'table','equation','inequality','ratio',
  ]);
  assert.deepEqual(model.modes.map(mode=>mode[1]),'123456789ABC'.split(''));
  assert.equal(model.modes[9][1],'A');
  assert.equal(model.modes[11][1],'C');
  assert.ok(model.references.some(url=>url.endsWith('/fx-570_991EX_EN.pdf')));
  assert.notEqual(model.keyboard,getModel('cnx').keyboard);
});

test('EX physical legends match English keys, ALPHA memory and simulator QR export', () => {
  const model=getModel('ex'),key=action=>model.keyboard.science.find(row=>row[1]===action);
  assert.equal(key('store')[2],'RECALL');
  assert.equal(key('-')[3],'log10(');
  assert.equal(key('frac')[3],'mixed-input');
  assert.equal(key('sd')[3],'mixed');
  assert.deepEqual(model.keyboard.digits.slice(0,5).map(row=>row[2]),['CONST','CONV','RESET','INS','OFF']);
  assert.equal(modifiedKeyAction(model,'DEL','alpha'),'undo');
  for(const [legend,variable] of [['(−)','A'],['°′″','B'],['x⁻¹','C'],['sin','D'],['cos','E'],['tan','F'],[')','x'],['S⇔D','y'],['M+','M']]) {
    assert.equal(modifiedKeyAction(model,legend,'alpha'),variable,legend);
  }
  const controls=[...model.keyboard.controls.left,...model.keyboard.controls.right];
  assert.deepEqual(controls.find(row=>row[0]==='CALC'),['CALC','calc','SOLVE','solve','=','=']);
  assert.equal(controls.find(row=>row[0]==='OPTN')[3],'ex-qr');
  assert.equal(controls.find(row=>row[0]==='MENU')[2],'SETUP');
  assert.equal(controls.find(row=>row[0]==='x')[3],'sigma');
});

test('EX CALC and Newton SOLVE stay in Calculate with the ALPHA CALC equals shortcut', () => {
  const model=getModel('ex');
  assert.equal(model.solveLocation,'calc');
  assert.equal(shortcutAction(model,{key:'F6'}),'calc');
  assert.equal(shortcutAction(model,{key:'F6',shiftKey:true}),'solve');
  assert.equal(shortcutAction(model,{key:'F6'},false,true),'=');
  assert.equal(getModel('cncw').solveLocation,'equation');
  const calc=new ModelCalculator('ex');
  calc.assign('B',-2);
  const result=calc.solve('x^2+B=0',1);
  near(result,Math.sqrt(2));
  assert.ok(Math.abs(calc.evaluate('x^2+B',{x:result}))<1e-9);
  assert.equal(calc.vars.B,-2);
  near(calc.solve('x^2+B=0',-1),-Math.sqrt(2));
});

test('EX limits restored and assigned variables to A–F/M/x/y and refuses registered f/g', () => {
  const calc=new ModelCalculator('ex',{
    angle:'Rad',vars:{A:3,M:7,x:2,y:4,z:99,t:8,Ans:5},definitions:{f:'x^2',g:'x+1'},
    approximateVariables:['M','z'],
  });
  assert.deepEqual(getModel('ex').variables,['A','B','C','D','E','F','M','x','y']);
  assert.equal(calc.evaluate('A+M+x+y+Ans'),21);
  assert.equal(calc.isApproximate('M'),true);
  assert.equal(Object.hasOwn(calc.vars,'z'),false);
  assert.equal(Object.hasOwn(calc.vars,'t'),false);
  assert.throws(()=>calc.assign('z',1));
  assert.throws(()=>calc.evaluate('z'));
  assert.throws(()=>calc.define('f','x^2'),/不支持注册函数/);
  assert.throws(()=>calc.evaluate('f(2)'));
  assert.deepEqual(calc.definitions,{});
  assert.deepEqual(new ModelCalculator('ex',calc.save()).save(),calc.save());
});

test('EX 2010 constants keep manual precision instead of substituting the CW 2018 catalog', () => {
  const constants=constantsFor(getModel('ex'));
  assert.equal(constants.length,47);
  assert.equal(constants.find(row=>row[0]==='c₀')[2],299792458);
  assert.equal(constants.find(row=>row[0]==='h')[2],6.62606957e-34);
  assert.notEqual(constants.find(row=>row[0]==='h')[2],constantsFor(getModel('cncw')).find(row=>row[0]==='h')[2]);
  assert.equal(getModel('ex').constants,'codata2010');
});

test('EX manual arithmetic, fraction, trigonometric and CALC examples use the shared engine', () => {
  const calc=new ModelCalculator('ex');
  near(calc.calculate('4*sin(30)*(30+10*3)'),120);
  near(calc.calculate('2/3+1+1/2'),13/6);
  near(calc.evaluate('pi/6'),Math.PI/6);
  calc.assign('A',5);calc.assign('B',10);
  assert.equal(calc.evaluate('3*A+B'),25);
  calc.angle='Rad';near(calc.evaluate('sin(pi/6)'),.5);
  for(const expression of ['1/0','tan(pi/2)','import("fs")','A=3'])assert.throws(()=>calc.evaluate(expression),expression);
  assert.equal(calc.vars.A,5);
});

test('EX manual Equation/Func examples return every polynomial root and system unknown', () => {
  const calc=new ModelCalculator('ex');
  assert.deepEqual(calc.solveLinearSystem([[1,2,3],[2,3,4]]),[-1,2]);
  const roots=calc.solvePolynomial([1,2,-2]);
  near(roots[0],-1-Math.sqrt(3));near(roots[1],-1+Math.sqrt(3));
  const quartic=calc.solvePolynomial([1,0,-5,0,4]);
  assert.equal(quartic.length,4);
  quartic.forEach((root,index)=>near(root,[-2,-1,1,2][index]));
  const imaginary=calc.solvePolynomial([1,0,1]);
  assert.equal(imaginary.length,2);
  imaginary.forEach(root=>{near(root.re,0);near(Math.abs(root.im),1);});
  assert.throws(()=>calc.solvePolynomial([1,0,0,0,0,1]),/次数/);
  assert.deepEqual(getModel('ex').linearSizes,[2,3,4]);
});

test('EX manual matrices and vectors preserve dimensions and independent result types', () => {
  const calc=new ModelCalculator('ex'),scope={MatA:[[2,1],[1,1]],MatB:[[2,-1],[-1,2]],VctA:[1,2],VctB:[3,4]};
  assert.equal(calc.evaluate('det(MatA)',scope),1);
  assert.deepEqual(array(calc.evaluate('MatA*MatB',scope)),[[3,0],[1,1]]);
  assert.deepEqual(array(calc.evaluate('VctA+VctB',scope)),[4,6]);
  assert.deepEqual(getModel('ex').matrixNames,['MatA','MatB','MatC','MatD']);
  assert.deepEqual(getModel('ex').vectorDimensions,[2,3]);
  assert.equal(array(calc.evaluate('identity(4)')).length,4);
  assert.throws(()=>calc.evaluate('identity(5)'),/尺寸/);
  assert.throws(()=>calc.evaluate('VctA',{VctA:[1,2,3,4]}),/维数/);
});

test('EX Table follows the manual two-function example and enforces 45/30 row capacities', () => {
  const calc=new ModelCalculator('ex');
  assert.deepEqual(calc.makeTable('x^2+1/2','x^2-1/2',-1,1,.5),[
    [-1,1.5,.5],[-.5,.75,-.25],[0,.5,-.5],[.5,.75,-.25],[1,1.5,.5],
  ]);
  assert.equal(calc.makeTable('x','',0,44,1).length,45);
  assert.throws(()=>calc.makeTable('x','',0,45,1),/45/);
  assert.equal(calc.makeTable('x','x+1',0,29,1).length,30);
  assert.throws(()=>calc.makeTable('x','x+1',0,30,1),/30/);
  assert.equal(getModel('cnx').tableRows.dual,45,'the documented CN X desktop extension must stay isolated');
});

test('EX distributions expose the documented order, scalar examples and independent app policy', () => {
  const calc=new ModelCalculator('ex'),model=getModel('ex');
  assert.deepEqual(model.distributionOrder,['normalPDF','normalCDF','inverseNormal','binomialPDF','binomialCDF','poissonPDF','poissonCDF']);
  assert.deepEqual(model.distributionParameterOrder,{
    normalPDF:['x','σ','μ'],normalCDF:['下限','上限','σ','μ'],inverseNormal:['区域','σ','μ'],
  });
  assert.equal(model.distributionListLimit,45);
  assert.deepEqual([...model.distributionOrder].sort(),distributionTypes.map(type=>type.id).sort());
  near(calc.distribution('normalPDF',{x:36,'μ':35,'σ':2}),.1760326634,1e-9);
  near(calc.distribution('inverseNormal',{'区域':.5,'μ':35,'σ':2}),35);
  const probability=calc.distribution('binomialPDF',{x:10,N:15,p:.6});
  near(probability,3003*.6**10*.4**5);
  near(calc.distribution('normalCDF',{'下限':-1,'上限':1,'μ':0,'σ':1}),.6826894921370859);
  assert.throws(()=>calc.distribution('normalPDF',{x:36,'μ':35,'σ':0}));
  assert.equal(model.spreadsheet,true);
  assert.equal(model.spreadsheetLifecycle,'leave-app');
  assert.ok(calc.createSpreadsheet());
  assert.throws(()=>new ModelCalculator('cnx').createSpreadsheet());
});

test('EX statistics match the manual frequency example and declare physical data capacity', () => {
  const result=statistics([[1,0,1],[2,0,2],[3,0,3],[4,0,2],[5,0,1]]);
  assert.equal(result.n,9);assert.equal(result['x̄'],3);
  near(result['σx²'],4/3);
  const model=getModel('ex');
  assert.equal(model.volatileStatistics,true);
  assert.equal(model.statisticsCells,160);
  assert.deepEqual([1,2,3].map(columns=>Math.floor(model.statisticsCells/columns)),[160,80,53]);
});

test('EX statistics accept the last physical data row and reject the next for each column layout', () => {
  const calc=new ModelCalculator('ex');
  for(const [paired,frequency,limit] of [[false,false,160],[false,true,80],[true,false,80],[true,true,53]]) {
    const data=Array.from({length:limit},(_,index)=>[index,index*2,1]);
    assert.equal(calc.statisticsCapacity(paired,frequency),limit);
    assert.doesNotThrow(()=>calc.checkStatisticsData(data,paired,frequency));
    const overflowing=[...data,[limit,limit*2,1]];
    assert.throws(()=>calc.checkStatisticsData(overflowing,paired,frequency),/行数/);
    assert.equal(overflowing.length,limit+1,'rejecting excess data must not silently truncate it');
  }
  assert.equal(new ModelCalculator('cnx').statisticsCapacity(),100,'EX capacity must not alter the legacy CN X policy');
});

test('EX Base-N Ans continuation keeps signed 32-bit values and rejects noninteger answers',()=>{
  assert.equal(baseCalculate('Ans+1',10,2),3);
  assert.equal(baseFormat(baseCalculate('Ans+1',16,15),16),'10');
  assert.equal(baseCalculate('ANS+1',2,-1),0);
  assert.equal(baseFormat(baseCalculate('NOT Ans',16,0),16),'FFFFFFFF');
  for(const value of [1.5,Infinity,NaN,0x100000000,-0x80000001])assert.throws(()=>baseCalculate('Ans+1',16,value));
  assert.throws(()=>baseCalculate('ANSfoo',16,1));
});

test('EX profile saves stay isolated, preserve memory/history and discard volatile statistics and formulas', () => {
  const values=new Map(),storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
  const store=new AppStore(storage,'en'),calc=new ModelCalculator('ex');
  calc.assign('M',7);calc.assign('A',5);
  const session=createSession({},'en','ex');
  session.history=[{expr:'M+A',latex:'M+A',answer:'12',mode:'calc'}];
  session.statsRows=[[1,2,3]];
  session.base=16;
  store.saveProfile('ex',calc,session);store.select('ex');
  const reopened=new AppStore(storage,'zh');
  assert.equal(reopened.data.activeModel,'ex');
  assert.equal(reopened.data.language,'en');
  assert.equal(reopened.profile('ex').calculator.vars.M,7);
  assert.equal(reopened.profile('ex').history[0].answer,'12');
  assert.deepEqual(reopened.profile('ex').statsRows,[]);
  assert.equal(createSession(reopened.profile('ex'),'en','ex').base,16);
  assert.deepEqual(reopened.profile('cnx').calculator.vars,{});
  const sanitized=sanitizeProfile({calculator:{vars:{A:2,z:9},definitions:{f:'x^2',g:'x+1'}},statsRows:[[1,2,3]],sheet:{A1:'5'}},'ex');
  assert.deepEqual(sanitized.calculator.vars,{A:2});
  assert.deepEqual(sanitized.calculator.definitions,{});
  assert.deepEqual(sanitized.statsRows,[]);
  assert.equal(sanitized.sheet,undefined);
  assert.equal(JSON.parse(values.get(STORAGE_KEY)).profiles.ex.calculator.vars.M,7);
});
