import test from 'node:test';
import assert from 'node:assert/strict';
import {createCGRational as fraction,readCGRational,cgRationalJSON,reduceCGRational,equalCGRational,combineCGRationals,evaluateCGRationalExpression as evaluate,formatCGRationalDisplay as display,simplifyCGRational as simp,formatCGDecimalDisplay as decimal,CG_RATIONAL_LIMITS,CGRationalError} from '../src/engine/cg-rational-display.js';
const manual={simplify:'Manual',complex:'real',inputOutput:'Math'},parts=value=>[value.n,value.d],error=code=>value=>value instanceof CGRationalError&&value.code===code;

test('manual1-37 and2-26 preserve the actual integer fraction15/60 and Auto reduces it',()=>{
 const value=evaluate('15/60');assert.deepEqual(parts(value),[15n,60n]);assert.equal(display(value,manual).text,'15/60');assert.equal(display(value,manual).latex,'\\frac{15}{60}');assert.equal(display(value).text,'1/4');assert.deepEqual(parts(value),[15n,60n]);
});
test('manual2-26 repeated automatic Simp chooses prime3 then5 and omitsF once irreducible',()=>{
 const value=fraction(15,60),first=simp(value,manual),second=simp(first.answer,manual),third=simp(second.answer,manual);assert.deepEqual([first.factor,first.text],[3n,'5/20']);assert.deepEqual([second.factor,second.text],[5n,'1/4']);assert.equal(third.factor,null);assert.equal(third.changed,false);assert.equal(third.text,'1/4');assert.deepEqual(parts(value),[15n,60n]);
});
test('manual2-27 specified composite divisor9 turns27/63 into3/7 without forcing prime-only input',()=>{
 const result=simp(fraction(27,63),{...manual,divisor:9});assert.equal(result.factor,9n);assert.equal(result.text,'3/7');assert.equal(result.changed,true);
});
test('Appendix Can’t Simplify4/8 divisor3 fails atomically and keeps the original answer',()=>{
 const value=fraction(4,8),before=cgRationalJSON(value);assert.throws(()=>simp(value,{...manual,divisor:3}),error('Can’t Simplify'));assert.deepEqual(cgRationalJSON(value),before);
});
test('complex a+bi and polar always auto-reduce even when Simplify preference is Manual',()=>{
 for(const complex of ['a+bi','polar']){const result=display(fraction(15,60),{...manual,complex});assert.equal(result.text,'1/4');assert.equal(simp(fraction(15,60),{...manual,complex}).factor,null);}assert.equal(display(fraction(15,60),{...manual,inputOutput:'Line'}).text,'15/60');
});
test('smallest-prime search works for even,odd and composite common factors rather than gcd-in-one-step',()=>{
 assert.deepEqual([simp(fraction(12,60),manual).factor,simp(fraction(12,60),manual).text],[2n,'6/30']);assert.deepEqual([simp(fraction(77,154),manual).factor,simp(fraction(77,154),manual).text],[7n,'11/22']);assert.equal(simp(fraction(49,343),manual).factor,7n);assert.equal(simp(fraction(97,194),manual).factor,97n);
});
test('a displayed integer or decimal is unchanged and no factor is fabricated',()=>{
 for(const value of [fraction(3),fraction(0),evaluate('.25')]){const result=simp(value,manual);assert.equal(result.changed,false);assert.equal(result.factor,null);}assert.equal(simp(fraction(15,60),{...manual,forceDecimal:true}).text,'0.25');
});
test('project divisor domain rejects zero,negative,noninteger and nondisors; identity1 makes no change',()=>{
 const value=fraction(4,8);for(const divisor of [0,-2,1.5,'1.5',Infinity,{},5])assert.throws(()=>simp(value,{...manual,divisor}),error('Can’t Simplify'));assert.equal(simp(value,{...manual,divisor:1}).factor,null);assert.equal(simp(value,{...manual,divisor:2n}).text,'2/4');
});
test('fraction arithmetic is exact and retains equal denominators or explicit cross-product intermediates',()=>{
 assert.deepEqual(parts(evaluate('1/4+1/4')),[2n,4n]);assert.deepEqual(parts(evaluate('1/2+1/3')),[5n,6n]);assert.deepEqual(parts(evaluate('(2/3)*(3/4)')),[6n,12n]);assert.deepEqual(parts(evaluate('(2/3)/(4/5)')),[10n,12n]);assert.deepEqual(parts(evaluate('((1/2)+(1/3))*6')),[30n,6n]);assert.ok(equalCGRational(evaluate('2/7+3/5'),fraction(31,35)));
});
test('pure precedence handles parentheses,right-associated powers,unary signs and unicode operators',()=>{
 assert.deepEqual(parts(evaluate('-2^2')) ,[-4n,1n]);assert.deepEqual(parts(evaluate('2^3^2')),[512n,1n]);assert.deepEqual(parts(evaluate('(2/3)^-2')),[9n,4n]);assert.deepEqual(parts(evaluate('−15÷60×2')) ,[-30n,60n]);assert.equal(evaluate('2^(1/2)'),null);assert.throws(()=>evaluate('0^0'),error('Math ERROR'));assert.throws(()=>evaluate('1/(2-2)'),error('Math ERROR'));
});
test('decimal literals retain exact base10 value but force decimal result per manual2-23',()=>{
 const value=evaluate('1/2*.5');assert.deepEqual(parts(value),[5n,20n]);assert.equal(value.decimal,true);assert.equal(display(value,manual).text,'0.25');assert.equal(evaluate('0.1+0.2').n,3n);assert.equal(display(evaluate('0.1+0.2'),manual).text,'0.3');assert.equal(display(evaluate('1e-3'),manual).text,'1e-3');
});
test('manual2-23 fraction capacity counts numerator,denominator and separators without silently rounding them',()=>{
 assert.equal(display(fraction(12345,6789),manual).kind,'fraction');assert.equal(display(fraction(123456,6789),manual).kind,'decimal');assert.equal(display(evaluate('1/2578+1/4572')).text,'6.066202547e-4');assert.deepEqual(parts(fraction(-15,-60)),[15n,60n]);assert.equal(display(fraction(-15,60),manual).text,'-15/60');assert.equal(display(fraction(73,20),{...manual,fracResult:'ab/c'}).text,'3 13/20');
});
test('exact JSON sidecar preserves un-reduced values across restart and rejects unsafe/malformed input',()=>{
 const json=JSON.parse(JSON.stringify(cgRationalJSON(fraction('12345678901234567890','98765432109876543210')))),restored=readCGRational(json);assert.deepEqual(parts(restored),[12345678901234567890n,98765432109876543210n]);assert.ok(Object.isFrozen(restored));for(const source of [{kind:'cg-rational-v1',n:'1',d:'0'},{kind:'cg-rational-v1',n:'1e3',d:'4'},{kind:'cg-rational-v1',n:'2',d:'4',decimal:'false'},{kind:'cg-rational-v1',n:'1'.repeat(257),d:'2'}])assert.equal(readCGRational(source),null);assert.throws(()=>fraction(.25),error('Exact input required'));assert.throws(()=>fraction(Number.MAX_SAFE_INTEGER+1),error('Exact input required'));
});
test('unsupported functions,Ran,Getkey and accessors are never invoked or reconstructed from a float',()=>{
 let calls=0;const variables={A:fraction(15,60),B:3,C:.25,Ran(){calls++;return 1;},Getkey(){calls++;return 1;}};Object.defineProperty(variables,'D',{get(){calls++;return 1;}});for(const source of ['Ran()','Getkey','Getkey()','A+Ran()','sin(30)','sqrt(4)','D+1','C+1','constructor.constructor("bad")','globalThis.x','A→B','[1,2]','2A'])assert.equal(evaluate(source,{variables}),null,source);assert.equal(calls,0);assert.deepEqual(parts(evaluate('A*B',{variables})),[45n,60n]);
});
test('exact expression limits bound source,tokens,depth,digits and exponentiation work',()=>{
 assert.equal(evaluate('1'.repeat(CG_RATIONAL_LIMITS.source+1)),null);assert.equal(evaluate('1+'.repeat(200)+'1'),null);assert.throws(()=>evaluate('('.repeat(33)+'1'+')'.repeat(33)),error('Memory ERROR'));assert.throws(()=>evaluate('10^999'),error('Memory ERROR'));assert.throws(()=>evaluate('2^1000'),error('Memory ERROR'));assert.throws(()=>fraction('1'.repeat(257)),error('Memory ERROR'));assert.ok(evaluate('2^500').n.toString().length<256);
});
test('Norm page image2-13 uses >=1e10 while each lower boundary is strict',()=>{
 for(const value of [10000000000,'10000000000',fraction(10000000000n)])assert.equal(decimal(value),'1e+10');assert.equal(decimal(-10000000000),'-1e+10');assert.equal(decimal(9999999999),'9999999999');assert.equal(decimal('.01'),'0.01');assert.equal(decimal('.001'),'1e-3');assert.equal(decimal('.000000001',{norm:2}),'0.000000001');assert.equal(decimal('.0000000001',{norm:2}),'1e-10');assert.equal(display(fraction(10000000000n)).latex,'1\\times10^{+10}');
});
test('manual2-2 display examples round100/6 as Norm10,Fix4,Sci5; Sci0 means ten digits',()=>{
 const value=fraction(100,6);assert.equal(decimal(value),'16.66666667');assert.equal(decimal(value,{mode:'Fix',digits:4}),'16.6667');assert.equal(decimal(value,{mode:'Sci',digits:5}),'1.6667e+1');assert.equal(decimal(value,{mode:'Sci',digits:0}),'1.666666667e+1');assert.equal(decimal(evaluate('200/7*14'),{mode:'Fix',digits:3}),'400.000');
});
test('declared project half-away policy handles carry into exponent10 and removes negative zero',()=>{
 assert.equal(decimal('9999999999.4'),'9999999999');assert.equal(decimal('9999999999.5'),'1e+10');assert.equal(decimal('-1.25',{mode:'Fix',digits:1}),'-1.3');assert.equal(decimal('-0.0001',{mode:'Fix',digits:2}),'0.00');assert.equal(decimal('-0'),'0');assert.equal(decimal('0',{mode:'Sci',digits:3}),'0.00e+0');
});
test('ordinary floating display reads its IEEE value without granting an exact-fraction sidecar',()=>{
 assert.equal(decimal(100/6),'16.66666667');assert.equal(decimal(.1+.2),'0.3');assert.equal(decimal(1e-100),'1e-100');assert.equal(readCGRational(.25),null);assert.throws(()=>decimal(NaN));assert.throws(()=>decimal(Infinity));assert.throws(()=>decimal(1,{norm:3}),error('Argument ERROR'));
});
test('arithmetic invariants hold over deterministic integer samples without mutating operands',()=>{
 for(let i=-12;i<=12;i++)for(let d=1;d<=13;d++){const a=fraction(i,d),b=fraction(d+1,7),before=cgRationalJSON(a),sum=combineCGRationals(a,'+',b),difference=combineCGRationals(sum,'-',b);assert.ok(equalCGRational(a,difference));assert.ok(equalCGRational(a,reduceCGRational(a)));assert.deepEqual(cgRationalJSON(a),before);}
});
