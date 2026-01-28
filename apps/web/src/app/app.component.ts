import { NgOptimizedImage } from '@angular/common';
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
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { StatusBar, Style } from '@capacitor/status-bar';
import { TranslateModule } from '@ngx-translate/core';
import { filter } from 'rxjs';
import { AssetPreloaderService } from '@core/services/ui/asset-preloader.service';
import { AuthService } from '@core/services/auth/auth.service';
import { BookingApprovalService } from '@core/services/bookings/booking-approval.service';
import { CarsCompareService } from '@core/services/cars/cars-compare.service';
import { DebugService } from '@core/services/admin/debug.service';
import { HapticFeedbackService } from '@core/services/ui/haptic-feedback.service';
import { LocaleManagerService } from '@core/services/ui/locale-manager.service';
import { MapboxPreloaderService } from '@core/services/geo/mapbox-preloader.service';
import { MobileBottomNavPortalService } from '@core/services/ui/mobile-bottom-nav-portal.service';
import { ProfileService, UserProfile } from '@core/services/auth/profile.service';
import { PushNotificationService } from '@core/services/infrastructure/push-notification.service';
import { PwaService } from '@core/services/infrastructure/pwa.service';
import { NotificationsService } from '@core/services/infrastructure/user-notifications.service';
import { routeAnimations } from '@core/animations/route-animations'; // Importar animaciones
import { GuidedTourService } from './core/guided-tour';
import { FooterComponent } from './shared/components/footer/footer.component';
import { SeoFooterComponent } from './core/components/seo-footer/seo-footer.component';
import { HelpButtonComponent } from './shared/components/help-button/help-button.component';
import { LanguageSelectorComponent } from './shared/components/language-selector/language-selector.component';
import { NotificationsComponent } from './shared/components/notifications/notifications.component';
import { PendingReviewsBannerComponent } from './shared/components/pending-reviews-banner/pending-reviews-banner.component';
import { PwaInstallBannerComponent } from './shared/components/pwa-install-banner/pwa-install-banner.component';
import { PwaTitlebarComponent } from './shared/components/pwa-titlebar/pwa-titlebar.component';
import { PwaUpdatePromptComponent } from './shared/components/pwa-update-prompt/pwa-update-prompt.component';
import { ShareButtonComponent } from './shared/components/share-button/share-button.component';

import { DebugPanelComponent } from './shared/components/debug-panel/debug-panel.component';
import { HeaderIconComponent } from './shared/components/header-icon/header-icon.component';
import { IconComponent } from './shared/components/icon/icon.component';
import { MobileMenuDrawerComponent } from './shared/components/mobile-menu-drawer/mobile-menu-drawer.component';
import { SplashScreenComponent } from './shared/components/splash-screen/splash-screen.component';
import { VerificationBadgeComponent } from './shared/components/verification-badge/verification-badge.component';
import { VerificationPromptBannerComponent } from './shared/components/verification-prompt-banner/verification-prompt-banner.component';
import { ClickOutsideDirective } from './shared/directives/click-outside.directive';
import { OfflineBannerComponent } from './shared/components/offline-banner/offline-banner.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    NgOptimizedImage,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    TranslateModule,
    PendingReviewsBannerComponent,
    VerificationPromptBannerComponent,
    PwaInstallBannerComponent,
    PwaUpdatePromptComponent,
    PwaTitlebarComponent,
    VerificationBadgeComponent,
    LanguageSelectorComponent,
    HelpButtonComponent,
    NotificationsComponent,
    ShareButtonComponent,
    FooterComponent,
    SeoFooterComponent,
    IconComponent,
    SplashScreenComponent,
    MobileMenuDrawerComponent,
    HeaderIconComponent,
    ClickOutsideDirective,
    DebugPanelComponent,
    OfflineBannerComponent,
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
        background: #7b7b7b;
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
  animations: [routeAnimations], // Registrar la animación
})
export class AppComponent implements OnInit {
  // ... imports anteriores ...

  // Método para detectar la animación de la ruta
  prepareRoute(outlet: RouterOutlet) {
    return outlet && outlet.activatedRouteData && outlet.activatedRouteData['animation'];
  }

  private readonly authService = inject(AuthService);
  private readonly profileService = inject(ProfileService);
  private readonly assetPreloader = inject(AssetPreloaderService);
  private readonly mapboxPreloader = inject(MapboxPreloaderService);
  private readonly debugService = inject(DebugService); // Initialize early for e2e tests
  private readonly bookingApprovalService = inject(BookingApprovalService);

  readonly userEmail = this.authService.userEmail;
  private readonly compareService = inject(CarsCompareService);
  private readonly pwaService = inject(PwaService);
  private readonly guidedTour = inject(GuidedTourService);
  private readonly localeManager = inject(LocaleManagerService);
  private readonly pushNotificationService = inject(PushNotificationService);
  private readonly notificationsService = inject(NotificationsService);
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly mobileBottomNavPortal: MobileBottomNavPortalService = inject(
    MobileBottomNavPortalService,
  );
  private readonly contexts = inject(ChildrenOutletContexts);
  private readonly hapticService = inject(HapticFeedbackService); // Injected HapticFeedbackService
  private readonly isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

  readonly isAuthenticatedSig = this.authService.isAuthenticated;
  readonly unreadNotificationsCount = this.notificationsService.unreadCount;

  triggerHapticFeedback(): void {
    this.hapticService.selection();
  }
  readonly compareCountSig = computed(() => this.compareService.count());
  readonly sidebarOpen = signal(false);
  readonly profileMenuOpen = signal(false);
  readonly mobileMenuDrawerOpen = signal(false);

  // Legacy binding placeholder: UI no longer uses dark mode toggle, keep for template compatibility
  readonly darkMode = false;

  readonly fullBleedLayout = signal(false);
  readonly hideFooter = signal(false);
  readonly hideMobileNav = signal(false);
  readonly hideHeader = signal(false);
  readonly userProfile = signal<UserProfile | null>(null);
  readonly isOnVerificationPage = signal(false);
  readonly isHomePage = signal(false); // Header transparente en homepage
  readonly pendingApprovalCount = signal(0); // Contador de solicitudes pendientes para propietarios

  @ViewChild('menuButton', { read: ElementRef }) menuButton?: ElementRef<HTMLButtonElement>;
  @ViewChild('sidebarPanel', { read: ElementRef }) sidebarPanel?: ElementRef<HTMLElement>;
  @ViewChild('profileButton', { read: ElementRef }) profileButton?: ElementRef<HTMLButtonElement>;
  @ViewChild(SplashScreenComponent) splashScreen?: SplashScreenComponent;

  /**
   * Elements to exclude from profile menu click-outside detection
   */
  get profileMenuExcludedElements(): HTMLElement[] {
    return this.profileButton?.nativeElement ? [this.profileButton.nativeElement] : [];
  }

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

  openMobileMenuDrawer(): void {
    this.mobileMenuDrawerOpen.set(true);
  }

  closeMobileMenuDrawer(): void {
    this.mobileMenuDrawerOpen.set(false);
  }

  goToNotifications(): void {
    this.router.navigate(['/notifications']);
  }

  ngOnInit(): void {
    // SSR-safe: Only run browser-specific initialization in browser
    if (!this.isBrowser) {
      return;
    }

    this.handleOAuthCallbackRedirect();
    this.initializeTheme();
    this.initializeLayoutWatcher();
    this.loadUserProfile();
    this.loadPendingApprovalCount();
    this.pushNotificationService.initializePushNotifications();
    this.initializeLocalNotificationListeners();
    this.initializePushNotificationListeners();
    this.initializeProfileMenuCloseOnNavigation();
    this.checkVerificationPage(this.router.url);

    // Configurar Edge-to-Edge en móvil
    if (Capacitor.isNativePlatform()) {
      try {
        void StatusBar.setOverlaysWebView({ overlay: true });
        void StatusBar.setBackgroundColor({ color: '#00000000' }); // Transparent
        void StatusBar.setStyle({ style: Style.Dark }); // Dark icons on light background
      } catch (e) {
        console.warn('StatusBar not available', e);
      }
    }

    // Renderizar barra inferior movil directamente en body para evitar issues de stacking
    this.mobileBottomNavPortal.create();
    this.mobileBottomNavPortal.setHidden(this.hideMobileNav());
    this.destroyRef.onDestroy(() => this.mobileBottomNavPortal.destroy());

    // Subscribe to mobile menu drawer open event
    this.mobileBottomNavPortal.menuOpen$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.openMobileMenuDrawer());

    // Hide splash screen when app initialization is complete
    this.hideSplashWhenReady();
  }

  /**
   * Hide splash screen after initial app data is loaded
   */
  private hideSplashWhenReady(): void {
    // Use a small delay to ensure all initial data is loaded
    // This prevents the splash from hiding too quickly
    setTimeout(() => {
      if (this.splashScreen) {
        this.splashScreen.hideSplash();
      }
    }, 500);
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

    this.hideFooter.set(Boolean(current?.snapshot.data?.['hideFooter']));
    this.hideMobileNav.set(Boolean(current?.snapshot.data?.['hideMobileNav']));
    this.hideHeader.set(Boolean(current?.snapshot.data?.['hideHeader']));
    this.mobileBottomNavPortal.setHidden(this.hideMobileNav());

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

  private async loadPendingApprovalCount(): Promise<void> {
    if (!this.isAuthenticatedSig()) {
      this.pendingApprovalCount.set(0);
      return;
    }

    try {
      const pendingApprovals = await this.bookingApprovalService.getPendingApprovals();
      this.pendingApprovalCount.set(pendingApprovals.length);
    } catch {
      // Silently fail - badge will not show
      this.pendingApprovalCount.set(0);
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
   * Initialize listeners for local notification clicks
   * Handles navigation when user taps on a notification
   */
  private initializeLocalNotificationListeners(): void {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    // Listen for notification clicks
    LocalNotifications.addListener(
      'localNotificationActionPerformed',
      (action: {
        actionId: string;
        inputValue?: string;
        notification: { id: number; title?: string; body?: string; extra?: unknown };
      }) => {
        console.log('[Notification] Action performed:', action);

        const extra = action.notification.extra as
          | { route?: string; bookingId?: string }
          | undefined;

        if (extra?.route) {
          // Navigate to the specified route
          console.log('[Notification] Navigating to:', extra.route);
          this.router.navigate([extra.route], {
            queryParams: extra.bookingId ? { id: extra.bookingId } : undefined,
          });
        }
      },
    );

    // Listen for notifications received while app is open
    LocalNotifications.addListener(
      'localNotificationReceived',
      (notification: { id: number; title?: string; body?: string }) => {
        console.log('[Notification] Received while app open:', notification);
      },
    );
  }

  /**
   * Initialize listeners for push notification clicks (FCM)
   * Handles navigation when user taps on a push notification (works even when app was closed)
   */
  private initializePushNotificationListeners(): void {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    // Subscribe to push notification clicks
    this.pushNotificationService.notificationClicks$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(
        (action) => {
          const notificationAction = action as { action: string; notification?: { data?: Record<string, unknown> } };
          console.log('[Push] Notification action performed:', notificationAction);

          // Extract navigation data from notification
          const data = notificationAction.notification?.data as
            | { cta_link?: string; route?: string; bookingId?: string }
            | undefined;
          const route = data?.cta_link || data?.route;

          if (route) {
            console.log('[Push] Navigating to:', route);
            // Use setTimeout to ensure app is fully initialized after cold start
            setTimeout(() => {
              this.router.navigate([route], {
                queryParams: data?.bookingId ? { id: data.bookingId } : undefined,
              });
            }, 100);
          }
        },
      );

    // Subscribe to push messages received while app is open
    this.pushNotificationService.messages$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((message) => {
        console.log('[Push] Message received while app open:', message);
        // Optionally show an in-app notification or toast
      });
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
