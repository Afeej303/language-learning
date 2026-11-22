import test from 'node:test';
import assert from 'node:assert/strict';
import { grade, normalize } from '../src/grade.js';
test('normalizes harakat, hamza and spacing while preserving Malayalam vowels', () => {
  assert.equal(normalize('  أَكَلَ   إِبْرَاهِيمُ. '), 'اكل ابراهيم');
  assert.notEqual(normalize('പടി'), normalize('പട'));
});
test('short exact alternatives, restricted typo tolerance, no missing negation', () => {
  const b = {
    type: 'translation',
    answers: ['The teacher returned', 'The tutor returned']
  };
  for (const a of ['The tutor returned.', 'The teacher retxrned']) assert.equal(grade(b, a), true);
  for (const a of ['The teacher never returned', 'A tutor returned', '']) assert.equal(grade(b, a), false);
});
test('a vowel-identification exercise requires the assessed mark', () => {
  const b = {
    type: 'blank',
    answers: ['بَ'],
    requireVowels: true
  };
  assert.equal(grade(b, 'بُ'), false);
  assert.equal(grade(b, 'بَ'), true);
});
