import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { once } from 'node:events';
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
  assert.equal(drafts.length, 120);
  assert.ok(drafts.every(q => q.status === 'draft'));
  cli('approve');
  const bank = (await admin('questions')).data;
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
    status: 'approved'
  });
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
    assert.equal(response.status, 200);
    state = response.data;
    assert.equal((await s('answer', {
      input,
      token
    })).status, 400);
  }
  while (state.run) await submit(false);
  assert.equal(state.lanes.reading.level, 'A1');
  for (const [mode, correct] of [['practice', true], ['checkpoint', false], ['review', true], ['checkpoint', true], ['practice', true], ['checkpoint', true]]) {
    const response = await s('begin', {
      mode,
      skill: 'reading'
    });
    assert.equal(response.status, 200);
    state = response.data;
    while (state.run) await submit(correct);
  }
  assert.equal(state.lanes.reading.level, 'A2');
  assert.equal(state.lanes.grammar.level, 'A1');
  assert.equal((await admin('students')).data[0].lanes.reading.level, 'A2');
  assert.equal((await s('logout', {})).status, 200);
  assert.equal((await s('state')).status, 401);
});
