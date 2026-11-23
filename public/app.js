import { api, el, button, section, field, notice, bidi } from './ui.js';
import { teacher } from './teacher.js';
const main = document.querySelector('main'),
  account = document.querySelector('#account');
const names = {
  reading: 'വായന',
  grammar: 'വ്യാകരണം',
  vocabulary: 'പദസമ്പത്ത്',
  translation: 'വിവർത്തനം'
};
let syllabus = [],
  state,
  pendingControllerReload = false,
  reloadedForController = false;
function hero(title, sub) {
  const h = el('div', undefined, 'hero');
  h.append(el('p', 'DARUL HUDA  /  LANGUAGE LAB', 'eyebrow'), el('h1', title), el('p', sub, 'intro'));
  const glyph = bidi('العَرَبِيَّةُ', 'div');
  glyph.classList.add('wordmark');
  glyph.setAttribute('aria-hidden', 'true');
  h.append(glyph);
  return h;
}
function signin() {
  account.replaceChildren();
  const form = el('form'),
    name = el('input'),
    password = el('input');
  name.autocomplete = 'username';
  password.type = 'password';
  password.autocomplete = 'current-password';
  name.required = password.required = true;
  form.append(el('h2', 'Sign in'), el('p', 'നിങ്ങളുടെ അക്കൗണ്ടിൽ പ്രവേശിക്കുക', 'ml'), field('Username · ഉപയോക്തൃനാമം', name), field('Password · പാസ്‌വേഡ്', password), el('button', 'Sign in →'));
  form.className = 'login';
  form.onsubmit = async e => {
    e.preventDefault();
    try {
      await api('login', {
        name: name.value,
        password: password.value
      });
      notice('');
      await boot();
    } catch (e) {
      notice(e.message);
    }
  };
  const welcome = hero('Arabic Studio', 'അറബി ഭാഷാപഠനം · Modern Standard Arabic');
  welcome.classList.add('signin-hero');
  const layout = el('div', undefined, 'signin-layout');
  layout.append(welcome, form);
  main.replaceChildren(layout);
}
async function boot() {
  let me;
  try {
    me = await api('me');
  } catch (e) {
    if (e.status !== 401) notice('Connect to the college server to sign in.');
    signin();
    return;
  }
  syllabus = me.syllabus;
  account.replaceChildren(el('span', me.user.name), button('Sign out', async () => {
    await api('logout', {});
    state = null;
    notice('');
    signin();
  }, 'quiet'));
  if (me.user.role === 'teacher') return teacher(main, syllabus);
  state = await api('state');
  learner();
}
async function start(mode, skill) {
  try {
    state = await api('begin', { mode, skill });
    notice('');
    activity();
  } catch (e) {
    notice(e.message);
  }
}
function learner() {
  const welcome = hero('Your learning path', 'പഠനപാത · ' + state.streak + ' day streak');
  welcome.classList.add('path-hero');
  const content = [welcome];
  const overview = el('div', undefined, 'overview-strip');
  const metric = (label, value, note, cls = '') => {
    const item = el('div', undefined, `overview-metric ${cls}`.trim());
    item.append(el('span', label, 'metric-label'), el('strong', value, 'metric-value'));
    if (note) item.append(el('small', note, 'metric-note'));
    return item;
  };
  overview.append(metric('Daily streak', `${state.streak} ${state.streak === 1 ? 'day' : 'days'}`, 'Keep your study habit going', 'metric-streak'));
  overview.append(metric('Vocabulary due', String(state.due), state.due ? 'Ready for review' : 'Nothing due today', 'metric-due'));
  if (state.lanes) {
    for (const [skill, lane] of Object.entries(state.lanes)) {
      overview.append(metric(`${skill[0].toUpperCase()}${skill.slice(1)} level`, lane.level, names[skill], 'metric-level'));
    }
  }
  content.push(overview);
  if (state.run) {
    const r=state.run;
    const activityName=r.mode==='placement'?'placement':`${r.mode}${r.skill ? ' · '+r.skill : ''}`;
    const resume=section('Continue where you left off','തുടരാനുള്ള പ്രവർത്തനം');
    resume.classList.add('resume-panel');
    resume.append(el('p',`Your ${activityName} is still open at question ${r.current} of ${r.mode==='placement'?'up to ':''}${r.total}.`),button(`Resume ${activityName} · question ${r.current} of ${r.total}`,activity));
    content.push(resume);
  }
  if (state.last) {
    const r = state.last;
    content.push(el('p', r.mode === 'placement' ? 'Placement complete · Your four skill levels are ready.' : r.mode + ' complete · ' + Math.round(r.score * 100) + '%' + (r.misses?.length ? ' · Review: ' + r.misses.join(', ') : ''), 'result'));
  }
  if (!state.lanes) {
    const card = section('Find your starting point', 'നിങ്ങളുടെ നിലവാരം കണ്ടെത്തുക');
    card.classList.add('placement-panel');
    card.append(el('p', 'Answer 20–28 questions. Reading, grammar, vocabulary and translation each get their own starting level.'), button(state.count ? 'Resume placement' : 'Start placement', () => start('placement')));
    content.push(card);
  } else {
    const pathLayout = el('div', undefined, 'learning-layout');
    const pathMain = el('div', undefined, 'curriculum-main');
    const grid = el('div', undefined, 'skill-grid');
    for (const [skill, l] of Object.entries(state.lanes)) {
      const topics = syllabus.filter(p => p.level === l.level),
        units = [...new Set(topics.map(p => p.unit))],
        unit = units.find(u => !l.passed.includes(u));
      const card = section(skill[0].toUpperCase() + skill.slice(1), names[skill]);
      card.classList.add('skill-lane', `skill-${skill}`);
      card.prepend(el('strong', l.level, 'band'));
      if (unit) {
        const complete = units.filter(u => l.passed.includes(u)).length;
        const bar = el('progress');
        bar.value = complete;
        bar.max = units.length;
        bar.setAttribute('aria-label', skill + ' unit progress');
        const progressHeader = el('div', undefined, 'unit-progress-header');
        progressHeader.append(el('small', `${complete} of ${units.length} units complete`, 'progress-copy'), el('span', unit, 'current-unit'));
        card.append(bar, progressHeader);
        for (const p of topics.filter(p => p.unit === unit && (!l.review.length || l.review.includes(p.point)))) {
          const d = el('details');
          d.className = 'lesson-disclosure';
          if (l.review.length) d.open = true;
          d.append(el('summary', p.title), el('p', p.lesson), el('p', p.lessonMl, 'ml'));
          if (p.worked) {
            const worked = el('div', undefined, 'worked-example');
            worked.append(el('small', 'Worked example'), bidi(p.worked, 'p'));
            d.append(worked);
          }
          card.append(d);
        }
        const mode = l.review.length ? 'review' : l.practised === unit ? 'checkpoint' : 'practice';
        card.append(button({
          review: 'Start targeted review',
          checkpoint: 'Take checkpoint',
          practice: 'Start practice'
        }[mode], () => start(mode, skill), 'lane-action'));
      } else card.append(el('p', 'A1–B1 path completed.', 'path-complete'));
      grid.append(card);
    }
    const bandHeading = el('div', undefined, 'section-heading');
    bandHeading.append(el('p', 'Your curriculum', 'eyebrow'), el('h2', 'Learning by skill'), el('p', 'Each skill keeps its own level and progress.', 'section-intro'));
    pathMain.append(bandHeading, grid);
    const aside = el('aside', undefined, 'learning-aside');
    const vocab = section('Vocabulary review', 'പദാവർത്തനം');
    vocab.classList.add('aside-panel', 'vocab-panel');
    vocab.append(el('strong', `${state.due} expressions due`, 'aside-count'));
    if (state.due) vocab.append(button('Review due vocabulary', () => start('vocab')));
    else vocab.append(el('p', 'New words will appear here when they are due.'));
    aside.append(vocab);
    const weakRows = Object.entries(state.weak || {}).filter(([, count]) => count > 0).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const diagnostic = section('Topics to revisit', 'വീണ്ടും പരിശീലിക്കാവുന്ന വിഷയങ്ങൾ');
    diagnostic.classList.add('aside-panel', 'diagnostic-panel');
    if (weakRows.length) {
      const list = el('ul', undefined, 'weak-list');
      weakRows.forEach(([point, count]) => {
        const row = el('li');
        row.append(el('span', point), el('strong', `${count} ${count === 1 ? 'miss' : 'misses'}`));
        list.append(row);
      });
      diagnostic.append(list);
    } else diagnostic.append(el('p', 'No topics need extra review right now.'));
    aside.append(diagnostic);
    pathLayout.append(pathMain, aside);
    content.push(pathLayout);
  }
  main.replaceChildren(...content);
}
function activity() {
  const r = state.run,
    q = r.q;
  if (!q) {
    const s = section('Question withdrawn', 'ചോദ്യം പിൻവലിച്ചു');
    s.classList.add('withdrawn-panel');
    s.append(button('Exit to home', learner, 'quiet'), button('Refresh activity', () => start(r.mode, r.skill)));
    return main.replaceChildren(s);
  }
  const title = r.mode === 'placement' ? 'Placement test' : r.mode[0].toUpperCase() + r.mode.slice(1);
  const lesson = syllabus.find(p => p.point === q.point);
  const workspace = el('div', undefined, 'practice-workspace');
  const exerciseColumn = el('div', undefined, 'exercise-column');
  const contextColumn = el('aside', undefined, 'exercise-context');
  const activityHeader = el('div', undefined, 'activity-header');
  const titleBlock = el('div', undefined, 'activity-title-block');
  titleBlock.append(el('p', `${q.level} · ${q.skill}`, 'eyebrow'), el('h1', title), el('p', q.point));
  const progressBlock = el('div', undefined, 'activity-progress');
  progressBlock.append(el('span', `Question ${r.mode === 'placement' ? state.count + 1 : r.done + 1} of ${r.total}`, 'progress-label'));
  const bar = el('progress');
  bar.value = r.mode === 'placement' ? state.count : r.done;
  bar.max = r.mode === 'placement' ? 28 : r.total;
  bar.setAttribute('aria-label', 'Activity progress');
  progressBlock.append(bar);
  const exit = button('Exit to home', learner, 'quiet activity-exit');
  exit.type = 'button';
  activityHeader.append(titleBlock, progressBlock, exit);
  const s = section(q.prompt, q.ml);
  s.classList.add('exercise-card');
  s.append(bidi(q.cue, 'blockquote'));
  const answerArea = el('div', undefined, 'answer-area');
  const form = el('form');
  form.dataset.answerForm = 'true';
  form.addEventListener('input', () => { form.dataset.answerDirty = 'true'; });
  form.addEventListener('change', () => { form.dataset.answerDirty = 'true'; });
  form.addEventListener('click', event => {
    if (event.target.closest('button') && !event.target.closest('button').type?.includes('submit')) form.dataset.answerDirty = 'true';
  });
  let read;
  if (q.type === 'choice') {
    const options = q.options || [];
    const longEnglish = options.some(opt => /[A-Za-z]{2,}/u.test(opt) && opt.trim().length >= 34);
    const shortArabic = options.length > 0 && options.every(opt => /\p{Script=Arabic}/u.test(opt) && opt.trim().length <= 20);
    const grid = el('div', undefined, `choice-grid${longEnglish ? ' choice-grid--sentences' : ''}${shortArabic ? ' choice-grid--arabic' : ''}`);
    grid.setAttribute('role', 'radiogroup');
    grid.setAttribute('aria-label', q.prompt);
    options.forEach((opt, index) => {
      const label = el('label', undefined, 'choice-tile'),
        input = el('input'),
        marker = el('span', String(index + 1), 'choice-number');
      input.type = 'radio';
      input.className = 'choice-radio';
      input.name = 'choice';
      input.required = true;
      input.value = opt;
      input.setAttribute('aria-label', `${index + 1}: ${opt}`);
      label.append(input, marker, bidi(opt, 'span'));
      grid.append(label);
    });
    answerArea.append(grid);
    form.addEventListener('keydown', event => {
      if (!/^[1-5]$/.test(event.key) || event.altKey || event.ctrlKey || event.metaKey) return;
      const field = event.target;
      if (field instanceof HTMLInputElement && field.type !== 'radio' || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement) return;
      const radio = grid.querySelectorAll('input[type="radio"]')[Number(event.key) - 1];
      if (!radio) return;
      event.preventDefault();
      radio.checked = true;
      radio.focus();
      radio.dispatchEvent(new Event('change', { bubbles: true }));
    });
    read = () => form.querySelector(':checked').value;
  } else if (q.type === 'match') {
    const selects = q.left.map(left => {
      const select = el('select');
      select.required = true;
      select.dir = 'auto';
      select.append(Object.assign(el('option', 'Choose meaning'), {
        value: ''
      }));
      for (const x of q.right) select.append(Object.assign(el('option', x), {
        value: x
      }));
      answerArea.append(field(left, select));
      return select;
    });
    read = () => selects.map(x => x.value);
  } else if (q.type === 'reorder') {
    const tokens = el('div', undefined, 'tokens'),
      line = bidi('', 'p'),
      indices = [];
    tokens.dir = 'rtl';
    line.dir = 'rtl';
    line.className = 'assembled';
    const buttons = [];
    function render() {
      line.textContent = indices.map(i => q.options[i]).join(' ');
      buttons.forEach((b, i) => b.hidden = indices.includes(i));
    }
    q.options.forEach((x, i) => {
      const b = button(x, () => {
        indices.push(i);
        render();
      }, 'quiet');
      buttons.push(b);
      tokens.append(b);
    });
    answerArea.append(line, tokens, button('Undo last word', () => {
      indices.pop();
      render();
    }, 'quiet'));
    read = () => {
      if (indices.length !== q.options.length) throw Error('Use every word.');
      return line.textContent;
    };
  } else {
    const input = el('input');
    input.required = true;
    input.dir = 'auto';
    input.maxLength = 1000;
    input.autocomplete = 'off';
    answerArea.append(field('Your answer · ഉത്തരം', input));
    read = () => input.value;
  }
  const submit = el('button', 'Submit answer');
  submit.classList.add('answer-submit');
  answerArea.append(submit);
  form.append(answerArea);
  form.onsubmit = async e => {
    e.preventDefault();
    submit.disabled = true;
    try {
      state = await api('answer', {
        input: read(),
        token: r.token
      });
      notice('');
      const f = state.feedback;
      const box = section(f.ok ? 'Correct' : 'Answer recorded', f.ok ? 'ശരിയാണ്' : 'ഉത്തരം രേഖപ്പെടുത്തി');
      box.classList.add('answer-feedback', f.ok ? 'feedback-correct' : 'feedback-wrong');
      if (!f.ok && f.solution) box.append(el('small', 'Accepted answer'), bidi(f.solution, 'p'));
      if (!f.ok && f.explanation?.en) box.append(el('p', f.explanation.en));
      if (!f.ok && f.explanation?.ml) box.append(bidi(f.explanation.ml, 'p'));
      box.append(button('Continue →', () => {
        if (pendingControllerReload && !reloadedForController) {
          reloadedForController = true;
          window.location.reload();
          return;
        }
        state.run ? activity() : learner();
      }));
      main.replaceChildren(box);
    } catch (e) {
      notice(e.message);
      submit.disabled = false;
    }
  };
  s.append(form);
  exerciseColumn.append(activityHeader, s);
  if (lesson) {
    const rule = section('Grammar rule', 'വ്യാകരണ നിയമം');
    rule.classList.add('context-rule');
    if (lesson.worked) rule.append(bidi(lesson.worked, 'blockquote'));
    rule.append(el('p', lesson.lesson), el('p', lesson.lessonMl, 'ml'));
    contextColumn.append(rule);
  }
  const contextMeta = section('Practice details', 'പരിശീലന വിവരങ്ങൾ');
  contextMeta.classList.add('context-meta');
  contextMeta.append(el('p', `Activity · ${title}`), el('p', `Skill · ${q.skill}`), el('p', `CEFR band · ${q.level}`));
  contextColumn.append(contextMeta);
  workspace.append(exerciseColumn, contextColumn);
  main.replaceChildren(workspace);
}
boot().catch(e => notice(e.message));
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloadedForController) return;
    if (document.querySelector('form[data-answer-form="true"][data-answer-dirty="true"]')) {
      pendingControllerReload = true;
      return;
    }
    reloadedForController = true;
    window.location.reload();
  });
  navigator.serviceWorker.register('/sw.js').then(registration => registration.update()).catch(() => {});
}
