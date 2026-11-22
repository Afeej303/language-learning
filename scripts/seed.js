import {syllabus,skills,save} from '../src/content.js';
import {db,atomic} from '../src/db.js';
atomic(()=>{for(const p of syllabus)for(const [i,[ar,en,ml,word]] of p.examples.entries())for(const skill of skills){
 const id=[p.point,i,skill].join('-');
 if(db.prepare('SELECT id FROM questions WHERE id=?').get(id))continue;
 let body;
 if(skill==='reading')body={type:'choice',prompt:'Read and choose the meaning',ml:'വായിച്ച് അർഥം തിരഞ്ഞെടുക്കുക',cue:ar,options:p.examples.map(e=>e[1]),answers:[en]};
 if(skill==='grammar')body=i===1&&ar.includes(' ')?{type:'reorder',prompt:'Build the Arabic sentence',ml:'വാക്കുകൾ ക്രമപ്പെടുത്തുക',cue:en,answers:[ar]}:{type:'blank',prompt:'Supply the missing Arabic form',ml:'വിട്ടുപോയ അറബി രൂപം എഴുതുക',cue:ar.replace(word,'____')+' · '+en,answers:[word]};
 if(skill==='vocabulary')body=i===2?{type:'match',prompt:'Match each Arabic expression',ml:'അറബി പ്രയോഗങ്ങളുടെ അർഥം യോജിപ്പിക്കുക',cue:p.title,pairs:p.examples.map(e=>[e[0],e[2]]),answers:[ml]}:{type:'choice',prompt:'Choose the Arabic expression',ml:'അറബി പ്രയോഗം തിരഞ്ഞെടുക്കുക',cue:ml,options:p.examples.map(e=>e[0]),answers:[ar]};
 if(skill==='translation'){const dir=(syllabus.indexOf(p)+i)%4;body={type:'translation',prompt:'Write in '+['English','Malayalam','Arabic','Arabic'][dir],ml:['ഇംഗ്ലീഷിൽ എഴുതുക','മലയാളത്തിൽ എഴുതുക','അറബിയിൽ എഴുതുക','അറബിയിൽ എഴുതുക'][dir],cue:[ar,ar,en,ml][dir],answers:[[en],[ml],[ar],[ar]][dir]};}
 save({id,language:'ar',skill,level:p.level,unit:p.unit,point:p.point,difficulty:i+1,status:'draft',body});
}});
console.log('Question count:',db.prepare('SELECT count(*) n FROM questions').get().n);
