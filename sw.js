// Service Worker for SafeSystems.PRO by Omnibosh
const CACHE_NAME = 'safesystems-pro-v2.0';
const OFFLINE_URL = './index.html';

// Core files to cache for offline use
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  
  // Icons
  './icon-72.png',
  './icon-96.png',
  './icon-128.png',
  './icon-144.png',
  './icon-152.png',
  './icon-192.png',
  './icon-192-maskable.png',
  './icon-384.png',
  './icon-512.png',
  './icon-512-maskable.png',
  './apple-touch-icon.png',
  './favicon-32x32.png'
];

// Install event - cache resources
self.addEventListener('install', function(event) {
  console.log('[SafeSystems.PRO] Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('[SafeSystems.PRO] Caching core resources');
        return cache.addAll(urlsToCache).catch(function(error) {
          console.log('[SafeSystems.PRO] Some resources failed to cache:', error);
          // Cache critical files individually as fallback
          return cache.addAll([
            './',
            './index.html'
          ]);
        });
      })
      .then(function() {
        console.log('[SafeSystems.PRO] Service Worker installed successfully');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', function(event) {
  console.log('[SafeSystems.PRO] Service Worker activating...');
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          // Delete any old caches (including old safepark-pro caches)
          if (cacheName !== CACHE_NAME) {
            console.log('[SafeSystems.PRO] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(function() {
      console.log('[SafeSystems.PRO] Service Worker activated');
      return self.clients.claim();
    })
  );
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', function(event) {
  // Skip cross-origin requests (Firebase, external modules, etc.)
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  // Handle navigation requests (HTML pages)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(function(response) {
          // Cache successful navigation responses
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(function() {
          // Offline - return cached page or index.html
          return caches.match(event.request).then(function(response) {
            return response || caches.match(OFFLINE_URL);
          });
        })
    );
    return;
  }
  
  // Handle other requests (images, scripts, etc.) - cache first
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        if (response) {
          return response;
        }
        
        return fetch(event.request).then(function(response) {
          // Don't cache non-successful responses
          if (!response || response.status !== 200) {
            return response;
          }
          
          // Clone and cache the response
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, responseToCache);
          });
          
          return response;
        });
      })
  );
});

// Handle push notifications (for future use)
self.addEventListener('push', function(event) {
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body || 'New notification from SafeSystems.PRO',
      icon: './icon-192.png',
      badge: './icon-192.png',
      tag: data.tag || 'safesystems-notification',
      data: data.data
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'SafeSystems.PRO', options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || './')
  );
});

console.log('[SafeSystems.PRO] Service Worker loaded');
