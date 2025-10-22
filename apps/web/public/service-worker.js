self.importScripts('ngsw-worker.js');

const OFFLINE_URL = '/offline.html';

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          return await fetch(event.request);
        } catch (err) {
          const cachedResponse = await caches.match(OFFLINE_URL);
          return cachedResponse || (await caches.match('/index.html'));
        }
      })(),
    );
  }
});
