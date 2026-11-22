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
  const [bank, students] = await Promise.all([api('teacher/questions'), api('teacher/students')]);
  const workshop = section('Question workshop', 'ചോദ്യശേഖരം');
  const form = el('form');
  const picker = dropdown([['', 'Create a question'], ...bank.map(q => [q.id, q.status + ' · ' + q.level + ' · ' + q.skill + ' · ' + q.body.cue])]);
  const point = dropdown(syllabus.map(p => [p.point, p.level + ' / ' + p.unit + ' / ' + p.title]));
  const skill = choices(['reading', 'grammar', 'vocabulary', 'translation']);
  const type = choices(['choice', 'blank', 'reorder', 'match', 'translation']);
  const status = choices(['draft', 'approved']);
  const difficulty = Object.assign(el('input'), {
    type: 'number',
    min: 1,
    max: 5,
    required: true
  });
  const [prompt, ml, cue, answers, options, pairs] = Array.from({
    length: 6
  }, area);
  const optionField = field('Choices · one per line', options);
  const pairsField = field('Pairs · Arabic | meaning, one pair per line', pairs);
  const answerField = field('Accepted answers · one per line', answers);
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
    format();
  }
  picker.onchange = populate;
  type.onchange = format;
  populate();
  form.append(field('Select question · ചോദ്യം', picker), field('Syllabus point', point), field('Skill', skill), field('Format', type), field('Difficulty · 1 to 5', difficulty), field('English instruction', prompt), field('Malayalam instruction', ml), field('Text to present', cue), optionField, pairsField, answerField, field('Publication status', status), el('button', 'Save question'));
  form.onsubmit = async event => {
    event.preventDefault();
    try {
      const p = syllabus.find(p => p.point === point.value);
      const body = {
        type: type.value,
        prompt: prompt.value,
        ml: ml.value,
        cue: cue.value,
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
  workshop.append(form);
  const reports = section('Student progress', 'വിദ്യാർഥികളുടെ പുരോഗതി');
  if (!students.length) reports.append(el('p', 'No student accounts yet.'));
  for (const student of students) {
    const card = el('article');
    card.append(el('h3', student.name));
    if (student.lanes) {
      for (const [skill, lane] of Object.entries(student.lanes)) {
        card.append(el('p', skill + ' · ' + lane.level + ' · ' + lane.passed.length + ' units passed'));
      }
    } else card.append(el('p', 'Placement · ' + student.count + ' answered'));
    const weak = Object.entries(student.weak).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
    card.append(el('small', 'Weak points · ' + (weak.map(([p, n]) => p + ' × ' + n).join(', ') || 'None recorded')));
    reports.append(card);
  }
  main.replaceChildren(workshop, reports);
}
