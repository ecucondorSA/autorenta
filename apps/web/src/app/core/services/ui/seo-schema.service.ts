import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { environment } from '@environment';
import type { FAQItem } from '@core/models';

/**
 * SEO Schema Service - Manages JSON-LD structured data
 *
 * Implements:
 * - Organization schema
 * - LocalBusiness schema (for car rental)
 * - FAQPage schema
 * - Product schema (for individual cars)
 * - BreadcrumbList schema
 */
@Injectable({
  providedIn: 'root',
})
export class SeoSchemaService {
  private readonly document = inject(DOCUMENT) as Document;
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private scriptElements: Map<string, HTMLScriptElement> = new Map();

  // ─── Organization Schema ────────────────────────────────────────────────
  setOrganizationSchema(): void {
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Autorentar',
      alternateName: 'Autorentar Alquiler entre Personas',
      url: 'https://autorentar.com.ar',
      logo: 'https://autorentar.com.ar/assets/logo/logo.svg',
      description:
        'Plataforma de alquiler de autos peer-to-peer en Argentina. Conectamos propietarios con conductores verificados.',
      foundingDate: '2024',
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: '+54-9-11-1234-5678',
        contactType: 'customer service',
        availableLanguage: ['Spanish', 'English'],
        areaServed: 'AR',
      },
      sameAs: [
        environment.socialMedia.instagram,
        environment.socialMedia.facebook,
        environment.socialMedia.twitter,
        environment.socialMedia.linkedin,
        environment.socialMedia.tiktok,
        environment.socialMedia.youtube,
      ],
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Buenos Aires',
        addressCountry: 'AR',
      },
    };

    this.addSchema('organization', schema);
  }

  // ─── Local Business Schema ──────────────────────────────────────────────
  setLocalBusinessSchema(): void {
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'CarRental',
      name: 'Autorentar',
      description:
        'Alquiler de autos entre personas en Argentina. Autos verificados, pagos seguros con MercadoPago, seguro incluido.',
      url: 'https://autorentar.com.ar',
      telephone: '+54-9-11-1234-5678',
      priceRange: '$$ - $$$',
      image: 'https://autorentar.com.ar/assets/og-image.jpg',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Buenos Aires',
        addressRegion: 'CABA',
        addressCountry: 'AR',
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: -34.6037,
        longitude: -58.3816,
      },
      openingHoursSpecification: {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        opens: '00:00',
        closes: '23:59',
      },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.8',
        reviewCount: '1250',
        bestRating: '5',
        worstRating: '1',
      },
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name: 'Autos disponibles',
        itemListElement: [
          {
            '@type': 'OfferCatalog',
            name: 'Económicos',
            itemListElement: [
              {
                '@type': 'Offer',
                itemOffered: {
                  '@type': 'Car',
                  name: 'Autos económicos',
                },
              },
            ],
          },
          {
            '@type': 'OfferCatalog',
            name: 'SUV',
            itemListElement: [
              {
                '@type': 'Offer',
                itemOffered: {
                  '@type': 'Car',
                  name: 'SUV y Camionetas',
                },
              },
            ],
          },
        ],
      },
    };

    this.addSchema('localBusiness', schema);
  }

  // ─── FAQ Schema ─────────────────────────────────────────────────────────
  setFAQSchema(faqs: FAQItem[]): void {
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })),
    };

    this.addSchema('faq', schema);
  }

  // ─── Product Schema (for individual car) ────────────────────────────────
  setCarProductSchema(car: {
    id: string;
    title: string;
    description: string;
    pricePerDay: number;
    currency: string;
    imageUrl: string;
    brand: string;
    model: string;
    year: number;
    ratingValue?: number;
    reviewCount?: number;
  }): void {
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: car.title,
      description: car.description,
      image: car.imageUrl,
      brand: {
        '@type': 'Brand',
        name: car.brand,
      },
      model: car.model,
      productionDate: car.year.toString(),
      offers: {
        '@type': 'Offer',
        priceCurrency: car.currency,
        price: car.pricePerDay,
        priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        availability: 'https://schema.org/InStock',
        url: `https://autorentar.com.ar/cars/${car.id}`,
        seller: {
          '@type': 'Organization',
          name: 'Autorentar',
        },
      },
      ...(car.ratingValue &&
        car.reviewCount && {
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: car.ratingValue,
          reviewCount: car.reviewCount,
          bestRating: 5,
          worstRating: 1,
        },
      }),
    };

    this.addSchema('product', schema);
  }

  // ─── Breadcrumb Schema ──────────────────────────────────────────────────
  setBreadcrumbSchema(items: Array<{ name: string; url: string }>): void {
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: item.url,
      })),
    };

    this.addSchema('breadcrumb', schema);
  }

  // ─── WebSite Schema (for search box) ────────────────────────────────────
  setWebSiteSchema(): void {
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Autorentar',
      url: 'https://autorentar.com.ar',
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: 'https://autorentar.com.ar/cars/list?q={search_term_string}',
        },
        'query-input': 'required name=search_term_string',
      },
    };

    this.addSchema('website', schema);
  }

  // ─── Remove Schema ──────────────────────────────────────────────────────
  removeSchema(id: string): void {
    const script = this.scriptElements.get(id);
    if (script && script.parentNode) {
      script.parentNode.removeChild(script);
      this.scriptElements.delete(id);
    }
  }

  // ─── Remove All Schemas ─────────────────────────────────────────────────
  removeAllSchemas(): void {
    this.scriptElements.forEach((script) => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    });
    this.scriptElements.clear();
  }

  // ─── Private: Add Schema to DOM ─────────────────────────────────────────
  private addSchema(id: string, schema: object): void {
    if (!this.isBrowser) return;

    // Remove existing schema with same ID
    this.removeSchema(id);

    // Create script element
    const script = this.document.createElement('script');
    script.type = 'application/ld+json';
    script.id = `schema-${id}`;
    script.text = JSON.stringify(schema);

    // Add to head
    this.document.head.appendChild(script);
    this.scriptElements.set(id, script);
  }

  // ─── Initialize All Schemas for Landing Page ────────────────────────────
  initializeLandingPageSchemas(faqs: FAQItem[]): void {
    this.setOrganizationSchema();
    this.setLocalBusinessSchema();
    this.setWebSiteSchema();
    this.setFAQSchema(faqs);
    this.setBreadcrumbSchema([
      { name: 'Inicio', url: 'https://autorentar.com.ar' },
      { name: 'Alquiler de Autos', url: 'https://autorentar.com.ar/cars' },
    ]);
  }
}
