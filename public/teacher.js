import { api, el, section, field, notice } from './ui.js';
function dropdown(entries) {
  const select = el('select');
  for (const [value, label] of entries) {
    select.append(Object.assign(el('option', label), {
      value
    }));
  }
  return select;
}
const choices = values => dropdown(values.map(v => [v, v]));
const lines = input => input.value.split('\n').map(x => x.trim()).filter(Boolean);
const area = () => Object.assign(el('textarea'), {
  rows: 3,
  dir: 'auto'
});
export async function teacher(main, syllabus) {
  const [bank, students, wrongAnswers] = await Promise.all([api('teacher/questions'), api('teacher/students'), api('teacher/wrong-answers')]);
  const workshop = section('Question workshop', 'ചോദ്യശേഖരം');
  const tools = el('div');
  for (const [label, url] of [['Download CSV template','teacher/questions/template'],['Export full question bank','teacher/questions/export']]) {
    const link=el('a',label); link.href='/api/'+url; link.download=''; tools.append(link,el('span',' · '));
  }
  const upload=Object.assign(el('input'),{type:'file',accept:'.csv,text/csv'}), importButton=el('button','Import CSV'); importButton.type='button';
  importButton.onclick=async()=>{ try { if(!upload.files[0]) throw Error('Choose a CSV file.'); const result=await api('teacher/questions/import',{csv:await upload.files[0].text()}); const errors=result.rows.filter(r=>!r.ok).map(r=>'Row '+r.row+': '+r.error); notice('Imported '+result.imported+' draft questions.'+(errors.length?' '+errors.join(' | '):'')); await teacher(main,syllabus); } catch(e){notice(e.message)} };
  tools.append(upload,importButton);
  const form = el('form');
  const questionLabel = q => `${q.status} · ${q.level} · ${q.skill} · ${q.body.cue}${q.approved_by_name ? ` · approved by ${q.approved_by_name} (${new Date(q.approved_at).toLocaleString()})` : ''}`;
  const picker = dropdown([['', 'Create a question'], ...bank.map(q => [q.id, questionLabel(q)])]);
  const point = dropdown(syllabus.map(p => [p.point, p.level + ' / ' + p.unit + ' / ' + p.title]));
  const skill = choices(['reading', 'grammar', 'vocabulary', 'translation']);
  const type = choices(['choice', 'blank', 'reorder', 'match', 'translation']);
  const status = dropdown([['draft','draft'],['in_review','in review'],['approved','approved']]);
  const difficulty = Object.assign(el('input'), {
    type: 'number',
    min: 1,
    max: 5,
    required: true
  });
  const [prompt, ml, cue, answers, options, pairs, explanation, explanationMl] = Array.from({
    length: 8
  }, area);
  const optionField = field('Choices · one per line', options);
  const pairsField = field('Pairs · Arabic | meaning, one pair per line', pairs);
  const answerField = field('Accepted answers · one per line (use multiple lines for translation alternatives)', answers);
  function format() {
    optionField.hidden = type.value !== 'choice';
    pairsField.hidden = type.value !== 'match';
    answerField.hidden = type.value === 'match';
  }
  function populate() {
    const q = bank.find(q => q.id === picker.value);
    const b = q?.body || {};
    point.value = q?.point || syllabus[0].point;
    skill.value = q?.skill || 'reading';
    status.value = q?.status || 'draft';
    difficulty.value = q?.difficulty || 1;
    type.value = b.type || 'choice';
    prompt.value = b.prompt || '';
    ml.value = b.ml || '';
    cue.value = b.cue || '';
    answers.value = b.answers?.join('\n') || '';
    options.value = b.options?.join('\n') || '';
    pairs.value = b.pairs?.map(p => p.join(' | ')).join('\n') || '';
    explanation.value = b.explanation || '';
    explanationMl.value = b.explanationMl || '';
    format();
  }
  picker.onchange = populate;
  type.onchange = format;
  populate();
  const statusFilter = dropdown([['all','All statuses'],['draft','Draft'],['in_review','In review'],['approved','Approved']]);
  statusFilter.onchange = () => { picker.replaceChildren(Object.assign(el('option','Create a question'),{value:''}), ...bank.filter(q=>statusFilter.value==='all'||q.status===statusFilter.value).map(q=>Object.assign(el('option',questionLabel(q)),{value:q.id}))); picker.value=''; populate(); };
  form.append(field('Filter question status', statusFilter), field('Select question · ചോദ്യം', picker), field('Syllabus point', point), field('Skill', skill), field('Format', type), field('Difficulty · 1 to 5', difficulty), field('English instruction', prompt), field('Malayalam instruction', ml), field('Text to present', cue), optionField, pairsField, answerField, field('Explanation in English (optional)', explanation), field('Explanation in Malayalam (optional)', explanationMl), field('Publication status', status), el('button', 'Save question'));
  form.onsubmit = async event => {
    event.preventDefault();
    try {
      const p = syllabus.find(p => p.point === point.value);
      const body = {
        type: type.value,
        prompt: prompt.value,
        ml: ml.value,
        cue: cue.value,
        explanation: explanation.value.trim(),
        explanationMl: explanationMl.value.trim(),
        answers: lines(answers)
      };
      if (p.point === 'letters' && body.answers.some(a => /[َُِ]/u.test(a))) body.requireVowels = true;
      if (type.value === 'choice') body.options = lines(options);
      if (type.value === 'match') {
        body.pairs = lines(pairs).map(line => line.split('|').map(x => x.trim()));
        body.answers = body.pairs.map(p => p[1]);
      }
      await api('teacher/questions', {
        id: picker.value || undefined,
        language: 'ar',
        level: p.level,
        unit: p.unit,
        point: p.point,
        skill: skill.value,
        status: status.value,
        difficulty: Number(difficulty.value),
        body
      });
      await teacher(main, syllabus);
      notice('Question saved · ചോദ്യം സംരക്ഷിച്ചു');
    } catch (e) {
      notice(e.message);
    }
  };
  workshop.append(tools,form);
  const errorReview = section('Common wrong answers', 'പതിവായി തെറ്റുന്ന ഉത്തരങ്ങൾ');
  if (!wrongAnswers.length) errorReview.append(el('p', 'No wrong answers recorded yet.'));
  for (const row of wrongAnswers) {
    const item = el('article');
    item.append(el('p', `${row.point} · ${row.cue} · “${row.raw_answer}” × ${row.count}`));
    const accept = el('button', 'Accept this answer');
    accept.type = 'button';
    accept.onclick = async () => {
      try {
        await api('teacher/wrong-answers/accept', { question_id: row.question_id, answer: row.raw_answer });
        notice('Accepted answer added.');
        await teacher(main, syllabus);
      } catch (e) { notice(e.message); }
    };
    item.append(accept);
    errorReview.append(item);
  }
  const dashboard = section('Class dashboard', 'ക്ലാസ് പുരോഗതി');
  const grammarRows = [];
  if (!students.length) dashboard.append(el('p', 'No student accounts yet.'));
  for (const student of students) {
    const card = el('article');
    card.append(el('h3', student.name));
    if (student.lanes) {
      for (const [skill, lane] of Object.entries(student.lanes)) {
        card.append(el('p', `${skill}: ${lane.level} · ${lane.passed.length} units passed`));
      }
    } else card.append(el('p', `Placement in progress · ${student.count} answered`));
    card.append(el('p', 'Last activity · ' + (student.lastActivity ? new Date(student.lastActivity).toLocaleString() : 'No answers yet')));
    const performance = student.performance || {};
    const skillNames = { reading: 'Reading', grammar: 'Grammar', vocabulary: 'Vocabulary', translation: 'Translation' };
    for (const [skill, points] of Object.entries(performance)) {
      const stats = Object.entries(points).map(([point, stat]) => `${point}: ${Math.round(stat.correct / stat.total * 100)}% (${stat.correct}/${stat.total})`);
      if (stats.length) card.append(el('p', `${skillNames[skill] || skill} accuracy · ${stats.join(' · ')}`));
    }
    if (!Object.values(performance).some(points => Object.keys(points).length)) card.append(el('p', 'No answers yet.'));
    const weak = Object.entries(student.weak || {}).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
    card.append(el('small', 'Weak points · ' + (weak.map(([p, n]) => p + ' × ' + n).join(', ') || 'None recorded')));
    for (const [point, stat] of Object.entries(performance.grammar || {})) {
      const row = grammarRows.find(x => x.point === point) || { point, total: 0, correct: 0 };
      row.total += stat.total;
      row.correct += stat.correct;
      if (!grammarRows.some(x => x.point === point)) grammarRows.push(row);
    }
    dashboard.append(card);
  }
  const weakest = grammarRows.filter(x => x.total).sort((a,b) => a.correct/a.total - b.correct/b.total).slice(0, 5);
  dashboard.append(el('h3', 'Class weakest grammar points'));
  dashboard.append(el('p', weakest.length ? weakest.map(x => `${x.point} · ${Math.round(x.correct/x.total*100)}% (${x.correct}/${x.total})`).join(' · ') : 'No grammar activity yet.'));
  main.replaceChildren(workshop, errorReview, dashboard);
}
