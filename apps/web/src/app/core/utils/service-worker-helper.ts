/**
 * Helper functions for Service Worker management
 */

/**
 * Force update the service worker and clear all caches
 * This should be called when we detect issues with cached API calls
 */
export async function forceServiceWorkerUpdate(): Promise<void> {
  console.log('🔧 [SW] Forcing service worker update...');

  if (!('serviceWorker' in navigator)) {
    console.log('⚠️ [SW] Service Worker not supported');
    return;
  }

  try {
    // 1. Get all service worker registrations
    const registrations = await navigator.serviceWorker.getRegistrations();
    console.log(`🔍 [SW] Found ${registrations.length} service worker registrations`);

    // 2. Unregister all service workers
    for (const registration of registrations) {
      const success = await registration.unregister();
      console.log(`🗑️ [SW] Unregistered service worker:`, registration.scope, success);
    }

    // 3. Clear all caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      console.log(`🗑️ [SW] Found ${cacheNames.length} caches to delete`);

      for (const cacheName of cacheNames) {
        const deleted = await caches.delete(cacheName);
        console.log(`🗑️ [SW] Deleted cache:`, cacheName, deleted);
      }
    }

    // 4. Clear local storage and session storage
    localStorage.clear();
    sessionStorage.clear();
    console.log('🗑️ [SW] Cleared local and session storage');

    // 5. Reload the page to get fresh content
    console.log('🔄 [SW] Reloading page...');
    window.location.reload();
  } catch (error) {
    console.error('❌ [SW] Error during service worker update:', error);
  }
}

/**
 * Check if service worker needs update due to API issues
 */
export async function checkServiceWorkerHealth(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return true; // No SW, so it's "healthy"
  }

  try {
    // Check if there are any caches that might be interfering
    if ('caches' in window) {
      const cacheNames = await caches.keys();

      // Check for problematic cache entries
      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();

        // Check if any RPC calls are cached
        const problematicRequests = requests.filter(
          (req) => req.url.includes('/rest/v1/rpc/') || req.url.includes('/functions/v1/'),
        );

        if (problematicRequests.length > 0) {
          console.warn('⚠️ [SW] Found cached RPC/Function calls:', problematicRequests.length);
          return false; // Not healthy, needs update
        }
      }
    }

    return true; // Healthy
  } catch (error) {
    console.error('❌ [SW] Error checking service worker health:', error);
    return false; // Assume not healthy on error
  }
}

/**
 * Initialize service worker with auto-recovery
 */
export async function initializeServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  // Check health first
  const isHealthy = await checkServiceWorkerHealth();

  if (!isHealthy) {
    console.warn('⚠️ [SW] Service worker not healthy, forcing update...');
    await forceServiceWorkerUpdate();
    return; // Page will reload
  }

  // Normal SW registration will happen through Angular
  console.log('✅ [SW] Service worker is healthy');
}

/**
 * Add version check to detect when SW config has changed
 */
export function checkServiceWorkerVersion(): void {
  const SW_VERSION = '2.1.0'; // Increment this when ngsw-config.json changes
  const STORAGE_KEY = 'sw-version';

  const storedVersion = localStorage.getItem(STORAGE_KEY);

  if (storedVersion !== SW_VERSION) {
    console.log(`🔄 [SW] Version changed from ${storedVersion} to ${SW_VERSION}`);
    localStorage.setItem(STORAGE_KEY, SW_VERSION);

    if (storedVersion) {
      // Only force update if there was a previous version
      forceServiceWorkerUpdate();
    }
  }
}
