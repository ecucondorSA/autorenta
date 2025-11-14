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
  AfterViewInit,
} from '@angular/core';
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterLink,
  RouterOutlet,
  RouterLinkActive,
} from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from './core/services/auth.service';
import { ProfileService } from './core/services/profile.service';
import { CarsCompareService } from './core/services/cars-compare.service';
import { PwaService } from './core/services/pwa.service';
import { GuidedTourService } from './core/guided-tour';
import { LocaleManagerService } from './core/services/locale-manager.service';
import { PushNotificationService } from './core/services/push-notification.service';
import { PendingReviewsBannerComponent } from './shared/components/pending-reviews-banner/pending-reviews-banner.component';
import { SplashLoaderComponent } from './shared/components/splash-loader/splash-loader.component';
import { PwaInstallPromptComponent } from './shared/components/pwa-install-prompt/pwa-install-prompt.component';
import { PwaUpdatePromptComponent } from './shared/components/pwa-update-prompt/pwa-update-prompt.component';
import { PwaTitlebarComponent } from './shared/components/pwa-titlebar/pwa-titlebar.component';
import { PwaInstallBannerComponent } from './shared/components/pwa-install-banner/pwa-install-banner.component';
import { VerificationBadgeComponent } from './shared/components/verification-badge/verification-badge.component';
import { VerificationPromptBannerComponent } from './shared/components/verification-prompt-banner/verification-prompt-banner.component';
import { LanguageSelectorComponent } from './shared/components/language-selector/language-selector.component';
import { HelpButtonComponent } from './shared/components/help-button/help-button.component';
import { MobileBottomNavComponent } from './shared/components/mobile-bottom-nav/mobile-bottom-nav.component';
import { NotificationsComponent } from './shared/components/notifications/notifications.component';
import { ShareButtonComponent } from './shared/components/share-button/share-button.component';
import { FooterComponent } from './shared/components/footer/footer.component';
import { Toast } from 'primeng/toast';

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
    SplashLoaderComponent,
    PwaInstallPromptComponent,
    PwaInstallBannerComponent,
    PwaUpdatePromptComponent,
    PwaTitlebarComponent,
    VerificationBadgeComponent,
    LanguageSelectorComponent,
    HelpButtonComponent,
    NotificationsComponent,
    MobileBottomNavComponent,
    ShareButtonComponent,
    FooterComponent,
    Toast,
  ],
  templateUrl: './app.component.html',
  styles: [
    `
      :host {
        display: block;
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

      @media (prefers-color-scheme: dark) {
        [data-profile-menu]::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
        }

        [data-profile-menu]::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      }

      /* Firefox scrollbar */
      [data-profile-menu] {
        scrollbar-width: thin;
        scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
      }

      @media (prefers-color-scheme: dark) {
        [data-profile-menu] {
          scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit, AfterViewInit {
  private readonly authService = inject(AuthService);
  private readonly profileService = inject(ProfileService);

  readonly userEmail = this.authService.userEmail;
  private readonly compareService = inject(CarsCompareService);
  private readonly pwaService = inject(PwaService);
  private readonly guidedTour = inject(GuidedTourService);
  private readonly localeManager = inject(LocaleManagerService);
  private readonly pushNotificationService = inject(PushNotificationService);
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

  readonly isAuthenticatedSig = this.authService.isAuthenticated;
  readonly compareCountSig = computed(() => this.compareService.count());
  readonly sidebarOpen = signal(false);
  readonly profileMenuOpen = signal(false);
  readonly darkMode = signal(false);
  readonly fullBleedLayout = signal(false);
  readonly userProfile = signal<Record<string, unknown> | null>(null);
  readonly isOnVerificationPage = signal(false);

  @ViewChild('menuButton', { read: ElementRef }) menuButton?: ElementRef<HTMLButtonElement>;
  @ViewChild('sidebarPanel', { read: ElementRef }) sidebarPanel?: ElementRef<HTMLElement>;

  year = new Date().getFullYear();

  // Splash loader state
  showSplash = signal(true);

  ngOnInit(): void {
    this.handleOAuthCallbackRedirect();
    this.initializeSplash();
    this.initializeTheme();
    this.initializeLayoutWatcher();
    this.loadUserProfile();
    this.pushNotificationService.initializePushNotifications();
    this.initializeProfileMenuCloseOnNavigation();
    this.checkVerificationPage(this.router.url);
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) {
      return;
    }

    // Wait for splash screen (4s) + initial render (1s) + buffer (1s)
    setTimeout(() => {
      this.initializeWelcomeTour();
    }, 6000);
  }

  toggleSidebar(): void {
    const next = !this.sidebarOpen();
    this.sidebarOpen.set(next);
    this.syncSidebarSideEffects(next);
  }

  closeSidebar(): void {
    if (!this.sidebarOpen()) {
      return;
    }
    this.sidebarOpen.set(false);
    this.syncSidebarSideEffects(false);
  }

  onSidebarKeydown(event: KeyboardEvent): void {
    if (!this.sidebarOpen()) {
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeSidebar();
      return;
    }

    if (event.key !== 'Tab') {
      return;
    }

    const focusable = this.getSidebarFocusableElements();

    if (focusable.length === 0) {
      event.preventDefault();
      this.sidebarPanel?.nativeElement.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const activeElement = document.activeElement;

    if (event.shiftKey && activeElement === first) {
      event.preventDefault();
      last.focus();
      return;
    }

    if (!event.shiftKey && activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  toggleDarkMode(): void {
    const next = !this.darkMode();
    this.darkMode.set(next);
    if (!this.isBrowser) {
      return;
    }
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
    window.dispatchEvent(new CustomEvent('autorenta:theme-change', { detail: { dark: next } }));
  }

  toggleProfileMenu(): void {
    const next = !this.profileMenuOpen();
    this.profileMenuOpen.set(next);
    if (next && this.isBrowser) {
      // Close menu when clicking outside
      setTimeout(() => {
        const handler = (event: MouseEvent) => {
          const target = event.target as HTMLElement;
          const profileMenu = document.querySelector('[data-profile-menu]');
          const profileButton = document.querySelector('[data-profile-button]');

          if (
            profileMenu &&
            profileButton &&
            !profileMenu.contains(target) &&
            !profileButton.contains(target)
          ) {
            this.closeProfileMenu();
            document.removeEventListener('click', handler);
          }
        };
        document.addEventListener('click', handler);
      }, 0);
    }
  }

  closeProfileMenu(): void {
    this.profileMenuOpen.set(false);
  }

  private initializeProfileMenuCloseOnNavigation(): void {
    if (!this.isBrowser) {
      return;
    }

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.closeProfileMenu();
      });
  }

  async signOut(): Promise<void> {
    this.closeProfileMenu();
    await this.authService.signOut();
    await this.router.navigate(['/']);
  }

  private initializeSplash(): void {
    if (!this.isBrowser) {
      this.showSplash.set(false);
      return;
    }

    const hasSeenSplash = sessionStorage.getItem('splash_shown');

    if (!hasSeenSplash) {
      setTimeout(() => {
        this.showSplash.set(false);
        sessionStorage.setItem('splash_shown', '1');
      }, 4000);
    } else {
      this.showSplash.set(false);
    }
  }

  private initializeTheme(): void {
    if (!this.isBrowser) {
      return;
    }

    const stored = localStorage.getItem('theme');
    const useDark = stored ? stored === 'dark' : false;

    if (!stored) {
      localStorage.setItem('theme', 'light');
    }

    this.darkMode.set(useDark);
    document.documentElement.classList.toggle('dark', useDark);
    window.dispatchEvent(new CustomEvent('autorenta:theme-change', { detail: { dark: useDark } }));
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

  private syncLayoutFromRoute(route: ActivatedRoute): void {
    let current: ActivatedRoute | null = route;

    while (current?.firstChild) {
      current = current.firstChild;
    }

    const layout = current?.snapshot.data?.['layout'];
    this.fullBleedLayout.set(layout === 'full-bleed');
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
      this.userProfile.set(profile as Record<string, unknown> | null);
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
