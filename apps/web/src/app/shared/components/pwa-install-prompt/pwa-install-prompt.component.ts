import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate } from '@angular/animations';
import { TranslateModule } from '@ngx-translate/core';
import { Router, NavigationEnd } from '@angular/router';
import { PwaService } from '../../../core/services/pwa.service';
import { filter } from 'rxjs';

@Component({
  selector: 'app-pwa-install-prompt',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './pwa-install-prompt.component.html',
  styleUrl: './pwa-install-prompt.component.css',
  animations: [
    trigger('slideUp', [
      transition(':enter', [
        style({ transform: 'translateY(100%)', opacity: 0 }),
        animate('300ms ease-out', style({ transform: 'translateY(0)', opacity: 1 })),
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ transform: 'translateY(100%)', opacity: 0 })),
      ]),
    ]),
  ],
})
export class PwaInstallPromptComponent {
  readonly visible = signal(false);
  readonly installing = signal(false);
  private readonly router = inject(Router);
  private readonly pwaService = inject(PwaService);
  
  private currentRoute = signal<string>('');
  private showBenefitsFlag = signal<boolean>(true);
  private showSecurityBadgesFlag = signal<boolean>(true);
  private securityInfoExpandedFlag = signal<boolean>(false);

  constructor() {
    // Track current route for contextual messages
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.currentRoute.set(event.url || '');
      });

    // Set initial route
    this.currentRoute.set(this.router.url || '');

    // Show prompt after 30 seconds if installable
    setTimeout(() => {
      if (this.pwaService.installable() && !this.pwaService.isStandalone()) {
        this.visible.set(true);
      }
    }, 30000);
  }

  /**
   * Get contextual message based on current route
   */
  getContextualMessage(): string {
    const route = this.currentRoute();

    if (route.includes('/bookings')) {
      return 'Recibe notificaciones instantáneas de tus reservas y gestiona tus viajes sin conexión. 100% seguro y gratuito.';
    }

    if (route.includes('/cars')) {
      return 'Busca y reserva autos más rápido. Acceso instantáneo desde tu pantalla de inicio. Protegido con HTTPS.';
    }

    if (route.includes('/wallet')) {
      return 'Gestiona tu wallet sin conexión. Recibe notificaciones de pagos y depósitos. Seguro y verificado.';
    }

    if (route.includes('/profile')) {
      return 'Accede a tu perfil y configuración más rápido. Funciona sin conexión. Sin riesgos.';
    }

    // Default message
    return 'Acceso rápido desde tu pantalla de inicio. Funciona offline y recibe notificaciones. Es seguro y puedes desinstalarlo cuando quieras.';
  }

  /**
   * Show benefits list (can be toggled)
   */
  showBenefits(): boolean {
    return this.showBenefitsFlag();
  }

  /**
   * Toggle benefits visibility (for mobile, can hide if too much content)
   */
  toggleBenefits(): void {
    this.showBenefitsFlag.set(!this.showBenefitsFlag());
  }

  /**
   * Show security badges (HTTPS, Verified)
   */
  showSecurityBadges(): boolean {
    return this.showSecurityBadgesFlag();
  }

  /**
   * Show security info section
   * Only show if user has concerns (optional - can be hidden by default)
   */
  showSecurityInfo(): boolean {
    // Show security info toggle, but collapsed by default
    // User can expand if they have concerns
    return true; // Always show the toggle button
  }

  /**
   * Get security info expanded state
   */
  securityInfoExpanded(): boolean {
    return this.securityInfoExpandedFlag();
  }

  /**
   * Toggle security info visibility
   */
  toggleSecurityInfo(): void {
    this.securityInfoExpandedFlag.set(!this.securityInfoExpandedFlag());
  }

  async install(): Promise<void> {
    this.installing.set(true);

    const accepted = await this.pwaService.promptInstall();

    if (accepted) {
      this.visible.set(false);
    }

    this.installing.set(false);
  }

  dismiss(): void {
    this.visible.set(false);
    // Don't show again for 7 days
    localStorage.setItem('pwa_install_dismissed', Date.now().toString());
  }
}
