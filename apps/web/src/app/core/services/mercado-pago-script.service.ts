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

  constructor(
    rendererFactory: RendererFactory2,
    @Inject(DOCUMENT) private document: Document,
    @Inject(PLATFORM_ID) private platformId: object,
  ) {
    this.renderer = rendererFactory.createRenderer(null, null);
  }

  private loadScript(): Promise<void> {
    if (this.scriptPromise) {
      return this.scriptPromise;
    }

    this.scriptPromise = new Promise((resolve, reject) => {
      const script = this.renderer.createElement('script');
      script.src = 'https://sdk.mercadopago.com/js/v2';
      script.defer = true;
      script.onload = () => {
        this.scriptLoaded = true;
        resolve();
      };
      script.onerror = (error: unknown) => {
        console.error('Mercado Pago SDK script failed to load', error);
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
      await this.loadScript();

      const windowWithMP = globalThis as unknown as WindowWithMercadoPago;
      const MercadoPagoGlobal = windowWithMP.MercadoPago ?? windowWithMP.Mercadopago;

      if (typeof MercadoPagoGlobal === 'undefined') {
        throw new Error('Mercado Pago object not found after script load.');
      }

      this.mercadoPagoInstance = new MercadoPagoGlobal(publicKey, {
        locale: 'es-AR',
      });
      return this.mercadoPagoInstance;
    } catch (error: unknown) {
      const normalizedError =
        error instanceof Error
          ? error
          : new Error(typeof error === 'string' ? error : 'Unknown error');

      console.error(
        'Detailed error object in getMercadoPago:',
        JSON.stringify(normalizedError, Object.getOwnPropertyNames(normalizedError), 2),
      );
      return Promise.reject(normalizedError);
    }
  }
}
