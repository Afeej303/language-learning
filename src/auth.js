import {randomBytes,scryptSync,timingSafeEqual,createHash} from 'node:crypto';
import {db} from './db.js';
const digest=s=>createHash('sha256').update(s).digest('hex');
export function account(name,password,role='student'){
 if(!/^[\w.-]{2,40}$/.test(name)||password.length<10||password.length>256)throw Error('Use a 2–40 character username and a 10–256 character password.');
 const salt=randomBytes(16).toString('hex');
 db.prepare('INSERT INTO users(name,hash,role) VALUES(?,?,?)').run(name,salt+'.'+scryptSync(password,salt,64).toString('hex'),role);
}
export function login(name,password){
 const user=db.prepare('SELECT * FROM users WHERE name=?').get(name);
 const [salt,hash]=(user?.hash||'missing.'+'00'.repeat(64)).split('.');
 if(!timingSafeEqual(scryptSync(password,salt,64),Buffer.from(hash,'hex'))||!user)throw Error('Incorrect username or password.');
 const token=randomBytes(32).toString('hex');
 db.prepare('DELETE FROM sessions WHERE expires<=?').run(Date.now());
 db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(digest(token),user.id,Date.now()+8*3600000);
 return token;
}
export function identity(token){return db.prepare('SELECT u.id,u.name,u.role FROM users u JOIN sessions s ON s.user=u.id WHERE token=? AND expires>?').get(digest(token),Date.now());}
export function logout(token){db.prepare('DELETE FROM sessions WHERE token=?').run(digest(token));}
