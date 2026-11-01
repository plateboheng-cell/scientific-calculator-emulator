import test from 'node:test';
import assert from 'node:assert/strict';
import {ModelCalculator} from '../src/engine/model-calculator.js';
import {runCGProgram} from '../src/engine/cg-program.js';
import {sanitizeProfile} from '../src/state/store.js';
import {graphRelationPoint} from '../src/engine/graph.js';
test('all 28 CG scalar registers persist; polar graph sampling overrides theta without altering it',()=>{const calc=new ModelCalculator('cg50');calc.assign('r',7);calc.assign('theta',90);const saved=sanitizeProfile({calculator:calc.save()},'cg50'),restored=new ModelCalculator('cg50',saved.calculator);assert.equal(restored.evaluate('r+θ'),97);const p=graphRelationPoint(restored,{type:'polar',expression:'r'},0);assert.equal(p.x,7);assert.equal(p.y,0);assert.equal(restored.vars.theta,90);});
test('Program distinguishes R from r and supports theta input, assignment, loops and sequences',()=>{const calc=new ModelCalculator('cg50'),result=runCGProgram(calc,'9→R:2→r:?→θ:Print R,r,θ:0→A:For 1→r To 3:A+r→A:Next:Seq(θ^2,θ,1,3)→List1:Print A',{inputs:[30]});assert.deepEqual(result.outputs,['9 2 30','6']);assert.equal(result.variables.R,9);assert.equal(result.variables.theta,30);assert.deepEqual(result.lists[0],[1,4,9]);assert.equal(calc.vars.r,0);});
test('financial register aliases do not override a recursion or caller independent variable',()=>{const calc=new ModelCalculator('cg50');calc.evaluate('Cmpd_PMT(360,6,100000,0)');assert.equal(calc.evaluate('n+Finance_n',{n:7}),367);assert.equal(calc.financialMemory.n,360);});
