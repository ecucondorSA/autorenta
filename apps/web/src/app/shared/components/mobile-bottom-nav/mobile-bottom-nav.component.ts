import { Component, computed, signal, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { UnreadMessagesService } from '../../../core/services/unread-messages.service';

interface NavItem {
  id: string;
  label: string;
  icon: string;
  route: string;
  badgeSignal?: () => number;
}

@Component({
  selector: 'app-mobile-bottom-nav',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './mobile-bottom-nav.component.html',
  styleUrls: ['./mobile-bottom-nav.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush, // ✅ Performance boost
})
export class MobileBottomNavComponent {
  private readonly unreadMessagesService = inject(UnreadMessagesService);
  readonly currentRoute = signal<string>('');

  readonly navItems: NavItem[] = [
    {
      id: 'home',
      label: 'Inicio',
      icon: 'home',
      route: '/',
    },
    {
      id: 'cars',
      label: 'Autos',
      icon: 'car',
      route: '/cars',
    },
    {
      id: 'rent',
      label: 'Alquilar',
      icon: 'search',
      route: '/explore',
    },
    {
      id: 'publish',
      label: 'Publicar',
      icon: 'plus',
      route: '/cars/publish',
    },
    {
      id: 'messages',
      label: 'Mensajes',
      icon: 'message',
      route: '/messages',
      badgeSignal: () => this.unreadMessagesService.totalUnreadCount(),
    },
    {
      id: 'bookings',
      label: 'Reservas',
      icon: 'calendar',
      route: '/bookings',
    },
    {
      id: 'account',
      label: 'Cuenta',
      icon: 'user',
      route: '/profile',
    },
  ];

  constructor(private router: Router) {
    // Detectar ruta actual
    this.router.events.subscribe(() => {
      this.currentRoute.set(this.router.url);
    });
  }

  isActive(route: string): boolean {
    const current = this.currentRoute();
    return current === route || current.startsWith(route + '/');
  }

  /**
   * Navega con haptic feedback
   * Funciona en dispositivos móviles con Capacitor
   */
  async navigateWithHaptic(event: Event, route: string): Promise<void> {
    event.preventDefault();
    
    // Haptic feedback (solo funciona en móvil nativo)
    try {
      // Vibración ligera en navegadores que lo soportan
      if ('vibrate' in navigator) {
        navigator.vibrate(10);
      }
    } catch (_e) {
      // Silently fail en navegadores sin soporte
    }
    
    await this.router.navigate([route]);
  }

  getIcon(iconName: string): string {
    const icons: Record<string, string> = {
      home: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
      car: 'M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z M13 16v6 M8 16l-1.5-6h11L19 16M5 11l1.5-6h11L19 11H5z',
      search: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
      plus: 'M12 4v16m8-8H4',
      message: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
      calendar: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
      user: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
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
