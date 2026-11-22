import { randomUUID } from 'node:crypto';
import { syllabus, skills, save } from '../src/content.js';
import { atomic } from '../src/db.js';
const [point, level] = process.argv.slice(2),
  p = syllabus.find(p => p.point === point && p.level === level);
if (!p || !process.env.OPENAI_API_KEY) throw Error('Supply a syllabus point, level and OPENAI_API_KEY.');
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    Authorization: 'Bearer ' + process.env.OPENAI_API_KEY,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    response_format: {
      type: 'json_object'
    },
    messages: [{
      role: 'user',
      content: 'Draft four new ' + level + ' MSA items for ' + p.title + '. Use full tashkeel at A1, partial at A2, minimal at B1. Return JSON {items:[{skill,difficulty,body:{type:"choice",prompt,ml,cue,options,answers,explanation,explanationMl}}]}. skill one of ' + skills.join(', ') + '. difficulty integer 1–5. prompt English, ml Malayalam instruction, cue stimulus, options distinct including distractors, answers array of accepted exact choices, explanation English and explanationMl Malayalam each briefly explain the answer.'
    }]
  })
});
if (!response.ok) throw Error('Draft API returned ' + response.status);
const items = JSON.parse((await response.json()).choices[0].message.content).items;
if (!Array.isArray(items) || items.length !== 4) throw Error('Expected four items.');
atomic(() => items.forEach(({
  skill,
  difficulty,
  body
}) => save({
  id: randomUUID(),
  language: 'ar',
  unit: p.unit,
  point,
  level,
  skill,
  difficulty,
  body,
  status: 'draft'
})));
console.log('Created four drafts.');
