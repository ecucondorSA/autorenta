import { CommonModule, NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ActivatedRoute,
  ChildrenOutletContexts,
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { filter } from 'rxjs';
import { GuidedTourService } from './core/guided-tour';
import { AssetPreloaderService } from './core/services/asset-preloader.service';
import { AuthService } from './core/services/auth.service';
import { CarsCompareService } from './core/services/cars-compare.service';
import { LocaleManagerService } from './core/services/locale-manager.service';
import { MapboxPreloaderService } from './core/services/mapbox-preloader.service';
import { MobileBottomNavPortalService } from './core/services/mobile-bottom-nav-portal.service';
import { ProfileService, UserProfile } from './core/services/profile.service';
import { PushNotificationService } from './core/services/push-notification.service';
import { PwaService } from './core/services/pwa.service';
import { FooterComponent } from './shared/components/footer/footer.component';
import { HelpButtonComponent } from './shared/components/help-button/help-button.component';
import { LanguageSelectorComponent } from './shared/components/language-selector/language-selector.component';
import { NotificationsComponent } from './shared/components/notifications/notifications.component';
import { PendingReviewsBannerComponent } from './shared/components/pending-reviews-banner/pending-reviews-banner.component';
import { PwaInstallBannerComponent } from './shared/components/pwa-install-banner/pwa-install-banner.component';
import { PwaInstallPromptComponent } from './shared/components/pwa-install-prompt/pwa-install-prompt.component';
import { PwaTitlebarComponent } from './shared/components/pwa-titlebar/pwa-titlebar.component';
import { PwaUpdatePromptComponent } from './shared/components/pwa-update-prompt/pwa-update-prompt.component';
import { ShareButtonComponent } from './shared/components/share-button/share-button.component';

import { VerificationBadgeComponent } from './shared/components/verification-badge/verification-badge.component';
import { VerificationPromptBannerComponent } from './shared/components/verification-prompt-banner/verification-prompt-banner.component';
import { IconComponent } from './shared/components/icon/icon.component';
import { SplashScreenComponent } from './shared/components/splash-screen/splash-screen.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    NgOptimizedImage,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    TranslateModule,
    PendingReviewsBannerComponent,
    VerificationPromptBannerComponent,

    PwaInstallPromptComponent,
    PwaInstallBannerComponent,
    PwaUpdatePromptComponent,
    PwaTitlebarComponent,
    VerificationBadgeComponent,
    LanguageSelectorComponent,
    HelpButtonComponent,
    NotificationsComponent,
    ShareButtonComponent,
    FooterComponent,
    IconComponent,
    SplashScreenComponent,
  ],
  templateUrl: './app.component.html',
  styles: [
    `
      :host {
        display: block;
        /* Asegurar que app-root no cree nuevo stacking context */
        transform: none !important;
        will-change: auto !important;
        isolation: auto !important;
      }

      /* Fix for bottom nav bar - ensure body doesn't have transform */
      :host-context(body) {
        transform: none !important;
      }

      /* Custom scrollbar para el dropdown del perfil */
      [data-profile-menu]::-webkit-scrollbar {
        width: 6px;
      }

      [data-profile-menu]::-webkit-scrollbar-track {
        background: transparent;
      }

      [data-profile-menu]::-webkit-scrollbar-thumb {
        background: rgba(0, 0, 0, 0.2);
        border-radius: 3px;
      }

      [data-profile-menu]::-webkit-scrollbar-thumb:hover {
        background: rgba(0, 0, 0, 0.3);
      }



      /* Firefox scrollbar */
      [data-profile-menu] {
        scrollbar-width: thin;
        scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
      }



      /* Header en home: usa colores de tokens, sin forzar blanco ni gradientes */
      .header-transparent {
        color: var(--text-primary) !important;
        background: rgba(255, 255, 255, 0.12);
        backdrop-filter: blur(18px);
        border: 1px solid rgba(255, 255, 255, 0.25);
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.25);
      }

      .header-transparent * {
        color: inherit !important;
      }

      .header-transparent svg {
        stroke: currentColor !important;
      }

      .header-transparent img {
        filter: none !important;
      }

      .header-transparent .nav-link,
      .header-transparent .nav-link-primary,
      .header-transparent .nav-link-highlight,
      .header-transparent .icon-button {
        color: var(--text-primary) !important;
      }

      .header-transparent .nav-link:hover,
      .header-transparent .nav-link-primary:hover,
      .header-transparent .icon-button:hover {
        background-color: var(--surface-secondary);
      }

      .header-transparent .nav-link-highlight {
        background: var(--warning-300);
        color: var(--text-primary);
        box-shadow: none;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly profileService = inject(ProfileService);
  private readonly assetPreloader = inject(AssetPreloaderService);
  private readonly mapboxPreloader = inject(MapboxPreloaderService);

  readonly userEmail = this.authService.userEmail;
  private readonly compareService = inject(CarsCompareService);
  private readonly pwaService = inject(PwaService);
  private readonly guidedTour = inject(GuidedTourService);
  private readonly localeManager = inject(LocaleManagerService);
  private readonly pushNotificationService = inject(PushNotificationService);
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly mobileBottomNavPortal: MobileBottomNavPortalService = inject(
    MobileBottomNavPortalService,
  );
  private readonly contexts = inject(ChildrenOutletContexts);
  private readonly isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

  readonly isAuthenticatedSig = this.authService.isAuthenticated;
  readonly compareCountSig = computed(() => this.compareService.count());
  readonly sidebarOpen = signal(false);
  readonly profileMenuOpen = signal(false);

  // Legacy binding placeholder: UI no longer uses dark mode toggle, keep for template compatibility
  readonly darkMode = false;

  readonly fullBleedLayout = signal(false);
  readonly userProfile = signal<UserProfile | null>(null);
  readonly isOnVerificationPage = signal(false);
  readonly isHomePage = signal(false); // Header transparente en homepage

  @ViewChild('menuButton', { read: ElementRef }) menuButton?: ElementRef<HTMLButtonElement>;
  @ViewChild('sidebarPanel', { read: ElementRef }) sidebarPanel?: ElementRef<HTMLElement>;

  year = new Date().getFullYear();


  toggleSidebar(): void {
    this.sidebarOpen.update((v) => !v);
    this.syncSidebarSideEffects(this.sidebarOpen());
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
    this.syncSidebarSideEffects(false);
  }

  async signOut(): Promise<void> {
    await this.authService.signOut();
    this.closeProfileMenu();
    this.router.navigate(['/']);
  }

  onSidebarKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.closeSidebar();
    }
  }



  toggleProfileMenu(): void {
    this.profileMenuOpen.update((v) => !v);
  }

  closeProfileMenu(): void {
    this.profileMenuOpen.set(false);
  }

  ngOnInit(): void {
    this.handleOAuthCallbackRedirect();
    this.initializeTheme();
    this.initializeLayoutWatcher();
    this.loadUserProfile();
    this.pushNotificationService.initializePushNotifications();
    this.initializeProfileMenuCloseOnNavigation();
    this.checkVerificationPage(this.router.url);

    // Renderizar barra inferior móvil directamente en body para evitar issues de stacking
    this.mobileBottomNavPortal.create();
    this.destroyRef.onDestroy(() => this.mobileBottomNavPortal.destroy());
  }

  private initializeTheme(): void {
    if (!this.isBrowser) {
      return;
    }
    localStorage.setItem('theme', 'light');
    document.documentElement.classList.remove('dark');
    window.dispatchEvent(new CustomEvent('autorenta:theme-change', { detail: { dark: false } }));
  }

  private initializeLayoutWatcher(): void {
    this.syncLayoutFromRoute(this.activatedRoute);
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.syncLayoutFromRoute(this.activatedRoute);
        this.checkVerificationPage(this.router.url);
      });
  }

  private initializeProfileMenuCloseOnNavigation(): void {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.profileMenuOpen.set(false);
      });
  }

  private syncLayoutFromRoute(route: ActivatedRoute): void {
    let current: ActivatedRoute | null = route;

    while (current?.firstChild) {
      current = current.firstChild;
    }

    const layout = current?.snapshot.data?.['layout'];
    this.fullBleedLayout.set(layout === 'full-bleed');

    // Detectar si estamos en el homepage para header transparente
    const currentUrl = this.router.url.split('?')[0]; // Ignorar query params
    const isHome = currentUrl === '/' || currentUrl === '';
    this.isHomePage.set(isHome);
  }

  private syncSidebarSideEffects(open: boolean): void {
    if (!this.isBrowser) {
      return;
    }

    document.documentElement.classList.toggle('overflow-hidden', open);

    if (open) {
      queueMicrotask(() => {
        const target = this.getSidebarFocusableElements()[0] ?? this.sidebarPanel?.nativeElement;
        target?.focus({ preventScroll: true });
      });
    } else {
      queueMicrotask(() => this.menuButton?.nativeElement.focus());
    }
  }

  private getSidebarFocusableElements(): HTMLElement[] {
    if (!this.sidebarPanel) {
      return [];
    }

    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',');

    return Array.from(
      this.sidebarPanel.nativeElement.querySelectorAll<HTMLElement>(focusableSelectors),
    ).filter((element) => !element.hasAttribute('disabled') && element.tabIndex !== -1);
  }

  private initializeWelcomeTour(): void {
    // NEW TOUR SYSTEM: Tours with autoStart: true will start automatically
    // No manual initialization needed! TourOrchestrator handles it.

    // Enable debug mode in development
    if (!this.isBrowser) {
      return;
    }

    const isDev = !window.location.hostname.includes('autorentar.com');
    if (isDev) {
      this.guidedTour.enableDebug();
    }

    // Tours are now managed by TourOrchestrator based on:
    // - autoStart flag in TourDefinition
    // - Guards (isHomePage, hasInventory, etc.)
    // - Triggers (route patterns, custom events)
    // - Throttle periods (won't show if already completed recently)
  }

  private async loadUserProfile(): Promise<void> {
    if (!this.isAuthenticatedSig()) {
      return;
    }

    try {
      const profile = await this.profileService.getCurrentProfile();
      this.userProfile.set(profile);
    } catch {
      // Silently fail - avatar will show placeholder
    }
  }

  private checkVerificationPage(url: string): void {
    // Hide verification banner on verification-related pages to avoid layout conflicts
    const verificationRoutes = [
      '/profile/verification',
      '/verification',
      '/verification/upload-documents',
    ];

    const isOnVerificationPage = verificationRoutes.some((route) => url.includes(route));

    this.isOnVerificationPage.set(isOnVerificationPage);
  }

  /**
   * Detecta tokens de OAuth en el hash de la URL y redirige a /auth/callback si es necesario
   * Esto maneja el caso donde Supabase redirige a la raíz (/) en lugar de /auth/callback
   */
  private handleOAuthCallbackRedirect(): void {
    if (!this.isBrowser) {
      return;
    }

    // Verificar si hay tokens de OAuth en el hash (access_token, refresh_token, etc.)
    const hash = window.location.hash;
    const hasOAuthTokens =
      hash.includes('access_token=') ||
      hash.includes('refresh_token=') ||
      hash.includes('provider_token=');

    // Solo redirigir si estamos en la raíz y no ya en /auth/callback
    const isRoot = window.location.pathname === '/' || window.location.pathname === '';
    const isNotCallback = !window.location.pathname.includes('/auth/callback');

    if (hasOAuthTokens && isRoot && isNotCallback) {
      // Redirigir a /auth/callback preservando el hash
      void this.router.navigate(['/auth/callback'], {
        fragment: hash.substring(1), // Remover el '#' del hash
        replaceUrl: true, // Reemplazar en el historial para evitar loops
      });
    }
  }
}
