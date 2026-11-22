import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv, importCsv, columns, template, exportCsv } from '../src/bank-csv.js';
import { db } from '../src/db.js';

test('CSV parser preserves quoted commas and newlines',()=>{
  assert.deepEqual(parseCsv('a,b\n"one,two","three\nfour"'),[['a','b'],['one,two','three\nfour']]);
});

test('import reports each invalid row and inserts valid rows as drafts',()=>{
  const valid=['','draft','ar','grammar','A1','sentences','nominal',1,'choice','Pick noun','اختر','هذا طالب','طالب','طالب\nteacher','','Why?','لماذا؟'];
  const invalid=[...valid]; invalid[3]='invalid-skill';
  const encode = row => row.map(value => /[",\n\r]/.test(String(value)) ? '"' + String(value).replaceAll('"', '""') + '"' : value).join(',');
  const csv=columns.join(',')+'\n'+encode(valid)+'\n'+encode(invalid)+'\n'+encode(valid.slice(0,3));
  const before=db.prepare('SELECT count(*) n FROM questions').get().n;
  const rows=importCsv(csv);
  assert.deepEqual(rows.map(r=>r.ok),[true,false,false]);
  assert.equal(rows[1].row,3); assert.match(rows[1].error,/Check tags/);
  assert.equal(rows[2].row,4); assert.match(rows[2].error,/columns/);
  assert.equal(db.prepare('SELECT count(*) n FROM questions').get().n,before+1);
  assert.equal(db.prepare("SELECT status FROM questions ORDER BY rowid DESC LIMIT 1").get().status,'draft');
});

test('download template example imports successfully',()=>{
  const rows=importCsv(template);
  assert.equal(rows.length,1);
  assert.equal(rows[0].ok,true,rows[0].error);
  assert.equal(db.prepare('SELECT status FROM questions WHERE id=?').get(rows[0].id).status,'draft');
});

test('export then import updates matching IDs without duplicating bank rows',()=>{
  const before=db.prepare('SELECT count(*) n FROM questions').get().n;
  const csv=exportCsv();
  assert.ok(csv.startsWith('\uFEFF'));
  const rows=importCsv(csv);
  assert.ok(rows.every(x=>x.ok));
  assert.equal(db.prepare('SELECT count(*) n FROM questions').get().n,before);
});
