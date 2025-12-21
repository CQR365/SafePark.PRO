// Service Worker for SafePark.PRO PWA - Enhanced Version
const CACHE_NAME = 'safepark-pro-v1.2';
const OFFLINE_URL = '/index.html';

// Comprehensive file caching for SafePark.PRO modules
const urlsToCache = [
  '/',
  '/index.html',
  '/firebase-config.js',
  '/manifest.json',
  
  // Core SafePark.PRO modules
  '/accommodation.html',
  '/hot-tub.html',
  '/maintenance.html',
  '/gas.html',
  '/coshh.html',
  '/contractor-management.html',
  '/fire-risk-assessment.html',
  '/incidents.html',
  '/play-parks.html',
  '/food-beverage.html',
  '/vehicles.html',
  '/ukas.html',
  '/contractors.html',
  '/risk-management.html',
  '/puwer.html',
  '/loler.html',
  '/electric.html',
  '/fire.html',
  '/management.html',
  
  // Icons (when PNG files are created)
  '/icon-192.png',
  '/icon-512.png'
];

// Install event - cache resources
self.addEventListener('install', function(event) {
  console.log('SafePark.PRO Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Caching SafePark.PRO resources');
        return cache.addAll(urlsToCache.map(url => {
          return new Request(url, {mode: 'no-cors'});
        })).catch(function(error) {
          console.log('Some resources failed to cache:', error);
          // Cache critical files individually
          return cache.addAll([
            '/',
            '/index.html',
            '/firebase-config.js'
          ]);
        });
      })
      .then(function() {
        console.log('SafePark.PRO Service Worker installed successfully');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', function(event) {
  console.log('SafePark.PRO Service Worker activating...');
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(function() {
      console.log('SafePark.PRO Service Worker activated');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', function(event) {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  // Handle navigation requests
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(function() {
          return caches.match(OFFLINE_URL);
        })
    );
    return;
  }
  
  // Handle all other requests
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Return cached version if available
        if (response) {
          return response;
        }
        
        // Otherwise, fetch from network
        return fetch(event.request).then(function(response) {
          // Don't cache if not successful
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Clone the response for caching
          const responseToCache = response.clone();
          
          caches.open(CACHE_NAME)
            .then(function(cache) {
              cache.put(event.request, responseToCache);
            });
          
          return response;
        }).catch(function() {
          // If network fails, try to return index.html for HTML requests
          if (event.request.headers.get('accept').includes('text/html')) {
            return caches.match(OFFLINE_URL);
          }
        });
      })
  );
});

// Handle background sync for offline forms
self.addEventListener('sync', function(event) {
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Trigger Firebase sync when back online
      self.registration.showNotification('SafePark.PRO', {
        body: 'Data synced successfully!',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'sync-complete'
      })
    );
  }
});

// Handle push notifications (if implemented later)
self.addEventListener('push', function(event) {
  if (event.data) {
    const notificationData = event.data.json();
    
    const options = {
      body: notificationData.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: notificationData.data,
      tag: notificationData.tag || 'safepark-notification',
      requireInteraction: true
    };
    
    event.waitUntil(
      self.registration.showNotification(notificationData.title, options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/')
  );
});

console.log('SafePark.PRO Service Worker loaded successfully');
