import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  Output,
  signal,
  ViewChild,
} from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '@core/services/auth/auth.service';
import { UserProfile } from '@core/services/auth/profile.service';
import { MenuIconComponent } from '../menu-icon/menu-icon.component';
import { VerifiedBadgeComponent } from '../verified-badge/verified-badge.component';

interface MenuItem {
  label: string;
  route: string;
  icon: string;
  badge?: string;
}

interface MenuSection {
  title: string;
  color: string;
  iconBgColor: string;
  iconTextColor: string;
  items: MenuItem[];
}

@Component({
  selector: 'app-mobile-menu-drawer',
  standalone: true,
  imports: [RouterModule, MenuIconComponent, VerifiedBadgeComponent],
  templateUrl: './mobile-menu-drawer.component.html',
  styleUrls: ['./mobile-menu-drawer.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MobileMenuDrawerComponent {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  @ViewChild('drawerContent') drawerContent!: ElementRef<HTMLElement>;

  @Input() set open(value: boolean) {
    this.isOpen.set(value);
    if (value) {
      this.animateIn();
    }
  }

  @Input() userProfile: UserProfile | null = null;

  @Output() closeDrawer = new EventEmitter<void>();

  readonly isOpen = signal(false);
  readonly isAnimating = signal(false);

  // User email from auth service
  readonly userEmail = this.authService.userEmail;

  // Menu sections based on the plan
  readonly menuSections: MenuSection[] = [
    {
      title: 'Mis Actividades',
      color: 'text-blue-600',
      iconBgColor: 'bg-blue-500/10',
      iconTextColor: 'text-blue-600',
      items: [
        {
          label: 'Verificacion',
          route: '/profile/verification',
          icon: 'check-circle',
          badge: 'IMPORTANTE',
        },
        { label: 'Mis Reservas', route: '/bookings', icon: 'calendar' },
        { label: 'Mis Autos', route: '/cars/my', icon: 'archive' },
        { label: 'Calendario', route: '/bookings/calendar', icon: 'calendar-days' },
        { label: 'Favoritos', route: '/favorites', icon: 'heart' },
      ],
    },
    {
      title: 'Comunicacion',
      color: 'text-violet-600',
      iconBgColor: 'bg-violet-500/10',
      iconTextColor: 'text-violet-600',
      items: [
        { label: 'Mensajes', route: '/messages', icon: 'message' },
        { label: 'Notificaciones', route: '/profile/notifications-settings', icon: 'bell' },
      ],
    },
    {
      title: 'Finanzas',
      color: 'text-emerald-600',
      iconBgColor: 'bg-emerald-500/10',
      iconTextColor: 'text-emerald-600',
      items: [
        { label: 'Wallet', route: '/wallet', icon: 'wallet' },
        { label: 'Retiros', route: '/wallet/payouts', icon: 'credit-card' },
        { label: 'Mis Ganancias', route: '/dashboard/earnings', icon: 'chart-bar', badge: 'NEW' },
      ],
    },
    {
      title: 'Configuracion',
      color: 'text-gray-500',
      iconBgColor: 'bg-gray-500/10',
      iconTextColor: 'text-gray-600',
      items: [
        { label: 'Editar Perfil', route: '/profile', icon: 'user' },
        { label: 'Mi Direccion', route: '/profile/location-settings', icon: 'location' },
        { label: 'Seguridad', route: '/profile/security', icon: 'shield' },
        { label: 'Preferencias', route: '/profile/preferences', icon: 'settings' },
        { label: 'Conductor', route: '/profile/driver-profile', icon: 'document' },
      ],
    },
    {
      title: 'Ayuda',
      color: 'text-amber-600',
      iconBgColor: 'bg-amber-500/10',
      iconTextColor: 'text-amber-600',
      items: [
        { label: 'Centro de Ayuda', route: '/help', icon: 'help', badge: 'NEW' },
        { label: 'Contactar Soporte', route: '/support', icon: 'phone' },
      ],
    },
  ];

  private touchStartY = 0;
  private isDragging = false;

  private animateIn(): void {
    this.isAnimating.set(true);
    // Let CSS animation handle it
    setTimeout(() => this.isAnimating.set(false), 300);
  }

  close(): void {
    this.isOpen.set(false);
    this.closeDrawer.emit();
  }

  onBackdropClick(): void {
    this.close();
  }

  async navigateAndClose(route: string): Promise<void> {
    // Haptic feedback
    try {
      if ('vibrate' in navigator) {
        navigator.vibrate(10);
      }
    } catch {
      // Silently fail
    }

    this.close();
    await this.router.navigate([route]);
  }

  async signOut(): Promise<void> {
    this.close();
    await this.authService.signOut();
    await this.router.navigate(['/']);
  }

  // Touch handling for swipe-to-close
  onTouchStart(event: TouchEvent): void {
    this.touchStartY = event.touches[0].clientY;
    this.isDragging = true;
  }

  onTouchMove(event: TouchEvent): void {
    if (!this.isDragging) return;

    const currentY = event.touches[0].clientY;
    const diff = currentY - this.touchStartY;

    // Only allow dragging down
    if (diff > 0 && this.drawerContent) {
      this.drawerContent.nativeElement.style.transform = `translateY(${diff}px)`;
    }
  }

  onTouchEnd(event: TouchEvent): void {
    if (!this.isDragging) return;
    this.isDragging = false;

    const currentY = event.changedTouches[0].clientY;
    const diff = currentY - this.touchStartY;

    // If dragged more than 100px, close
    if (diff > 100) {
      this.close();
    }

    // Reset transform
    if (this.drawerContent) {
      this.drawerContent.nativeElement.style.transform = '';
    }
  }

  trackBySection(index: number, section: MenuSection): string {
    return section.title;
  }

  trackByItem(index: number, item: MenuItem): string {
    return item.route;
  }
}
