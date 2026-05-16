// Soul Player — Service Worker
// Caches the app shell for offline use
// The live audio stream itself always requires a connection

const CACHE_NAME = 'soul-player-v202605162200';
const OFFLINE_URL  = '/offline.html';

// Files to cache for offline app shell
const SHELL_FILES = [
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Playfair+Display:wght400;700&family=Montserrat:wght@300;400;600;700&display=swap'
];

// ── INSTALL — cache app shell ──
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(SHELL_FILES.filter(function(url) {
        // Only cache same-origin and known CDN files
        return !url.startsWith('http') || url.startsWith('https://fonts');
      }));
    })
  );
  self.skipWaiting();
});

// ── ACTIVATE — clean old caches ──
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE_NAME; })
            .map(function(key) { return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

// ── FETCH — serve from cache, fall back to network ──
self.addEventListener('fetch', function(event) {
  var url = event.request.url;

  // Never intercept the audio stream or metadata endpoints
  if (url.includes('streamerr.co') || url.includes('status-json') || url.includes('7.html')) {
    return; // let browser handle directly
  }

  // For navigation requests, serve index.html from cache or offline page
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html').then(function(cached) {
        return cached || fetch(event.request).catch(function() {
          return caches.match(OFFLINE_URL);
        });
      })
    );
    return;
  }

  // For other requests — cache first, network fallback
  event.respondWith(
    caches.match(event.request).then(function(cached) {
      if (cached) return cached;
      return fetch(event.request).then(function(response) {
        // Cache successful GET responses
        if (event.request.method === 'GET' && response.status === 200) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(function() {
        return caches.match(OFFLINE_URL);
      });
    })
  );
});

// ── BACKGROUND SYNC — notify clients when back online ──
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
