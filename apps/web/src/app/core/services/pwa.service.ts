import { Injectable, Optional, signal } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs/operators';

// Types for experimental PWA APIs
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type NavigatorWithExperimentalAPIs = Navigator & {
  standalone?: boolean;
  setAppBadge?: (count: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
  contacts?: {
    select: (properties: string[], options: { multiple: boolean }) => Promise<ContactInfo[]>;
  };
  wakeLock?: {
    request: (type: 'screen') => Promise<WakeLockSentinel>;
  };
};

interface ContactInfo {
  name?: string[];
  email?: string[];
  tel?: string[];
}

interface WakeLockSentinel extends EventTarget {
  released: boolean;
  type: 'screen';
  release: () => Promise<void>;
}

interface ServiceWorkerRegistrationWithPeriodicSync extends ServiceWorkerRegistration {
  periodicSync?: {
    register: (tag: string, options: { minInterval: number }) => Promise<void>;
  };
}

type ScreenOrientationWithLock = ScreenOrientation & {
  lock?: (orientation: 'portrait' | 'landscape') => Promise<void>;
  unlock?: () => void;
};

@Injectable({
  providedIn: 'root',
})
export class PwaService {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  readonly installable = signal(false);
  readonly updateAvailable = signal(false);
  readonly isStandalone = signal(false);

  constructor(@Optional() private swUpdate: SwUpdate | null) {
    this.initPwa();
    this.checkStandaloneMode();
    this.listenForUpdates();
  }

  private initPwa(): void {
    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      this.deferredPrompt = e as BeforeInstallPromptEvent;
      // Update installable state
      this.installable.set(true);
    });

    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
      // Clear the deferredPrompt
      this.deferredPrompt = null;
      this.installable.set(false);

      // Track installation (opcional: enviar a analytics)
      this.trackInstallation();
    });
  }

  private checkStandaloneMode(): void {
    // Check if app is running in standalone mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as NavigatorWithExperimentalAPIs).standalone ||
      document.referrer.includes('android-app://');

    this.isStandalone.set(isStandalone);
  }

  private listenForUpdates(): void {
    if (!this.swUpdate?.isEnabled) {
      return;
    }

    // Listen for version updates
    this.swUpdate.versionUpdates
      .pipe(filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'))
      .subscribe((event) => {
        this.updateAvailable.set(true);
      });

    // Check for updates every 30 minutes
    setInterval(
      () => {
        this.swUpdate?.checkForUpdate();
      },
      30 * 60 * 1000,
    );
  }

  /**
   * Show the install prompt to the user
   */
  async promptInstall(): Promise<boolean> {
    if (!this.deferredPrompt) {
      return false;
    }

    // Show the install prompt
    this.deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await this.deferredPrompt.userChoice;

    // Clear the deferredPrompt
    this.deferredPrompt = null;
    this.installable.set(false);

    return outcome === 'accepted';
  }

  /**
   * Activate the latest version of the service worker
   */
  async activateUpdate(): Promise<void> {
    if (!this.swUpdate?.isEnabled) {
      return;
    }

    try {
      await this.swUpdate.activateUpdate();
      this.updateAvailable.set(false);
      // Reload the page to load the new version
      document.location.reload();
    } catch (__error) {}
  }

  /**
   * Check if the app can be shared
   */
  canShare(): boolean {
    return navigator.share !== undefined;
  }

  /**
   * Share content using Web Share API
   */
  async share(data: ShareData): Promise<boolean> {
    if (!this.canShare()) {
      return false;
    }

    try {
      await navigator.share(data);
      return true;
    } catch (__error) {
      if ((__error as Error).name !== 'AbortError') {
      }
      return false;
    }
  }

  /**
   * Request notification permission
   */
  async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      return 'denied';
    }

    const permission = await Notification.requestPermission();
    return permission;
  }

  /**
   * Show a notification
   */
  async showNotification(title: string, options?: NotificationOptions): Promise<void> {
    if (!('Notification' in window)) {
      return;
    }

    if (Notification.permission !== 'granted') {
      return;
    }

    // Use service worker to show notification if available
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        badge: '/icons/icon-96x96.png',
        icon: '/icons/icon-192x192.png',
        ...options,
      });
    } else {
      // Fallback to regular notification
      new Notification(title, options);
    }
  }

  /**
   * Track installation for analytics
   */
  private trackInstallation(): void {
    // Opcional: enviar evento a Google Analytics, Mixpanel, etc.
    if (window.gtag) {
      window.gtag('event', 'pwa_install', {
        event_category: 'engagement',
        event_label: 'PWA Installation',
      });
    }
  }

  /**
   * Get PWA metrics for analytics
   */
  getPwaMetrics(): {
    isInstallable: boolean;
    isStandalone: boolean;
    hasUpdate: boolean;
  } {
    return {
      isInstallable: this.installable(),
      isStandalone: this.isStandalone(),
      hasUpdate: this.updateAvailable(),
    };
  }

  // ========================================================================
  // PROJECT FUGU APIs - Advanced PWA Capabilities
  // ========================================================================

  /**
   * Badging API - Set app icon badge count
   */
  async setAppBadge(count: number): Promise<void> {
    const nav = navigator as NavigatorWithExperimentalAPIs;
    if (!nav.setAppBadge) {
      return;
    }

    try {
      await nav.setAppBadge(count);
    } catch (__error) {}
  }

  /**
   * Badging API - Clear app icon badge
   */
  async clearAppBadge(): Promise<void> {
    const nav = navigator as NavigatorWithExperimentalAPIs;
    if (!nav.clearAppBadge) {
      return;
    }

    try {
      await nav.clearAppBadge();
    } catch (__error) {}
  }

  /**
   * Contact Picker API - Select contacts
   */
  async pickContacts(
    properties: string[] = ['name', 'email', 'tel'],
    multiple = true,
  ): Promise<ContactInfo[] | null> {
    const nav = navigator as NavigatorWithExperimentalAPIs;
    if (!nav.contacts) {
      return null;
    }

    try {
      const contacts = await nav.contacts.select(properties, {
        multiple,
      });
      return contacts;
    } catch (__error) {
      if ((__error as Error).name !== 'AbortError') {
      }
      return null;
    }
  }

  /**
   * Wake Lock API - Keep screen awake
   */
  async requestWakeLock(): Promise<WakeLockSentinel | null> {
    const nav = navigator as NavigatorWithExperimentalAPIs;
    if (!nav.wakeLock) {
      return null;
    }

    try {
      const wakeLock = await nav.wakeLock.request('screen');

      // Listen for release
      wakeLock.addEventListener('release', () => {});

      return wakeLock;
    } catch (__error) {
      return null;
    }
  }

  /**
   * Clipboard API - Write rich content (text + images)
   */
  async writeToClipboard(data: { text?: string; html?: string; image?: Blob }): Promise<boolean> {
    if (!navigator.clipboard?.write) {
      return false;
    }

    try {
      const items: Record<string, Blob> = {};

      if (data.text) {
        items['text/plain'] = new Blob([data.text], { type: 'text/plain' });
      }

      if (data.html) {
        items['text/html'] = new Blob([data.html], { type: 'text/html' });
      }

      if (data.image) {
        items['image/png'] = data.image;
      }

      await navigator.clipboard.write([new ClipboardItem(items)]);
      return true;
    } catch (__error) {
      return false;
    }
  }

  /**
   * Screen Orientation API - Lock orientation
   */
  async lockOrientation(orientation: 'portrait' | 'landscape'): Promise<boolean> {
    const screenOrientation = screen.orientation as ScreenOrientationWithLock;
    if (!screenOrientation?.lock) {
      return false;
    }

    try {
      await screenOrientation.lock(orientation);
      return true;
    } catch (__error) {
      return false;
    }
  }

  /**
   * Screen Orientation API - Unlock orientation
   */
  unlockOrientation(): void {
    const screenOrientation = screen.orientation as ScreenOrientationWithLock;
    if (screenOrientation?.unlock) {
      screenOrientation.unlock();
    }
  }

  /**
   * Periodic Background Sync API - Register periodic sync
   */
  async registerPeriodicSync(tag: string, minInterval: number): Promise<boolean> {
    if (!('serviceWorker' in navigator)) {
      return false;
    }

    try {
      const registration = (await navigator.serviceWorker
        .ready) as ServiceWorkerRegistrationWithPeriodicSync;

      if (!registration.periodicSync) {
        return false;
      }

      await registration.periodicSync.register(tag, { minInterval });
      return true;
    } catch (__error) {
      return false;
    }
  }

  /**
   * Check if Contact Picker is supported
   */
  isContactPickerSupported(): boolean {
    return 'contacts' in navigator;
  }

  /**
   * Check if Badging is supported
   */
  isBadgingSupported(): boolean {
    return 'setAppBadge' in navigator;
  }

  /**
   * Check if Wake Lock is supported
   */
  isWakeLockSupported(): boolean {
    return 'wakeLock' in navigator;
  }

  /**
   * Get all supported Fugu APIs
   */
  getSupportedFuguApis(): {
    badging: boolean;
    contactPicker: boolean;
    wakeLock: boolean;
    advancedClipboard: boolean;
    screenOrientation: boolean;
    periodicBackgroundSync: boolean;
    webShare: boolean;
  } {
    const screenOrientation = screen.orientation as ScreenOrientationWithLock;
    return {
      badging: this.isBadgingSupported(),
      contactPicker: this.isContactPickerSupported(),
      wakeLock: this.isWakeLockSupported(),
      advancedClipboard: !!navigator.clipboard?.write,
      screenOrientation: !!screenOrientation?.lock,
      periodicBackgroundSync: 'serviceWorker' in navigator,
      webShare: this.canShare(),
    };
  }
}
