import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

/**
 * Mobile Bottom Navigation Component
 * Sticky navigation bar at the bottom of mobile screens
 * 
 * Features:
 * - 5 main navigation items
 * - Active state indication
 * - Badge notifications
 * - Smooth transitions
 * - Safe area support
 */
@Component({
  selector: 'app-bottom-nav-v2',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <nav class="bottom-nav" [class.visible]="isVisible()">
      <a 
        routerLink="/" 
        routerLinkActive="active"
        [routerLinkActiveOptions]="{exact: true}"
        class="nav-item"
        aria-label="Inicio"
      >
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <polyline points="9 22 9 12 15 12 15 22" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span class="nav-label">Inicio</span>
      </a>

      <a 
        routerLink="/discover" 
        routerLinkActive="active"
        class="nav-item"
        aria-label="Explorar"
      >
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="11" cy="11" r="8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="m21 21-4.35-4.35" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span class="nav-label">Explorar</span>
      </a>

      <a 
        routerLink="/trips" 
        routerLinkActive="active"
        class="nav-item"
        aria-label="Viajes"
      >
        @if (tripsCount() > 0) {
          <span class="badge">{{ tripsCount() }}</span>
        }
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M5 17H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M6 17a2 2 0 1 0 0 4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M18 17a2 2 0 1 0 0 4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M6 17h12" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span class="nav-label">Viajes</span>
      </a>

      <a 
        routerLink="/inbox" 
        routerLinkActive="active"
        class="nav-item"
        aria-label="Mensajes"
      >
        @if (unreadMessages() > 0) {
          <span class="badge">{{ unreadMessages() }}</span>
        }
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span class="nav-label">Mensajes</span>
      </a>

      <a 
        routerLink="/profile" 
        routerLinkActive="active"
        class="nav-item"
        aria-label="Perfil"
      >
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="12" cy="7" r="4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span class="nav-label">Perfil</span>
      </a>
    </nav>
  `,
  styles: [`
    .bottom-nav {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      display: flex;
      justify-content: space-around;
      align-items: center;
      background: white;
      border-top: 1px solid #e5e7eb;
      padding: 0.5rem 0;
      padding-bottom: max(0.5rem, env(safe-area-inset-bottom));
      z-index: 1000;
      transform: translateY(100%);
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
    }

    .bottom-nav.visible {
      transform: translateY(0);
    }

    .nav-item {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.25rem;
      padding: 0.5rem 1rem;
      text-decoration: none;
      color: #6b7280;
      transition: color 0.2s ease;
      min-width: 60px;
      -webkit-tap-highlight-color: transparent;
    }

    .nav-item:active {
      transform: scale(0.95);
    }

    .nav-item.active {
      color: #4F46E5;
    }

    .nav-icon {
      width: 24px;
      height: 24px;
      flex-shrink: 0;
    }

    .nav-label {
      font-size: 0.75rem;
      font-weight: 500;
      line-height: 1;
    }

    .badge {
      position: absolute;
      top: 0.25rem;
      right: 0.75rem;
      background: #ef4444;
      color: white;
      font-size: 0.625rem;
      font-weight: 600;
      padding: 0.125rem 0.375rem;
      border-radius: 9999px;
      min-width: 1.25rem;
      text-align: center;
      line-height: 1.2;
    }

    /* Hide on desktop */
    @media (min-width: 768px) {
      .bottom-nav {
        display: none;
      }
    }
  `]
})
export class BottomNavV2Component {
  // Signals for reactive state
  isVisible = signal(true);
  tripsCount = signal(0);
  unreadMessages = signal(0);

  constructor() {
    // Show navigation after initial render
    setTimeout(() => {
      this.isVisible.set(true);
    }, 100);
  }

  // Methods to update counts from services
  updateTripsCount(count: number): void {
    this.tripsCount.set(count);
  }

  updateUnreadMessages(count: number): void {
    this.unreadMessages.set(count);
  }
}
