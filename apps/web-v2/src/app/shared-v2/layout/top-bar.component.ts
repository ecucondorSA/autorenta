import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

/**
 * Mobile Top Bar Component
 * App bar for mobile screens with back button, title, and actions
 * 
 * Features:
 * - Dynamic title
 * - Back navigation
 * - Custom actions (search, share, more)
 * - Safe area support
 * - Transparent/solid variants
 */
@Component({
  selector: 'app-top-bar-v2',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <header 
      class="top-bar" 
      [class.transparent]="transparent()"
      [class.elevated]="elevated()"
    >
      <div class="top-bar-content">
        <!-- Left: Back button or menu -->
        <div class="top-bar-left">
          @if (showBack()) {
            <button 
              type="button"
              class="icon-button"
              (click)="onBackClick()"
              aria-label="Volver"
            >
              <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M19 12H5M12 19l-7-7 7-7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          } @else if (showMenu()) {
            <button 
              type="button"
              class="icon-button"
              (click)="onMenuClick()"
              aria-label="Menú"
            >
              <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M3 12h18M3 6h18M3 18h18" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          }
        </div>

        <!-- Center: Title -->
        <div class="top-bar-center">
          @if (logo()) {
            <img [src]="logo()" alt="AutoRenta" class="logo">
          } @else {
            <h1 class="title">{{ title() }}</h1>
          }
        </div>

        <!-- Right: Actions -->
        <div class="top-bar-right">
          @if (showSearch()) {
            <button 
              type="button"
              class="icon-button"
              (click)="onSearchClick()"
              aria-label="Buscar"
            >
              <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="11" cy="11" r="8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="m21 21-4.35-4.35" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          }
          
          @if (showShare()) {
            <button 
              type="button"
              class="icon-button"
              (click)="onShareClick()"
              aria-label="Compartir"
            >
              <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="18" cy="5" r="3" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="6" cy="12" r="3" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="18" cy="19" r="3" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          }

          @if (showMore()) {
            <button 
              type="button"
              class="icon-button"
              (click)="onMoreClick()"
              aria-label="Más opciones"
            >
              <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="19" cy="12" r="1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="5" cy="12" r="1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          }
        </div>
      </div>
    </header>
  `,
  styles: [`
    .top-bar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: white;
      border-bottom: 1px solid #e5e7eb;
      z-index: 1010;
      transition: all 0.3s ease;
    }

    .top-bar.transparent {
      background: transparent;
      border-bottom-color: transparent;
    }

    .top-bar.elevated {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .top-bar-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 56px;
      padding: 0 1rem;
      padding-top: max(0, env(safe-area-inset-top));
    }

    .top-bar-left,
    .top-bar-right {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      min-width: 40px;
    }

    .top-bar-center {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    .icon-button {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border: none;
      background: transparent;
      color: #374151;
      cursor: pointer;
      border-radius: 0.5rem;
      transition: background-color 0.2s ease;
      -webkit-tap-highlight-color: transparent;
    }

    .icon-button:hover {
      background-color: #f3f4f6;
    }

    .icon-button:active {
      transform: scale(0.95);
    }

    .icon {
      width: 24px;
      height: 24px;
    }

    .logo {
      height: 32px;
      width: auto;
    }

    .title {
      font-size: 1.125rem;
      font-weight: 600;
      color: #111827;
      margin: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .top-bar.transparent .title,
    .top-bar.transparent .icon-button {
      color: white;
    }

    .top-bar.transparent .icon-button:hover {
      background-color: rgba(255, 255, 255, 0.1);
    }

    /* Hide on desktop */
    @media (min-width: 768px) {
      .top-bar {
        display: none;
      }
    }
  `]
})
export class TopBarV2Component {
  // Inputs
  title = input<string>('AutoRenta');
  logo = input<string>('');
  transparent = input<boolean>(false);
  elevated = input<boolean>(true);
  showBack = input<boolean>(false);
  showMenu = input<boolean>(true);
  showSearch = input<boolean>(false);
  showShare = input<boolean>(false);
  showMore = input<boolean>(false);

  // Outputs
  backClick = output<void>();
  menuClick = output<void>();
  searchClick = output<void>();
  shareClick = output<void>();
  moreClick = output<void>();

  // Event handlers
  onBackClick(): void {
    this.backClick.emit();
  }

  onMenuClick(): void {
    this.menuClick.emit();
  }

  onSearchClick(): void {
    this.searchClick.emit();
  }

  onShareClick(): void {
    this.shareClick.emit();
  }

  onMoreClick(): void {
    this.moreClick.emit();
  }
}
