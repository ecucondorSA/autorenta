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

import { AuthService } from '@core/services/auth/auth.service';
import { UserProfile } from '@core/services/auth/profile.service';
import { GamificationService } from '@core/services/gamification/gamification.service';
import {
  PROFILE_NAV_TONE_CLASSES,
  ProfileNavTone,
  resolveProfileNavSections,
} from '@core/ui/navigation/profile-menu';
import { MenuIconComponent } from '../menu-icon/menu-icon.component';
import { VerifiedBadgeComponent } from '../verified-badge/verified-badge.component';

interface MenuItemVm {
  id: string;
  label: string;
  route: string;
  icon: string;
  iconBgColor: string;
  iconTextColor: string;
  iconBgHover: string;
  badgeText?: string;
  badgeKind?: 'new' | 'count';
}

interface MenuSectionVm {
  id: string;
  title: string;
  tone: ProfileNavTone;
  color: string;
  items: MenuItemVm[];
}

@Component({
  selector: 'app-mobile-menu-drawer',
  standalone: true,
  imports: [RouterModule, MenuIconComponent, VerifiedBadgeComponent],
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
  @Input() pendingApprovalCount: number = 0;
  @Input() unreadNotificationsCount: number = 0;

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
    'linear-gradient(135deg, #00d95f 0%, #00bf54 100%)',
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

  readonly menuSections = computed<MenuSectionVm[]>(() =>
    resolveProfileNavSections({
      pendingApprovalCount: this.pendingApprovalCount,
      unreadNotificationsCount: this.unreadNotificationsCount,
    }).map((section) => ({
      id: section.id,
      title: section.title,
      tone: section.tone,
      color: PROFILE_NAV_TONE_CLASSES[section.tone].heading,
      items: section.items.map((item) => {
        const toneClasses = PROFILE_NAV_TONE_CLASSES[item.resolvedTone];
        return {
          id: item.id,
          label: item.label,
          route: item.route,
          icon: item.mobileIcon,
          iconBgColor: toneClasses.iconBg,
          iconTextColor: toneClasses.iconText,
          iconBgHover: toneClasses.iconBgHover,
          badgeText: item.badgeText,
          badgeKind: item.badgeKind,
        };
      }),
    })),
  );

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
      // Parse URL to extract path and query params
      const [path, queryString] = route.split('?');
      const queryParams: Record<string, string> = {};

      if (queryString) {
        const params = new URLSearchParams(queryString);
        params.forEach((value, key) => {
          queryParams[key] = value;
        });
      }

      await this.router.navigate([path], { queryParams });
    } catch (error) {
      console.error('Navigation failed:', error);
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

  trackBySection(index: number, section: MenuSectionVm): string {
    return section.id;
  }

  trackByItem(index: number, item: MenuItemVm): string {
    return item.id;
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
