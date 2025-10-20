import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterOutlet, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from './core/services/auth.service';
import { CarsCompareService } from './core/services/cars-compare.service';
import { PwaService } from './core/services/pwa.service';
import { PendingReviewsBannerComponent } from './shared/components/pending-reviews-banner/pending-reviews-banner.component';
import { SplashLoaderComponent } from './shared/components/splash-loader/splash-loader.component';
import { PwaInstallPromptComponent } from './shared/components/pwa-install-prompt/pwa-install-prompt.component';
import { PwaUpdatePromptComponent } from './shared/components/pwa-update-prompt/pwa-update-prompt.component';
import { VerificationBadgeComponent } from './shared/components/verification-badge/verification-badge.component';
import { LanguageSelectorComponent } from './shared/components/language-selector/language-selector.component';

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
    SplashLoaderComponent,
    PwaInstallPromptComponent,
    PwaUpdatePromptComponent,
    VerificationBadgeComponent,
    LanguageSelectorComponent,
  ],
  templateUrl: './app.component.html',
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly compareService = inject(CarsCompareService);
  private readonly pwaService = inject(PwaService);
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

  readonly isAuthenticatedSig = this.authService.isAuthenticated;
  readonly compareCountSig = computed(() => this.compareService.count());
  readonly sidebarOpen = signal(false);
  readonly darkMode = signal(false);
  readonly fullBleedLayout = signal(false);

  @ViewChild('menuButton', { read: ElementRef }) menuButton?: ElementRef<HTMLButtonElement>;
  @ViewChild('sidebarPanel', { read: ElementRef }) sidebarPanel?: ElementRef<HTMLElement>;

  year = new Date().getFullYear();

  // Splash loader state
  showSplash = signal(true);

  ngOnInit(): void {
    this.initializeSplash();
    this.initializeTheme();
    this.initializeLayoutWatcher();
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
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const useDark = stored ? stored === 'dark' : prefersDark;
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
      .subscribe(() => this.syncLayoutFromRoute(this.activatedRoute));
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
    ).filter(element => !element.hasAttribute('disabled') && element.tabIndex !== -1);
  }
}
