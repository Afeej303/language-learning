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
