import { db } from '../src/db.js';
if (process.env.NODE_ENV !== 'development') throw Error('Dev only. Set NODE_ENV=development on a disposable database.');
console.log('DEV ONLY: approved', db.prepare("UPDATE questions SET status='approved' WHERE status='draft'").run().changes);
