export const el = (tag, text, cls) => {
  const n = document.createElement(tag);
  if (text !== undefined) n.textContent = text;
  if (cls) n.className = cls;
  return n;
};
export const notice = text => {
  document.querySelector('#message').textContent = text;
};
export function button(label, fn, cls = '') {
  const b = el('button', label, cls);
  b.type = 'button';
  b.onclick = async () => {
    b.disabled = true;
    try {
      await fn();
    } catch (e) {
      notice(e.message);
    } finally {
      b.disabled = false;
    }
  };
  return b;
}
export function section(title, ml) {
  const s = el('section');
  s.append(el('h2', title), el('p', ml, 'ml'));
  return s;
}
export function field(name, input) {
  const label = el('label', name);
  label.append(input);
  return label;
}
export async function api(route, body) {
  const response = await fetch('/api/' + route, body === undefined ? {
    cache: 'no-store'
  } : {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  const data = await response.json();
  if (!response.ok) {
    const e = Error(data.error);
    e.status = response.status;
    throw e;
  }
  return data;
}
export function bidi(text, tag = 'span') {
  const n = el(tag, text);
  n.dir = 'auto';
  if (/[\u0600-\u06ff]/.test(text)) {
    n.lang = 'ar';
    n.classList.add('arabic');
  } else if (/[\u0d00-\u0d7f]/.test(text)) n.lang = 'ml';
  return n;
}
