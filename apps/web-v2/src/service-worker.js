/**
 * AutoRenta V2 Service Worker
 * 
 * Estrategia de caching:
 * - Network First: API calls (con cache fallback)
 * - Cache First: Assets estáticos (CSS, JS, fonts, images)
 * - Stale While Revalidate: Imágenes de autos
 * 
 * Features:
 * - Offline page
 * - Background sync para acciones offline
 * - Push notifications
 * - Periodic background sync
 */

const CACHE_VERSION = 'v2.0.0';
const STATIC_CACHE = `autorenta-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `autorenta-dynamic-${CACHE_VERSION}`;
const IMAGE_CACHE = `autorenta-images-${CACHE_VERSION}`;

// Assets críticos para cachear en install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest-v2.webmanifest',
  '/offline.html',
  '/styles/global-v2.css',
  '/assets/icons/icon-192x192.png',
  '/assets/icons/icon-512x512.png',
];

// Rutas que requieren autenticación
const AUTH_ROUTES = ['/trips', '/hosting', '/wallet', '/inbox', '/profile'];

// Límites de cache
const MAX_CACHE_SIZE = 100; // Máximo 100 items en cache dinámico
const MAX_IMAGE_CACHE_SIZE = 50; // Máximo 50 imágenes

// ============================================
// INSTALL - Cachear assets críticos
// ============================================
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Skip waiting');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Installation failed:', error);
      })
  );
});

// ============================================
// ACTIVATE - Limpiar caches viejos
// ============================================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && 
                cacheName !== DYNAMIC_CACHE && 
                cacheName !== IMAGE_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Claiming clients');
        return self.clients.claim();
      })
  );
});

// ============================================
// FETCH - Estrategias de caching
// ============================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar requests de chrome extensions y non-GET
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
  if (request.method !== 'GET') return;

  // API calls: Network First con timeout
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/rest/v1/')) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // Imágenes: Stale While Revalidate
  if (request.destination === 'image') {
    event.respondWith(staleWhileRevalidateStrategy(request, IMAGE_CACHE));
    return;
  }

  // Assets estáticos: Cache First
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirstStrategy(request, STATIC_CACHE));
    return;
  }

  // HTML pages: Network First con offline fallback
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(htmlNetworkFirstStrategy(request));
    return;
  }

  // Default: Network First
  event.respondWith(networkFirstStrategy(request));
});

// ============================================
// BACKGROUND SYNC - Sincronizar acciones offline
// ============================================
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);

  if (event.tag === 'sync-offline-actions') {
    event.waitUntil(syncOfflineActions());
  }

  if (event.tag === 'sync-bookings') {
    event.waitUntil(syncBookings());
  }

  if (event.tag === 'sync-messages') {
    event.waitUntil(syncMessages());
  }
});

// ============================================
// PUSH NOTIFICATIONS
// ============================================
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);

  let data = { title: 'AutoRenta', body: 'Nueva notificación' };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/assets/icons/icon-192x192.png',
    badge: '/assets/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: data.data || {},
    actions: data.actions || [],
    tag: data.tag || 'default',
    requireInteraction: data.requireInteraction || false,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// ============================================
// NOTIFICATION CLICK
// ============================================
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);

  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Si ya hay una ventana abierta, enfocarla
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // Si no, abrir nueva ventana
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// ============================================
// PERIODIC BACKGROUND SYNC (futuro)
// ============================================
self.addEventListener('periodicsync', (event) => {
  console.log('[SW] Periodic sync:', event.tag);

  if (event.tag === 'check-bookings-updates') {
    event.waitUntil(checkBookingsUpdates());
  }
});

// ============================================
// MESSAGE - Comunicación con la app
// ============================================
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data?.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(DYNAMIC_CACHE)
        .then((cache) => cache.addAll(event.data.urls))
    );
  }

  if (event.data?.type === 'CLEAR_CACHE') {
    event.waitUntil(clearAllCaches());
  }
});

// ============================================
// ESTRATEGIAS DE CACHING
// ============================================

/**
 * Network First con timeout y cache fallback
 */
async function networkFirstStrategy(request, timeout = 3000) {
  const cacheName = DYNAMIC_CACHE;

  try {
    const networkResponse = await Promise.race([
      fetch(request),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Network timeout')), timeout)
      )
    ]);

    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', error);
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Si es HTML, retornar página offline
    if (request.headers.get('accept')?.includes('text/html')) {
      return caches.match('/offline.html');
    }

    throw error;
  }
}

/**
 * Cache First - Para assets estáticos
 */
async function cacheFirstStrategy(request, cacheName) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.error('[SW] Fetch failed:', error);
    throw error;
  }
}

/**
 * Stale While Revalidate - Para imágenes
 */
async function staleWhileRevalidateStrategy(request, cacheName) {
  const cachedResponse = await caches.match(request);

  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      const cache = caches.open(cacheName);
      cache.then((c) => c.put(request, networkResponse.clone()));
    }
    return networkResponse;
  });

  return cachedResponse || fetchPromise;
}

/**
 * Network First para HTML con offline page
 */
async function htmlNetworkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }

    return caches.match('/offline.html');
  }
}

// ============================================
// HELPERS
// ============================================

function isStaticAsset(url) {
  const staticExtensions = ['.js', '.css', '.woff', '.woff2', '.ttf', '.eot'];
  return staticExtensions.some(ext => url.pathname.endsWith(ext));
}

async function syncOfflineActions() {
  try {
    const db = await openIndexedDB();
    const actions = await getOfflineActions(db);
    
    for (const action of actions) {
      try {
        await fetch(action.url, {
          method: action.method,
          headers: action.headers,
          body: action.body
        });
        
        // Eliminar acción completada
        await deleteOfflineAction(db, action.id);
      } catch (error) {
        console.error('[SW] Failed to sync action:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Sync failed:', error);
  }
}

async function syncBookings() {
  // TODO: Implementar sincronización de bookings
  console.log('[SW] Syncing bookings...');
}

async function syncMessages() {
  // TODO: Implementar sincronización de mensajes
  console.log('[SW] Syncing messages...');
}

async function checkBookingsUpdates() {
  // TODO: Verificar actualizaciones de bookings
  console.log('[SW] Checking bookings updates...');
}

async function clearAllCaches() {
  const cacheNames = await caches.keys();
  return Promise.all(cacheNames.map(name => caches.delete(name)));
}

async function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('autorenta-offline', 1);
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('offline-actions')) {
        db.createObjectStore('offline-actions', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

async function getOfflineActions(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['offline-actions'], 'readonly');
    const store = transaction.objectStore('offline-actions');
    const request = store.getAll();
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function deleteOfflineAction(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['offline-actions'], 'readwrite');
    const store = transaction.objectStore('offline-actions');
    const request = store.delete(id);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

console.log('[SW] Service Worker loaded successfully');
