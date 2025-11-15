import {
  Component,
  output,
  signal,
  OnInit,
  PLATFORM_ID,
  inject,
  effect,
  computed,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { UnreadMessagesService } from '../../../core/services/unread-messages.service';
import { AuthService } from '../../../core/services/auth.service';

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  badge?: number;
  route?: string;
}

export interface DashboardItem {
  id: string;
  label: string;
  icon: string;
  route?: string;
}

/**
 * Bottom Navigation Bar - Facebook Style
 * Fixed bottom bar with icons in a row
 */
@Component({
  selector: 'app-bottom-nav-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Bottom Navigation Bar -->
    <nav class="bottom-nav">
      @for (item of navItems(); track item.id) {
        <button
          class="nav-item"
          [class.active]="activeItem() === item.id"
          (click)="handleNavClick(item)"
        >
          <div class="nav-icon-wrapper">
            <span class="nav-icon">{{ item.icon }}</span>
            @if (item.badge && item.badge > 0) {
              <span class="nav-badge">{{ item.badge > 9 ? '9+' : item.badge }}</span>
            }
          </div>
          <span class="nav-label">{{ item.label }}</span>
        </button>
      }

      <!-- Dashboard Button -->
      <button class="nav-item dashboard-btn" (click)="openDashboard()">
        <div class="nav-icon-wrapper">
          <span class="nav-icon">📊</span>
        </div>
        <span class="nav-label">Más</span>
      </button>
    </nav>

    <!-- Dashboard Modal -->
    @if (showDashboard()) {
      <div class="dashboard-overlay" (click)="closeDashboard()">
        <div class="dashboard-modal" (click)="$event.stopPropagation()">
          <div class="dashboard-header">
            <h3>Dashboard</h3>
            <button class="close-btn" (click)="closeDashboard()">✕</button>
          </div>

          <div class="dashboard-grid">
            @for (item of dashboardItems; track item.id) {
              <button class="dashboard-item" (click)="handleDashboardClick(item)">
                <span class="dashboard-icon">{{ item.icon }}</span>
                <span class="dashboard-label">{{ item.label }}</span>
              </button>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      :host {
        display: block !important;
        position: fixed !important;
        bottom: 0 !important;
        left: 0 !important;
        right: 0 !important;
        width: 100% !important;
        z-index: 99999 !important;
        pointer-events: auto !important;
        transform: translate3d(0, 0, 0) !important;
        will-change: transform !important;
      }

      /* Bottom Navigation Bar - Glassmorphism Effect */
      .bottom-nav {
        position: relative;
        width: 100%;
        display: flex;
        align-items: stretch;
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(20px) saturate(180%);
        -webkit-backdrop-filter: blur(20px) saturate(180%);
        border-top: 1px solid rgba(188, 188, 188, 0.3);
        padding-bottom: env(safe-area-inset-bottom, 0);
        box-shadow:
          0 -4px 24px rgba(0, 0, 0, 0.08),
          0 -1px 2px rgba(0, 0, 0, 0.04),
          inset 0 1px 0 rgba(255, 255, 255, 0.5);
      }

      /* Navigation Items - Professional Animations */
      .nav-item {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4px;
        padding: 12px 8px;
        background: transparent;
        border: none;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        overflow: hidden;
        -webkit-tap-highlight-color: transparent;
      }

      /* Ripple Effect */
      .nav-item::before {
        content: '';
        position: absolute;
        inset: 0;
        background: radial-gradient(circle, rgba(167, 216, 244, 0.3) 0%, transparent 70%);
        transform: scale(0);
        opacity: 0;
        transition:
          transform 0.6s cubic-bezier(0.4, 0, 0.2, 1),
          opacity 0.3s;
      }

      .nav-item:active::before {
        transform: scale(2);
        opacity: 1;
        transition:
          transform 0s,
          opacity 0s;
      }

      .nav-item:active {
        transform: scale(0.92);
        background: rgba(248, 244, 236, 0.5);
      }

      .nav-item.active {
        color: #a7d8f4;
      }

      /* Active indicator line */
      .nav-item::after {
        content: '';
        position: absolute;
        top: 0;
        left: 50%;
        transform: translateX(-50%) scaleX(0);
        width: 32px;
        height: 3px;
        background: linear-gradient(90deg, #a7d8f4 0%, #75bae4 100%);
        border-radius: 0 0 3px 3px;
        transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      }

      .nav-item.active::after {
        transform: translateX(-50%) scaleX(1);
      }

      /* Spring animation on icon */
      .nav-item.active .nav-icon {
        animation: iconBounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
      }

      @keyframes iconBounce {
        0% {
          transform: scale(1);
        }
        30% {
          transform: scale(1.3);
        }
        50% {
          transform: scale(0.95);
        }
        70% {
          transform: scale(1.1);
        }
        100% {
          transform: scale(1);
        }
      }

      .nav-item.dashboard-btn {
        background: linear-gradient(
          135deg,
          rgba(248, 244, 236, 0.6) 0%,
          rgba(223, 210, 191, 0.4) 100%
        );
        border-radius: 12px;
        margin: 4px;
      }

      .nav-item.dashboard-btn:hover {
        background: linear-gradient(
          135deg,
          rgba(248, 244, 236, 0.8) 0%,
          rgba(223, 210, 191, 0.6) 100%
        );
      }

      /* Icon Wrapper */
      .nav-icon-wrapper {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .nav-icon {
        font-size: 1.5rem;
        transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        line-height: 1;
        filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
      }

      .nav-item:active .nav-icon {
        filter: drop-shadow(0 4px 8px rgba(167, 216, 244, 0.4));
      }

      /* Badge - Animated with pulse */
      .nav-badge {
        position: absolute;
        top: -6px;
        right: -8px;
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 18px;
        height: 18px;
        padding: 0 4px;
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        color: white;
        font-size: 0.625rem;
        font-weight: 700;
        border-radius: 9px;
        border: 2px solid rgba(255, 255, 255, 0.95);
        box-shadow:
          0 2px 8px rgba(239, 68, 68, 0.4),
          0 0 0 0 rgba(239, 68, 68, 0.7);
        animation: badgePulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
      }

      @keyframes badgePulse {
        0%,
        100% {
          box-shadow:
            0 2px 8px rgba(239, 68, 68, 0.4),
            0 0 0 0 rgba(239, 68, 68, 0.7);
        }
        50% {
          box-shadow:
            0 2px 12px rgba(239, 68, 68, 0.6),
            0 0 0 8px rgba(239, 68, 68, 0);
        }
      }

      /* Label */
      .nav-label {
        font-size: 0.6875rem;
        font-weight: 500;
        color: #050505;
        text-align: center;
        line-height: 1;
      }

      .nav-item.active .nav-label {
        color: #a7d8f4;
        font-weight: 600;
      }

      /* Dashboard Modal - Professional Overlay */
      .dashboard-overlay {
        position: fixed;
        inset: 0;
        background: rgba(5, 5, 5, 0.6);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        z-index: 100000;
        display: flex;
        align-items: flex-end;
        animation: overlayFadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      }

      @keyframes overlayFadeIn {
        from {
          opacity: 0;
          backdrop-filter: blur(0px);
        }
        to {
          opacity: 1;
          backdrop-filter: blur(8px);
        }
      }

      .dashboard-modal {
        width: 100%;
        max-height: 80vh;
        background: linear-gradient(180deg, #ffffff 0%, #f8f4ec 100%);
        border-radius: 24px 24px 0 0;
        padding-bottom: env(safe-area-inset-bottom, 0);
        box-shadow:
          0 -20px 40px rgba(0, 0, 0, 0.15),
          0 -4px 12px rgba(0, 0, 0, 0.08);
        animation: modalSlideUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        overflow-y: auto;
        overflow-x: hidden;
      }

      @keyframes modalSlideUp {
        from {
          transform: translateY(100%) scale(0.95);
          opacity: 0;
        }
        to {
          transform: translateY(0) scale(1);
          opacity: 1;
        }
      }

      .dashboard-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 20px 24px;
        border-bottom: 1px solid #bcbcbc;
        position: sticky;
        top: 0;
        background: white;
        z-index: 1;
      }

      .dashboard-header h3 {
        font-size: 1.25rem;
        font-weight: 700;
        color: #050505;
        margin: 0;
      }

      .close-btn {
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f8f4ec;
        border: none;
        border-radius: 50%;
        font-size: 1.25rem;
        color: #050505;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .close-btn:hover {
        background: #dfd2bf;
        transform: rotate(90deg);
      }

      /* Dashboard Grid */
      .dashboard-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;
        padding: 24px;
      }

      .dashboard-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        padding: 20px 12px;
        background: linear-gradient(
          135deg,
          rgba(255, 255, 255, 0.9) 0%,
          rgba(248, 244, 236, 0.8) 100%
        );
        border: 1px solid rgba(188, 188, 188, 0.3);
        border-radius: 16px;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        overflow: hidden;
        box-shadow:
          0 2px 8px rgba(0, 0, 0, 0.04),
          inset 0 1px 0 rgba(255, 255, 255, 0.8);
      }

      .dashboard-item::before {
        content: '';
        position: absolute;
        inset: 0;
        background: radial-gradient(circle at center, rgba(167, 216, 244, 0.2) 0%, transparent 70%);
        opacity: 0;
        transition: opacity 0.3s;
      }

      .dashboard-item:hover::before {
        opacity: 1;
      }

      .dashboard-item:hover {
        transform: translateY(-4px);
        border-color: rgba(167, 216, 244, 0.5);
        box-shadow:
          0 8px 24px rgba(0, 0, 0, 0.12),
          inset 0 1px 0 rgba(255, 255, 255, 0.9);
      }

      .dashboard-item:active {
        transform: translateY(-2px) scale(0.96);
        background: linear-gradient(
          135deg,
          rgba(223, 210, 191, 0.9) 0%,
          rgba(223, 210, 191, 0.7) 100%
        );
        border-color: #a7d8f4;
      }

      .dashboard-icon {
        font-size: 2rem;
      }

      .dashboard-label {
        font-size: 0.875rem;
        font-weight: 500;
        color: #050505;
        text-align: center;
      }

      /* Responsive */
      @media (min-width: 768px) {
        .bottom-nav {
          max-width: 600px;
          left: 50%;
          transform: translateX(-50%);
          border-radius: 16px 16px 0 0;
        }

        .nav-label {
          font-size: 0.75rem;
        }

        .dashboard-modal {
          max-width: 600px;
          margin: 0 auto;
          border-radius: 24px;
          max-height: 90vh;
        }

        .dashboard-grid {
          grid-template-columns: repeat(4, 1fr);
        }
      }
    `,
  ],
})
export class BottomNavBarComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly unreadMessagesService = inject(UnreadMessagesService);
  private readonly authService = inject(AuthService);

  // Outputs
  navClick = output<NavItem>();
  dashboardClick = output<DashboardItem>();

  // State
  activeItem = signal('home');
  showDashboard = signal(false);

  // Real-time unread counts
  readonly unreadMessagesCount = computed(() => this.unreadMessagesService.totalUnreadCount());
  readonly isAuthenticated = computed(() => !!this.authService.session$());

  constructor() {
    // Update active item based on route changes
    if (this.isBrowser) {
      this.router.events
        .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
        .subscribe((event) => {
          this.updateActiveItemFromRoute(event.urlAfterRedirects);
        });
    }
  }

  ngOnInit(): void {
    // Fix body transform that breaks position:fixed
    if (this.isBrowser) {
      requestAnimationFrame(() => {
        document.body.style.setProperty('transform', 'none', 'important');
      });

      // Set initial active item from current route
      this.updateActiveItemFromRoute(this.router.url);
    }
  }

  private updateActiveItemFromRoute(url: string): void {
    // Check in order of specificity (most specific first)
    if (url === '/' || url.includes('/home')) {
      this.activeItem.set('home');
    } else if (url.includes('/messages')) {
      this.activeItem.set('messages');
    } else if (url.includes('/bookings')) {
      this.activeItem.set('bookings');
    } else if (url.includes('/wallet')) {
      this.activeItem.set('wallet');
    } else if (url.includes('/profile')) {
      this.activeItem.set('profile');
    } else if (url.includes('/cars')) {
      this.activeItem.set('cars');
    }
  }

  // Navigation items (6 buttons) with real-time counts
  readonly navItems = computed<NavItem[]>(() => {
    const unreadCount = this.unreadMessagesCount();
    return [
      { id: 'home', label: 'Inicio', icon: '🏠', route: '/home-v2' },
      { id: 'cars', label: 'Autos', icon: '🚗', badge: 3, route: '/cars' },
      { id: 'bookings', label: 'Reservas', icon: '📅', badge: 2, route: '/bookings' },
      { id: 'wallet', label: 'Billetera', icon: '💰', route: '/wallet' },
      {
        id: 'messages',
        label: 'Mensajes',
        icon: '💬',
        badge: unreadCount || undefined,
        route: '/messages',
      },
      { id: 'profile', label: 'Perfil', icon: '👤', route: '/profile' },
    ];
  });

  // Dashboard items (3x4 grid = 12 items)
  dashboardItems: DashboardItem[] = [
    { id: 'stats', label: 'Estadísticas', icon: '📊' },
    { id: 'calendar', label: 'Calendario', icon: '📆' },
    { id: 'earnings', label: 'Ganancias', icon: '💵' },
    { id: 'reviews', label: 'Reseñas', icon: '⭐' },
    { id: 'favorites', label: 'Favoritos', icon: '❤️' },
    { id: 'notifications', label: 'Notificaciones', icon: '🔔' },
    { id: 'help', label: 'Ayuda', icon: '❓' },
    { id: 'documents', label: 'Documentos', icon: '📄' },
    { id: 'insurance', label: 'Seguros', icon: '🛡️' },
    { id: 'payments', label: 'Pagos', icon: '💳' },
    { id: 'support', label: 'Soporte', icon: '🎧' },
    { id: 'referrals', label: 'Referidos', icon: '🎁' },
  ];

  handleNavClick(item: NavItem): void {
    this.activeItem.set(item.id);
    this.navClick.emit(item);

    // Haptic feedback with pattern
    if (this.isBrowser && 'vibrate' in navigator) {
      navigator.vibrate([10, 20, 5]);
    }

    // Navigate using Angular Router
    if (item.route && this.isBrowser) {
      this.router.navigate([item.route]).catch((err) => {
        console.error('Navigation error:', err);
      });
    }
  }

  openDashboard(): void {
    this.showDashboard.set(true);

    // Rich haptic feedback for modal opening
    if (this.isBrowser && 'vibrate' in navigator) {
      navigator.vibrate([15, 30, 10, 20, 8]);
    }
  }

  closeDashboard(): void {
    this.showDashboard.set(false);

    // Subtle haptic for closing
    if (this.isBrowser && 'vibrate' in navigator) {
      navigator.vibrate(8);
    }
  }

  handleDashboardClick(item: DashboardItem): void {
    this.dashboardClick.emit(item);
    this.closeDashboard();

    // Confirmation haptic
    if (this.isBrowser && 'vibrate' in navigator) {
      navigator.vibrate([12, 15, 8]);
    }

    // Navigate based on dashboard item
    if (this.isBrowser) {
      const routeMap: Record<string, string> = {
        stats: '/dashboard/stats',
        calendar: '/bookings',
        earnings: '/wallet/earnings',
        reviews: '/profile/reviews',
        favorites: '/cars/favorites',
        notifications: '/notifications',
        help: '/help',
        documents: '/profile/documents',
        insurance: '/insurance',
        payments: '/wallet/payments',
        support: '/support',
        referrals: '/referrals',
      };

      const route = routeMap[item.id];
      if (route) {
        this.router.navigate([route]).catch((err) => {
          console.warn(`Route ${route} not found:`, err);
        });
      }
    }
  }
}
