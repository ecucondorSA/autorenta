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

    console.log('📦 Iniciando carga del script de Mercado Pago...');

    this.scriptPromise = new Promise((resolve, reject) => {
      const script = this.renderer.createElement('script');
      script.src = 'https://sdk.mercadopago.com/js/v2';
      script.defer = true;
      script.onload = () => {
        console.log('✅ Script de Mercado Pago cargado exitosamente');
        this.scriptLoaded = true;
        resolve();
      };
      script.onerror = (error: unknown) => {
        console.error('❌ Error al cargar el script de Mercado Pago:', error);
        const errorMsg = 'No se pudo cargar el SDK de Mercado Pago. Verifica tu conexión a internet e intenta nuevamente.';
        reject(new Error(errorMsg));
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
      console.error('❌ Mercado Pago SDK no puede cargarse en el servidor (SSR)');
      return Promise.reject('Mercado Pago SDK cannot be loaded on the server.');
    }

    if (this.mercadoPagoInstance) {
      console.log('✅ Reutilizando instancia existente de Mercado Pago');
      return Promise.resolve(this.mercadoPagoInstance);
    }

    try {
      await this.loadScript();

      console.log('🔍 Buscando objeto global MercadoPago...');
      const windowWithMP = globalThis as unknown as WindowWithMercadoPago;
      const MercadoPagoGlobal = windowWithMP.MercadoPago ?? windowWithMP.Mercadopago;

      if (typeof MercadoPagoGlobal === 'undefined') {
        console.error('❌ Objeto MercadoPago no encontrado después de cargar el script');
        throw new Error('Mercado Pago object not found after script load.');
      }

      console.log('🎯 Inicializando instancia de Mercado Pago con locale es-AR...');
      this.mercadoPagoInstance = new MercadoPagoGlobal(publicKey, {
        locale: 'es-AR',
      });
      console.log('✅ Instancia de Mercado Pago creada exitosamente');
      return this.mercadoPagoInstance;
    } catch (error: any) {
      console.error(
        '❌ Error detallado en getMercadoPago:',
        JSON.stringify(error, Object.getOwnPropertyNames(error), 2),
      );
      return Promise.reject(error);
    }
  }
}
