import { CommonModule, DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnDestroy,
  OnInit,
  Output,
  EventEmitter,
  signal,
  PLATFORM_ID,
  NgZone,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { Subject, takeUntil, filter, fromEvent, throttleTime } from 'rxjs';
import { UnreadMessagesService } from '../../../core/services/unread-messages.service';
import { NavIconComponent } from '../nav-icon/nav-icon.component';

interface NavItem {
  id: string;
  label: string;
  icon: string;
  route: string;
  badgeSignal?: () => number;
  isMenuTrigger?: boolean;
}

@Component({
  selector: 'app-mobile-bottom-nav',
  standalone: true,
  imports: [CommonModule, RouterModule, NavIconComponent],
  templateUrl: './mobile-bottom-nav.component.html',
  styleUrls: ['./mobile-bottom-nav.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush, // ✅ Performance boost
  host: { class: 'block md:hidden' },
})
export class MobileBottomNavComponent implements OnInit, OnDestroy {
  private readonly unreadMessagesService = inject(UnreadMessagesService);
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly ngZone = inject(NgZone);
  private readonly destroy$ = new Subject<void>();

  @Output() menuOpen = new EventEmitter<void>();

  readonly currentRoute = signal<string>('');
  readonly isHidden = signal(false);

  private lastScrollY = 0;
  private readonly scrollThreshold = 50;
  private readonly scrollDelta = 10;

  readonly navItems: NavItem[] = [
    {
      id: 'rent',
      label: 'Alquilar',
      icon: 'nav-car', // Premium icon
      route: '/cars',
    },
    {
      id: 'publish',
      label: 'Publicar',
      icon: 'nav-plus', // Premium icon
      route: '/cars/publish',
    },
    {
      id: 'messages',
      label: 'Mensajes',
      icon: 'nav-message', // Premium icon
      route: '/messages',
      badgeSignal: () => this.unreadMessagesService.totalUnreadCount(),
    },
    {
      id: 'bookings',
      label: 'Reservas',
      icon: 'nav-calendar', // Premium icon
      route: '/bookings',
    },
    {
      id: 'menu',
      label: 'Menu',
      icon: 'nav-menu', // Premium icon (grid style)
      route: '',
      isMenuTrigger: true,
    },
  ];

  constructor(private router: Router) {
    // Detectar ruta actual con cleanup automático
    this.router.events.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.currentRoute.set(this.router.url);
    });

    // Reset nav visibility on route change
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.isHidden.set(false);
        this.lastScrollY = 0;
      });
  }

  ngOnInit(): void {
    this.setupScrollListener();
  }

  /**
   * Sets up scroll listener with throttling for performance
   * Hides nav on scroll down, shows on scroll up
   */
  private setupScrollListener(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // Run outside Angular zone for performance
    this.ngZone.runOutsideAngular(() => {
      fromEvent(window, 'scroll', { passive: true })
        .pipe(throttleTime(100), takeUntil(this.destroy$))
        .subscribe(() => {
          this.handleScroll();
        });
    });
  }

  private handleScroll(): void {
    const currentScrollY = window.scrollY;
    const scrollDiff = currentScrollY - this.lastScrollY;

    // Only react if scroll difference is significant
    if (Math.abs(scrollDiff) < this.scrollDelta) return;

    // Scrolling down and past threshold - hide nav
    if (scrollDiff > 0 && currentScrollY > this.scrollThreshold) {
      if (!this.isHidden()) {
        this.ngZone.run(() => this.isHidden.set(true));
      }
    }
    // Scrolling up - show nav
    else if (scrollDiff < 0) {
      if (this.isHidden()) {
        this.ngZone.run(() => this.isHidden.set(false));
      }
    }

    // At top of page - always show
    if (currentScrollY <= this.scrollThreshold) {
      if (this.isHidden()) {
        this.ngZone.run(() => this.isHidden.set(false));
      }
    }

    this.lastScrollY = currentScrollY;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  isActive(route: string): boolean {
    const current = this.currentRoute();
    return current === route || current.startsWith(route + '/');
  }

  /**
   * Navega con haptic feedback o abre menu
   * Funciona en dispositivos moviles con Capacitor
   */
  async navigateWithHaptic(event: Event, item: NavItem): Promise<void> {
    event.preventDefault();

    // Haptic feedback (solo funciona en movil nativo)
    try {
      if ('vibrate' in navigator) {
        navigator.vibrate(10);
      }
    } catch {
      // Silently fail en navegadores sin soporte
    }

    // If this is the menu trigger, emit event instead of navigating
    if (item.isMenuTrigger) {
      this.menuOpen.emit();
      return;
    }

    await this.router.navigate([item.route]);
  }

  getIcon(iconName: string): string {
    const icons: Record<string, string> = {
      // Icono innovador de exploración/búsqueda con ondas
      search:
        'M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z M10.5 7.5v6m3-3h-6',
      // Icono de publicar con efecto de subida/upload
      plus: 'M12 4.5v15m7.5-7.5h-15 M12 4.5a7.5 7.5 0 100 15 7.5 7.5 0 000-15z',
      // Icono de mensajes moderno con burbujas de chat
      message:
        'M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.338L3 20l1.186-3.302A8.973 8.973 0 013 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z',
      // Icono de reservas con reloj y calendario combinado
      calendar:
        'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z',
      // Icono de usuario/perfil moderno con círculo
      user: 'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z',
      // Iconos legacy para compatibilidad
      home: 'M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25',
      car: 'M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H18.75m-10.5 0H8.25m0 0H5.625c-.621 0-1.125-.504-1.125-1.125V8.25a1.125 1.125 0 011.125-1.125h12.75c.621 0 1.125.504 1.125 1.125v9.375c0 .621-.504 1.125-1.125 1.125H16.5m-8.25-6h7.5m-7.5 0v6m7.5-6v6',
    };
    return icons[iconName] || icons['home'];
  }

  /**
   * TrackBy function para optimizar *ngFor
   * Evita re-renderizado innecesario de items
   */
  trackByRoute(index: number, item: NavItem): string {
    return item.route;
  }
}
