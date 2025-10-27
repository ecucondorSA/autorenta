import { Injectable, Renderer2, RendererFactory2, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, DOCUMENT } from '@angular/common';

// Declare window to access MercadoPago global object after script loads
declare var window: any;

@Injectable({
  providedIn: 'root',
})
export class MercadoPagoScriptService {
  private renderer: Renderer2;
  private scriptLoaded = false;
  private mercadoPagoInstance: any; // To store the single instance of MercadoPago
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
      console.log('Attempting to load Mercado Pago script...');
      const script = this.renderer.createElement('script');
      script.src = 'https://sdk.mercadopago.com/js/v2'; // Load v2 which exposes the MercadoPago constructor
      script.defer = true; // Ensure non-blocking load
      script.onload = () => {
        console.log('Mercado Pago script loaded successfully.');
        this.scriptLoaded = true;
        resolve();
      };
      script.onerror = (error: any) => {
        console.error('Failed to load Mercado Pago script manually:', error);
        reject(new Error('Failed to load Mercado Pago script.'));
      };
      this.renderer.appendChild(this.document.body, script);
    });
    return this.scriptPromise;
  }

  /**
   * Loads the Mercado Pago SDK script dynamically and initializes it.
   * Ensures the script is loaded only once and returns a single instance of MercadoPago.
   * @param publicKey Your Mercado Pago public key.
   * @returns A Promise that resolves with the MercadoPago instance.
   */
  public async getMercadoPago(publicKey: string): Promise<unknown> {
    if (!isPlatformBrowser(this.platformId)) {
      // Handle server-side rendering (SSR) if applicable
      return Promise.reject('Mercado Pago SDK cannot be loaded on the server.');
    }

    if (this.mercadoPagoInstance) {
      return Promise.resolve(this.mercadoPagoInstance);
    }

    try {
      console.log('Calling loadScript()...');
      await this.loadScript();
      console.log('loadScript() resolved. Checking MercadoPago global...');
      const MercadoPagoGlobal = window.MercadoPago ?? window.Mercadopago;

      if (typeof MercadoPagoGlobal === 'undefined') {
        console.error('MercadoPago global is undefined after script load.');
        throw new Error('Mercado Pago object not found after script load.');
      }

      console.log('MercadoPago global found. Initializing instance...');
      this.mercadoPagoInstance = new MercadoPagoGlobal(publicKey, {
        locale: 'es-AR', // Or your desired locale
      });
      console.log('MercadoPago instance initialized.');
      return this.mercadoPagoInstance;
    } catch (error) {
      console.error('Error in getMercadoPago:', error);
      console.error(
        'Detailed error object in getMercadoPago:',
        JSON.stringify(error, Object.getOwnPropertyNames(error), 2),
      );
      return Promise.reject(error);
    }
  }
}
