// Service Worker for SafePark.PRO PWA
const CACHE_NAME = 'safepark-pro-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/accommodation.html',
  '/hot-tub.html',
  '/maintenance.html',
  '/firebase-config.js'
];

// Install event
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event
self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      }
    )
  );
});