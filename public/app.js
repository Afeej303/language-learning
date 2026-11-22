import {api,el,button,section,field,notice,bidi} from './ui.js';
import {teacher} from './teacher.js';
const main=document.querySelector('main'),account=document.querySelector('#account');
const names={reading:'വായന',grammar:'വ്യാകരണം',vocabulary:'പദസമ്പത്ത്',translation:'വിവർത്തനം'};
let syllabus=[],state;
function hero(title,sub){
 const h=el('div',undefined,'hero');h.append(el('p','DARUL HUDA  /  LANGUAGE LAB','eyebrow'),el('h1',title),el('p',sub,'intro'));
 const glyph=bidi('العَرَبِيَّةُ','div');glyph.classList.add('wordmark');glyph.setAttribute('aria-hidden','true');h.append(glyph);return h;
}
function signin(){
 account.replaceChildren();const form=el('form'),name=el('input'),password=el('input');
 name.autocomplete='username';password.type='password';password.autocomplete='current-password';name.required=password.required=true;
 form.append(el('h2','Sign in'),el('p','നിങ്ങളുടെ അക്കൗണ്ടിൽ പ്രവേശിക്കുക','ml'),field('Username · ഉപയോക്തൃനാമം',name),field('Password · പാസ്‌വേഡ്',password),el('button','Sign in →'));
 form.className='login';form.onsubmit=async e=>{e.preventDefault();try{await api('login',{name:name.value,password:password.value});notice('');await boot();}catch(e){notice(e.message);}};
 main.replaceChildren(hero('Arabic Studio','അറബി ഭാഷാപഠനം · Modern Standard Arabic'),form);
}
async function boot(){
 let me;try{me=await api('me');}catch(e){if(e.status!==401)notice('Connect to the college server to sign in.');signin();return;}
 syllabus=me.syllabus;account.replaceChildren(el('span',me.user.name),button('Sign out',async()=>{await api('logout',{});state=null;notice('');signin();},'quiet'));
 if(me.user.role==='teacher')return teacher(main,syllabus);
 state=await api('state');draw();
}
async function start(mode,skill){state=await api('begin',{mode,skill});notice('');draw();}
function learner(){
 const content=[hero('Your learning path','പഠനപാത · '+state.streak+' day streak')];
 if(state.last){const r=state.last;content.push(el('p',r.mode==='placement'?'Placement complete · Your four skill levels are ready.':r.mode+' complete · '+Math.round(r.score*100)+'%'+(r.misses?.length?' · Review: '+r.misses.join(', '):''),'result'));}
 if(!state.lanes){const card=section('Find your starting point','നിങ്ങളുടെ നിലവാരം കണ്ടെത്തുക');card.append(el('p','Answer 20–28 questions. Reading, grammar, vocabulary and translation each get their own starting level.'),button(state.count?'Resume placement':'Start placement',()=>start('placement')));content.push(card);}
 else{
 const grid=el('div',undefined,'grid');
 for(const [skill,l] of Object.entries(state.lanes)){
 const topics=syllabus.filter(p=>p.level===l.level),units=[...new Set(topics.map(p=>p.unit))],unit=units.find(u=>!l.passed.includes(u));
 const card=section(skill[0].toUpperCase()+skill.slice(1),names[skill]);card.prepend(el('strong',l.level,'band'));
 if(unit){const complete=units.filter(u=>l.passed.includes(u)).length;const bar=el('progress');bar.value=complete;bar.max=units.length;bar.setAttribute('aria-label',skill+' unit progress');card.append(bar,el('small',complete+' / '+units.length+' units · '+unit));
 for(const p of topics.filter(p=>p.unit===unit&&(!l.review.length||l.review.includes(p.point)))){const d=el('details');if(l.review.length)d.open=true;d.append(el('summary',p.title),el('p',p.lesson),el('p',p.lessonMl,'ml'));if(p.worked)d.append(bidi(p.worked,'p'));card.append(d);}
 const mode=l.review.length?'review':l.practised===unit?'checkpoint':'practice';card.append(button({review:'Start targeted review',checkpoint:'Take checkpoint',practice:'Start practice'}[mode],()=>start(mode,skill)));
 }else card.append(el('p','A1–B1 path completed.'));grid.append(card);
 }content.push(grid);const vocab=section('Vocabulary review','പദാവർത്തനം');vocab.append(el('p',state.due+' expressions due today'));if(state.due)vocab.append(button('Review due vocabulary',()=>start('vocab')));content.push(vocab);
 }
 main.replaceChildren(...content);
}
function activity(){
 const r=state.run,q=r.q;
 if(!q){const s=section('Question withdrawn','ചോദ്യം പിൻവലിച്ചു');s.append(button('Refresh activity',()=>start(r.mode,r.skill)));return main.replaceChildren(s);}
 const title=r.mode==='placement'?'Placement test':r.mode[0].toUpperCase()+r.mode.slice(1);
 const s=section(q.prompt,q.ml),bar=el('progress');bar.value=r.mode==='placement'?state.count:r.done;bar.max=r.mode==='placement'?28:r.total;bar.setAttribute('aria-label','Activity progress');
 s.prepend(el('small',q.skill.toUpperCase()+'  /  '+q.level,'eyebrow'));s.append(bidi(q.cue,'blockquote'));
 const form=el('form');let read;
 if(q.type==='choice'){for(const opt of q.options){const label=el('label',undefined,'choice'),input=el('input');input.type='radio';input.name='choice';input.required=true;input.value=opt;label.append(input,bidi(opt));form.append(label);}read=()=>form.querySelector(':checked').value;}
 else if(q.type==='match'){const selects=q.left.map(left=>{const select=el('select');select.required=true;select.dir='auto';select.append(Object.assign(el('option','Choose meaning'),{value:''}));for(const x of q.right)select.append(Object.assign(el('option',x),{value:x}));form.append(field(left,select));return select;});read=()=>selects.map(x=>x.value);}
 else if(q.type==='reorder'){
 const tokens=el('div',undefined,'tokens'),line=bidi('','p'),indices=[];tokens.dir='rtl';line.dir='rtl';line.className='assembled';const buttons=[];
 function render(){line.textContent=indices.map(i=>q.options[i]).join(' ');buttons.forEach((b,i)=>b.hidden=indices.includes(i));}
 q.options.forEach((x,i)=>{const b=button(x,()=>{indices.push(i);render();},'quiet');buttons.push(b);tokens.append(b);});form.append(line,tokens,button('Undo last word',()=>{indices.pop();render();},'quiet'));read=()=>{if(indices.length!==q.options.length)throw Error('Use every word.');return line.textContent;};}
 else{const input=el('input');input.required=true;input.dir='auto';input.maxLength=1000;input.autocomplete='off';form.append(field('Your answer · ഉത്തരം',input));read=()=>input.value;}
 const submit=el('button','Submit answer');form.append(submit);form.onsubmit=async e=>{e.preventDefault();submit.disabled=true;try{
 state=await api('answer',{input:read(),token:r.token});notice('');
 const f=state.feedback;const box=section(f.ok?'Correct':'Answer recorded',f.ok?'ശരിയാണ്':'ഉത്തരം രേഖപ്പെടുത്തി');if(!f.ok&&f.solution)box.append(el('small','Accepted answer'),bidi(f.solution,'p'));box.append(button('Continue →',draw));main.replaceChildren(box);
 }catch(e){notice(e.message);submit.disabled=false;}};
 s.append(form);main.replaceChildren(el('h1',title),el('p',r.mode==='placement'?'Question '+(state.count+1)+' · up to 28':'Question '+(r.done+1)+' of '+r.total),bar,s);
}
function draw(){notice('');if(state.run)activity();else learner();window.scrollTo(0,0);}
boot().catch(e=>notice(e.message));
if('serviceWorker'in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});
