import { Injectable, inject, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { App, URLOpenListenerEvent } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { LoggerService } from '@core/services/infrastructure/logger.service';

/**
 * DeepLink Service
 *
 * Part of Step #33: Deep Linking.
 *
 * Handles native App Links (Android) and Universal Links (iOS).
 * Intercepts incoming URLs and navigates to the corresponding internal route.
 */
@Injectable({
  providedIn: 'root',
})
export class DeepLinkService {
  private readonly router = inject(Router);
  private readonly zone = inject(NgZone);
  private readonly logger = inject(LoggerService).createChildLogger('DeepLinkService');
  private readonly isNative = Capacitor.isNativePlatform();

  /**
   * Initializes the deep link listeners.
   * Should be called during app bootstrap (AppComponent).
   */
  public initialize(): void {
    if (!this.isNative) {
      return;
    }

    this.logger.info('Initializing Deep Link listeners');

    // 1. Handle app opening from a link (Cold Start or Resume)
    App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
      this.handleIncomingUrl(event.url);
    });

    // 2. Handle initial deep link if app was closed (Cold Start check)
    void this.checkInitialUrl();
  }

  /**
   * Check if app was started via a URL
   */
  private async checkInitialUrl(): Promise<void> {
    const launchUrl = await App.getLaunchUrl();
    if (launchUrl?.url) {
      this.logger.debug('App launched with URL:', launchUrl.url);
      this.handleIncomingUrl(launchUrl.url);
    }
  }

  /**
   * Universal URL Parser & Navigator
   * Handles both custom schemas (app.autorentar://) and web links (https://autorentar.com/)
   */
  private handleIncomingUrl(url: string): void {
    this.zone.run(() => {
      try {
        const parsedUrl = new URL(url);
        const internalPath = parsedUrl.pathname + parsedUrl.search + parsedUrl.hash;

        this.logger.info('Deep link detected:', {
          full: url,
          internal: internalPath,
        });

        // Safety check: ensure path exists or fallback to home
        if (internalPath && internalPath !== '/') {
          void this.router.navigateByUrl(internalPath);
        }
      } catch {
        // Fallback for custom schemas that might not parse as standard URLs
        this.logger.warn('Failed to parse URL, attempting slug extraction', url);
        const slug = url.split('://').pop();
        if (slug) {
          void this.router.navigateByUrl('/' + slug);
        }
      }
    });
  }
}