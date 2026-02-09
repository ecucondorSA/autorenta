import { afterNextRender, Injector, runInInjectionContext } from '@angular/core';

// Track if we have an injector available for afterNextRender
let _appInjector: Injector | null = null;

/**
 * Set the application injector for use with runAfterHydration
 * This should be called once during app bootstrap
 */
export function setAppInjector(injector: Injector): void {
  _appInjector = injector;
}

/**
 * Platform Utilities
 *
 * Utilities to prevent Angular SSR hydration errors (NG0750).
 * Provides safe access to browser-only APIs.
 *
 * **Why this matters:**
 * Angular SSR renders HTML on the server, then "hydrates" it on the client.
 * If server HTML differs from client HTML, you get NG0750 errors.
 *
 * **Common causes:**
 * - Accessing `window`, `document`, `localStorage` without guards
 * - Using browser-only APIs in component constructors
 * - Rendering different content based on browser state
 *
 * **Solution:**
 * Use these utilities to safely access browser APIs and defer
 * browser-only code until after hydration is complete.
 */

/**
 * Check if code is running in the browser
 *
 * @example
 * ```typescript
 * if (isBrowser()) {
 *   window.scrollTo(0, 0);
 * }
 * ```
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

/**
 * Safely access window object
 *
 * @returns Window object if in browser, null otherwise
 *
 * @example
 * ```typescript
 * const win = getWindow();
 * if (win) {
 *   win.scrollTo(0, 0);
 * }
 * ```
 */
export function getWindow(): Window | null {
  return isBrowser() ? window : null;
}

/**
 * Safely access document object
 *
 * @returns Document object if in browser, null otherwise
 *
 * @example
 * ```typescript
 * const doc = getDocument();
 * if (doc) {
 *   const el = doc.getElementById('my-element');
 * }
 * ```
 */
export function getDocument(): Document | null {
  return isBrowser() ? document : null;
}

/**
 * Safely access localStorage
 *
 * @returns Storage object if available, null otherwise
 *
 * @example
 * ```typescript
 * const storage = getLocalStorage();
 * if (storage) {
 *   storage.setItem('key', 'value');
 * }
 * ```
 */
export function getLocalStorage(): Storage | null {
  try {
    return isBrowser() && typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    // localStorage might be disabled in some browsers
    return null;
  }
}

/**
 * Safely access sessionStorage
 *
 * @returns Storage object if available, null otherwise
 *
 * @example
 * ```typescript
 * const storage = getSessionStorage();
 * if (storage) {
 *   storage.setItem('key', 'value');
 * }
 * ```
 */
export function getSessionStorage(): Storage | null {
  try {
    return isBrowser() && typeof sessionStorage !== 'undefined' ? sessionStorage : null;
  } catch {
    // sessionStorage might be disabled
    return null;
  }
}

/**
 * Execute callback only in browser, after hydration
 *
 * **Use this for:**
 * - Initializing third-party libraries (Google Maps, MercadoPago SDK, etc.)
 * - Setting up event listeners
 * - Accessing browser-only APIs
 * - Measuring DOM elements
 *
 * **Do NOT use in constructors** - use in ngOnInit or as a standalone call.
 *
 * @param callback Function to execute after hydration
 *
 * @example
 * ```typescript
 * @Component({...})
 * export class MyComponent {
 *   constructor() {
 *     runAfterHydration(() => {
 *       // Safe to access DOM here
 *       console.log('Window width:', window.innerWidth);
 *       this.initGoogleMaps();
 *     });
 *   }
 * }
 * ```
 */
export function runAfterHydration(callback: () => void): void {
  if (!isBrowser()) {
    return;
  }

  // If we have an app injector, use it for afterNextRender
  if (_appInjector) {
    try {
      runInInjectionContext(_appInjector, () => {
        afterNextRender(callback);
      });
      return;
    } catch {
      // Fall through to fallback if injector is no longer valid
    }
  }

  // Fallback: Use requestAnimationFrame + setTimeout for non-DI contexts
  // This is equivalent to "after next render" but without injection context
  if (document.readyState === 'complete') {
    // Document already loaded, run on next frame
    requestAnimationFrame(() => {
      setTimeout(callback, 0);
    });
  } else {
    // Wait for load event
    window.addEventListener(
      'load',
      () => {
        requestAnimationFrame(() => {
          setTimeout(callback, 0);
        });
      },
      { once: true },
    );
  }
}

/**
 * Execute callback only in browser, immediately if already in browser
 *
 * **Use when:**
 * - You need to run code in browser but don't care about hydration timing
 * - Setting up services that don't affect initial render
 *
 * @param callback Function to execute
 *
 * @example
 * ```typescript
 * runInBrowser(() => {
 *   // Will run immediately if in browser
 *   this.analytics.track('page_view');
 * });
 * ```
 */
export function runInBrowser(callback: () => void): void {
  if (isBrowser()) {
    callback();
  }
}

/**
 * Safe wrapper for browser-only values
 *
 * Returns a default value on server, actual value in browser.
 *
 * **Use for:**
 * - Component properties that depend on browser state
 * - Computed values that use browser APIs
 *
 * @param getValue Function that returns browser-only value
 * @param defaultValue Value to return on server (default: null)
 *
 * @example
 * ```typescript
 * @Component({...})
 * export class MyComponent {
 *   // Will be null on server, actual value in browser
 *   readonly windowWidth = computed(() =>
 *     browserValue(() => window.innerWidth, 0)
 *   );
 * }
 * ```
 */
export function browserValue<T>(getValue: () => T, defaultValue: T | null = null): T | null {
  return isBrowser() ? getValue() : defaultValue;
}

/**
 * Create a signal that updates after hydration
 *
 * Returns default value immediately, then updates with actual value after hydration.
 *
 * **Use for:**
 * - Responsive breakpoints
 * - Window dimensions
 * - User preferences from localStorage
 *
 * @param getValue Function that returns browser-only value
 * @param defaultValue Value to return on server
 *
 * @example
 * ```typescript
 * import { signal } from '@angular/core';
 *
 * @Component({...})
 * export class MyComponent {
 *   readonly isMobile = signal(false);
 *
 *   constructor() {
 *     signalAfterHydration(
 *       () => window.innerWidth < 768,
 *       false,
 *       this.isMobile.set
 *     );
 *   }
 * }
 * ```
 */
export function signalAfterHydration<T>(
  getValue: () => T,
  defaultValue: T,
  setter: (value: T) => void,
): void {
  // Set default immediately (works on server)
  setter(defaultValue);

  // Update with actual value after hydration (browser only)
  runAfterHydration(() => {
    try {
      const value = getValue();
      setter(value);
    } catch (error) {
      console.error('Error in signalAfterHydration:', error);
    }
  });
}

/**
 * Detect if current environment is SSR (Server-Side Rendering)
 *
 * @returns true if running on server, false if in browser
 *
 * @example
 * ```typescript
 * if (isSSR()) {
 *   // Skip expensive operations on server
 *   return;
 * }
 * ```
 */
export function isSSR(): boolean {
  return !isBrowser();
}

/**
 * Create a browser-safe computed signal
 *
 * Returns default value on server, computed value in browser.
 *
 * @example
 * ```typescript
 * import { signal, computed } from '@angular/core';
 *
 * @Component({...})
 * export class MyComponent {
 *   readonly windowWidth = browserComputed(
 *     () => window.innerWidth,
 *     0
 *   );
 * }
 * ```
 */
export function browserComputed<T>(computation: () => T, defaultValue: T): () => T {
  return () => browserValue(computation, defaultValue) as T;
}

/**
 * Check if a global browser API is available
 *
 * @param apiName Name of the global API (e.g., 'IntersectionObserver')
 * @returns true if API is available, false otherwise
 *
 * @example
 * ```typescript
 * if (hasAPI('IntersectionObserver')) {
 *   // Use IntersectionObserver
 * } else {
 *   // Fallback to scroll events
 * }
 * ```
 */
export function hasAPI(apiName: string): boolean {
  const win = getWindow();
  return win !== null && apiName in win;
}

/**
 * Get user agent string safely
 *
 * @returns User agent string if in browser, empty string otherwise
 *
 * @example
 * ```typescript
 * const ua = getUserAgent();
 * if (ua.includes('Mobile')) {
 *   // Mobile-specific code
 * }
 * ```
 */
export function getUserAgent(): string {
  return browserValue(() => navigator.userAgent, '') || '';
}

/**
 * Check if device is likely mobile based on user agent
 *
 * @returns true if mobile device detected, false otherwise
 *
 * @example
 * ```typescript
 * if (isMobileDevice()) {
 *   // Show mobile UI
 * }
 * ```
 */
export function isMobileDevice(): boolean {
  const ua = getUserAgent();
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
}
