import { Component, Output, EventEmitter, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * 🔄 Pull to Refresh Component
 * 
 * Componente que añade funcionalidad pull-to-refresh a cualquier contenido.
 * UX estándar en apps móviles.
 * 
 * @example
 * <app-pull-to-refresh (refresh)="handleRefresh()">
 *   <div>Tu contenido aquí</div>
 * </app-pull-to-refresh>
 */
@Component({
  selector: 'app-pull-to-refresh',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="pull-to-refresh-wrapper"
         (touchstart)="onTouchStart($event)"
         (touchmove)="onTouchMove($event)"
         (touchend)="onTouchEnd()">
      
      <!-- Refresh Indicator -->
      <div class="refresh-indicator" 
           [class.visible]="pullDistance() > 0"
           [class.refreshing]="isRefreshing()"
           [style.transform]="'translateY(' + pullDistance() + 'px)'">
        <div class="spinner" [class.active]="isRefreshing()">
          <svg viewBox="0 0 24 24" class="refresh-icon">
            <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
          </svg>
        </div>
        <span class="refresh-text">{{ refreshText() }}</span>
      </div>

      <!-- Content -->
      <div class="content" [style.transform]="'translateY(' + pullDistance() + 'px)'">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: [`
    .pull-to-refresh-wrapper {
      position: relative;
      overflow: hidden;
      height: 100%;
    }

    .refresh-indicator {
      position: absolute;
      top: -60px;
      left: 0;
      right: 0;
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      background: transparent;
      opacity: 0;
      transition: opacity 0.2s ease;
    }

    .refresh-indicator.visible {
      opacity: 1;
    }

    .spinner {
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .refresh-icon {
      width: 24px;
      height: 24px;
      fill: #2c4a52;
      transition: transform 0.3s ease;
    }

    :host-context(.dark) .refresh-icon {
      fill: #7aa2aa;
    }

    .spinner.active .refresh-icon {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .refresh-text {
      font-size: 14px;
      font-weight: 500;
      color: #2c4a52;
    }

    :host-context(.dark) .refresh-text {
      color: #7aa2aa;
    }

    .content {
      transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      will-change: transform;
    }

    .refresh-indicator.refreshing {
      background: linear-gradient(180deg, 
        rgba(44, 74, 82, 0.05) 0%, 
        rgba(44, 74, 82, 0) 100%
      );
    }

    :host-context(.dark) .refresh-indicator.refreshing {
      background: linear-gradient(180deg, 
        rgba(122, 162, 170, 0.08) 0%, 
        rgba(122, 162, 170, 0) 100%
      );
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PullToRefreshComponent {
  @Output() refresh = new EventEmitter<void>();

  readonly pullDistance = signal(0);
  readonly isRefreshing = signal(false);
  readonly refreshText = signal('Desliza para actualizar');

  private startY = 0;
  private isDragging = false;
  private readonly REFRESH_THRESHOLD = 70;
  private readonly MAX_PULL_DISTANCE = 120;

  onTouchStart(event: TouchEvent): void {
    if (window.scrollY === 0) {
      this.startY = event.touches[0].clientY;
      this.isDragging = true;
    }
  }

  onTouchMove(event: TouchEvent): void {
    if (!this.isDragging || this.isRefreshing()) return;

    const currentY = event.touches[0].clientY;
    const diff = currentY - this.startY;

    if (diff > 0) {
      event.preventDefault();
      
      const resistance = diff / 2;
      const pullDist = Math.min(resistance, this.MAX_PULL_DISTANCE);
      
      this.pullDistance.set(pullDist);

      if (pullDist >= this.REFRESH_THRESHOLD) {
        this.refreshText.set('Suelta para actualizar');
      } else {
        this.refreshText.set('Desliza para actualizar');
      }
    }
  }

  async onTouchEnd(): Promise<void> {
    if (!this.isDragging) return;

    this.isDragging = false;

    if (this.pullDistance() >= this.REFRESH_THRESHOLD && !this.isRefreshing()) {
      this.isRefreshing.set(true);
      this.refreshText.set('Actualizando...');
      
      this.refresh.emit();

      setTimeout(() => {
        if (this.isRefreshing()) {
          this.completeRefresh();
        }
      }, 2000);
    } else {
      this.pullDistance.set(0);
    }
  }

  completeRefresh(): void {
    this.isRefreshing.set(false);
    this.pullDistance.set(0);
    this.refreshText.set('Actualizado');
    
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }

    setTimeout(() => {
      this.refreshText.set('Desliza para actualizar');
    }, 1000);
  }
}
