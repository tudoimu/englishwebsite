/* Minimal offline app-shell cache. */
const CACHE_NAME = 'ielts-buddy-v1';
const SHELL_FILES = [
  'index.html',
  'css/style.css',
  'js/app.js',
  'js/data.js',
  'js/storage.js',
  'js/vocab.js',
  'js/grammar.js',
  'js/mocktest.js',
  'js/achievements.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
