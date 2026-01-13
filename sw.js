const CACHE_NAME = 'car-rush-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/game.js',
  '/manifest.json',
  '/car.png',
  '/bg.png',
  '/obstacle1.png',
  '/obstacle2.png',
  '/engine.mp3',
  '/crash.mp3'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
