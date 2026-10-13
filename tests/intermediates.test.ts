import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {calculateDrying} from '../apps/api/src/engine/drying';
const fixtures=JSON.parse(fs.readFileSync('tests/fixtures/intermediates-original.json','utf8'),(_key,value)=>value?.$nonfinite?Number(value.$nonfinite):value);
function equivalent(actual:any,expected:any,path='intermediate'){
 if(typeof expected==='number'){if(!Number.isFinite(expected)){assert.ok(Object.is(actual,expected),path);return;}assert.equal(typeof actual,'number',path);const tolerance=Math.max(1e-12,Math.abs(expected)*1e-10);assert.ok(Math.abs(actual-expected)<=tolerance,`${path}: ${actual} != ${expected}; tolerancia=${tolerance}`);return;}
 if(expected&&typeof expected==='object'){assert.deepEqual(Object.keys(actual),Object.keys(expected),path);for(const key of Object.keys(expected))equivalent(actual[key],expected[key],path+'.'+key);return;}
 assert.equal(actual,expected,path);
}
for(const [i,fixture]of fixtures.entries())test(`Intermedios ${i+1}: psicrometría, energía, caudal y etapas ${fixture.input.tipoGrano}/${fixture.input.machine}`,()=>equivalent(calculateDrying(fixture.input,true).details,fixture.intermediates));
