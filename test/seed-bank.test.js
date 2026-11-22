import test from 'node:test';
import assert from 'node:assert/strict';
import { syllabus } from '../src/content.js';
import { seedVariants } from '../content/seed-variants.js';

test('seed content contains at least twelve distinct sentences per grammar point', () => {
  for (const lesson of syllabus.filter(x => x.level && !['letters', 'words'].includes(x.point))) {
    const examples = [...lesson.examples, ...(seedVariants[lesson.point] || [])];
    assert.ok(examples.length >= 12, `${lesson.point} has ${examples.length}`);
    assert.equal(new Set(examples.map(x => x[0])).size, examples.length, `${lesson.point} Arabic sentences must be distinct`);
  }
});
