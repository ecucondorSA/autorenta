import { Directive, ElementRef, Input, OnInit, Renderer2 } from '@angular/core';

/**
 * Directiva para imágenes responsivas con srcset automático
 *
 * @example
 * ```html
 * <img
 *   appResponsiveImage
 *   [src]="imageUrl"
 *   [imageSizes]="['400w', '800w', '1200w']"
 *   alt="Car photo"
 *   loading="lazy"
 * />
 * ```
 */
@Directive({
  selector: 'img[appResponsiveImage]',
  standalone: true,
})
export class ResponsiveImageDirective implements OnInit {
  /**
   * Tamaños de imagen disponibles (ej: ['400w', '800w', '1200w'])
   * Se generará srcset automáticamente si la URL es de Supabase/Unsplash
   */
  @Input() imageSizes: string[] = ['400w', '800w', '1200w', '1600w'];

  /**
   * Atributo sizes para responsive images
   * Default: optimizado para car cards y heroes
   */
  @Input() sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 800px';

  /**
   * Calidad de imagen para servicios que lo soporten (1-100)
   */
  @Input() quality = 85;

  constructor(
    private el: ElementRef<HTMLImageElement>,
    private renderer: Renderer2,
  ) {}

  ngOnInit(): void {
    const img = this.el.nativeElement;
    const src = img.getAttribute('src');

    if (!src) {
      return;
    }

    // Solo aplicar srcset si es una URL externa optimizable
    if (this.isOptimizableUrl(src)) {
      const srcset = this.generateSrcset(src);
      if (srcset) {
        this.renderer.setAttribute(img, 'srcset', srcset);
        this.renderer.setAttribute(img, 'sizes', this.sizes);
      }
    }

    // Agregar lazy loading por defecto si no está especificado
    if (!img.hasAttribute('loading')) {
      this.renderer.setAttribute(img, 'loading', 'lazy');
    }

    // Agregar decoding async por defecto
    if (!img.hasAttribute('decoding')) {
      this.renderer.setAttribute(img, 'decoding', 'async');
    }
  }

  /**
   * Verifica si la URL es optimizable (Supabase Storage o Unsplash)
   */
  private isOptimizableUrl(url: string): boolean {
    return (
      url.includes('supabase.co/storage') ||
      url.includes('unsplash.com') ||
      url.includes('images.unsplash.com')
    );
  }

  /**
   * Genera srcset para diferentes tamaños
   */
  private generateSrcset(originalUrl: string): string | null {
    if (originalUrl.includes('unsplash.com')) {
      return this.generateUnsplashSrcset(originalUrl);
    }

    if (originalUrl.includes('supabase.co/storage')) {
      return this.generateSupabaseSrcset(originalUrl);
    }

    return null;
  }

  /**
   * Genera srcset para Unsplash con parámetros de resize
   */
  private generateUnsplashSrcset(url: string): string {
    const widths = this.extractWidths();

    return widths
      .map((width) => {
        const optimizedUrl = this.addUnsplashParams(url, width);
        return `${optimizedUrl} ${width}w`;
      })
      .join(', ');
  }

  /**
   * Genera srcset para Supabase Storage
   * Nota: Supabase no tiene resize automático, pero podemos preparar URLs para CDN futuro
   */
  private generateSupabaseSrcset(url: string): string {
    const widths = this.extractWidths();

    // Por ahora solo retorna la URL original en diferentes anchos
    // Cuando implementemos CDN con resize, esto funcionará automáticamente
    return widths.map((width) => `${url} ${width}w`).join(', ');
  }

  /**
   * Agrega parámetros de optimización a URLs de Unsplash
   */
  private addUnsplashParams(url: string, width: number): string {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}w=${width}&q=${this.quality}&fm=webp&fit=crop`;
  }

  /**
   * Extrae anchos numéricos del array imageSizes
   */
  private extractWidths(): number[] {
    return this.imageSizes
      .map((size) => parseInt(size.replace('w', ''), 10))
      .filter((width) => !isNaN(width))
      .sort((a, b) => a - b);
  }
}
