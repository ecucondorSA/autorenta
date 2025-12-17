import { Injectable, Renderer2, RendererFactory2, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, DOCUMENT } from '@angular/common';

interface MercadoPagoConstructor {
  new (publicKey: string, options?: { locale?: string }): unknown;
}

interface WindowWithMercadoPago {
  MercadoPago?: MercadoPagoConstructor;
  Mercadopago?: MercadoPagoConstructor;
}

@Injectable({
  providedIn: 'root',
})
export class MercadoPagoScriptService {
  private renderer: Renderer2;
  private scriptLoaded = false;
  private mercadoPagoInstance: unknown;
  private scriptPromise: Promise<void> | null = null;
  private preloadAdded = false;

  constructor(
    rendererFactory: RendererFactory2,
    @Inject(DOCUMENT) private document: Document,
    @Inject(PLATFORM_ID) private platformId: object,
  ) {
    this.renderer = rendererFactory.createRenderer(null, null);
    this.addPreconnectHints();
  }

  /**
   * Add preconnect hints for MercadoPago SDK
   * This allows the browser to establish connections early
   */
  private addPreconnectHints(): void {
    if (!isPlatformBrowser(this.platformId) || this.preloadAdded) {
      return;
    }

    // Check if hints already exist
    const existingPreconnect = this.document.querySelector(
      'link[href="https://sdk.mercadopago.com"]',
    );
    if (existingPreconnect) {
      this.preloadAdded = true;
      return;
    }

    // Add DNS prefetch
    const dnsPrefetch = this.renderer.createElement('link');
    dnsPrefetch.rel = 'dns-prefetch';
    dnsPrefetch.href = 'https://sdk.mercadopago.com';
    this.renderer.appendChild(this.document.head, dnsPrefetch);

    // Add preconnect for faster connection
    const preconnect = this.renderer.createElement('link');
    preconnect.rel = 'preconnect';
    preconnect.href = 'https://sdk.mercadopago.com';
    preconnect.crossOrigin = 'anonymous';
    this.renderer.appendChild(this.document.head, preconnect);

    this.preloadAdded = true;
  }

  /**
   * Preload the SDK script without initializing
   * Useful for preloading on route navigation before payment page
   */
  public preloadSDK(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return Promise.resolve();
    }

    return this.loadScript();
  }

  /**
   * Wait for MercadoPago SDK to be available on window object
   * Uses polling instead of arbitrary timeouts
   */
  private waitForMercadoPagoSDK(maxAttempts = 50, interval = 100): Promise<void> {
    return new Promise((resolve, reject) => {
      let attempts = 0;

      const checkSDK = () => {
        const windowWithMP = globalThis as unknown as WindowWithMercadoPago;
        const hasMercadoPago = windowWithMP.MercadoPago || windowWithMP.Mercadopago;

        if (hasMercadoPago) {
          resolve();
        } else if (attempts >= maxAttempts) {
          reject(new Error('MercadoPago SDK not available after maximum attempts'));
        } else {
          attempts++;
          setTimeout(checkSDK, interval);
        }
      };

      checkSDK();
    });
  }

  private loadScript(): Promise<void> {
    if (this.scriptPromise) {
      return this.scriptPromise;
    }

    // Check if script already exists in DOM
    const existingScript = this.document.querySelector('script[src*="sdk.mercadopago.com"]');
    if (existingScript) {
      this.scriptPromise = Promise.resolve();
      return this.scriptPromise;
    }

    this.scriptPromise = new Promise((resolve, reject) => {
      const script = this.renderer.createElement('script');
      script.src = 'https://sdk.mercadopago.com/js/v2';
      script.defer = true;
      script.async = true;

      // Add timeout to prevent hanging
      const timeout = setTimeout(() => {
        reject(new Error('Timeout loading Mercado Pago SDK script.'));
      }, 30000); // 30 seconds timeout

      script.onload = () => {
        clearTimeout(timeout);
        this.scriptLoaded = true;

        // Wait for SDK to be available on window (with retry logic)
        this.waitForMercadoPagoSDK()
          .then(() => {
            resolve();
          })
          .catch((error) => {
            reject(error);
          });
      };

      script.onerror = (error: unknown) => {
        clearTimeout(timeout);
        reject(new Error('Failed to load Mercado Pago script.'));
      };

      this.renderer.appendChild(this.document.body, script);
    });
    return this.scriptPromise;
  }

  /**
   * Loads the Mercado Pago SDK script dynamically and initializes it.
   * Ensures the script is loaded only once and returns a single instance of MercadoPago.
   */
  public async getMercadoPago(publicKey: string): Promise<unknown> {
    if (!isPlatformBrowser(this.platformId)) {
      return Promise.reject('Mercado Pago SDK cannot be loaded on the server.');
    }

    if (this.mercadoPagoInstance) {
      return Promise.resolve(this.mercadoPagoInstance);
    }

    try {
      // Load script and wait for SDK to be available
      await this.loadScript();

      // Ensure SDK is available on window
      await this.waitForMercadoPagoSDK();

      const windowWithMP = globalThis as unknown as WindowWithMercadoPago;
      const MercadoPagoGlobal = windowWithMP.MercadoPago ?? windowWithMP.Mercadopago;

      if (typeof MercadoPagoGlobal === 'undefined') {
        throw new Error(
          'Mercado Pago object not found after script load. The SDK may not have loaded correctly.',
        );
      }

      // Validate constructor
      if (typeof MercadoPagoGlobal !== 'function') {
        throw new Error('MercadoPago constructor is not a function');
      }

      // Initialize MercadoPago instance
      this.mercadoPagoInstance = new MercadoPagoGlobal(publicKey, {
        locale: 'es-AR',
      });

      if (!this.mercadoPagoInstance) {
        throw new Error('Failed to create MercadoPago instance');
      }

      return this.mercadoPagoInstance;
    } catch (error: unknown) {
      const normalizedError =
        error instanceof Error
          ? error
          : new Error(typeof error === 'string' ? error : 'Unknown error');

      return Promise.reject(normalizedError);
    }
  }
}
