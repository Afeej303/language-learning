import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { once } from 'node:events';
import { DatabaseSync } from 'node:sqlite';
test('shared lab workflow through the HTTP API', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'dhic-'));
  const env = {
    ...process.env,
    DB_FILE: join(dir, 'db'),
    ACCOUNT_PASSWORD: 'test-password',
    PORT: '0',
    HOST: '127.0.0.1',
    NODE_ENV: 'development'
  };
  const cli = (script, ...args) => execFileSync(process.execPath, ['scripts/' + script + '.js', ...args], {
    env
  });
  cli('seed');
  cli('seed');
  cli('account', 'learner');
  cli('account', 'tutor', 'teacher');
  const child = spawn(process.execPath, ['server.js'], {
    env
  });
  t.after(async () => {
    child.kill();
    await once(child, 'exit');
    rmSync(dir, {
      recursive: true,
      force: true
    });
  });
  const [message] = await once(child.stdout, 'data');
  const url = 'http://127.0.0.1:' + String(message).trim().split(' ').at(-1) + '/api/';
  async function api(path, body, cookie = '') {
    const res = await fetch(url + path, {
      method: body ? 'POST' : 'GET',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookie
      },
      body: body && JSON.stringify(body)
    });
    return {
      status: res.status,
      data: await res.json(),
      cookie: res.headers.get('set-cookie')?.split(';')[0]
    };
  }
  const student = (await api('login', {
    name: 'learner',
    password: 'test-password'
  })).cookie;
  const teacher = (await api('login', {
    name: 'tutor',
    password: 'test-password'
  })).cookie;
  const s = (path, b) => api(path, b, student),
    admin = (path, b) => api('teacher/' + path, b, teacher);
  assert.equal((await s('teacher/questions')).status, 403);
  assert.equal((await s('begin', {
    mode: 'placement'
  })).status, 400);
  const drafts = (await admin('questions')).data;
  assert.equal(drafts.length, 480);
  assert.ok(drafts.every(q => q.status === 'draft'));
  cli('approve');
  let bank = (await admin('questions')).data;
  let state = (await s('begin', {
    mode: 'placement'
  })).data;
  let first = bank.find(q => q.id === state.run.q.id);
  await admin('questions', {
    ...first,
    status: 'draft'
  });
  assert.equal((await s('state')).data.run.q, null);
  assert.equal((await s('answer', {
    input: 'x',
    token: state.run.token
  })).status, 400);
  await admin('questions', {
    ...first,
    status: 'in_review'
  });
  await admin('questions', { ...first, status: 'approved' });
  bank = (await admin('questions')).data;
  state = (await s('begin', { mode: 'placement' })).data;
  async function submit(correct) {
    const q = bank.find(q => q.id === state.run.q.id);
    assert.ok(!('answers' in state.run.q));
    const b = q.body;
    const input = correct ? b.type === 'match' ? b.pairs.map(p => p[1]) : b.answers[0] : 'incorrect';
    const token = state.run.token;
    const response = await s('answer', {
      input,
      token
    });
    assert.equal(response.status, 200, JSON.stringify(response.data));
    state = response.data;
    assert.equal((await s('answer', {
      input,
      token
    })).status, 400);
  }
  while (state.run) await submit(false);
  const audit = new DatabaseSync(env.DB_FILE);
  const attempts = audit.prepare('SELECT user,question_id,raw_answer,correct,mode,skill,point,attempted_at FROM attempts').all();
  assert.equal(attempts.length, 20);
  assert.ok(attempts.every(a => a.user > 0 && a.question_id && a.raw_answer === 'incorrect' && a.correct === 0 && a.mode === 'placement' && a.skill && a.point && !Number.isNaN(Date.parse(a.attempted_at))));
  audit.close();
  const errors = (await admin('wrong-answers')).data;
  assert.ok(errors.some(row => row.raw_answer === 'incorrect' && row.count > 0));
  const candidate = errors.find(row => row.raw_answer === 'incorrect');
  assert.equal((await admin('wrong-answers/accept', { question_id: candidate.question_id, answer: candidate.raw_answer })).status, 200);
  assert.ok((await admin('questions')).data.find(q => q.id === candidate.question_id).body.answers.includes('incorrect'));
  const currentBank = (await admin('questions')).data;
  assert.ok(currentBank.some(q => q.status === 'approved' && q.skill === 'reading' && q.unit === 'script' && q.point === 'letters'));
  assert.ok(currentBank.some(q => q.status === 'approved' && q.skill === 'reading' && q.unit === 'script' && q.point === 'words'));
  assert.equal(state.lanes.reading.level, 'A1');
  for (const [mode, correct] of [['practice', true], ['checkpoint', false], ['review', true], ['checkpoint', true], ['practice', true], ['checkpoint', true]]) {
    const response = await s('begin', {
      mode,
      skill: 'reading'
    });
    assert.equal(response.status, 200, `${mode} ${state.lanes.reading.level}: ${JSON.stringify(response.data)}`);
    state = response.data;
    while (state.run) await submit(correct);
  }
  assert.equal(state.lanes.reading.level, 'A2');
  assert.equal(state.lanes.grammar.level, 'A1');
  assert.equal((await admin('students')).data[0].lanes.reading.level, 'A2');
  assert.equal((await s('logout', {})).status, 200);
  assert.equal((await s('state')).status, 401);
});
