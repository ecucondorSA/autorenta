import { Injectable, inject, PLATFORM_ID, DestroyRef } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

export interface MetaConfig {
  title?: string;
  description?: string;
  keywords?: string;
  author?: string;
  ogType?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogUrl?: string;
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player';
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  canonical?: string;
  noindex?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class MetaService {
  private readonly meta = inject(Meta);
  private readonly title = inject(Title);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  private readonly defaultConfig: MetaConfig = {
    title: 'AutoRenta - Alquiler de Autos entre Personas',
    description:
      'Alquiler de autos entre personas en Argentina y Uruguay. Plataforma peer-to-peer segura con wallet integrada.',
    keywords: 'alquiler autos, rent a car, argentina, uruguay, autorentar',
    author: 'AutoRenta',
    ogType: 'website',
    ogImage: 'https://autorentar.com/assets/images/autorentar-logo.png',
    twitterCard: 'summary_large_image',
  };

  constructor() {
    // Update canonical URL on navigation
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => {
        if (event instanceof NavigationEnd) {
          this.updateCanonicalUrl(event.urlAfterRedirects);
        }
      });
  }

  /**
   * Update all meta tags with provided configuration
   */
  updateMeta(config: MetaConfig): void {
    const fullConfig = { ...this.defaultConfig, ...config };

    // Update title
    if (fullConfig.title) {
      this.title.setTitle(fullConfig.title);
    }

    // Update meta tags
    if (fullConfig.description) {
      this.meta.updateTag({ name: 'description', content: fullConfig.description });
    }

    if (fullConfig.keywords) {
      this.meta.updateTag({ name: 'keywords', content: fullConfig.keywords });
    }

    if (fullConfig.author) {
      this.meta.updateTag({ name: 'author', content: fullConfig.author });
    }

    // Open Graph tags
    if (fullConfig.ogType) {
      this.meta.updateTag({ property: 'og:type', content: fullConfig.ogType });
    }

    if (fullConfig.ogTitle || fullConfig.title) {
      this.meta.updateTag({
        property: 'og:title',
        content: fullConfig.ogTitle || fullConfig.title!,
      });
    }

    if (fullConfig.ogDescription || fullConfig.description) {
      this.meta.updateTag({
        property: 'og:description',
        content: fullConfig.ogDescription || fullConfig.description!,
      });
    }

    if (fullConfig.ogImage) {
      this.meta.updateTag({ property: 'og:image', content: fullConfig.ogImage });
    }

    if (fullConfig.ogUrl) {
      this.meta.updateTag({ property: 'og:url', content: fullConfig.ogUrl });
    }

    // Twitter Card tags
    if (fullConfig.twitterCard) {
      this.meta.updateTag({ property: 'twitter:card', content: fullConfig.twitterCard });
    }

    if (fullConfig.twitterTitle || fullConfig.title) {
      this.meta.updateTag({
        property: 'twitter:title',
        content: fullConfig.twitterTitle || fullConfig.title!,
      });
    }

    if (fullConfig.twitterDescription || fullConfig.description) {
      this.meta.updateTag({
        property: 'twitter:description',
        content: fullConfig.twitterDescription || fullConfig.description!,
      });
    }

    if (fullConfig.twitterImage || fullConfig.ogImage) {
      this.meta.updateTag({
        property: 'twitter:image',
        content: fullConfig.twitterImage || fullConfig.ogImage!,
      });
    }

    // Noindex robots meta
    if (fullConfig.noindex) {
      this.meta.updateTag({ name: 'robots', content: 'noindex, nofollow' });
    } else {
      this.meta.updateTag({ name: 'robots', content: 'index, follow' });
    }

    // Canonical URL
    if (fullConfig.canonical) {
      this.updateCanonicalUrl(fullConfig.canonical);
    }
  }

  /**
   * Update meta tags for car detail page
   */
  updateCarDetailMeta(car: {
    title: string;
    description: string;
    main_photo_url?: string;
    price_per_day: number;
    currency: string;
    id: string;
  }): void {
    const priceFormatted = (car.price_per_day / 100).toFixed(0);

    this.updateMeta({
      title: `${car.title} - Desde $${priceFormatted}/día | AutoRenta`,
      description: car.description.substring(0, 160) + '...',
      keywords: `${car.title}, alquiler auto, rent a car, ${car.currency}`,
      ogType: 'product',
      ogTitle: car.title,
      ogDescription: `Alquila este auto desde $${priceFormatted} por día. ${car.description.substring(0, 100)}`,
      ogImage: car.main_photo_url || this.defaultConfig.ogImage,
      ogUrl: `https://autorentar.com/cars/${car.id}`,
      twitterCard: 'summary_large_image',
      canonical: `/cars/${car.id}`,
    });
  }

  /**
   * Update meta tags for search/list page
   */
  updateCarsListMeta(filters?: { city?: string; minPrice?: number; maxPrice?: number }): void {
    let title = 'Buscar Autos para Alquilar | AutoRenta';
    let description =
      'Encuentra el auto perfecto para tu viaje. Más de 100 autos disponibles para alquilar en Argentina y Uruguay.';

    if (filters?.city) {
      title = `Alquiler de Autos en ${filters.city} | AutoRenta`;
      description = `Encuentra autos para alquilar en ${filters.city}. Comparación de precios, reserva instantánea y seguro incluido.`;
    }

    this.updateMeta({
      title,
      description,
      keywords: filters?.city
        ? `alquiler autos ${filters.city}, rent a car ${filters.city}, autos ${filters.city}`
        : 'alquiler autos, buscar autos, rent a car, comparar precios',
      canonical: '/cars',
    });
  }

  /**
   * Update meta tags for wallet page
   */
  updateWalletMeta(): void {
    this.updateMeta({
      title: 'Mi Wallet - Gestiona tu Saldo | AutoRenta',
      description:
        'Gestiona tu saldo, deposita fondos y retira ganancias de forma segura con AutoRenta Wallet.',
      keywords: 'wallet, saldo, depositar, retirar, mercado pago',
      noindex: true, // Private page
    });
  }

  /**
   * Update meta tags for booking detail page
   */
  updateBookingDetailMeta(bookingId: string): void {
    this.updateMeta({
      title: `Reserva #${bookingId.substring(0, 8)} - Detalles | AutoRenta`,
      description:
        'Detalles de tu reserva de auto. Información de pago, fechas y datos del vehículo.',
      keywords: 'reserva, booking, alquiler confirmado',
      noindex: true, // Private page
    });
  }

  /**
   * Update meta tags for profile page
   */
  updateProfileMeta(): void {
    this.updateMeta({
      title: 'Mi Perfil - Configuración de Cuenta | AutoRenta',
      description:
        'Gestiona tu perfil, verifica tu identidad y configura tus preferencias en AutoRenta.',
      keywords: 'perfil, cuenta, configuración, verificación',
      noindex: true, // Private page
    });
  }

  /**
   * Update canonical URL
   */
  private updateCanonicalUrl(url: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    let link: HTMLLinkElement | null = document.querySelector("link[rel='canonical']");

    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }

    const baseUrl = 'https://autorentar.com';
    link.setAttribute('href', `${baseUrl}${url}`);
  }

  /**
   * Add JSON-LD structured data to page
   */
  addStructuredData(
    type: 'Product' | 'Organization' | 'WebSite',
    data: Record<string, unknown>,
  ): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    let script: HTMLScriptElement | null = document.querySelector(
      `script[type='application/ld+json'][data-type='${type}']`,
    );

    if (!script) {
      script = document.createElement('script');
      script.setAttribute('type', 'application/ld+json');
      script.setAttribute('data-type', type);
      document.head.appendChild(script);
    }

    const structuredData = {
      '@context': 'https://schema.org',
      '@type': type,
      ...data,
    };

    script.textContent = JSON.stringify(structuredData, null, 2);
  }

  /**
   * Add Product structured data for car detail page
   */
  addCarProductData(car: {
    title: string;
    description: string;
    main_photo_url?: string;
    price_per_day: number;
    currency: string;
    id: string;
    rating_avg?: number;
    rating_count?: number;
    brand?: string;
    model?: string;
    year?: number;
  }): void {
    this.addStructuredData('Vehicle', {
      name: car.title,
      description: car.description,
      image:
        car.main_photo_url || 'https://autorentar.com/assets/images/autorentar-logo.png',
      brand: {
        '@type': 'Brand',
        name: car.brand || 'AutoRenta',
      },
      model: car.model,
      productionDate: car.year,
      offers: {
        '@type': 'Offer',
        price: (car.price_per_day / 100).toFixed(2),
        priceCurrency: car.currency,
        availability: 'https://schema.org/InStock',
        url: `https://autorentar.com/cars/${car.id}`,
      },
      aggregateRating:
        car.rating_count && car.rating_count > 0
          ? {
              '@type': 'AggregateRating',
              ratingValue: car.rating_avg?.toFixed(1) || '0',
              reviewCount: car.rating_count.toString(),
            }
          : undefined,
    });
  }

  /**
   * Reset to default meta tags
   */
  resetMeta(): void {
    this.updateMeta(this.defaultConfig);
  }
}
