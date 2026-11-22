// Each launch gets a private, disposable database. Production content is never opened.
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
const directory = mkdtempSync(join(tmpdir(), 'dhic-demo-'));
process.env.DB_FILE = join(directory, 'demo.sqlite');
process.env.NODE_ENV = 'development';
process.env.HOST = '127.0.0.1';
await import('./seed.js');
await import('./approve.js');
const { account } = await import('../src/auth.js');
for (const role of ['student', 'teacher']) {
  const password = randomBytes(12).toString('base64url');
  account(role, password, role);
  console.log(role + ' password: ' + password);
}
console.log('Open http://localhost:' + (process.env.PORT || 3000) + ' · usernames: student, teacher');
process.on('exit', () => {
  // Close SQLite before removing its files, including on Windows.
  database.close();
  rmSync(directory, { recursive: true, force: true });
});
const { db: database } = await import('../src/db.js');
process.once('SIGINT', () => process.exit(0));
process.once('SIGTERM', () => process.exit(0));
await import('../server.js');
