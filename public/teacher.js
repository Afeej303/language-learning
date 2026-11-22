import {api,el,button,section,field,notice} from './ui.js';
export async function teacher(main,syllabus){
 const [bank,students]=await Promise.all([api('teacher/questions'),api('teacher/students')]);
 const panel=section('Question workshop','ചോദ്യശേഖരം'),form=el('form'),status=el('select'),select=el('select'),edit=el('textarea');
 const options=(select,values)=>values.forEach(([value,label])=>select.append(Object.assign(el('option',label),{value})));
 options(select,[['','Create a question'],...bank.map(q=>[q.id,q.status+' · '+q.level+' · '+q.point+' · '+q.id])]);
 options(status,[['draft','Draft'],['approved','Approved']]);edit.rows=14;
 const example=bank[0]||{language:'ar',skill:'reading',level:syllabus[0].level,unit:syllabus[0].unit,point:syllabus[0].point,difficulty:1,body:{type:'choice',prompt:'Read and choose',ml:'വായിച്ച് തിരഞ്ഞെടുക്കുക',cue:'بَ',options:['ba','bi'],answers:['ba']}};
 function populate(){const q=bank.find(q=>q.id===select.value)||example;const {id,status:st,...rest}=q;edit.value=JSON.stringify(rest,null,2);status.value=select.value?st:'draft';}select.onchange=populate;populate();
 form.append(field('Question',select),field('Question data · JSON',edit),field('Publication status',status),el('button','Save question'));
 form.onsubmit=async e=>{e.preventDefault();try{await api('teacher/questions',{...JSON.parse(edit.value),id:select.value||undefined,status:status.value});await teacher(main,syllabus);notice('Question saved.');}catch(e){notice(e.message);}};
 panel.append(form);const reports=section('Student progress','വിദ്യാർഥികളുടെ പുരോഗതി');
 if(!students.length)reports.append(el('p','No student accounts yet.'));
 for(const s of students){const card=el('article');card.append(el('h3',s.name));
 if(s.lanes)for(const [skill,l] of Object.entries(s.lanes))card.append(el('p',skill+' · '+l.level+' · '+l.passed.length+' units passed'));
 else card.append(el('p','Placement · '+s.count+' answered'));
 card.append(el('small','Weak points · '+(Object.entries(s.weak).filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]).map(x=>x.join(' × ')).join(', ')||'None recorded')));reports.append(card);}
 main.replaceChildren(panel,reports);
}
