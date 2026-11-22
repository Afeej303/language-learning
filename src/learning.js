import { randomUUID, createHash } from 'node:crypto';
import { db } from './db.js';
import { syllabus, skills, visible } from './content.js';
import { startPlacement, nextPlacement, recordPlacement, placementDone, placementLevels } from './placement.js';
import { newLane, current, unitQuestions, finishUnit } from './path.js';
import { grade } from './grade.js';
import { schedule, dueCards } from './vocab.js';
export function load(id) {
  const row = db.prepare("SELECT state FROM learners WHERE user=? AND language='ar'").get(id);
  return row ? JSON.parse(row.state) : {
    placement: startPlacement(),
    lanes: null,
    run: null,
    cards: {},
    weak: {},
    performance: {},
    streak: 0,
    day: ''
  };
}
export function persist(id, s) {
  db.prepare("INSERT OR REPLACE INTO learners VALUES(?,'ar',?)").run(id, JSON.stringify(s));
}
const revision = q => createHash('sha256').update(JSON.stringify(q)).digest('hex');
function active(run, bank) {
  const q = bank.find(q => q.id === run?.ids[0]);
  return q && revision(q) === run.versions[q.id] ? q : null;
}
export function view(s, bank) {
  const run = s.run,
    q = active(run, bank);
  const yesterday = new Date(Date.now() + 19800000 - 86400000).toISOString().slice(0, 10);
  return {
    lanes: s.lanes,
    streak: s.day >= yesterday ? s.streak : 0,
    due: dueCards(s.cards, bank).length,
    count: s.placement.seen.length,
    weak: s.weak,
    last: s.last,
    run: run && {
      mode: run.mode,
      skill: run.skill,
      done: run.results.length,
      total: run.ids.length + run.results.length,
      token: run.token,
      q: q && visible(q)
    }
  };
}
export function begin(s, mode, skill, bank) {
  if (s.run && active(s.run, bank)) throw Error('An activity is already open.');
  let questions;
  if (mode === 'placement' && !s.lanes) {
    if (skills.some(skill => bank.filter(q => q.skill === skill).length < 7)) throw Error('Placement needs seven approved items per skill. Ask your teacher to publish the bank.');
    questions = [nextPlacement(s.placement, bank)];
  } else if (s.lanes && mode === 'vocab') questions = dueCards(s.cards, bank).slice(0, 10);else if (s.lanes && skills.includes(skill) && ['review', 'practice', 'checkpoint'].includes(mode)) questions = unitQuestions(s.lanes[skill], skill, mode, bank);else throw Error('This activity is unavailable.');
  if (!questions.length || !questions[0]) throw Error('No approved items are available.');
  s.last = null;
  s.run = {
    mode,
    skill,
    versions: Object.fromEntries(questions.map(q => [q.id, revision(q)])),
    ids: questions.map(q => q.id),
    token: randomUUID(),
    results: []
  };
}
export function answer(s, input, token, bank, userId) {
  const r = s.run,
    q = active(r, bank);
  if (!q || r.token !== token) throw Error('Activity changed. Reload your workspace.');
  const ok = grade(q.body, input);
  db.prepare('INSERT INTO attempts(user,question_id,raw_answer,correct,mode,skill,point,attempted_at) VALUES(?,?,?,?,?,?,?,?)')
    .run(userId, q.id, typeof input === 'string' ? input : JSON.stringify(input), ok ? 1 : 0, r.mode, q.skill, q.point, new Date().toISOString());
  r.results.push({
    point: q.point,
    ok
  });
  r.ids.shift();
  r.token = randomUUID();
  const now = Date.now(),
    day = new Date(now + 19800000).toISOString().slice(0, 10);
  if (s.day !== day) {
    s.streak = s.day === new Date(now + 19800000 - 86400000).toISOString().slice(0, 10) ? s.streak + 1 : 1;
    s.day = day;
  }
  s.weak[q.point] = Math.max(0, (s.weak[q.point] || 0) + (ok ? -1 : 1));
  if (q.skill === 'grammar') {
    s.performance ||= {};
    const pointStats = s.performance[q.point] ||= { total: 0, correct: 0 };
    pointStats.total++;
    if (ok) pointStats.correct++;
  }
  s.lastActivity = now;
  if (q.skill === 'vocabulary') s.cards[q.id] = schedule(s.cards[q.id], ok, now);
  if (r.mode === 'placement') {
    recordPlacement(s.placement, q, ok);
    if (placementDone(s.placement)) {
      const bands = placementLevels(s.placement);
      s.lanes = Object.fromEntries(skills.map(k => [k, newLane(bands[k])]));
      s.last = {
        mode: 'placement'
      };
      s.run = null;
    } else {
      const next = nextPlacement(s.placement, bank);
      if (next) {
        r.ids = [next.id];
        r.versions = {
          [next.id]: revision(next)
        };
      } else s.run = null;
    }
  } else if (!r.ids.length) {
    s.last = r.mode === 'vocab' ? {
      mode: 'vocab',
      score: r.results.filter(x => x.ok).length / r.results.length
    } : finishUnit(s.lanes[r.skill], r.mode, r.results);
    s.run = null;
  }
  return {
    ok,
    solution: q.body.type === 'match' ? q.body.pairs.map(x => x.join(' → ')).join(' · ') : q.body.answers[0],
    explanation: ok ? undefined : { en: q.body.explanation || '', ml: q.body.explanationMl || '' }
  };
}
