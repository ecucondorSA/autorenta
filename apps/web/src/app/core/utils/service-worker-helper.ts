/**
 * Helper functions for Service Worker management
 */

/**
 * Force update the service worker and clear all caches
 * This should be called when we detect issues with cached API calls
 */
export async function forceServiceWorkerUpdate(): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  try {
    // 1. Get all service worker registrations
    const registrations = await navigator.serviceWorker.getRegistrations();

    // 2. Unregister all service workers
    for (const registration of registrations) {
      const success = await registration.unregister();
    }

    // 3. Clear all caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();

      for (const cacheName of cacheNames) {
        const deleted = await caches.delete(cacheName);
      }
    }

    // 4. Clear local storage and session storage
    localStorage.clear();
    sessionStorage.clear();

    // 5. Reload the page to get fresh content
    window.location.reload();
  } catch (_error) {
    // Silently ignore service worker errors
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
          return false; // Not healthy, needs update
        }
      }
    }

    return true; // Healthy
  } catch (_error) {
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
    await forceServiceWorkerUpdate();
    return; // Page will reload
  }

  // Normal SW registration will happen through Angular
}

/**
 * Add version check to detect when SW config has changed
 */
export function checkServiceWorkerVersion(): void {
  const SW_VERSION = '2.1.0'; // Increment this when ngsw-config.json changes
  const STORAGE_KEY = 'sw-version';

  const storedVersion = localStorage.getItem(STORAGE_KEY);

  if (storedVersion !== SW_VERSION) {
    localStorage.setItem(STORAGE_KEY, SW_VERSION);

    if (storedVersion) {
      // Only force update if there was a previous version
      forceServiceWorkerUpdate();
    }
  }
}
