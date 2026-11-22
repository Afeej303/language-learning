// Refresh this ID whenever any shell asset changes. `npm test` verifies it.
const BUILD_ID = '15dffe5abdb59a6515078996bbde5731cd7c1b8912e06a4038974fc61613496c';
const cacheName = `dhic-shell-${BUILD_ID}`;
const shell = [
  '/',
  '/index.html',
  '/app.js',
  '/ui.js',
  '/teacher.js',
  '/style.css',
  '/app.webmanifest',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(cacheName).then(cache => cache.addAll(shell)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys
      .filter(key => key.startsWith('dhic-shell-') && key !== cacheName)
      .map(key => caches.delete(key))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || !shell.includes(url.pathname)) return;

  // Always ask the server first. Cache is only an offline fallback.
  event.respondWith(fetch(event.request).then(response => {
    if (!response.ok) return response;
    return caches.open(cacheName)
      .then(cache => cache.put(event.request, response.clone()))
      .then(() => response);
  }).catch(() => caches.match(event.request).then(cached => cached || new Response('Offline and no cached copy is available.', {
    status: 503,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  }))));
});
