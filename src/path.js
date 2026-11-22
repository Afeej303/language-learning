import { levels, syllabus, shuffle } from './content.js';
export const newLane = level => ({
  level,
  passed: [],
  review: [],
  practised: null
});
export function current(lane) {
  return syllabus.find(p => p.level === lane.level && !lane.passed.includes(p.unit));
}
export function unitQuestions(lane, skill, mode, bank) {
  const unit = current(lane)?.unit;
  if (!unit) throw Error('Track complete.');
  if (lane.review.length && mode !== 'review') throw Error('Finish targeted review first.');
  if (mode === 'checkpoint' && lane.practised !== unit) throw Error('Complete practice first.');
  const points = mode === 'review' ? lane.review : syllabus.filter(p => p.unit === unit).map(p => p.point);
  if (!points.length) throw Error('No review is due.');
  const excluded = mode === 'checkpoint' ? new Set([...(lane.practiceIds || []), ...(lane.checkpointIds || [])]) : new Set();
  const groups = points.map(point => shuffle(bank.filter(q => q.point === point && q.skill === skill && q.unit === unit && !excluded.has(q.id))));
  if (groups.some(g => !g.length)) throw Error('Waiting for teacher approval of questions for this unit.');
  const rows = [];
  while (groups.some(g => g.length) && rows.length < 5) {
    for (const g of groups) if (g.length && rows.length < 5) rows.push(g.pop());
  }
  if (mode === 'practice') lane.practiceIds = rows.map(q => q.id);
  if (mode === 'checkpoint') lane.checkpointIds = [...new Set([...(lane.checkpointIds || []), ...rows.map(q => q.id)])];
  return rows;
}
export function finishUnit(lane, mode, results) {
  const unit = current(lane).unit;
  const misses = [...new Set(results.filter(r => !r.ok).map(r => r.point))];
  const score = results.filter(r => r.ok).length / results.length;
  if (mode === 'practice') lane.practised = unit;
  if (mode === 'review') lane.review = misses;
  if (mode === 'checkpoint') {
    if (score < 0.8) lane.review = misses;else {
      lane.passed.push(unit);
      lane.practised = null;
      if (!current(lane)) lane.level = levels[levels.indexOf(lane.level) + 1];
    }
  }
  return {
    mode,
    score,
    misses
  };
}
