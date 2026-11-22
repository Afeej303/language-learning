import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {randomUUID} from 'node:crypto';
import {db,atomic} from './src/db.js';
import {login,logout,identity} from './src/auth.js';
import {syllabus,bank,save} from './src/content.js';
import {load,persist,view,begin,answer} from './src/learning.js';
const root=resolve('public'),failures=new Map();
const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
const cookie=value=>'session='+value+'; Path=/; HttpOnly; SameSite=Strict'+(process.env.SECURE_COOKIE==='1'?'; Secure':'');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webmanifest':'application/manifest+json'};
const server=http.createServer(async(req,res)=>{
 try{
 const path=new URL(req.url,'http://localhost').pathname;
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Content-Security-Policy',"default-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
 if(!path.startsWith('/api/')){
 const file=resolve(root,'.'+(path==='/'?'/index.html':path));
 if(!file.startsWith(root+sep)||req.method!=='GET')return json(res,404,{error:'Not found'});
 try{const bytes=await readFile(file);res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream'});return res.end(bytes);}catch{return json(res,404,{error:'Not found'});}
 }
 const token=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('session='))?.slice(8)||'';
 let b={};const post=req.method==='POST';
 if(post){if(req.headers['content-type']!=='application/json')return json(res,415,{error:'JSON required'});
 let raw='';for await(const part of req){raw+=part;if(Buffer.byteLength(raw)>64000)return json(res,413,{error:'Too large'});}b=JSON.parse(raw);}
 if(path==='/api/login'&&post){
 const key=req.socket.remoteAddress,now=Date.now(),entry=failures.get(key);
 if(entry?.until>now&&entry.count>=30)return json(res,429,{error:'Too many attempts. Try again in five minutes.'});
 try{const session=login(String(b.name),String(b.password).slice(0,257));res.setHeader('Set-Cookie',cookie(session));failures.delete(key);}catch(e){const f=entry?.until>now?entry:{until:now+300000,count:0};f.count++;failures.set(key,f);return json(res,401,{error:e.message});}
 return json(res,200,{ok:true});}
 const user=identity(token);if(!user)return json(res,401,{error:'Sign in to continue.'});
 if(path==='/api/logout'&&post){logout(token);res.setHeader('Set-Cookie',cookie('')+'; Max-Age=0');return json(res,200,{});}
 if(path==='/api/me'&&!post)return json(res,200,{user,syllabus:syllabus.map(({examples,...lesson})=>lesson)});
 if(path.startsWith('/api/teacher/')){
 if(user.role!=='teacher')return json(res,403,{error:'Teacher access required.'});
 if(path==='/api/teacher/questions'&&!post)return json(res,200,bank(false));
 if(path==='/api/teacher/questions'&&post){atomic(()=>{const id=b.id||randomUUID();if(b.id&&!db.prepare('SELECT id FROM questions WHERE id=?').get(id))throw Error('Unknown question.');save({...b,id});});return json(res,200,{});}
 if(path==='/api/teacher/students'&&!post)return json(res,200,db.prepare("SELECT id,name FROM users WHERE role='student' ORDER BY name").all().map(u=>{const s=load(u.id);return {name:u.name,lanes:s.lanes,weak:s.weak,count:s.placement.seen.length};}));
 }else if(user.role==='student'&&['/api/state','/api/begin','/api/answer'].includes(path)){
 const result=atomic(()=>{const s=load(user.id),rows=bank();let feedback;
 if(path==='/api/begin'&&post)begin(s,b.mode,b.skill,rows);
 else if(path==='/api/answer'&&post)feedback=answer(s,b.input,b.token,rows);
 else if(path!=='/api/state'||post)throw Error('Invalid request.');
 persist(user.id,s);return {...view(s,rows),feedback};});
 return json(res,200,result);}
 return json(res,404,{error:'Not found'});
 }catch(e){return json(res,400,{error:e.message});}
});
server.listen(Number(process.env.PORT||3000),process.env.HOST||'0.0.0.0',()=>console.log('Arabic Studio listening on',server.address().port));
