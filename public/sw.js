const cache = 'dhic-shell-v1',
  shell = ['/', '/app.js', '/ui.js', '/teacher.js', '/style.css', '/app.webmanifest', '/icon-192.png', '/icon-512.png'];
self.addEventListener('install', e => e.waitUntil(caches.open(cache).then(c => c.addAll(shell))));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('dhic-shell-') && k !== cache).map(k => caches.delete(k))))));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method === 'GET' && u.origin === self.location.origin && shell.includes(u.pathname)) e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request)));
});
