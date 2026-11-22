import { skills, levels, shuffle } from './content.js';
export function startPlacement() {
  return {
    seen: [],
    tracks: Object.fromEntries(skills.map(s => [s, {
      rank: 1,
      correctStreak: 0,
      history: [],
      hits: []
    }]))
  };
}
export function nextPlacement(p, questions) {
  const skill = skills[p.seen.length % skills.length],
    track = p.tracks[skill];
  const pool = shuffle(questions.filter(q => q.skill === skill && !p.seen.includes(q.id)));
  return pool.sort((a, b) => Math.abs(levels.indexOf(a.level) - track.rank) - Math.abs(levels.indexOf(b.level) - track.rank))[0];
}
export function recordPlacement(p, q, correct) {
  const t = p.tracks[q.skill],
    rank = levels.indexOf(q.level);
  t.correctStreak ||= 0;
  if (correct) {
    t.correctStreak++;
    const estimate = Math.min(2, rank + 1);
    if (estimate > t.rank && t.correctStreak >= 2) t.rank = estimate;
    else if (estimate <= t.rank) t.rank = estimate;
  } else {
    t.correctStreak = 0;
    t.rank = Math.max(0, Math.min(2, rank - 1));
  }
  t.history.push(t.rank);
  t.hits.push(correct ? Math.min(2, rank + 1) : -1);
  p.seen.push(q.id);
}
export function placementDone(p) {
  const stable = t => Math.max(...t.history.slice(-3)) - Math.min(...t.history.slice(-3)) <= 1;
  return p.seen.length >= 28 || p.seen.length >= 20 && p.seen.length % 4 === 0 && Object.values(p.tracks).every(stable);
}
export function placementLevels(p) {
  return Object.fromEntries(skills.map(s => {
    const t = p.tracks[s];
    const recent = t.history.slice(-3).sort((a, b) => a - b);
    const middle = recent.length ? recent[Math.floor(recent.length / 2)] : t.rank;
    const highest = t.hits.length ? Math.max(...t.hits) : t.rank;
    return [s, levels[Math.max(0, Math.min(middle, highest))]];
  }));
}
