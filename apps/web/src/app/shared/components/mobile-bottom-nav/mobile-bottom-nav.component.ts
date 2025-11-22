import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
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
      id: 'rent',
      label: 'Alquilar',
      icon: 'search',
      route: '/cars',
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
    } catch {
      // Silently fail en navegadores sin soporte
    }

    await this.router.navigate([route]);
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
