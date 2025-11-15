import { Component, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface MenuItem {
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
 * Sidebar Menu Component - Facebook Style
 * Mobile-first sidebar with iOS animations
 */
@Component({
  selector: 'app-sidebar-menu',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Backdrop -->
    @if (isOpen()) {
      <div 
        class="sidebar-backdrop"
        (click)="close()"
      ></div>
    }

    <!-- Sidebar -->
    <div 
      class="sidebar"
      [class.open]="isOpen()"
    >
      <!-- Header -->
      <div class="sidebar-header">
        <div class="user-info">
          <img 
            src="https://ui-avatars.com/api/?name=Usuario&background=A7D8F4&color=050505&size=64" 
            alt="Avatar"
            class="user-avatar"
          />
          <div class="user-details">
            <h3 class="user-name">Usuario Autorenta</h3>
            <p class="user-email">usuario@ejemplo.com</p>
          </div>
        </div>
      </div>

      <!-- Menu Items -->
      <div class="menu-items">
        @for (item of menuItems; track item.id) {
          <button 
            class="menu-item"
            (click)="handleMenuClick(item)"
          >
            <span class="menu-icon">{{ item.icon }}</span>
            <span class="menu-label">{{ item.label }}</span>
            @if (item.badge && item.badge > 0) {
              <span class="menu-badge">{{ item.badge }}</span>
            }
          </button>
        }

        <!-- Dashboard Button -->
        <button 
          class="menu-item dashboard-item"
          (click)="openDashboard()"
        >
          <span class="menu-icon">📊</span>
          <span class="menu-label">Dashboard</span>
          <span class="menu-arrow">→</span>
        </button>
      </div>

      <!-- Footer -->
      <div class="sidebar-footer">
        <button class="footer-button" (click)="handleSettings()">
          <span class="footer-icon">⚙️</span>
          <span>Configuración</span>
        </button>
        <button class="footer-button logout" (click)="handleLogout()">
          <span class="footer-icon">🚪</span>
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </div>

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
              <button 
                class="dashboard-item"
                (click)="handleDashboardClick(item)"
              >
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
      /* Backdrop */
      .sidebar-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(5, 5, 5, 0.7);
        z-index: 998;
        animation: fadeIn 0.3s ease;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      /* Sidebar */
      .sidebar {
        position: fixed;
        top: 0;
        left: 0;
        bottom: 0;
        width: 280px;
        background: white;
        z-index: 999;
        display: flex;
        flex-direction: column;
        transform: translateX(-100%);
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 2px 0 8px rgba(0, 0, 0, 0.15);
        overflow-y: auto;
      }

      .sidebar.open {
        transform: translateX(0);
      }

      /* Header */
      .sidebar-header {
        padding: 24px 16px;
        border-bottom: 1px solid #bcbcbc;
        background: #f8f4ec;
      }

      .user-info {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .user-avatar {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        border: 2px solid #a7d8f4;
      }

      .user-details {
        flex: 1;
        min-width: 0;
      }

      .user-name {
        font-size: 1rem;
        font-weight: 600;
        color: #050505;
        margin: 0 0 4px 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .user-email {
        font-size: 0.875rem;
        color: #4e4e4e;
        margin: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      /* Menu Items */
      .menu-items {
        flex: 1;
        padding: 8px 0;
        overflow-y: auto;
      }

      .menu-item {
        display: flex;
        align-items: center;
        gap: 12px;
        width: 100%;
        padding: 14px 16px;
        background: transparent;
        border: none;
        text-align: left;
        cursor: pointer;
        transition: background 0.2s ease;
        position: relative;
      }

      .menu-item:hover {
        background: #f8f4ec;
      }

      .menu-item:active {
        background: #dfd2bf;
      }

      .menu-icon {
        font-size: 1.5rem;
        width: 32px;
        text-align: center;
      }

      .menu-label {
        flex: 1;
        font-size: 1rem;
        font-weight: 500;
        color: #050505;
      }

      .menu-badge {
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 24px;
        height: 24px;
        padding: 0 8px;
        background: #ef4444;
        color: white;
        font-size: 0.75rem;
        font-weight: 600;
        border-radius: 12px;
      }

      .menu-arrow {
        font-size: 1.25rem;
        color: #4e4e4e;
      }

      .dashboard-item {
        border-top: 1px solid #bcbcbc;
        border-bottom: 1px solid #bcbcbc;
        background: #f8f4ec;
      }

      /* Footer */
      .sidebar-footer {
        padding: 16px;
        border-top: 1px solid #bcbcbc;
        background: white;
      }

      .footer-button {
        display: flex;
        align-items: center;
        gap: 12px;
        width: 100%;
        padding: 12px 16px;
        background: transparent;
        border: 1px solid #bcbcbc;
        border-radius: 8px;
        font-size: 0.9375rem;
        font-weight: 500;
        color: #050505;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .footer-button + .footer-button {
        margin-top: 8px;
      }

      .footer-button:hover {
        background: #f8f4ec;
        border-color: #a7d8f4;
      }

      .footer-button.logout {
        color: #ef4444;
        border-color: #ef4444;
      }

      .footer-button.logout:hover {
        background: #fef2f2;
      }

      .footer-icon {
        font-size: 1.25rem;
      }

      /* Dashboard Modal */
      .dashboard-overlay {
        position: fixed;
        inset: 0;
        background: rgba(5, 5, 5, 0.8);
        z-index: 1000;
        display: flex;
        align-items: flex-end;
        animation: fadeIn 0.3s ease;
      }

      .dashboard-modal {
        width: 100%;
        max-height: 80vh;
        background: white;
        border-radius: 24px 24px 0 0;
        animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        overflow-y: auto;
      }

      @keyframes slideUp {
        from {
          transform: translateY(100%);
        }
        to {
          transform: translateY(0);
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
        background: #f8f4ec;
        border: 1px solid #bcbcbc;
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .dashboard-item:hover {
        background: #dfd2bf;
        border-color: #a7d8f4;
        transform: translateY(-2px);
      }

      .dashboard-item:active {
        transform: translateY(0);
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
        .sidebar {
          width: 320px;
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
export class SidebarMenuComponent {
  // Outputs
  menuClick = output<MenuItem>();
  dashboardClick = output<DashboardItem>();
  settingsClick = output<void>();
  logoutClick = output<void>();

  // State
  isOpen = signal(false);
  showDashboard = signal(false);

  // Menu items
  menuItems: MenuItem[] = [
    { id: 'home', label: 'Inicio', icon: '🏠', route: '/home-v2' },
    { id: 'cars', label: 'Mis Autos', icon: '🚗', badge: 3, route: '/cars/my-cars' },
    { id: 'bookings', label: 'Reservas', icon: '📅', badge: 2, route: '/bookings' },
    { id: 'wallet', label: 'Billetera', icon: '💰', route: '/wallet' },
    { id: 'messages', label: 'Mensajes', icon: '💬', badge: 5, route: '/messages' },
    { id: 'profile', label: 'Perfil', icon: '👤', route: '/profile' },
  ];

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

  open(): void {
    this.isOpen.set(true);
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }

  close(): void {
    this.isOpen.set(false);
  }

  toggle(): void {
    if (this.isOpen()) {
      this.close();
    } else {
      this.open();
    }
  }

  handleMenuClick(item: MenuItem): void {
    console.log('Menu clicked:', item);
    this.menuClick.emit(item);
    this.close();

    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }

    // Navigate if route exists
    if (item.route) {
      // In production, use Router.navigate()
      console.log('Navigate to:', item.route);
    }
  }

  openDashboard(): void {
    this.showDashboard.set(true);
    this.close();

    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate([10, 50, 10]);
    }
  }

  closeDashboard(): void {
    this.showDashboard.set(false);
  }

  handleDashboardClick(item: DashboardItem): void {
    console.log('Dashboard item clicked:', item);
    this.dashboardClick.emit(item);
    this.closeDashboard();

    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }

  handleSettings(): void {
    console.log('Settings clicked');
    this.settingsClick.emit();
    this.close();
  }

  handleLogout(): void {
    console.log('Logout clicked');
    if (confirm('¿Seguro que quieres cerrar sesión?')) {
      this.logoutClick.emit();
      this.close();
    }
  }
}
