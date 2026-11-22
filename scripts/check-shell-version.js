import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const files = [
  'public/index.html',
  'public/app.js',
  'public/ui.js',
  'public/teacher.js',
  'public/style.css',
  'public/app.webmanifest',
  'public/icon-192.png',
  'public/icon-512.png'
];
const hash = createHash('sha256');
for (const file of files) {
  hash.update(file);
  hash.update('\0');
  hash.update(readFileSync(resolve(root, file)));
  hash.update('\0');
}
const expected = hash.digest('hex');
const sw = readFileSync(resolve(root, 'public/sw.js'), 'utf8');
const actual = sw.match(/const BUILD_ID = '([a-f0-9]+)'/u)?.[1];
if (actual !== expected) {
  console.error(`Service worker BUILD_ID is stale. Expected ${expected}; found ${actual || 'missing'}. Update public/sw.js after changing shell files.`);
  process.exitCode = 1;
} else console.log(`Service worker shell version is current (${actual}).`);
