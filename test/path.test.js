import test from 'node:test';import assert from 'node:assert/strict';import {current,newLane,finishUnit,unitQuestions} from '../src/path.js';
test('80% passes, lower scores target misses, all level units required',()=>{
 const l=newLane('A1');const rows=n=>Array.from({length:5},(_,i)=>({ok:i<n,point:'words'}));
 assert.throws(()=>unitQuestions(l,'grammar','checkpoint',[]),/practice/);
 finishUnit(l,'practice',rows(3));finishUnit(l,'checkpoint',rows(3));assert.deepEqual(l.review,['words']);
 assert.throws(()=>unitQuestions(l,'grammar','checkpoint',[]),/review/);
 finishUnit(l,'review',rows(5));finishUnit(l,'checkpoint',rows(4));assert.equal(current(l).unit,'sentences');
 finishUnit(l,'checkpoint',rows(5));assert.equal(l.level,'A2');
});
test('final supported level promotes to B2 without artificial content',()=>{const l=newLane('B1');l.passed=['clauses'];finishUnit(l,'checkpoint',[{ok:true}]);assert.equal(l.level,'B2');assert.equal(current(l),undefined);});
