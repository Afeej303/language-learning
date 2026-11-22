import test from 'node:test';
import assert from 'node:assert/strict';
import { startPlacement, nextPlacement, recordPlacement, placementDone, placementLevels } from '../src/placement.js';
import { skills } from '../src/content.js';
test('starts at A2, rotates skills, avoids repeats and caps supported levels', () => {
  const bank = skills.flatMap(skill => ['A1', 'A2', 'B1'].flatMap(level => Array.from({
    length: 9
  }, (_, i) => ({
    id: skill + level + i,
    skill,
    level
  }))));
  const p = startPlacement();
  assert.equal(nextPlacement(p, bank).level, 'A2');
  while (!placementDone(p)) {
    const q = nextPlacement(p, bank);
    assert.ok(!p.seen.includes(q.id));
    recordPlacement(p, q, q.skill !== 'grammar');
  }
  assert.equal(p.seen.length, 20);
  assert.equal(placementLevels(p).reading, 'B1');
  assert.equal(placementLevels(p).grammar, 'A1');
});
test('unstable tracks run to the hard ceiling', () => {
  const p = startPlacement();
  for (const t of Object.values(p.tracks)) t.history = [0, 1, 2];
  p.seen.length = 24;
  assert.equal(placementDone(p), false);
  p.seen.length = 28;
  assert.equal(placementDone(p), true);
});
test('two consecutive correct responses are required for upward band estimates', () => {
  const p = startPlacement();
  const q1 = { id: 'a2-1', skill: 'reading', level: 'A2' };
  recordPlacement(p, q1, true);
  assert.equal(placementLevels(p).reading, 'A2');
  recordPlacement(p, { ...q1, id: 'a2-2' }, true);
  assert.equal(placementLevels(p).reading, 'B1');
  recordPlacement(p, { ...q1, id: 'a2-3' }, false);
  assert.equal(p.tracks.reading.correctStreak, 0);
});
