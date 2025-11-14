import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { TopBarV2Component } from './top-bar.component';
import { BottomNavV2Component } from './bottom-nav.component';

/**
 * Mobile Shell Component
 * Main layout container for mobile app
 * 
 * Features:
 * - Top bar with navigation
 * - Content area with router outlet
 * - Bottom navigation
 * - Safe area handling
 * - Pull to refresh
 */
@Component({
  selector: 'app-mobile-shell-v2',
  standalone: true,
  imports: [CommonModule, RouterOutlet, TopBarV2Component, BottomNavV2Component],
  template: `
    <div class="mobile-shell">
      <!-- Top Bar -->
      <app-top-bar-v2
        [title]="pageTitle()"
        [showBack]="showBackButton()"
        [showSearch]="showSearch()"
        (backClick)="onBack()"
        (searchClick)="onSearch()"
      />

      <!-- Main Content -->
      <main class="content" [class.with-bottom-nav]="showBottomNav()">
        <router-outlet />
      </main>

      <!-- Bottom Navigation -->
      @if (showBottomNav()) {
        <app-bottom-nav-v2 />
      }
    </div>
  `,
  styles: [`
    .mobile-shell {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      background: #f9fafb;
    }

    .content {
      flex: 1;
      margin-top: 56px;
      margin-top: calc(56px + env(safe-area-inset-top));
      overflow-x: hidden;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
    }

    .content.with-bottom-nav {
      margin-bottom: 60px;
      margin-bottom: calc(60px + env(safe-area-inset-bottom));
    }

    /* Hide on desktop */
    @media (min-width: 768px) {
      .mobile-shell {
        max-width: 430px;
        margin: 0 auto;
        box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
      }
    }
  `]
})
export class MobileShellV2Component {
  // State signals
  pageTitle = signal('AutoRenta');
  showBackButton = signal(false);
  showSearch = signal(false);
  showBottomNav = signal(true);

  // Navigation handlers
  onBack(): void {
    window.history.back();
  }

  onSearch(): void {
    // Navigate to search page
    console.log('Search clicked');
  }
}
