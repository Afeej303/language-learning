import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
const file = process.env.DB_FILE || 'data/studio.sqlite';
mkdirSync(dirname(file), {
  recursive: true
});
export const db = new DatabaseSync(file);
db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY,name TEXT UNIQUE NOT NULL,hash TEXT NOT NULL,role TEXT CHECK(role IN ('student','teacher')) NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user INTEGER REFERENCES users,expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS questions(id TEXT PRIMARY KEY, language TEXT NOT NULL, skill TEXT NOT NULL,level TEXT NOT NULL,unit TEXT NOT NULL,point TEXT NOT NULL,difficulty INTEGER NOT NULL,status TEXT CHECK(status IN ('draft','approved')) NOT NULL,body TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS bank ON questions(language,status,skill,level);
CREATE TABLE IF NOT EXISTS learners(user INTEGER REFERENCES users,language TEXT,state TEXT NOT NULL,PRIMARY KEY(user,language));`);
export function atomic(fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const value = fn();
    db.exec('COMMIT');
    return value;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}
