import { ChangeDetectionStrategy, Component, computed, inject, HostBinding, signal, OnInit } from '@angular/core';
import { RouterLink, RouterOutlet, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './core/services/auth.service';
import { CarsCompareService } from './core/services/cars-compare.service';
import { PendingReviewsBannerComponent } from './shared/components/pending-reviews-banner/pending-reviews-banner.component';
import { SplashLoaderComponent } from './shared/components/splash-loader/splash-loader.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    PendingReviewsBannerComponent,
    SplashLoaderComponent,
  ],
  templateUrl: './app.component.html',
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly compareService = inject(CarsCompareService);
  readonly isAuthenticated = computed(() => this.authService.isAuthenticated());
  readonly compareCount = this.compareService.count;

  sidebarOpen = false;
  darkMode = false;
  year = new Date().getFullYear();

  // Splash loader state
  showSplash = signal(true);

  ngOnInit(): void {
    // Mostrar splash solo en primera carga de sesión
    const hasSeenSplash = sessionStorage.getItem('splash_shown');

    if (!hasSeenSplash) {
      setTimeout(() => {
        this.showSplash.set(false);
        sessionStorage.setItem('splash_shown', '1');
      }, 4000);
    } else {
      this.showSplash.set(false);
    }
  }

  @HostBinding('class.dark') get darkClass() {
    return this.darkMode;
  }

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  toggleDarkMode() {
    this.darkMode = !this.darkMode;
  }
}
