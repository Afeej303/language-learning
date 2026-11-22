import test from 'node:test';
import assert from 'node:assert/strict';
import { syllabus, skills, types, validate, visible } from '../src/content.js';
test('student projection strips solutions and separates matching columns', () => {
  const b = {
    type: 'match',
    prompt: 'Match',
    ml: 'യോജിപ്പിക്കുക',
    cue: 'Words',
    pairs: [['أ', 'A'], ['ب', 'B']],
    answers: ['A', 'B']
  };
  const q = {
    ...syllabus[0],
    skill: skills[0],
    language: 'ar',
    difficulty: 2,
    status: 'approved',
    body: b
  };
  validate(q);
  const shown = visible(q);
  assert.deepEqual(shown.left, ['أ', 'ب']);
  assert.equal(shown.answers, undefined);
  assert.equal(shown.pairs, undefined);
  assert.throws(() => validate({
    ...q,
    body: {
      ...b,
      pairs: [['a', 'x'], ['b', 'x']]
    }
  }));
});

test('served choice options include one correct choice and at most four random distractors', () => {
  const q={language:'ar',skill:'reading',level:'A1',unit:'script',point:'letters',difficulty:1,status:'approved',body:{type:'choice',prompt:'Choose',ml:'اختر',cue:'cue',answers:['correct'],options:['correct','wrong1','wrong2','wrong3','wrong4','wrong5','wrong6']}};
  for(let i=0;i<20;i++) {
    const shown=visible(q);
    assert.ok(shown.options.length<=5);
    assert.ok(shown.options.includes('correct'));
  }
  assert.equal(q.body.options.length,7,'question-bank options remain unmodified');
});
