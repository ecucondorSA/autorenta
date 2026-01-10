import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  EventEmitter,
  HostListener,
  inject,
  Input,
  OnDestroy,
  Output,
  signal,
  ViewChild,
} from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { AuthService } from '@core/services/auth/auth.service';
import { UserProfile } from '@core/services/auth/profile.service';
import { GamificationService } from '@core/services/gamification/gamification.service';
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
  imports: [RouterModule, CurrencyPipe, DatePipe, DecimalPipe, MenuIconComponent, VerifiedBadgeComponent],
  templateUrl: './mobile-menu-drawer.component.html',
  styleUrls: ['./mobile-menu-drawer.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MobileMenuDrawerComponent implements OnDestroy {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly gamification = inject(GamificationService);

  // RAF ID for cleanup (memory leak fix)
  private rafId: number | null = null;

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

  // Pro Level: Quick stats signals (will be populated from services in the future)
  readonly walletBalance = signal(0);
  readonly unreadMessages = signal(0);
  readonly pendingNotifications = signal(0);
  readonly verificationProgress = signal(60); // Mock: 60% verified

  // Avatar colors for initials
  private readonly avatarColors = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  ];

  // Gamification data from service
  readonly gamificationStats = this.gamification.stats;
  readonly isHost = this.gamification.isHost;
  readonly hostStats = this.gamification.hostStats;
  readonly quickActions = this.gamification.quickActions;
  readonly isPremium = this.gamification.isPremium;
  readonly premiumPrice = this.gamification.premiumPrice;

  // Computed: verificaciones completadas
  readonly verificationsCompleted = computed(() => {
    // Mock: basado en verification progress
    const progress = this.verificationProgress();
    return {
      email: true,
      phone: progress >= 40,
      dni: progress >= 60,
      license: progress >= 80,
      selfie: progress >= 100,
    };
  });

  // Menu sections - Simplified to 3 sections (industry standard: Airbnb, Uber use 3-4)
  readonly menuSections: MenuSection[] = [
    {
      title: 'Mis Actividades',
      color: 'text-blue-600',
      iconBgColor: 'bg-blue-500/10',
      iconTextColor: 'text-blue-600',
      items: [
        { label: 'Mis Reservas', route: '/bookings', icon: 'calendar' },
        { label: 'Mis Autos', route: '/cars/my', icon: 'archive' },
        { label: 'Mensajes', route: '/messages', icon: 'message' },
        { label: 'Favoritos', route: '/favorites', icon: 'heart' },
      ],
    },
    {
      title: 'Cuenta',
      color: 'text-emerald-600',
      iconBgColor: 'bg-emerald-500/10',
      iconTextColor: 'text-emerald-600',
      items: [
        { label: 'Mi Perfil', route: '/profile', icon: 'user' },
        { label: 'Wallet', route: '/wallet', icon: 'wallet' },
        {
          label: 'Verificacion',
          route: '/profile/verification',
          icon: 'check-circle',
          badge: 'IMPORTANTE',
        },
        { label: 'Configuracion', route: '/profile/preferences', icon: 'settings' },
      ],
    },
    {
      title: 'Ayuda',
      color: 'text-gray-500',
      iconBgColor: 'bg-gray-500/10',
      iconTextColor: 'text-gray-600',
      items: [
        { label: 'Centro de Ayuda', route: '/help', icon: 'help' },
        { label: 'Soporte', route: '/support', icon: 'phone' },
      ],
    },
  ];

  private touchStartY = 0;
  private isDragging = false;

  // Keyboard support: Escape to close
  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.isOpen()) {
      this.close();
    }
  }

  ngOnDestroy(): void {
    // Cleanup RAF to prevent memory leaks
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

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

    try {
      await this.router.navigate([route]);
    } catch (error) {
      console.error('Navigation failed:', error);
      // Navigation errors are usually not critical, just log
    }
  }

  async signOut(): Promise<void> {
    this.close();

    try {
      await this.authService.signOut();
      await this.router.navigate(['/']);
    } catch (error) {
      console.error('Sign out failed:', error);
      // Still redirect to home even on error
      await this.router.navigate(['/']);
    }
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

    // Only allow dragging down - use RAF for better performance
    if (diff > 0 && this.drawerContent) {
      // Cancel previous RAF to avoid stacking
      if (this.rafId !== null) {
        cancelAnimationFrame(this.rafId);
      }

      this.rafId = requestAnimationFrame(() => {
        if (this.drawerContent) {
          this.drawerContent.nativeElement.style.transform = `translateY(${diff}px)`;
        }
      });
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

  // Pro Level: Get user initials for avatar
  getInitials(): string {
    const name = this.userProfile?.full_name || this.userEmail() || 'U';
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  // Pro Level: Get consistent color for avatar based on name
  getAvatarColor(): string {
    const name = this.userProfile?.full_name || this.userEmail() || 'User';
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return this.avatarColors[hash % this.avatarColors.length];
  }
}
