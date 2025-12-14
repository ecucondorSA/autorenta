import {Component, signal, output,
  ChangeDetectionStrategy} from '@angular/core';

import { Router } from '@angular/router';

export interface SidebarMenuItem {
  id: string;
  label: string;
  icon: string;
  route?: string;
  action?: () => void;
  badge?: number;
  color?: string;
}

/**
 * Facebook-style Sidebar Component
 * Mobile-first sidebar with 6 main buttons + dashboard button
 *
 * Features:
 * - iOS-style slide animation
 * - Avatar + user info at top
 * - 6 main navigation buttons
 * - Dashboard button with modal
 * - Backdrop overlay
 * - Gesture close support
 */
@Component({
  selector: 'app-facebook-sidebar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <!-- Backdrop -->
    @if (isOpen()) {
      <div class="sidebar-backdrop" (click)="close()" [@fadeIn]></div>
    }

    <!-- Sidebar Panel -->
    <aside
      class="sidebar-panel"
      [class.open]="isOpen()"
      role="navigation"
      aria-label="Main navigation"
    >
      <!-- Header con Avatar -->
      <div class="sidebar-header">
        <div class="user-profile">
          <div class="avatar">
            <img [src]="userAvatar()" [alt]="userName()" (error)="onImageError($event)" />
          </div>
          <div class="user-info">
            <h3 class="user-name">{{ userName() }}</h3>
            <p class="user-email">{{ userEmail() }}</p>
          </div>
        </div>

        <button class="close-btn" (click)="close()" aria-label="Cerrar menú">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M18 6L6 18M6 6L18 18"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
        </button>
      </div>

      <!-- Divider -->
      <div class="divider"></div>

      <!-- Main Menu - 6 Buttons -->
      <nav class="sidebar-menu">
        @for (item of menuItems; track item.id) {
          <button
            class="menu-item"
            (click)="handleMenuClick(item)"
            [class.active]="activeItem() === item.id"
          >
            <div class="menu-icon" [style.background]="item.color || '#A7D8F4'">
              <span class="icon-emoji">{{ item.icon }}</span>
            </div>
            <span class="menu-label">{{ item.label }}</span>
            @if (item.badge) {
              <span class="menu-badge">{{ item.badge }}</span>
            }
            <svg class="menu-arrow" width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M7 5L12 10L7 15"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
        }
      </nav>

      <!-- Divider -->
      <div class="divider"></div>

      <!-- Dashboard Button -->
      <button class="dashboard-btn" (click)="openDashboard()">
        <div class="dashboard-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="8" height="8" rx="2" stroke="currentColor" stroke-width="2" />
            <rect x="3" y="13" width="8" height="8" rx="2" stroke="currentColor" stroke-width="2" />
            <rect x="13" y="3" width="8" height="8" rx="2" stroke="currentColor" stroke-width="2" />
            <rect
              x="13"
              y="13"
              width="8"
              height="8"
              rx="2"
              stroke="currentColor"
              stroke-width="2"
            />
          </svg>
        </div>
        <div class="dashboard-text">
          <span class="dashboard-label">Ver más</span>
          <span class="dashboard-subtitle">Dashboard completo</span>
        </div>
        <svg class="dashboard-arrow" width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path
            d="M7 5L12 10L7 15"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>

      <!-- Footer -->
      <div class="sidebar-footer">
        <button class="footer-btn" (click)="handleSettings()">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="3" stroke="currentColor" stroke-width="1.5" />
            <path
              d="M10 1V3M10 17V19M19 10H17M3 10H1M16.07 3.93L14.66 5.34M5.34 14.66L3.93 16.07M16.07 16.07L14.66 14.66M5.34 5.34L3.93 3.93"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
          Configuración
        </button>
        <button class="footer-btn" (click)="handleLogout()">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M13 16L18 11M18 11L13 6M18 11H6M11 16C11 16.93 11 17.395 10.8978 17.7765C10.6204 18.8117 9.81173 19.6204 8.77646 19.8978C8.39496 20 7.92997 20 7 20H6.5C5.10218 20 4.40326 20 3.85195 19.7716C3.11687 19.4672 2.53284 18.8831 2.22836 18.1481C2 17.5967 2 16.8978 2 15.5V4.5C2 3.10217 2 2.40326 2.22836 1.85195C2.53284 1.11687 3.11687 0.532841 3.85195 0.228361C4.40326 0 5.10218 0 6.5 0H7C7.92997 0 8.39496 0 8.77646 0.102165C9.81173 0.37962 10.6204 1.18827 10.8978 2.22354C11 2.60504 11 3.07003 11 4"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          Cerrar sesión
        </button>
      </div>
    </aside>

    <!-- Dashboard Modal -->
    @if (showDashboard()) {
      <div class="dashboard-modal" (click)="closeDashboard()">
        <div class="dashboard-content" (click)="$event.stopPropagation()">
          <!-- Modal Header -->
          <div class="modal-header">
            <h2 class="modal-title">Dashboard</h2>
            <button class="modal-close" (click)="closeDashboard()">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M18 6L6 18M6 6L18 18"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                />
              </svg>
            </button>
          </div>

          <!-- Dashboard Grid -->
          <div class="dashboard-grid">
            @for (item of dashboardItems; track item.id) {
              <button
                class="dashboard-item"
                (click)="handleDashboardClick(item)"
                [style.background]="item.color"
              >
                <span class="dashboard-item-icon">{{ item.icon }}</span>
                <span class="dashboard-item-label">{{ item.label }}</span>
                @if (item.badge) {
                  <span class="dashboard-item-badge">{{ item.badge }}</span>
                }
              </button>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      /* Backdrop */
      .sidebar-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(5, 5, 5, 0.7);
        z-index: 998;
        animation: fadeIn 0.3s ease-out;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      /* Sidebar Panel */
      .sidebar-panel {
        position: fixed;
        top: 0;
        left: 0;
        bottom: 0;
        width: 340px;
        max-width: 85vw;
        background: white;
        z-index: 50;
        display: flex;
        flex-direction: column;
        transform: translateX(-100%);
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 4px 0 24px rgba(0, 0, 0, 0.15);
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
      }

      .sidebar-panel.open {
        transform: translateX(0);
      }

      /* Header */
      .sidebar-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        padding: 20px 16px;
        background: var(--cta-default, #a7d8f4);
      }

      .user-profile {
        display: flex;
        gap: 12px;
        flex: 1;
      }

      .avatar {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        overflow: hidden;
        border: 3px solid white;
        flex-shrink: 0;
      }

      .avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .user-info {
        flex: 1;
        min-width: 0;
      }

      .user-name {
        font-size: 1.125rem;
        font-weight: 700;
        color: var(--text-primary); /* Reemplazado hex con token semántico */
        margin: 0 0 4px 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .user-email {
        font-size: 0.875rem;
        color: var(--text-secondary, #4e4e4e); /* Reemplazado hex con token semántico */
        margin: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .close-btn {
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.2);
        border: none;
        border-radius: 50%;
        color: var(--text-primary); /* Reemplazado hex con token semántico */
        cursor: pointer;
        transition: all 0.2s ease;
        flex-shrink: 0;
      }

      .close-btn:hover {
        background: rgba(255, 255, 255, 0.3);
        transform: scale(1.05);
      }

      .close-btn:active {
        transform: scale(0.95);
      }

      /* Divider */
      .divider {
        height: 1px;
        background: #e3e3e3;
        margin: 8px 0;
      }

      /* Menu */
      .sidebar-menu {
        padding: 8px 0;
        flex: 1;
      }

      .menu-item {
        display: flex;
        align-items: center;
        gap: 12px;
        width: 100%;
        padding: 12px 16px;
        background: transparent;
        border: none;
        cursor: pointer;
        transition: background 0.2s ease;
        text-align: left;
      }

      .menu-item:hover {
        background: #f5f5f5;
      }

      .menu-item:active {
        background: #e3e3e3;
      }

      .menu-item.active {
        background: #f0f9fd;
      }

      .menu-icon {
        width: 48px;
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 12px;
        flex-shrink: 0;
      }

      .icon-emoji {
        font-size: 1.5rem;
      }

      .menu-label {
        flex: 1;
        font-size: 1rem;
        font-weight: 600;
        color: var(--text-primary); /* Reemplazado hex con token semántico */
      }

      .menu-badge {
        padding: 2px 8px;
        font-size: 0.75rem;
        font-weight: 700;
        color: white;
        background: #b25e5e;
        border-radius: 12px;
        min-width: 20px;
        text-align: center;
      }

      .menu-arrow {
        color: #bcbcbc;
        flex-shrink: 0;
      }

      /* Dashboard Button */
      .dashboard-btn {
        display: flex;
        align-items: center;
        gap: 12px;
        width: 100%;
        padding: 16px;
        background: #f8f4ec;
        border: none;
        cursor: pointer;
        transition: all 0.2s ease;
        margin: 8px 0;
      }

      .dashboard-btn:hover {
        background: #dfd2bf;
      }

      .dashboard-btn:active {
        transform: scale(0.98);
      }

      .dashboard-icon {
        width: 48px;
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: white;
        border-radius: 12px;
        color: #a7d8f4;
        flex-shrink: 0;
      }

      .dashboard-text {
        flex: 1;
        text-align: left;
      }

      .dashboard-label {
        display: block;
        font-size: 1rem;
        font-weight: 600;
        color: var(--text-primary); /* Reemplazado hex con token semántico */
        margin-bottom: 2px;
      }

      .dashboard-subtitle {
        display: block;
        font-size: 0.75rem;
        color: #4e4e4e;
      }

      .dashboard-arrow {
        color: #bcbcbc;
        flex-shrink: 0;
      }

      /* Footer */
      .sidebar-footer {
        padding: 16px;
        border-top: 1px solid #e3e3e3;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .footer-btn {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        font-size: 0.9375rem;
        font-weight: 500;
        color: #4e4e4e;
        background: transparent;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
        text-align: left;
      }

      .footer-btn:hover {
        background: #f5f5f5;
        color: var(--text-primary); /* Reemplazado hex con token semántico */
      }

      .footer-btn:active {
        background: #e3e3e3;
      }

      /* Dashboard Modal */
      .dashboard-modal {
        position: fixed;
        inset: 0;
        background: rgba(5, 5, 5, 0.8);
        z-index: 1000;
        display: flex;
        align-items: flex-end;
        animation: fadeIn 0.3s ease-out;
      }

      .dashboard-content {
        width: 100%;
        max-height: 80vh;
        background: white;
        border-radius: 24px 24px 0 0;
        padding: 24px 20px;
        animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        overflow-y: auto;
      }

      @keyframes slideUp {
        from {
          transform: translateY(100%);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }

      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
      }

      .modal-title {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--text-primary); /* Reemplazado hex con token semántico */
        margin: 0;
      }

      .modal-close {
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f5f5f5;
        border: none;
        border-radius: 50%;
        color: var(--text-primary); /* Reemplazado hex con token semántico */
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .modal-close:hover {
        background: #e3e3e3;
      }

      .modal-close:active {
        transform: scale(0.9);
      }

      /* Dashboard Grid */
      .dashboard-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;
      }

      .dashboard-item {
        aspect-ratio: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 16px 8px;
        background: #f8f4ec;
        border: none;
        border-radius: 16px;
        cursor: pointer;
        transition: all 0.2s ease;
        position: relative;
      }

      .dashboard-item:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
      }

      .dashboard-item:active {
        transform: translateY(-2px);
      }

      .dashboard-item-icon {
        font-size: 2rem;
      }

      .dashboard-item-label {
        font-size: 0.8125rem;
        font-weight: 600;
        color: var(--text-primary); /* Reemplazado hex con token semántico */
        text-align: center;
      }

      .dashboard-item-badge {
        position: absolute;
        top: 8px;
        right: 8px;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.6875rem;
        font-weight: 700;
        color: white;
        background: #b25e5e;
        border-radius: 50%;
      }

      /* Responsive */
      @media (min-width: 768px) {
        .sidebar-panel {
          width: 380px;
        }

        .dashboard-content {
          max-width: 600px;
          margin: 0 auto;
          border-radius: 24px;
        }

        .dashboard-modal {
          align-items: center;
        }

        .dashboard-grid {
          grid-template-columns: repeat(4, 1fr);
        }
      }
    `,
  ],
})
export class FacebookSidebarComponent {
  // State
  isOpen = signal(false);
  showDashboard = signal(false);
  activeItem = signal<string | null>(null);

  // User data (conectar con AuthService en producción)
  userName = signal('Eduardo Usuario');
  userEmail = signal('eduardo@autorenta.com');
  userAvatar = signal('');

  // Outputs
  menuItemClick = output<SidebarMenuItem>();
  dashboardItemClick = output<SidebarMenuItem>();
  settingsClick = output<void>();
  logoutClick = output<void>();

  // 6 Main Menu Items
  menuItems: SidebarMenuItem[] = [
    {
      id: 'home',
      label: 'Inicio',
      icon: '🏠',
      route: '/',
      color: 'var(--cta-default)', // Reemplazado gradiente con token semántico
    },
    {
      id: 'cars',
      label: 'Mis Autos',
      icon: '🚗',
      route: '/cars',
      badge: 3,
      color: 'var(--surface-secondary)', // Reemplazado gradiente con token semántico
    },
    {
      id: 'bookings',
      label: 'Reservas',
      icon: '📅',
      route: '/bookings',
      badge: 2,
      color: 'var(--surface-info-light, #E0F3FB)',
    },
    {
      id: 'wallet',
      label: 'Billetera',
      icon: '💰',
      route: '/wallet',
      color: 'var(--success-default, #9DB38B)',
    },
    {
      id: 'messages',
      label: 'Mensajes',
      icon: '💬',
      route: '/messages',
      badge: 5,
      color: 'var(--surface-raised, #F8F4EC)',
    },
    {
      id: 'profile',
      label: 'Mi Perfil',
      icon: '👤',
      route: '/profile',
      color: 'var(--border-default)', // Reemplazado gradiente con token semántico
    },
  ];

  // Dashboard Items (12 items en grid 3x4)
  dashboardItems: SidebarMenuItem[] = [
    { id: 'stats', label: 'Estadísticas', icon: '📊', route: '/dashboard/stats' },
    { id: 'earnings', label: 'Ganancias', icon: '💵', route: '/dashboard/earnings' },
    { id: 'calendar', label: 'Calendario', icon: '📆', route: '/dashboard/calendar' },
    { id: 'reviews', label: 'Reseñas', icon: '⭐', route: '/dashboard/reviews', badge: 3 },
    { id: 'insurance', label: 'Seguros', icon: '🛡️', route: '/dashboard/insurance' },
    { id: 'documents', label: 'Documentos', icon: '📄', route: '/dashboard/documents' },
    { id: 'support', label: 'Soporte', icon: '🎧', route: '/dashboard/support' },
    { id: 'referrals', label: 'Referidos', icon: '🎁', route: '/referrals' },
    { id: 'settings', label: 'Ajustes', icon: '⚙️', route: '/settings' },
    { id: 'help', label: 'Ayuda', icon: '❓', route: '/help' },
    { id: 'about', label: 'Acerca de', icon: 'ℹ️', route: '/about' },
    { id: 'legal', label: 'Legal', icon: '⚖️', route: '/legal' },
  ];

  constructor(private router: Router) {}

  open(): void {
    this.isOpen.set(true);
    document.body.style.overflow = 'hidden';
  }

  close(): void {
    this.isOpen.set(false);
    document.body.style.overflow = '';
  }

  handleMenuClick(item: SidebarMenuItem): void {
    this.activeItem.set(item.id);

    if (item.action) {
      item.action();
    } else if (item.route) {
      this.router.navigate([item.route]);
    }

    this.menuItemClick.emit(item);
    this.close();

    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    const name = encodeURIComponent(this.userName());
    img.src = `https://ui-avatars.com/api/?name=${name}&background=A7D8F4&color=050505&size=128`;
  }

  openDashboard(): void {
    this.showDashboard.set(true);
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }

  closeDashboard(): void {
    this.showDashboard.set(false);
  }

  handleDashboardClick(item: SidebarMenuItem): void {
    if (item.route) {
      this.router.navigate([item.route]);
    }

    this.dashboardItemClick.emit(item);
    this.closeDashboard();
    this.close();

    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }

  handleSettings(): void {
    this.settingsClick.emit();
    this.router.navigate(['/settings']);
    this.close();
  }

  handleLogout(): void {
    this.logoutClick.emit();
    this.close();
  }
}
