import { randomUUID } from 'node:crypto';
import { save, validate, bank } from './content.js';
import { atomic } from './db.js';

export const columns = ['language','skill','level','unit','point','difficulty','type','prompt','ml','cue','answers','options','pairs','explanation','explanationMl'];
export const template = columns.join(',') + '\n' + ['ar','grammar','A1','sentences','nominal',1,'choice','Choose the noun','اختر الاسم','هذا طالب','طالب | teacher','طالب\nteacher','', '', ''].map(csvCell).join(',') + '\n';
function csvCell(value) { const s = String(value ?? ''); return /[",\n\r]/.test(s) ? '"' + s.replaceAll('"','""') + '"' : s; }
export function parseCsv(text) {
  const rows=[]; let row=[], cell='', quoted=false;
  for(let i=0;i<text.length;i++) { const c=text[i]; if(quoted) { if(c==='"'&&text[i+1]==='"'){cell+='"';i++;} else if(c==='"') quoted=false; else cell+=c; } else if(c==='"'&&cell==='') quoted=true; else if(c===','){row.push(cell);cell='';} else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);rows.push(row);row=[];cell='';} else cell+=c; }
  if(quoted) throw Error('CSV has an unterminated quoted field.'); if(cell||row.length){row.push(cell);rows.push(row);} return rows;
}
export function importCsv(text) {
  const rows=parseCsv(text), header=rows.shift()?.map(x=>x.trim());
  if(!header || columns.some(c=>!header.includes(c)) || header.some(c=>!columns.includes(c))) throw Error('CSV header must contain exactly: '+columns.join(', '));
  const report=[];
  rows.forEach((cells,index)=>{ const rowNumber=index+2; if(cells.every(x=>!x.trim())) return; try {
    if(cells.length!==header.length) throw Error('Expected '+header.length+' columns, got '+cells.length+'.');
    const r=Object.fromEntries(header.map((k,i)=>[k,cells[i]])), split=s=>s.split(/\n/).map(x=>x.trim()).filter(Boolean);
    const body={type:r.type,prompt:r.prompt,ml:r.ml,cue:r.cue,answers:split(r.answers),explanation:r.explanation,explanationMl:r.explanationMl};
    if(r.options) body.options=split(r.options); if(r.pairs) body.pairs=split(r.pairs).map(x=>x.split('|').map(y=>y.trim()));
    if(body.type==='match') body.answers=body.pairs.map(p=>p[1]);
    const q={id:randomUUID(),language:r.language,skill:r.skill,level:r.level,unit:r.unit,point:r.point,difficulty:Number(r.difficulty),status:'draft',body}; validate(q); save(q); report.push({row:rowNumber,ok:true,id:q.id});
  } catch(e){ report.push({row:rowNumber,ok:false,error:e.message}); }});
  return report;
}
export function exportCsv(questions=bank(false)) {
  return columns.map(csvCell).join(',')+'\n'+questions.map(q=>{const b=q.body;return [q.language,q.skill,q.level,q.unit,q.point,q.difficulty,b.type,b.prompt,b.ml,b.cue,(b.answers||[]).join('\n'),(b.options||[]).join('\n'),(b.pairs||[]).map(p=>p.join('|')).join('\n'),b.explanation||'',b.explanationMl||''].map(csvCell).join(',')}).join('\n')+'\n';
}
