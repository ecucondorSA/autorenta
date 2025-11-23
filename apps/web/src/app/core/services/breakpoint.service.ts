import { isPlatformBrowser } from '@angular/common';
import { Injectable, Signal, computed, effect, inject, PLATFORM_ID } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { fromEvent, map, startWith, throttleTime, of } from 'rxjs';

/**
 * Breakpoints centralizados - Alineados con Tailwind CSS
 * @see apps/web/tailwind.config.js
 */
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

/**
 * Servicio centralizado para manejo de breakpoints responsivos
 *
 * @example
 * ```ts
 * export class MyComponent {
 *   private breakpoint = inject(BreakpointService);
 *
 *   // Señales reactivas
 *   isMobile = this.breakpoint.isMobile;
 *   isDesktop = this.breakpoint.isDesktop;
 *
 *   // Métodos helper
 *   showMobileNav = computed(() => this.isMobile() && this.hasUser());
 * }
 * ```
 *
 * @example
 * ```html
 * @if (breakpoint.isMobile()) {
 *   <app-mobile-nav />
 * } @else {
 *   <app-desktop-nav />
 * }
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class BreakpointService {
  /** Ancho actual de la ventana */
  readonly width: Signal<number>;

  /** < 768px - Mobile phones */
  readonly isMobile: Signal<boolean>;

  /** >= 768px && < 1024px - Tablets */
  readonly isTablet: Signal<boolean>;

  /** >= 1024px - Desktop */
  readonly isDesktop: Signal<boolean>;

  /** < 640px - Small mobile (SE, Mini) */
  readonly isSmallMobile: Signal<boolean>;

  /** >= 1280px - Large desktop */
  readonly isLargeDesktop: Signal<boolean>;

  /** Orientación actual */
  readonly isPortrait: Signal<boolean>;
  readonly isLandscape: Signal<boolean>;

  /** Breakpoint actual como string */
  readonly current: Signal<Breakpoint>;

  constructor() {
    const platformId = inject(PLATFORM_ID);
    const isBrowser = isPlatformBrowser(platformId);

    // Default width for SSR (desktop first approach or mobile first, here using desktop)
    const defaultWidth = isBrowser ? window.innerWidth : 1024;

    // Observable del resize con throttle para performance
    const resize$ = isBrowser
      ? fromEvent(window, 'resize').pipe(
          throttleTime(150, undefined, { leading: true, trailing: true }),
          map(() => window.innerWidth),
          startWith(window.innerWidth),
        )
      : of(defaultWidth); // Static value for SSR

    // Convertir a signal
    this.width = toSignal(resize$, { initialValue: defaultWidth });

    // Signals computados para cada breakpoint
    this.isMobile = computed(() => this.width() < BREAKPOINTS.md);
    this.isTablet = computed(() => this.width() >= BREAKPOINTS.md && this.width() < BREAKPOINTS.lg);
    this.isDesktop = computed(() => this.width() >= BREAKPOINTS.lg);
    this.isSmallMobile = computed(() => this.width() < BREAKPOINTS.sm);
    this.isLargeDesktop = computed(() => this.width() >= BREAKPOINTS.xl);

    // Orientación
    this.isPortrait = computed(() => (isBrowser ? window.innerHeight > window.innerWidth : false));
    this.isLandscape = computed(() => (isBrowser ? window.innerHeight <= window.innerWidth : true));

    // Breakpoint actual
    this.current = computed(() => {
      const w = this.width();
      if (w < BREAKPOINTS.sm) return 'sm';
      if (w < BREAKPOINTS.md) return 'md';
      if (w < BREAKPOINTS.lg) return 'lg';
      if (w < BREAKPOINTS.xl) return 'xl';
      return '2xl';
    });
  }

  /**
   * Verifica si el ancho actual es mayor o igual al breakpoint
   * @param breakpoint Breakpoint a verificar
   */
  isAtLeast(breakpoint: Breakpoint): boolean {
    return this.width() >= BREAKPOINTS[breakpoint];
  }

  /**
   * Verifica si el ancho actual es menor al breakpoint
   * @param breakpoint Breakpoint a verificar
   */
  isBelow(breakpoint: Breakpoint): boolean {
    return this.width() < BREAKPOINTS[breakpoint];
  }

  /**
   * Verifica si el ancho está entre dos breakpoints
   * @param min Breakpoint mínimo (inclusive)
   * @param max Breakpoint máximo (exclusive)
   */
  isBetween(min: Breakpoint, max: Breakpoint): boolean {
    const w = this.width();
    return w >= BREAKPOINTS[min] && w < BREAKPOINTS[max];
  }

  /**
   * Observa cambios en un breakpoint específico
   * @param breakpoint Breakpoint a observar
   * @param callback Función a ejecutar cuando cambie
   * @returns Función para cancelar la observación
   *
   * @example
   * ```ts
   * ngOnInit() {
   *   this.cleanup = this.breakpoint.observe('md', (matches) => {
   *     console.log('Mobile:', matches);
   *   });
   * }
   *
   * ngOnDestroy() {
   *   this.cleanup?.();
   * }
   * ```
   */
  observe(breakpoint: Breakpoint, callback: (matches: boolean) => void): () => void {
    const isMatch = computed(() => this.width() >= BREAKPOINTS[breakpoint]);
    const effectRef = effect(() => callback(isMatch()));
    return () => effectRef.destroy();
  }
}
