export function normalize(value) {
  const chillus = [
    ['ണ്‍', 'ൺ'], ['ണ്‌', 'ൺ'], ['ന്‍', 'ൻ'], ['ന്‌', 'ൻ'],
    ['ര്‍', 'ർ'], ['ര്‌', 'ർ'], ['ല്‍', 'ൽ'], ['ല്‌', 'ൽ'],
    ['ള്‍', 'ൾ'], ['ള്‌', 'ൾ'], ['ക്‍', 'ൿ'], ['ക്‌', 'ൿ']
  ];
  let text = String(value);
  for (const [legacy, atomic] of chillus) text = text.split(legacy).join(atomic);
  return text.normalize('NFKC').toLowerCase()
    .replace(/[\u0610-\u061a\u064b-\u065f\u0670\u0640]/gu, '')
    .replace(/[أإآٱ]/gu, 'ا').replace(/ة/gu, 'ه').replace(/ى/gu, 'ي')
    .replace(/ک/gu, 'ك').replace(/ی/gu, 'ي').replace(/ؤ/gu, 'و').replace(/ئ/gu, 'ي')
    .replace(/[’']/gu, '').replace(/\p{P}/gu, ' ').replace(/\s+/gu, ' ').trim();
}
// Permit one internal typing error in a long word, preserving word order and count.
function closeWord(a, b) {
  if (a === b) return true;
  if (Math.min(a.length, b.length) < 6 || a[0] !== b[0] || a.at(-1) !== b.at(-1) || Math.abs(a.length - b.length) > 1) return false;
  let i = 0,
    j = 0,
    errors = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++errors > 1) return false;
    if (a.length >= b.length) i++;
    if (a.length <= b.length) j++;
  }
  return errors + (a.length - i) + (b.length - j) <= 1;
}
export function grade(b, input) {
  if (b.type === 'match') return Array.isArray(input) && input.length === b.pairs.length && b.pairs.every((p, i) => p[1] === input[i]);
  if (typeof input !== 'string' || input.length > 2000) return false;
  if (b.requireVowels) return b.answers.some(a => a.normalize('NFC').trim() === input.normalize('NFC').trim());
  if (b.type === 'choice') return b.answers.includes(input);
  const a = normalize(input);
  return b.answers.some(answer => {
    const expected = normalize(answer);
    if (a === expected) return true;
    if (b.type !== 'translation') return false;
    const words = a.split(' '),
      target = expected.split(' ');
    return words.length === target.length && words.filter((w, i) => w !== target[i]).length === 1 && words.every((w, i) => closeWord(w, target[i]));
  });
}
