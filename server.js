import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { randomUUID } from 'node:crypto';
import { db, atomic } from './src/db.js';
import { login, logout, identity } from './src/auth.js';
import { syllabus, bank, save } from './src/content.js';
import { load, persist, view, begin, answer } from './src/learning.js';
import { importCsv, exportCsv, template as bankTemplate } from './src/bank-csv.js';
import { clientIp, throttleKey } from './src/login-throttle.js';
const root = resolve('public'),
  failures = new Map();
const json = (res, status, data) => {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(data));
};
const cookie = value => 'session=' + value + '; Path=/; HttpOnly; SameSite=Strict' + (process.env.SECURE_COOKIE === '1' ? '; Secure' : '');
const mime = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8'
};
const server = http.createServer(async (req, res) => {
  try {
    const path = new URL(req.url, 'http://localhost').pathname;
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    if (!path.startsWith('/api/')) {
      const file = resolve(root, '.' + (path === '/' ? '/index.html' : path));
      if (!file.startsWith(root + sep) || req.method !== 'GET') return json(res, 404, {
        error: 'Not found'
      });
      try {
        const bytes = await readFile(file);
        res.writeHead(200, {
          'Content-Type': mime[extname(file)] || 'application/octet-stream'
        });
        return res.end(bytes);
      } catch {
        return json(res, 404, {
          error: 'Not found'
        });
      }
    }
    const token = (req.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith('session='))?.slice(8) || '';
    let b = {};
    const post = req.method === 'POST';
    if (post) {
      if (req.headers['content-type'] !== 'application/json') return json(res, 415, {
        error: 'JSON required'
      });
      const chunks = [];
      let bytes = 0;
      for await (const part of req) {
        bytes += part.length;
        if (bytes > 64000) return json(res, 413, {
          error: 'Too large'
        });
        chunks.push(part);
      }
      b = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    }
    if (path === '/api/login' && post) {
      const key = throttleKey(String(b.name), clientIp(req)),
        now = Date.now(),
        entry = failures.get(key);
      if (entry?.until > now && entry.count >= 30) return json(res, 429, {
        error: 'Too many attempts. Try again in five minutes.'
      });
      try {
        const session = login(String(b.name), String(b.password).slice(0, 257));
        res.setHeader('Set-Cookie', cookie(session));
        failures.delete(key);
      } catch (e) {
        const f = entry?.until > now ? entry : {
          until: now + 300000,
          count: 0
        };
        f.count++;
        failures.set(key, f);
        return json(res, 401, {
          error: e.message
        });
      }
      return json(res, 200, {
        ok: true
      });
    }
    const user = identity(token);
    if (!user) return json(res, 401, {
      error: 'Sign in to continue.'
    });
    if (path === '/api/logout' && post) {
      logout(token);
      res.setHeader('Set-Cookie', cookie('') + '; Max-Age=0');
      return json(res, 200, {});
    }
    if (path === '/api/me' && !post) return json(res, 200, {
      user,
      syllabus: syllabus.map(({
        examples,
        ...lesson
      }) => lesson)
    });
    if (path.startsWith('/api/teacher/')) {
      if (user.role !== 'teacher') return json(res, 403, {
        error: 'Teacher access required.'
      });
      if (path === '/api/teacher/questions' && !post) return json(res, 200, bank(false).map(q => ({ ...q, approved_by_name: q.approved_by ? db.prepare('SELECT name FROM users WHERE id=?').get(q.approved_by)?.name || 'Unknown teacher' : null })));
      if (path === '/api/teacher/questions/export' && !post) {
        res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="question-bank.csv"', 'Cache-Control': 'no-store' });
        return res.end(exportCsv());
      }
      if (path === '/api/teacher/questions/template' && !post) {
        res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="question-bank-template.csv"', 'Cache-Control': 'no-store' });
        return res.end(bankTemplate);
      }
      if (path === '/api/teacher/questions/import' && post) {
        if (typeof b.csv !== 'string') throw Error('Provide CSV text.');
        const results = atomic(() => importCsv(b.csv, user.id));
        return json(res, 200, { imported: results.filter(x => x.ok).length, rows: results });
      }
      if (path === '/api/teacher/wrong-answers' && !post) {
        const rows = db.prepare(`SELECT question_id, point, raw_answer, count(*) AS count
          FROM attempts WHERE correct=0 AND raw_answer <> ''
          GROUP BY question_id, raw_answer HAVING count(*) >= 3 ORDER BY count DESC, question_id`).all();
        const questions = new Map(bank(false).map(q => [q.id, q]));
        return json(res, 200, rows.filter(x => {
          const q = questions.get(x.question_id);
          return q && !['choice','match'].includes(q.body.type);
        }).slice(0,50).map(x => ({ ...x, cue: questions.get(x.question_id).body.cue, skill: questions.get(x.question_id).skill })));
      }
      if (path === '/api/teacher/wrong-answers/accept' && post) {
        if (typeof b.question_id !== 'string' || typeof b.answer !== 'string' || !b.answer.trim() || b.answer.length > 2000) throw Error('Choose a valid answer to accept.');
        atomic(() => {
          const q = db.prepare('SELECT * FROM questions WHERE id=?').get(b.question_id);
          if (!q) throw Error('Question not found.');
          const body = JSON.parse(q.body);
          if (!body.answers.includes(b.answer)) body.answers.push(b.answer);
          if (body.type === 'choice' && !body.options.includes(b.answer)) body.options.push(b.answer);
          save({ ...q, body });
        });
        return json(res, 200, { ok: true });
      }
      if (path === '/api/teacher/questions' && post) {
        let savedId;
        atomic(() => {
          const id = b.id || randomUUID();
          savedId = id;
          const previous = b.id ? db.prepare('SELECT status,approved_by,approved_at,created_by FROM questions WHERE id=?').get(id) : null;
          if (b.id && !previous) throw Error('Unknown question.');
          let status = b.status;
          if (!['draft','in_review','approved'].includes(status)) throw Error('Choose draft, in review, or approved.');
          if (previous?.status === 'approved') status = 'in_review';
          if (status === 'approved') {
            const creator = previous?.created_by ?? (previous ? null : user.id);
            if (creator != null && creator === user.id) throw Error('A different teacher must approve this question.');
            if (previous && previous.status !== 'in_review') throw Error('Move the question to in review before approving it.');
          }
          save({ ...b, id, created_by: previous?.created_by ?? user.id, status, approved_by: status === 'approved' ? user.id : null, approved_at: status === 'approved' ? new Date().toISOString() : null });
        });
        return json(res, 200, { id: savedId });
      }
      if (path === '/api/teacher/students' && !post) return json(res, 200, db.prepare("SELECT id,name FROM users WHERE role='student' ORDER BY name").all().map(u => {
        const s = load(u.id);
        const attempts = db.prepare('SELECT skill,point,COUNT(*) AS total,SUM(correct) AS correct,MAX(attempted_at) AS last FROM attempts WHERE user=? GROUP BY skill,point').all(u.id);
        const performance = {};
        for (const row of attempts) (performance[row.skill] ||= {})[row.point] = { total: row.total, correct: row.correct };
        return {
          name: u.name,
          lanes: s.lanes,
          weak: s.weak,
          count: s.placement.seen.length,
          performance,
          lastActivity: db.prepare('SELECT MAX(attempted_at) AS last FROM attempts WHERE user=?').get(u.id).last || null
        };
      }));
    } else if (user.role === 'student' && ['/api/state', '/api/begin', '/api/answer'].includes(path)) {
      const result = atomic(() => {
        const s = load(user.id),
          rows = bank();
        let feedback;
      if (path === '/api/begin' && post) begin(s, b.mode, b.skill, rows);else if (path === '/api/answer' && post) feedback = answer(s, b.input, b.token, rows, user.id);else if (path !== '/api/state' || post) throw Error('Invalid request.');
        persist(user.id, s);
        return {
          ...view(s, rows),
          feedback
        };
      });
      return json(res, 200, result);
    }
    return json(res, 404, {
      error: 'Not found'
    });
  } catch (e) {
    return json(res, 400, {
      error: e.message
    });
  }
});
server.listen(Number(process.env.PORT || 3000), process.env.HOST || '0.0.0.0', () => console.log('Arabic Studio listening on', server.address().port));
