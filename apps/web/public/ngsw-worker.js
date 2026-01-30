/**
 * Emergency Safety Worker - AutoRenta
 * This worker immediately unregisters itself and clears all caches.
 * Used to recover from broken Service Worker states.
 */

// Immediately unregister this service worker
self.addEventListener('install', function(event) {
  console.log('[Safety Worker] Installing - will clear all caches');
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  console.log('[Safety Worker] Activating - clearing all caches and unregistering');

  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          console.log('[Safety Worker] Deleting cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(function() {
      console.log('[Safety Worker] All caches cleared, unregistering...');
      return self.registration.unregister();
    }).then(function() {
      console.log('[Safety Worker] Unregistered successfully');
      // Notify all clients to reload
      return self.clients.matchAll();
    }).then(function(clients) {
      clients.forEach(function(client) {
        client.postMessage({ type: 'CACHE_CLEARED', action: 'reload' });
      });
    })
  );
});

// Don't cache anything - let all requests go to network
self.addEventListener('fetch', function(event) {
  // Pass through to network
  event.respondWith(fetch(event.request));
});
