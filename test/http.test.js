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
  cli('account', 'tutor2', 'teacher');
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
  const teacher2 = (await api('login', { name: 'tutor2', password: 'test-password' })).cookie;
  const s = (path, b) => api(path, b, student),
    admin = (path, b) => api('teacher/' + path, b, teacher),
    admin2 = (path, b) => api('teacher/' + path, b, teacher2);
  assert.equal((await s('teacher/questions')).status, 403);
  assert.equal((await s('begin', {
    mode: 'placement'
  })).status, 400);
  const drafts = (await admin('questions')).data;
  assert.equal(drafts.length, 480);
  assert.ok(drafts.every(q => q.status === 'draft'));
  const created = await admin('questions', { ...drafts[0], id: undefined, status: 'in_review' });
  assert.equal(created.status,200);
  const inReview = (await admin('questions')).data.find(q => q.id === created.data.id);
  assert.equal(inReview.created_by,2);
  assert.equal((await admin('questions',{...inReview,status:'approved'})).status,400,'author cannot approve own item');
  assert.equal((await admin2('questions',{...inReview,status:'approved'})).status,200,'second teacher can approve');
  const approved = (await admin2('questions')).data.find(q => q.id === created.data.id);
  assert.equal(approved.status,'approved');
  assert.equal(approved.approved_by,3);
  assert.equal((await admin2('questions',{...approved,status:'approved',body:{...approved.body,prompt:'Edited'}})).status,200);
  const edited = (await admin2('questions')).data.find(q => q.id === created.data.id);
  assert.equal(edited.status,'in_review','editing approved item sends it back to review');
  cli('approve');
  let bank = (await admin('questions')).data;
  let state = (await s('begin', {
    mode: 'placement'
  })).data;
  const resumed=(await s('state')).data;
  assert.equal(resumed.run.q.id,state.run.q.id);
  assert.equal(resumed.run.current,1);
  const blocked=(await s('begin',{mode:'vocab'}));
  assert.equal(blocked.status,400);
  assert.match(blocked.data.error,/Finish or resume your open activity first/);
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
    if (!correct) {
      assert.ok(state.feedback.explanation.en);
      assert.ok(state.feedback.explanation.ml);
    }
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
  const repeat = bank.find(q => q.body.type === 'blank');
  const evidence = new DatabaseSync(env.DB_FILE);
  const learnerId=evidence.prepare("SELECT id FROM users WHERE name='learner'").get().id;
  const saveWrong=evidence.prepare('INSERT INTO attempts(user,question_id,raw_answer,correct,mode,skill,point,attempted_at) VALUES(?,?,?,0,?,?,?,?)');
  for(let i=0;i<4;i++) saveWrong.run(learnerId,repeat.id,'three-times','practice',repeat.skill,repeat.point,new Date().toISOString());
  for(let j=0;j<55;j++) for(let i=0;i<3;i++) saveWrong.run(learnerId,repeat.id,'other-'+j,'practice',repeat.skill,repeat.point,new Date().toISOString());
  evidence.close();
  const errors = (await admin('wrong-answers')).data;
  assert.ok(errors.every(row => row.count >= 3));
  assert.equal(errors.length,50);
  assert.ok(errors.every(row => !['choice','match'].includes(bank.find(q=>q.id===row.question_id)?.body.type)));
  const candidate = errors.find(row => row.raw_answer === 'three-times');
  assert.equal((await admin('wrong-answers/accept', { question_id: candidate.question_id, answer: candidate.raw_answer })).status, 200);
  assert.ok((await admin('questions')).data.find(q => q.id === candidate.question_id).body.answers.includes('three-times'));
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
  const learnerReport=(await admin('students')).data[0];
  assert.ok(['reading','grammar','vocabulary','translation'].every(skill=>Object.keys(learnerReport.performance[skill]||{}).length>0));
  assert.equal((await s('logout', {})).status, 200);
  assert.equal((await s('state')).status, 401);
});
