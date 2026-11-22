import {readFileSync} from 'node:fs';
import {randomInt} from 'node:crypto';
import {db} from './db.js';
export const syllabus=JSON.parse(readFileSync(new URL('../content/syllabus.json',import.meta.url)));
export const levels=['A1','A2','B1','B2','C1','C2'];
export const skills=['reading','grammar','vocabulary','translation'];
export const types=['choice','blank','reorder','match','translation'];
export function shuffle(items){const a=[...items];for(let i=a.length-1;i>0;i--){const j=randomInt(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
export function validate(q){
 const str=x=>typeof x==='string'&&x.trim().length>0&&x.length<=1000;
 const list=x=>Array.isArray(x)&&x.length>0&&x.length<=24&&x.every(str);
 const b=q.body;
 if(q.language!=='ar'||!skills.includes(q.skill)||!syllabus.some(p=>p.point===q.point&&p.unit===q.unit&&p.level===q.level)||!Number.isInteger(q.difficulty)||q.difficulty<1||q.difficulty>5||!['draft','approved'].includes(q.status)||!b||!types.includes(b.type)||![b.prompt,b.ml,b.cue].every(str)||!list(b.answers))throw Error('Check tags, difficulty (1–5), bilingual prompts, cue and answers.');
 if(b.type==='choice'&&(!list(b.options)||new Set(b.options).size<2||!b.answers.every(a=>b.options.includes(a))))throw Error('Choices must include an accepted answer and a distractor.');
 if(b.type==='reorder'&&b.answers[0].split(/\s+/).length<2)throw Error('Reorder needs two or more words.');
 if(b.type==='match'&&(!Array.isArray(b.pairs)||b.pairs.length<2||b.pairs.length>8||!b.pairs.every(p=>Array.isArray(p)&&p.length===2&&p.every(str))||[0,1].some(i=>new Set(b.pairs.map(p=>p[i])).size!==b.pairs.length)))throw Error('Use distinct matching pairs.');
}
export function save(q){validate(q);db.prepare('INSERT OR REPLACE INTO questions VALUES(?,?,?,?,?,?,?,?,?)').run(q.id,q.language,q.skill,q.level,q.unit,q.point,q.difficulty,q.status,JSON.stringify(q.body));}
export function bank(approved=true){return db.prepare('SELECT * FROM questions'+(approved?" WHERE status='approved' AND language='ar'":"")).all().map(q=>({...q,body:JSON.parse(q.body)}));}
export function visible(q){
 const {type,prompt,ml,cue,options,pairs,answers}=q.body;
 return {id:q.id,type,prompt,ml,cue,skill:q.skill,level:q.level,point:q.point,options:type==='choice'?shuffle(options):type==='reorder'?shuffle(answers[0].split(/\s+/)):undefined,left:type==='match'?pairs.map(p=>p[0]):undefined,right:type==='match'?shuffle(pairs.map(p=>p[1])):undefined};
}
